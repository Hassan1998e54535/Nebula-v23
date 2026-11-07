// SPDX-License-Identifier: Nebula

import {APIErrorCodes} from '@nexus/constants/src/ApiErrorCodes';
import {ConflictError} from '@nexus/errors/src/domains/core/ConflictError';

export class ReportUnderLegalHoldError extends ConflictError {
	constructor() {
		super({
			code: APIErrorCodes.REPORT_UNDER_LEGAL_HOLD,
		});
	}
}
