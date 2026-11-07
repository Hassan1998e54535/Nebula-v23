// SPDX-License-Identifier: Nebula

import {APIErrorCodes} from '@nexus/constants/src/ApiErrorCodes';
import {ConflictError} from '@nexus/errors/src/domains/core/ConflictError';

export class ReportFlowOutdatedError extends ConflictError {
	constructor() {
		super({
			code: APIErrorCodes.REPORT_FLOW_OUTDATED,
		});
	}
}
