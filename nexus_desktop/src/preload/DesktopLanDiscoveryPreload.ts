// SPDX-License-Identifier: Nebula

import type {DesktopLanDiscoveredInstance, DesktopLanDiscoveryAPI} from '@nexus/desktop_ipc/src/LanDiscoveryContract';
import {DESKTOP_LAN_DISCOVERY_CHANNELS} from '@nexus/desktop_ipc/src/LanDiscoveryContract';

interface DesktopLanDiscoveryInvoker {
	invoke: (channel: string, ...args: Array<unknown>) => Promise<unknown>;
}

export function createDesktopLanDiscoveryPreloadAPI(renderer: DesktopLanDiscoveryInvoker): {
	readonly desktopLanDiscovery: DesktopLanDiscoveryAPI;
} {
	return Object.freeze({
		desktopLanDiscovery: Object.freeze<DesktopLanDiscoveryAPI>({
			scan: () => renderer.invoke(DESKTOP_LAN_DISCOVERY_CHANNELS.scan) as Promise<Array<DesktopLanDiscoveredInstance>>,
		}),
	});
}
