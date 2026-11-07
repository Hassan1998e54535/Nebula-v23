// SPDX-License-Identifier: Nebula

import {MessageEmbedResponse} from '@nexus/schema/src/domains/message/EmbedSchemas';
import {URLType} from '@nexus/schema/src/primitives/UrlValidators';
import {z} from 'zod';

export const UnfurlRequest = z.object({
	url: URLType.describe('The URL to unfurl'),
});

export type UnfurlRequest = z.infer<typeof UnfurlRequest>;

export const UnfurlResponse = z.array(MessageEmbedResponse).describe('The embeds resolved by the unfurler');

export type UnfurlResponse = z.infer<typeof UnfurlResponse>;
