// SPDX-License-Identifier: Nebula

import {APIErrorCodes} from '@nexus/constants/src/ApiErrorCodes';
import {BadRequestError} from '@nexus/errors/src/domains/core/BadRequestError';

export class ThreadAlreadyCreatedForMessageError extends BadRequestError {
	constructor() {
		super({
			code: APIErrorCodes.THREAD_ALREADY_CREATED_FOR_MESSAGE,
		});
	}
}
