// SPDX-License-Identifier: Nebula

import {APIErrorCodes} from '@nexus/constants/src/ApiErrorCodes';
import {ForbiddenError} from '@nexus/errors/src/domains/core/ForbiddenError';

export class MissingPermissionsError extends ForbiddenError {
	constructor() {
		super({code: APIErrorCodes.MISSING_PERMISSIONS});
	}
}
