// SPDX-License-Identifier: Nebula

import {OAuth2Error} from '@nexus/errors/src/domains/auth/OAuth2Error';

export class InvalidScopeError extends OAuth2Error {
	constructor(message = 'The requested scope is invalid or unsupported') {
		super({error: 'invalid_scope', errorDescription: message, status: 400});
	}
}
