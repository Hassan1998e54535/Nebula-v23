// SPDX-License-Identifier: Nebula

import {APIErrorCodes} from '@nexus/constants/src/ApiErrorCodes';
import {ForbiddenError} from '@nexus/errors/src/domains/core/ForbiddenError';

export class InvalidApiOriginError extends ForbiddenError {
	constructor() {
		super({code: APIErrorCodes.INVALID_API_ORIGIN});
	}
}
