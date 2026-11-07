// SPDX-License-Identifier: Nebula

import {APIErrorCodes} from '@nexus/constants/src/ApiErrorCodes';
import {BadRequestError} from '@nexus/errors/src/domains/core/BadRequestError';

export class CannotExecuteOnDmError extends BadRequestError {
	constructor() {
		super({code: APIErrorCodes.CANNOT_EXECUTE_ON_DM});
	}
}
