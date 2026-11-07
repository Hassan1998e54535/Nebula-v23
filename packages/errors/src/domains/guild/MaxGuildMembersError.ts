// SPDX-License-Identifier: Nebula

import {APIErrorCodes} from '@nexus/constants/src/ApiErrorCodes';
import {BadRequestError} from '@nexus/errors/src/domains/core/BadRequestError';

export class MaxGuildMembersError extends BadRequestError {
	constructor(maxMembers: number) {
		super({
			code: APIErrorCodes.MAX_GUILD_MEMBERS,
			messageVariables: {count: maxMembers},
		});
	}
}
