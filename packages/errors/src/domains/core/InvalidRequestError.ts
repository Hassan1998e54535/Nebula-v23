// SPDX-License-Identifier: Nebula

import {APIErrorCodes} from '@nexus/constants/src/ApiErrorCodes';
import {OAuth2Error} from '@nexus/errors/src/domains/auth/OAuth2Error';

export class InvalidRequestError extends OAuth2Error {
	constructor() {
		super({error: 'invalid_request', errorDescription: APIErrorCodes.INVALID_REQUEST, status: 400});
	}
}
