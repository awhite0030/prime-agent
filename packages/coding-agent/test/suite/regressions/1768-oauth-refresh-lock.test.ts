import { getOAuthApiKey } from "@earendil-works/pi-ai/oauth";
import { describe, expect, it, vi } from "vitest";
import { AuthStorage, InMemoryAuthStorageBackend } from "../../../src/core/auth-storage.js";

vi.mock("@earendil-works/pi-ai/oauth", async (importOriginal) => {
	const actual = await importOriginal<typeof import("@earendil-works/pi-ai/oauth")>();
	return {
		...actual,
		getOAuthApiKey: vi.fn(),
		getOAuthProvider: (id: string) => {
			if (id === "test-oauth-provider") {
				return {
					id: "test-oauth-provider",
					name: "Test OAuth Provider",
					getApiKey: (cred: any) => cred.access,
					login: async () => ({ access: "new-access", refresh: "new-refresh", expires: Date.now() + 3600000 }),
				};
			}
			return actual.getOAuthProvider(id);
		},
	};
});

// We'll create a special backend that lets us simulate concurrent locks
class MockLockingBackend extends InMemoryAuthStorageBackend {
	public lockAcquiredCount = 0;
	public lockReleasedCount = 0;
	public concurrentLockAttempts = 0;

	private isLocked = false;
	private lockWaiters: (() => void)[] = [];

	private async acquireLock() {
		if (this.isLocked) {
			this.concurrentLockAttempts++;
			await new Promise<void>((resolve) => {
				this.lockWaiters.push(resolve);
			});
		}
		this.isLocked = true;
		this.lockAcquiredCount++;
	}

	private releaseLock() {
		this.isLocked = false;
		this.lockReleasedCount++;
		const next = this.lockWaiters.shift();
		if (next) next();
	}

	override async withLockAsync<T>(
		fn: (current: string | undefined) => Promise<{ result: T; next?: string }>,
	): Promise<T> {
		await this.acquireLock();
		try {
			return await super.withLockAsync(fn);
		} finally {
			this.releaseLock();
		}
	}
}

describe("regression 1768: OAuth token refresh holds lock across network call", () => {
	it("should drop lock during network call and handle concurrent updates", async () => {
		const mockedGetOAuthApiKey = vi.mocked(getOAuthApiKey);

		const initialCreds = {
			type: "oauth",
			access: "old-access",
			refresh: "old-refresh",
			expires: Date.now() - 1000, // expired
		};

		const backend = new MockLockingBackend();
		backend.withLock(() => ({
			result: undefined,
			next: JSON.stringify({ "test-oauth-provider": initialCreds }, null, 2),
		}));

		const storage1 = AuthStorage.fromStorage(backend);
		const storage2 = AuthStorage.fromStorage(backend); // concurrent process

		let networkCallStarted: () => void;
		const networkCallPromise = new Promise<void>((resolve) => {
			networkCallStarted = resolve;
		});

		let networkCallFinished: () => void;
		const finishNetworkCallPromise = new Promise<void>((resolve) => {
			networkCallFinished = resolve;
		});

		mockedGetOAuthApiKey.mockImplementationOnce(async (_providerId, _creds) => {
			networkCallStarted();
			await finishNetworkCallPromise;
			return {
				apiKey: "refreshed-access",
				newCredentials: {
					access: "refreshed-access",
					refresh: "refreshed-refresh",
					expires: Date.now() + 3600000,
				},
			};
		});

		// 1. Process 1 starts refresh
		const refreshPromise = storage1.getApiKey("test-oauth-provider");

		// Wait for the network call to begin (meaning lock was acquired and then released)
		await networkCallPromise;

		// 2. Process 2 updates the credentials while Process 1 is waiting on network
		// If Process 1 still holds the lock, this would deadlock or timeout in reality,
		// but in our mock it will just block until process 1 finishes.
		// Since we want to test that Process 1 drops the lock, we can do this:
		const concurrentUpdatePromise = (async () => {
			storage2.set("test-oauth-provider", {
				type: "oauth",
				access: "concurrent-access",
				refresh: "concurrent-refresh",
				expires: Date.now() + 3600000,
			});
		})();

		await concurrentUpdatePromise;

		// 3. Process 1 finishes network call
		networkCallFinished!();
		const result = await refreshPromise;

		// 4. Verification
		// Process 1 should return the concurrent update, NOT its own refreshed result
		expect(result).toBe("concurrent-access");

		// Disk should have the concurrent update
		const finalData = JSON.parse(backend.withLock((current) => ({ result: current as string })));

		expect(finalData["test-oauth-provider"].access).toBe("concurrent-access");
		expect(finalData["test-oauth-provider"].refresh).toBe("concurrent-refresh");

		// Assert that the lock was not contended (meaning process 1 dropped it)
		expect(backend.concurrentLockAttempts).toBe(0);
	});
});
