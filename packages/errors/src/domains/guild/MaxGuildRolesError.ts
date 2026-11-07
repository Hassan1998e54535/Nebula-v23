// SPDX-License-Identifier: Nebula

import {APIErrorCodes} from '@nexus/constants/src/ApiErrorCodes';
import {BadRequestError} from '@nexus/errors/src/domains/core/BadRequestError';

export class MaxGuildRolesError extends BadRequestError {
	constructor(limit: number) {
		super({
			code: APIErrorCodes.MAX_GUILD_ROLES,
			messageVariables: {count: limit},
			data: {
				max_guild_roles: limit,
			},
		});
	}
}
