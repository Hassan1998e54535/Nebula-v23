// SPDX-License-Identifier: Nebula

import {handleExternalLinkAuxClick} from '@app/features/messaging/utils/ExternalLinkUtils';
import type React from 'react';
import {useMemo} from 'react';

interface MiddleClickOpenHandlers {
	onAuxClick: (event: React.MouseEvent) => void;
}

export function useOpenInBrowserOnMiddleClick(url: string | null | undefined, enabled = true): MiddleClickOpenHandlers {
	return useMemo<MiddleClickOpenHandlers>(
		() => ({
			onAuxClick: (event) => {
				if (enabled) handleExternalLinkAuxClick(event, url);
			},
		}),
		[url, enabled],
	);
}
