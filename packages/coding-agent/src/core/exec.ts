/**
 * Shared command execution utilities for extensions and custom tools.
 */

import { spawn } from "node:child_process";
import { waitForChildProcess } from "../utils/child-process.js";

/**
 * Options for executing shell commands.
 */
export interface ExecOptions {
	/** AbortSignal to cancel the command */
	signal?: AbortSignal;
	/** Timeout in milliseconds */
	timeout?: number;
	/** Working directory */
	cwd?: string;
	/**
	 * Extra env vars merged over the parent process env for this command.
	 * A key with an undefined value is unset in the child.
	 */
	env?: Record<string, string | undefined>;
	/** Max buffer size in bytes for stdout/stderr (default: 1MB) */
	maxBuffer?: number;
}

/**
 * Result of executing a shell command.
 */
export interface ExecResult {
	stdout: string;
	stderr: string;
	code: number;
	killed: boolean;
	truncated?: boolean;
}

function mergeExecEnv(env?: Record<string, string | undefined>): NodeJS.ProcessEnv | undefined {
	if (!env) {
		return undefined;
	}
	const merged: NodeJS.ProcessEnv = { ...process.env };
	for (const [key, value] of Object.entries(env)) {
		if (value === undefined) {
			delete merged[key];
		} else {
			merged[key] = value;
		}
	}
	return merged;
}

/**
 * Execute a shell command and return stdout/stderr/code.
 * Supports timeout and abort signal.
 */
export async function execCommand(
	command: string,
	args: string[],
	cwd: string,
	options?: ExecOptions,
): Promise<ExecResult> {
	return new Promise((resolve) => {
		const proc = spawn(command, args, {
			cwd,
			shell: false,
			stdio: ["ignore", "pipe", "pipe"],
			// Merge per-call env over the parent env so callers can scope vars
			// (e.g. herdr pane identity) without mutating the shared process.env.
			env: mergeExecEnv(options?.env),
		});

		const stdoutChunks: Buffer[] = [];
		let stdoutBytes = 0;
		const stderrChunks: Buffer[] = [];
		let stderrBytes = 0;
		let truncated = false;
		const maxBuffer = options?.maxBuffer ?? 1024 * 1024; // 1MB default

		let killed = false;
		let timeoutId: NodeJS.Timeout | undefined;
		let forceKillTimeoutId: NodeJS.Timeout | undefined;

		const killProcess = () => {
			if (!killed) {
				killed = true;
				proc.kill("SIGTERM");
				forceKillTimeoutId = setTimeout(() => {
					forceKillTimeoutId = undefined;
					if (proc.exitCode === null && proc.signalCode === null) {
						proc.kill("SIGKILL");
					}
				}, 5000);
			}
		};

		if (options?.signal) {
			if (options.signal.aborted) {
				killProcess();
			} else {
				options.signal.addEventListener("abort", killProcess, { once: true });
			}
		}

		if (options?.timeout && options.timeout > 0) {
			timeoutId = setTimeout(() => {
				killProcess();
			}, options.timeout);
		}

		proc.stdout?.on("data", (data: Buffer) => {
			stdoutChunks.push(data);
			stdoutBytes += data.length;
			while (stdoutBytes > maxBuffer && stdoutChunks.length > 1) {
				const removed = stdoutChunks.shift()!;
				stdoutBytes -= removed.length;
				truncated = true;
			}
			// If a single huge chunk arrives and we haven't truncated it by shifting, slice it
			if (stdoutBytes > maxBuffer && stdoutChunks.length === 1) {
				const chunk = stdoutChunks[0];
				const over = stdoutBytes - maxBuffer;
				stdoutChunks[0] = chunk.subarray(over);
				stdoutBytes = maxBuffer;
				truncated = true;
			}
		});

		proc.stderr?.on("data", (data: Buffer) => {
			stderrChunks.push(data);
			stderrBytes += data.length;
			while (stderrBytes > maxBuffer && stderrChunks.length > 1) {
				const removed = stderrChunks.shift()!;
				stderrBytes -= removed.length;
				truncated = true;
			}
			// If a single huge chunk arrives and we haven't truncated it by shifting, slice it
			if (stderrBytes > maxBuffer && stderrChunks.length === 1) {
				const chunk = stderrChunks[0];
				const over = stderrBytes - maxBuffer;
				stderrChunks[0] = chunk.subarray(over);
				stderrBytes = maxBuffer;
				truncated = true;
			}
		});

		const cleanup = () => {
			if (timeoutId) clearTimeout(timeoutId);
			if (forceKillTimeoutId) clearTimeout(forceKillTimeoutId);
			if (options?.signal) {
				options.signal.removeEventListener("abort", killProcess);
			}
		};

		// Wait for process termination without hanging on inherited stdio handles
		// held open by detached descendants.
		waitForChildProcess(proc)
			.then((code) => {
				cleanup();
				const stdout = Buffer.concat(stdoutChunks).toString("utf8");
				const stderr = Buffer.concat(stderrChunks).toString("utf8");
				resolve({ stdout, stderr, code: code ?? 0, killed, truncated });
			})
			.catch((_err) => {
				cleanup();
				const stdout = Buffer.concat(stdoutChunks).toString("utf8");
				const stderr = Buffer.concat(stderrChunks).toString("utf8");
				resolve({ stdout, stderr, code: 1, killed, truncated });
			});
	});
}
