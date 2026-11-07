// SPDX-License-Identifier: Nebula

import {APIErrorCodes} from '@nexus/constants/src/ApiErrorCodes';
import {NexusError} from '@nexus/errors/src/NexusError';

export class SearchIndexNotReadyError extends NexusError {
	constructor(retryAfterSeconds: number) {
		super({
			code: APIErrorCodes.SEARCH_INDEX_NOT_READY,
			status: 202,
			data: {
				documents_indexed: 0,
				retry_after: retryAfterSeconds,
			},
		});
	}
}
