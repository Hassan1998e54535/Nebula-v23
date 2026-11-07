// SPDX-License-Identifier: Nebula

import {APIErrorCodes} from '@nexus/constants/src/ApiErrorCodes';
import {BadRequestError} from '@nexus/errors/src/domains/core/BadRequestError';

export class MaxPinnedThreadsInForumError extends BadRequestError {
	constructor(limit: number) {
		super({
			code: APIErrorCodes.MAX_PINNED_THREADS_IN_FORUM,
			messageVariables: {count: limit},
			data: {
				max_pinned_threads: limit,
			},
		});
	}
}
