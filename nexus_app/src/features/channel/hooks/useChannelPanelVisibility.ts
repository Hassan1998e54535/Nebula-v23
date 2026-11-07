// SPDX-License-Identifier: Nebula

import {ComponentBus} from '@app/features/platform/utils/ComponentBus';
import {useEffect, useRef} from 'react';

export function useChannelPanelVisibility(channelId: string | null, visible: boolean): void {
	const previousVisibilityRef = useRef({channelId, visible});
	useEffect(() => {
		const previousVisibility = previousVisibilityRef.current;
		previousVisibilityRef.current = {channelId, visible};
		if (!channelId) return;
		if (previousVisibility.channelId === channelId && previousVisibility.visible === visible) return;
		ComponentBus.dispatch('LAYOUT_RESIZED', {channelId});
	}, [channelId, visible]);
}
