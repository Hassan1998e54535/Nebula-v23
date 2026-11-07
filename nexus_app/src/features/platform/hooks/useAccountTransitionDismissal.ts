// SPDX-License-Identifier: Nebula

import {AccountScopedWork} from '@app/features/platform/state/AccountScopedWork';
import {useEffect, useRef} from 'react';

export function useAccountTransitionDismissal(active: boolean, dismiss: () => void): void {
	const dismissRef = useRef(dismiss);
	dismissRef.current = dismiss;
	useEffect(() => {
		if (!active) return undefined;
		return AccountScopedWork.registerCancellation(() => dismissRef.current());
	}, [active]);
}
