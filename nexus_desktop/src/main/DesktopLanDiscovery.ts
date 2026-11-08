// SPDX-License-Identifier: Nebula

import dgram from 'node:dgram';
import os from 'node:os';
import type {DesktopLanDiscoveredInstance} from '@nexus/desktop_ipc/src/LanDiscoveryContract';

const DISCOVERY_PORT = 18777;
const HTTP_PORT = 8081;
const DISCOVERY_TIMEOUT_MS = 1200;
const REQUEST = 'NEXUS_LAN_DISCOVERY_V1';
const RESPONSE = `NEXUS_LAN_RESPONSE_V1:${HTTP_PORT}`;
const DISPLAY_NAME = 'NEXUS server';

interface IPv4Network {
	readonly address: number;
	readonly mask: number;
	readonly broadcast: string;
}

function ipv4ToNumber(value: string): number | null {
	const parts = value.split('.');
	if (parts.length !== 4) {
		return null;
	}
	let result = 0;
	for (const part of parts) {
		if (!/^\d{1,3}$/.test(part)) {
			return null;
		}
		const octet = Number(part);
		if (octet < 0 || octet > 255) {
			return null;
		}
		result = ((result << 8) | octet) >>> 0;
	}
	return result;
}

function ipv4FromNumber(value: number): string {
	return [(value >>> 24) & 255, (value >>> 16) & 255, (value >>> 8) & 255, value & 255].join('.');
}

function isPrivateIPv4(value: string): boolean {
	const number = ipv4ToNumber(value);
	if (number == null) {
		return false;
	}
	const first = (number >>> 24) & 255;
	const second = (number >>> 16) & 255;
	return first === 10 || (first === 172 && second >= 16 && second <= 31) || (first === 192 && second === 168);
}

function getIPv4Networks(): Array<IPv4Network> {
	const networks: Array<IPv4Network> = [];
	for (const entries of Object.values(os.networkInterfaces())) {
		for (const entry of entries ?? []) {
			if (entry.internal || entry.family !== 'IPv4' || !isPrivateIPv4(entry.address)) {
				continue;
			}
			const address = ipv4ToNumber(entry.address);
			const mask = ipv4ToNumber(entry.netmask);
			if (address == null || mask == null || mask === 0xffffffff) {
				continue;
			}
			const broadcast = ipv4FromNumber((address & mask) | (~mask >>> 0));
			networks.push({address, mask, broadcast});
		}
	}
	return networks;
}

function isOnLocalNetwork(value: string, networks: ReadonlyArray<IPv4Network>): boolean {
	const address = ipv4ToNumber(value);
	return address != null && networks.some((network) => (address & network.mask) === (network.address & network.mask));
}

export function parseLanDiscoveryResponse(
	message: string,
	sourceAddress: string,
	networks: ReadonlyArray<IPv4Network>,
): DesktopLanDiscoveredInstance | null {
	if (message !== RESPONSE || !isPrivateIPv4(sourceAddress) || !isOnLocalNetwork(sourceAddress, networks)) {
		return null;
	}
	return {
		instanceKey: `nexus-lan:${sourceAddress}:${HTTP_PORT}`,
		domain: `http://${sourceAddress}:${HTTP_PORT}`,
		displayName: DISPLAY_NAME,
	};
}

export function discoverNexusLanInstances(
	timeoutMs = DISCOVERY_TIMEOUT_MS,
): Promise<Array<DesktopLanDiscoveredInstance>> {
	const networks = getIPv4Networks();
	if (networks.length === 0) {
		return Promise.resolve([]);
	}

	return new Promise((resolve) => {
		const socket = dgram.createSocket({type: 'udp4', reuseAddr: true});
		const found = new Map<string, DesktopLanDiscoveredInstance>();
		let timer: NodeJS.Timeout | null = null;
		let finished = false;
		let isBound = false;

		const finish = (): void => {
			if (finished) {
				return;
			}
			finished = true;
			if (timer != null) {
				clearTimeout(timer);
				timer = null;
			}
			if (isBound) {
				socket.close(() => resolve([...found.values()]));
			} else {
				resolve([...found.values()]);
			}
		};

		socket.on('error', finish);
		socket.on('message', (message, remote) => {
			const instance = parseLanDiscoveryResponse(message.toString('utf8'), remote.address, networks);
			if (instance != null) {
				found.set(instance.instanceKey, instance);
			}
		});
		socket.bind(0, '0.0.0.0', () => {
			isBound = true;
			socket.setBroadcast(true);
			timer = setTimeout(finish, Math.max(250, timeoutMs));
			const request = Buffer.from(REQUEST, 'utf8');
			for (const network of networks) {
				socket.send(request, DISCOVERY_PORT, network.broadcast, (error) => {
					if (error != null) {
						finish();
					}
				});
			}
		});
	});
}
