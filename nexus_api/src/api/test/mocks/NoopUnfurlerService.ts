// SPDX-License-Identifier: Nebula

import type {MediaProxyNsfwMode} from '@app/api/infrastructure/IMediaService';
import {IUnfurlerService, type UnfurlOptions, type UnfurlResult} from '@app/api/infrastructure/IUnfurlerService';

export class NoopUnfurlerService extends IUnfurlerService {
	override async unfurlWithCachePolicy(
		_url: string,
		_nsfwMode?: MediaProxyNsfwMode,
		_options?: UnfurlOptions,
	): Promise<UnfurlResult> {
		return {embeds: [], cacheTtlSeconds: null};
	}
}
