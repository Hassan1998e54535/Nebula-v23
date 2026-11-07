// SPDX-License-Identifier: Nebula

import {BaseChannelAuthService, type ChannelAuthOptions} from '@app/api/channel/services/BaseChannelAuthService';

export class ChannelAuthService extends BaseChannelAuthService {
	protected readonly options: ChannelAuthOptions = {
		errorOnMissingGuild: 'missing_permissions',
		validateNsfw: true,
	};
}
