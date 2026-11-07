// SPDX-License-Identifier: Nebula

import {DesktopLegacyImportPhase} from '@nexus/desktop_ipc/src/StorageContract';

let bootPhase: DesktopLegacyImportPhase | null = null;

export function recordDesktopLegacyImportPhase(phase: DesktopLegacyImportPhase | null): void {
	bootPhase = phase;
}

export function desktopLegacyImportIsComplete(): boolean {
	return bootPhase === DesktopLegacyImportPhase.DONE;
}
