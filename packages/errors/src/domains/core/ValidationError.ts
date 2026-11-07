// SPDX-License-Identifier: Nebula

import type {ValidationErrorCode} from '@nexus/constants/src/ValidationErrorCodes';
import type {ValidationErrorItem} from '@nexus/schema/src/domains/common/ErrorSchemas';

export interface ValidationError extends ValidationErrorItem {
	code?: ValidationErrorCode;
}
