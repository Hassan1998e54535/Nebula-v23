// SPDX-License-Identifier: Nebula

export function deferUntilModulesLoaded(setup: () => void): void {
	queueMicrotask(setup);
}
