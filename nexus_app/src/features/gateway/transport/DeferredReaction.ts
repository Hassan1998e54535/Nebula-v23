// SPDX-License-Identifier: Nebula

import {deferUntilModulesLoaded} from '@app/features/platform/utils/DeferUntilModulesLoaded';
import type {IReactionDisposer} from 'mobx';

export function installDeferredReaction(create: () => IReactionDisposer): () => void {
	let disposer: IReactionDisposer | null = null;
	let disposed = false;
	deferUntilModulesLoaded(() => {
		if (!disposed) {
			disposer = create();
		}
	});
	return () => {
		disposed = true;
		disposer?.();
		disposer = null;
	};
}
