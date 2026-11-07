// SPDX-License-Identifier: Nebula

import {APIErrorCodes} from '@nexus/constants/src/ApiErrorCodes';
import {BadRequestError} from '@nexus/errors/src/domains/core/BadRequestError';

export class UserOwnsGuildsError extends BadRequestError {
	constructor() {
		super({
			code: APIErrorCodes.USER_OWNS_GUILDS,
		});
	}
}
