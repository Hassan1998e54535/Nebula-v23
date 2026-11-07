// SPDX-License-Identifier: Nebula

import {APIErrorCodes} from '@nexus/constants/src/ApiErrorCodes';
import {BadRequestError} from '@nexus/errors/src/domains/core/BadRequestError';

export class IpAuthorizationResendLimitExceededError extends BadRequestError {
	constructor() {
		super({code: APIErrorCodes.IP_AUTHORIZATION_RESEND_LIMIT_EXCEEDED});
	}
}
