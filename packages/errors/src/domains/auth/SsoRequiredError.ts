// SPDX-License-Identifier: Nebula

import {APIErrorCodes} from '@nexus/constants/src/ApiErrorCodes';
import {ForbiddenError} from '@nexus/errors/src/domains/core/ForbiddenError';

export class SsoRequiredError extends ForbiddenError {
	constructor() {
		super({code: APIErrorCodes.SSO_REQUIRED});
		this.name = 'SsoRequiredError';
	}
}
