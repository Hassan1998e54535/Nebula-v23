// SPDX-License-Identifier: Nebula

import {APIErrorCodes} from '@nexus/constants/src/ApiErrorCodes';
import {BadRequestError} from '@nexus/errors/src/domains/core/BadRequestError';

export class MfaNotEnabledError extends BadRequestError {
	constructor() {
		super({code: APIErrorCodes.TWO_FACTOR_REQUIRED});
	}
}
