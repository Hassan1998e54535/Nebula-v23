// SPDX-License-Identifier: Nebula

import {OAuth2Error} from '@nexus/errors/src/domains/auth/OAuth2Error';

export class RedirectUriRequiredForNonBotError extends OAuth2Error {
	constructor(message = 'redirect_uri required for non-bot scopes') {
		super({error: 'invalid_request', errorDescription: message, status: 400});
	}
}
