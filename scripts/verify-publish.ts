import { execSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

export interface VerifyOptions {
	buildRef: string;
	productionVersion?: string;
	betaVersion?: string;
	r2Bucket?: string;
	r2EndpointUrl?: string;
	productionDir?: string;
	betaDir?: string;
}

export function runCommand(cmd: string): string {
	return execSync(cmd, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] });
}

export function verifyPublish(options: VerifyOptions) {
	const { buildRef, productionVersion, betaVersion, r2Bucket, r2EndpointUrl, productionDir, betaDir } = options;

	if (!/^[0-9a-f]{40}$/.test(buildRef)) {
		throw new Error(`BUILD_REF must be a 40-character commit SHA, got: ${buildRef}`);
	}

	const repo = process.env.GITHUB_REPOSITORY || 'PrimeIntellect-ai/prime-agent';
	let ciPassed = false;
	try {
		const result = runCommand(`gh api repos/${repo}/commits/${buildRef}/check-runs`);
		const data = JSON.parse(result);
		const gate = data.check_runs?.find((run: any) => run.name === 'build-check-test');
		if (gate && gate.conclusion === 'success') {
			ciPassed = true;
		}
	} catch (e: any) {
		throw new Error(`Failed to check CI status: ${e.message}`);
	}

	if (!ciPassed) {
		throw new Error(`CI aggregate gate 'build-check-test' did not succeed for ${buildRef}`);
	}

	const checkR2 = (version: string, localDir: string) => {
		if (!r2Bucket || !r2EndpointUrl) return;
		const prefix = `releases/v${version}`;
		let existingSums = '';
		try {
			existingSums = runCommand(`aws s3 cp s3://${r2Bucket}/${prefix}/SHA256SUMS - --endpoint-url ${r2EndpointUrl}`);
		} catch (e) {
			return; // doesn't exist
		}

		const localSums = readFileSync(join(localDir, 'SHA256SUMS'), 'utf-8');
		if (existingSums.trim() !== localSums.trim()) {
			throw new Error(`R2 checksum drift detected for v${version}`);
		}
	};

	const checkGH = (version: string, localDir: string) => {
		let existingSums = '';
		try {
			existingSums = runCommand(`gh release download v${version} -p SHA256SUMS -O -`);
		} catch (e) {
			return; // doesn't exist
		}

		const localSums = readFileSync(join(localDir, 'SHA256SUMS'), 'utf-8');
		if (existingSums.trim() !== localSums.trim()) {
			throw new Error(`GitHub release checksum drift detected for v${version}`);
		}
	};

	if (productionVersion && productionDir) {
		checkR2(productionVersion, productionDir);
		checkGH(productionVersion, productionDir);
	}

	if (betaVersion && betaDir) {
		checkR2(betaVersion, betaDir);
		checkGH(betaVersion, betaDir);
	}
}

if (import.meta.url.startsWith('file:') && process.argv[1] === new URL(import.meta.url).pathname) {
	const args = process.argv.slice(2);
	const opts: any = {};
	for (let i = 0; i < args.length; i++) {
		if (args[i] === '--build-ref') opts.buildRef = args[++i];
		else if (args[i] === '--production-version') opts.productionVersion = args[++i];
		else if (args[i] === '--beta-version') opts.betaVersion = args[++i];
		else if (args[i] === '--r2-bucket') opts.r2Bucket = args[++i];
		else if (args[i] === '--r2-endpoint') opts.r2EndpointUrl = args[++i];
		else if (args[i] === '--production-dir') opts.productionDir = args[++i];
		else if (args[i] === '--beta-dir') opts.betaDir = args[++i];
	}

	try {
		verifyPublish(opts);
		console.log('Publication invariants verified successfully.');
	} catch (e: any) {
		console.error(`Verification failed: ${e.message}`);
		process.exit(1);
	}
}
