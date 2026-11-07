// SPDX-License-Identifier: Nebula

import RuntimeConfig from '@app/features/app/state/RuntimeConfig';
import * as CodeLinkUtils from '@app/features/messaging/utils/CodeLinkUtils';

const OFFICIAL_GIFT_URL_BASES = Object.freeze([
	'https://nexus.app/gift',
	'https://canary.nexus.app/gift',
	'https://web.nexus.app/gift',
	'https://web.canary.nexus.app/gift',
	'https://nexus.com/gift',
	'https://canary.nexus.com/gift',
	'https://nexus.gift',
	'https://nexus.gift/gift',
]);
const GIFT_CONFIG: CodeLinkUtils.CodeLinkConfig = {
	path: 'gift',
	get urlBases() {
		if (RuntimeConfig.isSelfHosted()) {
			return [RuntimeConfig.giftUrlBase];
		}
		return [RuntimeConfig.giftUrlBase, ...OFFICIAL_GIFT_URL_BASES];
	},
};

export function findGifts(content: string | null): Array<string> {
	return CodeLinkUtils.findCodes(content, GIFT_CONFIG);
}

export function findSpoileredGifts(content: string | null): Array<CodeLinkUtils.CodeLinkMatch> {
	return CodeLinkUtils.findSpoileredCodeMatches(content, GIFT_CONFIG);
}
