// SPDX-License-Identifier: Nebula

import {APIErrorCodes} from '@nexus/constants/src/ApiErrorCodes';
import {ForbiddenError} from '@nexus/errors/src/domains/core/ForbiddenError';

export class IpAuthorizationRequiredError extends ForbiddenError {
	constructor({
		ticket,
		email,
		resendAvailableIn,
	}: {
		ticket: string;
		email: string;
		resendAvailableIn: number;
	}) {
		super({
			code: APIErrorCodes.IP_AUTHORIZATION_REQUIRED,
			data: {
				ip_authorization_required: true,
				ticket,
				email,
				resend_available_in: resendAvailableIn,
			},
		});
	}
}
