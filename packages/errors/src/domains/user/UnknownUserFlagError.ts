// SPDX-License-Identifier: Nebula

import {APIErrorCodes} from '@nexus/constants/src/ApiErrorCodes';
import {BadRequestError} from '@nexus/errors/src/domains/core/BadRequestError';

export class UnknownUserFlagError extends BadRequestError {
	constructor() {
		super({code: APIErrorCodes.UNKNOWN_USER_FLAG});
	}
}
