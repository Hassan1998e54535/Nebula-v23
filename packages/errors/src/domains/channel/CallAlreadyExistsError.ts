// SPDX-License-Identifier: Nebula

import {APIErrorCodes} from '@nexus/constants/src/ApiErrorCodes';
import {BadRequestError} from '@nexus/errors/src/domains/core/BadRequestError';

export class CallAlreadyExistsError extends BadRequestError {
	constructor() {
		super({
			code: APIErrorCodes.CALL_ALREADY_EXISTS,
		});
	}
}
