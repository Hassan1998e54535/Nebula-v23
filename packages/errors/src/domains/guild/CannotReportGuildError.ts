// SPDX-License-Identifier: Nebula

import {APIErrorCodes} from '@nexus/constants/src/ApiErrorCodes';
import {ForbiddenError} from '@nexus/errors/src/domains/core/ForbiddenError';

export class CannotReportGuildError extends ForbiddenError {
	constructor() {
		super({
			code: APIErrorCodes.CANNOT_REPORT_GUILD,
		});
	}
}
