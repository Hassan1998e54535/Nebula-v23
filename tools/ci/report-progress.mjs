// Report non-secret CI evidence through a dedicated Git ref when the operator's
// API connector cannot expose private Actions runs. Never changes the source ref.
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';

export function makeProgressReport(env, phase, conclusion) {
	const runId = env.GITHUB_RUN_ID;
	const attempt = env.GITHUB_RUN_ATTEMPT || '1';
	const runner = env.RUNNER_OS;
	const repository = env.GITHUB_REPOSITORY;
	if (!/^\d+$/.test(runId || '') || !/^\d+$/.test(attempt)) {
		throw new Error('A numeric GitHub run ID and attempt are required.');
	}
	if (!['Windows', 'Linux', 'macOS'].includes(runner)) {
		throw new Error('An explicit GitHub runner OS is required.');
	}
	if (!/^[\w.-]+\/[\w.-]+$/.test(repository || '')) {
		throw new Error('An explicit GitHub repository is required.');
	}
	if (!/^[a-z-]{1,64}$/.test(phase || '') ||
		!['in_progress', 'success', 'failure', 'cancelled', 'skipped'].includes(conclusion)) {
		throw new Error('Invalid progress phase or conclusion.');
	}
	return {
		ref: `refs/heads/nexus-ci-report/${runId}-${attempt}-${runner.toLowerCase()}`,
		report: {
			schema: 1,
			phase,
			conclusion,
			runner,
			runId,
			attempt,
			runUrl: `https://github.com/${repository}/actions/runs/${runId}`,
			installerProduced: false,
		},
	};
}

export function publishProgress(env, phase, conclusion, git) {
	const {ref, report} = makeProgressReport(env, phase, conclusion);
	const existing = git(['ls-remote', '--heads', 'origin', ref]).trim();
	let parent;
	if (existing) {
		const sha = existing.split(/\s+/)[0];
		if (!/^[0-9a-f]{40}$/.test(sha)) throw new Error('Invalid prior report revision.');
		git(['fetch', '--no-tags', '--depth=1', 'origin', ref]);
		parent = sha;
	}
	const blob = git(['hash-object', '-w', '--stdin'], `${JSON.stringify(report, null, 2)}\n`).trim();
	const tree = git(['mktree'], `100644 blob ${blob}\tstatus.json\n`).trim();
	const args = ['commit-tree', tree, ...(parent ? ['-p', parent] : []),
		'-m', `Record NEXUS ${phase}: ${conclusion}`];
	const commit = git(args).trim();
	git(['push', 'origin', `${commit}:${ref}`]);
	return report;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
	const env = {
		...process.env,
		GIT_AUTHOR_NAME: 'NEXUS CI',
		GIT_COMMITTER_NAME: 'NEXUS CI',
		GIT_AUTHOR_EMAIL: 'ci@nexus.invalid',
		GIT_COMMITTER_EMAIL: 'ci@nexus.invalid',
	};
	const git = (args, input) => execFileSync('git', args, {
		input,
		encoding: 'utf8',
		env,
	});
	const report = publishProgress(env, process.argv[2], process.argv[3], git);
	console.log(JSON.stringify(report));
}
