// SPDX-License-Identifier: Nebula

import {APIErrorCodes} from '@nexus/constants/src/ApiErrorCodes';
import {BadRequestError} from '@nexus/errors/src/domains/core/BadRequestError';

export class MaxUsersPerMessageReactionError extends BadRequestError {
	constructor(limit: number) {
		super({
			code: APIErrorCodes.MAX_REACTIONS,
			messageVariables: {count: limit},
		});
	}
}
