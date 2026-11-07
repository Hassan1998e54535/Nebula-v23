// SPDX-License-Identifier: Nebula

import {APIErrorCodes} from '@nexus/constants/src/ApiErrorCodes';
import {ForbiddenError} from '@nexus/errors/src/domains/core/ForbiddenError';

export class NewConversationsLimitedError extends ForbiddenError {
	constructor() {
		super({code: APIErrorCodes.NEW_CONVERSATIONS_LIMITED});
	}
}
