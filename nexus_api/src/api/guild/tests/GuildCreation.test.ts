// SPDX-License-Identifier: Nebula

import {createTestAccount} from '@app/api/auth/tests/AuthTestUtils';
import {getGuildChannels} from '@app/api/guild/tests/GuildTestUtils';
import {type ApiTestHarness, createApiTestHarness} from '@app/api/test/ApiTestHarness';
import {createBuilder} from '@app/api/test/TestRequestBuilder';
import type {GuildResponse} from '@nexus/schema/src/domains/guild/GuildResponseSchemas';
import {afterAll, beforeAll, beforeEach, describe, expect, test} from 'vitest';

describe('POST /guilds', () => {
	let harness: ApiTestHarness;

	beforeAll(async () => {
		harness = await createApiTestHarness();
	});

	beforeEach(async () => {
		await harness.reset();
	});

	afterAll(async () => {
		await harness?.shutdown();
	});

	test('allows a verified user to create and immediately retrieve a community', async () => {
		const creator = await createTestAccount(harness);
		const guild = await createBuilder<GuildResponse>(harness, creator.token)
			.post('/guilds')
			.body({name: 'Verified creator community'})
			.execute();

		const guilds = await createBuilder<Array<GuildResponse>>(harness, creator.token).get('/users/@me/guilds').execute();
		const channels = await getGuildChannels(harness, creator.token, guild.id);

		expect(guilds.some((entry) => entry.id === guild.id)).toBe(true);
		expect(channels.some((channel) => channel.id === guild.system_channel_id)).toBe(true);
	});
});
