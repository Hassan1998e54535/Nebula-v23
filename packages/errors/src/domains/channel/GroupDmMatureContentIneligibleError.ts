// SPDX-License-Identifier: Nebula

import {APIErrorCodes} from '@nexus/constants/src/ApiErrorCodes';
import {BadRequestError} from '@nexus/errors/src/domains/core/BadRequestError';

export class GroupDmMatureContentIneligibleError extends BadRequestError {
	constructor() {
		super({
			code: APIErrorCodes.GROUP_DM_MATURE_CONTENT_INELIGIBLE,
		});
	}
}
