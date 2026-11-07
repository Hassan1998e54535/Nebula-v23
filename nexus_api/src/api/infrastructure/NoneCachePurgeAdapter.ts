// SPDX-License-Identifier: Nebula

import type {CachePurgeAdapter} from '@app/api/infrastructure/CachePurgeAdapter';

export function createNoneCachePurgeAdapter(): CachePurgeAdapter {
	return {
		purge: async () => ({kind: 'purged'}),
	};
}
