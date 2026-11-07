// SPDX-License-Identifier: Nebula

import {APIErrorCodes} from '@nexus/constants/src/ApiErrorCodes';
import {BadRequestError} from '@nexus/errors/src/domains/core/BadRequestError';

export class UserNotInVoiceError extends BadRequestError {
	constructor() {
		super({
			code: APIErrorCodes.USER_NOT_IN_VOICE,
		});
	}
}
