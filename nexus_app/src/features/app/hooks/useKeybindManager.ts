// SPDX-License-Identifier: Nebula

import KeybindManager from '@app/features/app/keybindings/KeybindManager';
import type {I18n} from '@lingui/core';
import {useEffect} from 'react';

export function useKeybindManager(i18n: I18n): void {
	useEffect(() => {
		void KeybindManager.init(i18n);
		return () => {
			KeybindManager.destroy();
		};
	}, [i18n]);
}
