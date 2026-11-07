// SPDX-License-Identifier: Nebula

import {APIErrorCodes} from '@nexus/constants/src/ApiErrorCodes';
import {BadRequestError} from '@nexus/errors/src/domains/core/BadRequestError';

export class EmailUnavailableOnInstanceError extends BadRequestError {
	constructor() {
		super({code: APIErrorCodes.EMAIL_UNAVAILABLE_ON_INSTANCE});
	}
}
