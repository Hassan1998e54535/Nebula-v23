// SPDX-License-Identifier: Nebula

import {APIErrorCodes} from '@nexus/constants/src/ApiErrorCodes';
import {ForbiddenError} from '@nexus/errors/src/domains/core/ForbiddenError';

export class StripeRefundOutsideWindowError extends ForbiddenError {
	constructor() {
		super({
			code: APIErrorCodes.STRIPE_REFUND_OUTSIDE_WINDOW,
		});
	}
}
