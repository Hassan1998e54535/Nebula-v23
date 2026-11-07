// SPDX-License-Identifier: Nebula

import {APIErrorCodes} from '@nexus/constants/src/ApiErrorCodes';
import {ForbiddenError} from '@nexus/errors/src/domains/core/ForbiddenError';

export class GuildVerificationRequiredError extends ForbiddenError {
	constructor(detail?: string) {
		super({
			code: APIErrorCodes.GUILD_VERIFICATION_REQUIRED,
			messageVariables: detail ? {detail} : undefined,
		});
	}
}
