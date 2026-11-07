// SPDX-License-Identifier: Nebula

import {APIErrorCodes} from '@nexus/constants/src/ApiErrorCodes';
import {ConflictError} from '@nexus/errors/src/domains/core/ConflictError';

export class AccountIdentityLockedError extends ConflictError {
	constructor() {
		super({code: APIErrorCodes.ACCOUNT_IDENTITY_LOCKED});
	}
}
