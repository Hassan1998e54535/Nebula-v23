// SPDX-License-Identifier: Nebula

import type {IThreadSearchService} from '@app/api/search/IThreadSearchService';
import {SearchAdapterServiceBase} from '@app/api/search/SearchAdapterServiceBase';
import type {ISearchAdapter} from '@nexus/schema/src/contracts/search/SearchAdapterTypes';
import type {SearchableThread, ThreadSearchFilters} from '@nexus/schema/src/contracts/search/SearchDocumentTypes';

export class ThreadSearchIndex
	extends SearchAdapterServiceBase<
		ThreadSearchFilters,
		SearchableThread,
		ISearchAdapter<ThreadSearchFilters, SearchableThread>
	>
	implements IThreadSearchService
{
	private initializing: Promise<void> | null = null;

	constructor(adapter: ISearchAdapter<ThreadSearchFilters, SearchableThread>) {
		super(adapter);
	}

	ready(): Promise<void> {
		if (this.isAvailable()) return Promise.resolve();
		this.initializing ??= this.initialize().catch((error) => {
			this.initializing = null;
			throw error;
		});
		return this.initializing;
	}
}
