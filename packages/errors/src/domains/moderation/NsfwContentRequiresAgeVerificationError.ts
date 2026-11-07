// SPDX-License-Identifier: Nebula

import {APIErrorCodes} from '@nexus/constants/src/ApiErrorCodes';
import {ForbiddenError} from '@nexus/errors/src/domains/core/ForbiddenError';

export class NsfwContentRequiresAgeVerificationError extends ForbiddenError {
	constructor() {
		super({
			code: APIErrorCodes.NSFW_CONTENT_AGE_RESTRICTED,
		});
	}
}
