// SPDX-License-Identifier: Nebula

import {APIErrorCodes} from '@nexus/constants/src/ApiErrorCodes';
import {NexusError} from '@nexus/errors/src/NexusError';

export class StripeInvalidProductError extends NexusError {
	constructor() {
		super({
			code: APIErrorCodes.STRIPE_INVALID_PRODUCT,
			status: 400,
		});
	}
}
