// SPDX-License-Identifier: Nebula

import {APIErrorCodes} from '@nexus/constants/src/ApiErrorCodes';
import {ConflictError} from '@nexus/errors/src/domains/core/ConflictError';

export class ConnectionAlreadyExistsError extends ConflictError {
	constructor() {
		super({code: APIErrorCodes.CONNECTION_ALREADY_EXISTS});
	}
}
