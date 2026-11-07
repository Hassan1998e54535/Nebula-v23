// SPDX-License-Identifier: Nebula

import type {GuildFeature} from '@nexus/constants/src/GuildConstants';

export function mapGuildFeatures(features: ReadonlySet<string>): Array<GuildFeature> {
	return Array.from(features) as Array<GuildFeature>;
}
