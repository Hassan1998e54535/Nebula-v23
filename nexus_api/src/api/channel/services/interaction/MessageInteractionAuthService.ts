// SPDX-License-Identifier: Nebula

import {BaseChannelAuthService, type ChannelAuthOptions} from '@app/api/channel/services/BaseChannelAuthService';

export class MessageInteractionAuthService extends BaseChannelAuthService {
	protected readonly options: ChannelAuthOptions = {
		errorOnMissingGuild: 'unknown_channel',
		validateNsfw: false,
	};
}
