// SPDX-License-Identifier: Nebula

import {OAuth2Error} from '@nexus/errors/src/domains/auth/OAuth2Error';

export class InvalidRedirectUriError extends OAuth2Error {
	constructor(message = 'Invalid redirect_uri') {
		super({error: 'invalid_request', errorDescription: message, status: 400});
	}
}
