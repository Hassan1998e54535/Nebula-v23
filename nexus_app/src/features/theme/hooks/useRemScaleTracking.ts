// SPDX-License-Identifier: Nebula

import {startRemScaleTracking} from '@app/features/theme/layout/RemFromPx';
import {useLayoutEffect} from 'react';

export function useRemScaleTracking(): void {
	useLayoutEffect(() => startRemScaleTracking(document), []);
}
