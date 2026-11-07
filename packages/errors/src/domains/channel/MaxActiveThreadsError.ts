// SPDX-License-Identifier: Nebula

import {APIErrorCodes} from '@nexus/constants/src/ApiErrorCodes';
import {BadRequestError} from '@nexus/errors/src/domains/core/BadRequestError';

export class MaxActiveThreadsError extends BadRequestError {
	constructor(limit: number) {
		super({
			code: APIErrorCodes.MAX_ACTIVE_THREADS,
			messageVariables: {count: limit},
			data: {
				max_active_threads: limit,
			},
		});
	}
}
