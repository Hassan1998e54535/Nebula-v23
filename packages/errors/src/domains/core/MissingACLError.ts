// SPDX-License-Identifier: Nebula

import {APIErrorCodes} from '@nexus/constants/src/ApiErrorCodes';
import {ForbiddenError} from '@nexus/errors/src/domains/core/ForbiddenError';

export class MissingACLError extends ForbiddenError {
	constructor(requiredACL: string) {
		super({
			code: APIErrorCodes.MISSING_ACL,
			messageVariables: {requiredACL},
		});
	}
}
