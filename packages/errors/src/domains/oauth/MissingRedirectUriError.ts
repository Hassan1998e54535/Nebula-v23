// SPDX-License-Identifier: Nebula

import {OAuth2Error} from '@nexus/errors/src/domains/auth/OAuth2Error';

export class MissingRedirectUriError extends OAuth2Error {
	constructor(message = 'Missing redirect_uri') {
		super({error: 'invalid_request', errorDescription: message, status: 400});
	}
}
