// SPDX-License-Identifier: Nebula

import {useEffect} from 'react';

export function useDocumentClassToggle(className: string, enabled: boolean): void {
	useEffect(() => {
		const root = document.documentElement;
		root.classList.toggle(className, enabled);
		return () => {
			root.classList.remove(className);
		};
	}, [className, enabled]);
}
