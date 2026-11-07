// SPDX-License-Identifier: Nebula

import {APIErrorCodes} from '@nexus/constants/src/ApiErrorCodes';
import {BadRequestError} from '@nexus/errors/src/domains/core/BadRequestError';

export class MaxGuildInvitesError extends BadRequestError {
	constructor(limit: number) {
		super({
			code: APIErrorCodes.MAX_INVITES,
			messageVariables: {count: limit},
			data: {
				max_guild_invites: limit,
			},
		});
	}
}
