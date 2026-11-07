// SPDX-License-Identifier: Nebula

import {APIErrorCodes} from '@nexus/constants/src/ApiErrorCodes';
import {BadRequestError} from '@nexus/errors/src/domains/core/BadRequestError';

export class InvalidBotFlagError extends BadRequestError {
	constructor() {
		super({code: APIErrorCodes.INVALID_BOT_FLAG});
	}
}
