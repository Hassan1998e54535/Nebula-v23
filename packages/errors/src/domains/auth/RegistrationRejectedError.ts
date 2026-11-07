// SPDX-License-Identifier: Nebula

import {APIErrorCodes} from '@nexus/constants/src/ApiErrorCodes';
import {ForbiddenError} from '@nexus/errors/src/domains/core/ForbiddenError';

export class RegistrationRejectedError extends ForbiddenError {
	constructor() {
		super({code: APIErrorCodes.REGISTRATION_REJECTED});
		this.name = 'RegistrationRejectedError';
	}
}
