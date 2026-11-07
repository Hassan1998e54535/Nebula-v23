// SPDX-License-Identifier: Nebula

import {APIErrorCodes} from '@nexus/constants/src/ApiErrorCodes';
import {BadRequestError} from '@nexus/errors/src/domains/core/BadRequestError';

export class RegistrationUrlInvalidError extends BadRequestError {
	constructor() {
		super({code: APIErrorCodes.REGISTRATION_URL_INVALID});
		this.name = 'RegistrationUrlInvalidError';
	}
}
