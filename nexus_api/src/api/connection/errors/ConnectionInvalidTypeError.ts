// SPDX-License-Identifier: Nebula

import {APIErrorCodes} from '@nexus/constants/src/ApiErrorCodes';
import {BadRequestError} from '@nexus/errors/src/domains/core/BadRequestError';

export class ConnectionInvalidTypeError extends BadRequestError {
	constructor() {
		super({code: APIErrorCodes.CONNECTION_INVALID_TYPE});
	}
}
