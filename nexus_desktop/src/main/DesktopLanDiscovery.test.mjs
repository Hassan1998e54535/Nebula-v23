// SPDX-License-Identifier: Nebula

import assert from 'node:assert/strict';
import test from 'node:test';
import {parseLanDiscoveryResponse} from './DesktopLanDiscovery.ts';

const homeNetwork = [{address: 0xc0a80102, mask: 0xffffff00, broadcast: '192.168.1.255'}];

test('accepts the NEXUS discovery reply from the local subnet', () => {
	assert.deepEqual(parseLanDiscoveryResponse('NEXUS_LAN_RESPONSE_V1:8081', '192.168.1.42', homeNetwork), {
		instanceKey: 'nexus-lan:192.168.1.42:8081',
		domain: 'http://192.168.1.42:8081',
		displayName: 'NEXUS server',
	});
});

test('ignores unrelated, non-private, and off-subnet discovery replies', () => {
	assert.equal(parseLanDiscoveryResponse('other', '192.168.1.42', homeNetwork), null);
	assert.equal(parseLanDiscoveryResponse('NEXUS_LAN_RESPONSE_V1:8081', '8.8.8.8', homeNetwork), null);
	assert.equal(parseLanDiscoveryResponse('NEXUS_LAN_RESPONSE_V1:8081', '192.168.2.42', homeNetwork), null);
});
