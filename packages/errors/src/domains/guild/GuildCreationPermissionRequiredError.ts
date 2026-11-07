// SPDX-License-Identifier: Nebula

import {APIErrorCodes} from '@nexus/constants/src/ApiErrorCodes';
import {ForbiddenError} from '@nexus/errors/src/domains/core/ForbiddenError';

export class GuildCreationPermissionRequiredError extends ForbiddenError {
	constructor() {
		super({code: APIErrorCodes.GUILD_CREATION_PERMISSION_REQUIRED});
	}
}
