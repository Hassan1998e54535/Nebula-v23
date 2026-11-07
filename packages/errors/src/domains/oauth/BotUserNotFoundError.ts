// SPDX-License-Identifier: Nebula

import {APIErrorCodes} from '@nexus/constants/src/ApiErrorCodes';
import {NotFoundError} from '@nexus/errors/src/domains/core/NotFoundError';

export class BotUserNotFoundError extends NotFoundError {
	constructor(messageVariables?: Record<string, unknown>) {
		super({
			code: APIErrorCodes.BOT_USER_NOT_FOUND,
			messageVariables,
		});
	}
}
