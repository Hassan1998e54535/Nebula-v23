// SPDX-License-Identifier: Nebula

import {OAuth2Error} from '@nexus/errors/src/domains/auth/OAuth2Error';

export class InvalidGrantError extends OAuth2Error {
	constructor(message = 'The provided authorization grant is invalid, expired, or revoked') {
		super({error: 'invalid_grant', errorDescription: message, status: 400});
	}
}
