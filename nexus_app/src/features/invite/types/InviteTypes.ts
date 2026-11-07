// SPDX-License-Identifier: Nebula

import {InviteTypes} from '@nexus/constants/src/ChannelConstants';
import type {GroupDmInvite, GuildInvite, Invite} from '@nexus/schema/src/domains/invite/InviteSchemas';
export const isGuildInvite = (invite: Invite): invite is GuildInvite => invite.type === InviteTypes.GUILD;
export const isGroupDmInvite = (invite: Invite): invite is GroupDmInvite => invite.type === InviteTypes.GROUP_DM;
