import assert from 'node:assert/strict';
import test from 'node:test';
import {makeProgressReport, publishProgress} from './report-progress.mjs';

const env = {
	GITHUB_RUN_ID: '123',
	GITHUB_RUN_ATTEMPT: '1',
	GITHUB_REPOSITORY: 'owner/private-project',
	RUNNER_OS: 'Windows',
	UNRELATED_SECRET: 'must-not-be-reported',
};

test('reports evidence, not a fictitious installer or arbitrary environment', () => {
	const {ref, report} = makeProgressReport(env, 'environment-started', 'in_progress');
	assert.equal(ref, 'refs/heads/nexus-ci-report/123-1-windows');
	assert.equal(report.installerProduced, false);
	assert.equal(report.runUrl, 'https://github.com/owner/private-project/actions/runs/123');
	assert.ok(!JSON.stringify(report).includes(env.UNRELATED_SECRET));
});

test('rejects malformed refs and unsupported conclusions', () => {
	assert.throws(() => makeProgressReport({...env, GITHUB_RUN_ID: '../main'}, 'started', 'success'));
	assert.throws(() => makeProgressReport({...env, RUNNER_OS: 'main'}, 'started', 'success'));
	assert.throws(() => makeProgressReport(env, 'started', 'ready-for-download'));
});

test('only pushes a dedicated report branch and never checks out or rewrites source', () => {
	const calls = [];
	const git = (args, input) => {
		calls.push({args, input});
		if (args[0] === 'ls-remote') return '';
		return `${'a'.repeat(40)}\n`;
	};
	publishProgress(env, 'environment-completed', 'success', git);
	assert.deepEqual(calls.at(-1).args, [
		'push', 'origin', `${'a'.repeat(40)}:refs/heads/nexus-ci-report/123-1-windows`,
	]);
	assert.ok(!calls.some(({args}) => ['checkout', 'switch', 'reset', 'clean'].includes(args[0])));
	assert.ok(!calls.some(({args}) => args.includes('--force')));
});

test('updates the same run with an ancestor instead of force pushing', () => {
	const calls = [];
	const parent = 'b'.repeat(40);
	const git = (args) => {
		calls.push(args);
		if (args[0] === 'ls-remote') return `${parent}\trefs/heads/nexus-ci-report/123-1-windows\n`;
		return `${'a'.repeat(40)}\n`;
	};
	publishProgress(env, 'environment-completed', 'failure', git);
	assert.ok(calls.some((args) => args[0] === 'fetch'));
	assert.ok(calls.some((args) => args[0] === 'commit-tree' && args.includes(parent)));
});
