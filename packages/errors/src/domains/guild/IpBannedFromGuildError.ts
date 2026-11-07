// SPDX-License-Identifier: Nebula

import {APIErrorCodes} from '@nexus/constants/src/ApiErrorCodes';
import {ForbiddenError} from '@nexus/errors/src/domains/core/ForbiddenError';

export class IpBannedFromGuildError extends ForbiddenError {
	constructor() {
		super({code: APIErrorCodes.USER_IP_BANNED_FROM_GUILD});
	}
}
