// SPDX-License-Identifier: Nebula

import {NotFound} from '@app/features/platform/components/router/RouterTypes';

export function notFound(message?: string): NotFound {
	return new NotFound(message);
}
