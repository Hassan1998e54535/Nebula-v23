// SPDX-License-Identifier: Nebula

import {APIErrorCodes} from '@nexus/constants/src/ApiErrorCodes';
import {BadRequestError} from '@nexus/errors/src/domains/core/BadRequestError';

export class CannotBlockSystemUserError extends BadRequestError {
	constructor() {
		super({
			code: APIErrorCodes.CANNOT_BLOCK_SYSTEM_USER,
		});
	}
}
