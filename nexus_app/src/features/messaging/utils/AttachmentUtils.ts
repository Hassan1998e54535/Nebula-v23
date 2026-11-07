// SPDX-License-Identifier: Nebula

import {LimitResolver} from '@app/features/app/utils/LimitResolverAdapter';
import {ATTACHMENT_MAX_SIZE_NON_PREMIUM} from '@nexus/constants/src/LimitConstants';

export function getMaxAttachmentFileSize(): number {
	return LimitResolver.resolve({
		key: 'max_attachment_file_size',
		fallback: ATTACHMENT_MAX_SIZE_NON_PREMIUM,
	});
}
