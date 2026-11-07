// SPDX-License-Identifier: Nebula

import {APIErrorCodes} from '@nexus/constants/src/ApiErrorCodes';
import {BadRequestError} from '@nexus/errors/src/domains/core/BadRequestError';

export class MaxGroupDmRecipientsError extends BadRequestError {
	constructor(limit: number) {
		super({
			code: APIErrorCodes.MAX_GROUP_DM_RECIPIENTS,
			messageVariables: {count: limit},
			data: {
				max_recipients: limit,
			},
		});
	}
}
