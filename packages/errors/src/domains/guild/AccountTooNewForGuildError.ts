// SPDX-License-Identifier: Nebula

import {APIErrorCodes} from '@nexus/constants/src/ApiErrorCodes';
import {ForbiddenError} from '@nexus/errors/src/domains/core/ForbiddenError';

export class AccountTooNewForGuildError extends ForbiddenError {
	constructor() {
		super({
			code: APIErrorCodes.ACCOUNT_TOO_NEW_FOR_GUILD,
		});
	}
}
