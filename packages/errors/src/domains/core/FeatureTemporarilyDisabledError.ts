// SPDX-License-Identifier: Nebula

import {APIErrorCodes} from '@nexus/constants/src/ApiErrorCodes';
import {ForbiddenError} from '@nexus/errors/src/domains/core/ForbiddenError';

export class FeatureTemporarilyDisabledError extends ForbiddenError {
	constructor() {
		super({code: APIErrorCodes.FEATURE_TEMPORARILY_DISABLED});
	}
}
