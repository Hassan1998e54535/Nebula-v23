// SPDX-License-Identifier: Nebula

import {APIErrorCodes} from '@nexus/constants/src/ApiErrorCodes';
import {BadRequestError} from '@nexus/errors/src/domains/core/BadRequestError';

export class NoTagsAvailableToNonModeratorsError extends BadRequestError {
	constructor() {
		super({
			code: APIErrorCodes.NO_TAGS_AVAILABLE_TO_NON_MODERATORS,
		});
	}
}
