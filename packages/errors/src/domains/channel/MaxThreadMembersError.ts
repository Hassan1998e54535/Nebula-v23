// SPDX-License-Identifier: Nebula

import {APIErrorCodes} from '@nexus/constants/src/ApiErrorCodes';
import {BadRequestError} from '@nexus/errors/src/domains/core/BadRequestError';

export class MaxThreadMembersError extends BadRequestError {
	constructor(limit: number) {
		super({
			code: APIErrorCodes.MAX_THREAD_MEMBERS,
			messageVariables: {count: limit},
			data: {
				max_thread_members: limit,
			},
		});
	}
}
