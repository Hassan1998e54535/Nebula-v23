// SPDX-License-Identifier: Nebula

import {APIErrorCodes} from '@nexus/constants/src/ApiErrorCodes';
import {BadRequestError} from '@nexus/errors/src/domains/core/BadRequestError';

export class BotsCannotCreateGuildsError extends BadRequestError {
	constructor() {
		super({code: APIErrorCodes.BOTS_CANNOT_CREATE_GUILDS});
	}
}
