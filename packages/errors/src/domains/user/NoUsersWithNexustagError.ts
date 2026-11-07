// SPDX-License-Identifier: Nebula

import {APIErrorCodes} from '@nexus/constants/src/ApiErrorCodes';
import {BadRequestError} from '@nexus/errors/src/domains/core/BadRequestError';

export class NoUsersWithNEXUStagError extends BadRequestError {
	constructor() {
		super({
			code: APIErrorCodes.NO_USERS_WITH_NEXUSTAG_EXIST,
		});
	}
}
