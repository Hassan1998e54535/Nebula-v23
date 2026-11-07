// SPDX-License-Identifier: Nebula

import {APIErrorCodes} from '@nexus/constants/src/ApiErrorCodes';
import {BadRequestError} from '@nexus/errors/src/domains/core/BadRequestError';

export class MfaNotDisabledError extends BadRequestError {
	constructor() {
		super({code: APIErrorCodes.TWO_FA_NOT_ENABLED});
	}
}
