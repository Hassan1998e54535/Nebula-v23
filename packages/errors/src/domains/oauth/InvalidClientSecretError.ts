// SPDX-License-Identifier: Nebula

import {OAuth2Error} from '@nexus/errors/src/domains/auth/OAuth2Error';

export class InvalidClientSecretError extends OAuth2Error {
	constructor(message = 'Invalid client_secret') {
		super({error: 'invalid_client', errorDescription: message, status: 400});
	}
}
