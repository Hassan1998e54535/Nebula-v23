// SPDX-License-Identifier: Nebula

import {APIErrorCodes} from '@nexus/constants/src/ApiErrorCodes';
import {BadRequestError} from '@nexus/errors/src/domains/core/BadRequestError';

export class WebAuthnCredentialLimitReachedError extends BadRequestError {
	constructor(count = 10) {
		super({
			code: APIErrorCodes.WEBAUTHN_CREDENTIAL_LIMIT_REACHED,
			messageVariables: {count},
		});
	}
}
