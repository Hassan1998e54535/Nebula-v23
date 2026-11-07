// SPDX-License-Identifier: Nebula

import {APIErrorCodes} from '@nexus/constants/src/ApiErrorCodes';
import {NotFoundError} from '@nexus/errors/src/domains/core/NotFoundError';

export class ConnectionNotFoundError extends NotFoundError {
	constructor() {
		super({code: APIErrorCodes.CONNECTION_NOT_FOUND});
	}
}
