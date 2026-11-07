// SPDX-License-Identifier: Nebula

import {APIErrorCodes} from '@nexus/constants/src/ApiErrorCodes';
import {NexusError} from '@nexus/errors/src/NexusError';

export class AgeVerificationAlreadyVerifiedError extends NexusError {
	constructor() {
		super({
			code: APIErrorCodes.AGE_VERIFICATION_ALREADY_VERIFIED,
			status: 400,
		});
	}
}
