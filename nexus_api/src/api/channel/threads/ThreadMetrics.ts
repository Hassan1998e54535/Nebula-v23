// SPDX-License-Identifier: Nebula

import {registerCounter, registerGauge, registerHistogram} from '@nexus/hono/src/middleware/Metrics';

let sweepLagSeconds = 0;

export const threadsCreatedTotal = registerCounter(
	'nexus_api_threads_created_total',
	'Threads created, by kind and channel type',
);
export const threadsArchivedTotal = registerCounter('nexus_api_threads_archived_total', 'Threads archived, by reason');
export const threadArchiveSweepBatch = registerHistogram(
	'nexus_api_thread_archive_sweep_batch',
	'Threads archived per auto-archive sweep tick',
	[0, 1, 10, 50, 100, 200],
);
registerGauge(
	'nexus_api_thread_archive_sweep_lag_seconds',
	'Age of the oldest overdue thread seen by the last auto-archive sweep',
	() => sweepLagSeconds,
);
export const threadMemberAutojoinTotal = registerCounter(
	'nexus_api_thread_member_autojoin_total',
	'Thread members added automatically, by source',
);
export const threadSearchIndexEnqueueCappedTotal = registerCounter(
	'nexus_api_thread_search_index_enqueue_capped_total',
	'Guild searches whose channel index enqueue was capped',
);
export const threadRoleMentionCappedTotal = registerCounter(
	'nexus_api_thread_role_mention_capped_total',
	'Thread messages whose role mentions hit the member add cap',
);

export function setThreadArchiveSweepLag(seconds: number): void {
	sweepLagSeconds = Math.max(0, seconds);
}
