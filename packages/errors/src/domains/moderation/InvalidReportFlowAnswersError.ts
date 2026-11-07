// SPDX-License-Identifier: Nebula

import {APIErrorCodes} from '@nexus/constants/src/ApiErrorCodes';
import {BadRequestError} from '@nexus/errors/src/domains/core/BadRequestError';

export class InvalidReportFlowAnswersError extends BadRequestError {
	constructor(stepIndex: number) {
		super({
			code: APIErrorCodes.INVALID_REPORT_FLOW_ANSWERS,
			data: {
				step_index: stepIndex,
			},
		});
	}
}
