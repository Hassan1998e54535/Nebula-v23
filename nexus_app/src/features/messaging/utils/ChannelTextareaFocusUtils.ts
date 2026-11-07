// SPDX-License-Identifier: Nebula

import {ComponentBus} from '@app/features/platform/utils/ComponentBus';

export function focusChannelTextareaAfterNavigation(channelId: string): void {
	const requestFocus = () => {
		ComponentBus.dispatch('FOCUS_TEXTAREA', {channelId});
	};
	window.requestAnimationFrame(requestFocus);
	window.setTimeout(requestFocus, 300);
}

export function focusChannelTextareaFromKeybind(channelId: string): void {
	ComponentBus.dispatch('FOCUS_TEXTAREA', {channelId, enterKeyboardMode: true});
}
