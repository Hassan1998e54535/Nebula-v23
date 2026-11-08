// SPDX-License-Identifier: Nebula

export const DESKTOP_LAN_DISCOVERY_CHANNELS = Object.freeze({
	scan: 'desktop-lan-discovery:scan',
});

export interface DesktopLanDiscoveredInstance {
	readonly instanceKey: string;
	readonly domain: string;
	readonly displayName: string;
}

export interface DesktopLanDiscoveryAPI {
	scan: () => Promise<Array<DesktopLanDiscoveredInstance>>;
}
