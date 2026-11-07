// SPDX-License-Identifier: Nebula

import {APIErrorCodes} from '@nexus/constants/src/ApiErrorCodes';
import {BadRequestError} from '@nexus/errors/src/domains/core/BadRequestError';

export class GuildTemplateInvalidError extends BadRequestError {
	constructor() {
		super({code: APIErrorCodes.GUILD_TEMPLATE_INVALID});
	}
}
