// SPDX-License-Identifier: Nebula

import {OAuth2Error} from '@nexus/errors/src/domains/auth/OAuth2Error';

export class InvalidClientError extends OAuth2Error {
	constructor(message = 'Invalid client credentials') {
		super({error: 'invalid_client', errorDescription: message, status: 400});
	}
}
