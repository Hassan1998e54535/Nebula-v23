// SPDX-License-Identifier: Nebula

import {APIErrorCodes} from '@nexus/constants/src/ApiErrorCodes';
import {BadRequestError} from '@nexus/errors/src/domains/core/BadRequestError';

export class CannotReportYourselfError extends BadRequestError {
	constructor() {
		super({
			code: APIErrorCodes.CANNOT_REPORT_YOURSELF,
		});
	}
}
