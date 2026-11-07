// SPDX-License-Identifier: Nebula

import {APIErrorCodes} from '@nexus/constants/src/ApiErrorCodes';
import {UnauthorizedError} from '@nexus/errors/src/domains/core/UnauthorizedError';

export class PasskeyAuthenticationFailedError extends UnauthorizedError {
	constructor() {
		super({code: APIErrorCodes.PASSKEY_AUTHENTICATION_FAILED});
	}
}
