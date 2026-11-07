// SPDX-License-Identifier: Nebula

import type {FeatureDiscoveryIllustration, FeatureDiscoveryTour} from '@app/features/onboarding/state/FeatureDiscovery';
import type {I18n} from '@lingui/core';
import {msg} from '@lingui/core/macro';

const WELCOME_TITLE = msg({
	message: 'Welcome to NEXUS',
	comment: 'Title in the first-run NEXUS feature discovery tour.',
});
const WELCOME_DESCRIPTION = msg({
	message: 'Bring your conversations, communities, and voice together in one place.',
	comment: 'Introduction to NEXUS in the first-run feature discovery tour.',
});
const NAVIGATION_MOBILE_TITLE = msg({
	message: 'Your profile and notifications',
	comment: 'Mobile navigation step title in the NEXUS feature discovery tour.',
});
const NAVIGATION_MOBILE_DESCRIPTION = msg({
	message: 'Open your profile and settings here, and check your notifications from the bell.',
	comment: 'Mobile navigation step description in the NEXUS feature discovery tour.',
});
const NAVIGATION_DESKTOP_TITLE = msg({
	message: 'Your communities',
	comment: 'Desktop navigation step title in the NEXUS feature discovery tour.',
});
const NAVIGATION_DESKTOP_DESCRIPTION = msg({
	message: 'Your direct messages and communities are organized in this navigation rail.',
	comment: 'Desktop navigation step description in the NEXUS feature discovery tour.',
});
const EXPLORE_TITLE = msg({
	message: 'Explore communities',
	comment: 'Feature discovery title shown when the user opens community discovery for the first time.',
});
const EXPLORE_DESCRIPTION = msg({
	message: 'Find communities to join and explore new conversations.',
	comment: 'Feature discovery description shown when the user opens community discovery for the first time.',
});
const PROFILE_TITLE = msg({
	message: 'Make your profile yours',
	comment: 'Title for the first-use tour shown when a user opens their own profile.',
});
const PROFILE_DESCRIPTION = msg({
	message: 'Update your photo and profile details so friends can recognize you.',
	comment: 'Description for the first-use tour shown when a user opens their own profile.',
});
const MOBILE_STATUS_ACCESS_TITLE = msg({
	message: 'Find your status on your phone',
	comment: 'Title explaining how to open presence choices from the mobile navigation.',
});
const MOBILE_STATUS_ACCESS_DESCRIPTION = msg({
	message: 'Long-press your avatar in the bottom navigation to open account actions and choose your status.',
	comment: 'Description explaining how to open presence choices from the mobile navigation.',
});
const STATUS_TITLE = msg({
	message: 'Choose how you appear',
	comment: 'Title for the first-use online-status tour.',
});
const STATUS_DESCRIPTION = msg({
	message: 'Choose Online, Idle, Do Not Disturb, or Invisible. Invisible makes you appear offline.',
	comment: 'Description for the first-use online-status tour.',
});
const CREATE_COMMUNITY_TITLE = msg({
	message: 'Create your community',
	comment: 'Title for the first step of the create-community tour.',
});
const CREATE_COMMUNITY_DESCRIPTION = msg({
	message: 'Choose a name and optional picture. You can adjust the details after it is created.',
	comment: 'Description for the first step of the create-community tour.',
});
const CREATE_COMMUNITY_ACTION_TITLE = msg({
	message: 'Ready to bring people together?',
	comment: 'Title for the second step of the create-community tour.',
});
const CREATE_COMMUNITY_ACTION_DESCRIPTION = msg({
	message: 'Create the community here. You can invite people and add spaces once it opens.',
	comment: 'Description for the second step of the create-community tour.',
});
const COMMUNITY_CREATED_TITLE = msg({
	message: 'Your community is ready',
	comment: 'Title for the first-use tour shown after a community is successfully created.',
});
const COMMUNITY_CREATED_DESCRIPTION = msg({
	message: 'Open a channel to start a conversation. Use the community menu to invite people or adjust settings.',
	comment: 'Description for the first-use tour shown after a community is successfully created.',
});
const JOIN_COMMUNITY_TITLE = msg({
	message: 'Join a community',
	comment: 'Title for the first-use join-community tour.',
});
const JOIN_COMMUNITY_DESCRIPTION = msg({
	message: 'Paste an invite link or code here. After joining, you will see the community channels.',
	comment: 'Description for the first-use join-community tour.',
});
const GROUP_CHAT_TITLE = msg({
	message: 'Start a group conversation',
	comment: 'Title for the first-use group-chat tour.',
});
const GROUP_CHAT_DESCRIPTION = msg({
	message: 'Search for friends, select the people you want to include, then create the group.',
	comment: 'Description for the first-use group-chat tour.',
});
const COMMUNITY_SETTINGS_TITLE = msg({
	message: 'Manage your community',
	comment: 'Title for the first-use community-settings tour.',
});
const COMMUNITY_SETTINGS_DESCRIPTION = msg({
	message: 'Community settings bring together its details, members, roles, channels, and safety controls.',
	comment: 'Description for the first-use community-settings tour.',
});

function createOneStepTour(
	i18n: I18n,
	id: string,
	title: ReturnType<typeof msg>,
	description: ReturnType<typeof msg>,
	illustration: FeatureDiscoveryIllustration,
	presentation: 'center' | 'spotlight' | 'bottom-sheet',
	targetSelector?: string,
): FeatureDiscoveryTour {
	return {
		id,
		steps: [
			{
				title: i18n._(title),
				description: i18n._(description),
				illustration,
				presentation,
				...(targetSelector ? {targetSelector} : {}),
			},
		],
	};
}

export function createWelcomeFeatureTour(i18n: I18n, isMobile: boolean): FeatureDiscoveryTour {
	return {
		id: 'welcome-v1',
		steps: [
			{
				title: i18n._(WELCOME_TITLE),
				description: i18n._(WELCOME_DESCRIPTION),
				illustration: 'welcome',
				presentation: isMobile ? 'bottom-sheet' : 'center',
			},
			{
				title: i18n._(isMobile ? NAVIGATION_MOBILE_TITLE : NAVIGATION_DESKTOP_TITLE),
				description: i18n._(isMobile ? NAVIGATION_MOBILE_DESCRIPTION : NAVIGATION_DESKTOP_DESCRIPTION),
				illustration: 'profile',
				targetSelector: '[data-feature-discovery-target="navigation"]',
				presentation: isMobile ? 'center' : 'spotlight',
			},
		],
	};
}

export function createExploreCommunitiesFeatureTour(i18n: I18n): FeatureDiscoveryTour {
	return {
		id: 'explore-communities-v1',
		steps: [
			{
				title: i18n._(EXPLORE_TITLE),
				description: i18n._(EXPLORE_DESCRIPTION),
				illustration: 'community-join',
				targetSelector: '[data-feature-discovery-target="explore-communities"]',
				presentation: 'spotlight',
			},
		],
	};
}

export function createProfileFeatureTour(i18n: I18n, isMobile: boolean): FeatureDiscoveryTour {
	return {
		id: 'profile-v1',
		steps: [
			{
				title: i18n._(PROFILE_TITLE),
				description: i18n._(PROFILE_DESCRIPTION),
				illustration: 'profile',
				...(!isMobile ? {targetSelector: '[data-feature-discovery-target="own-profile-card"]'} : {}),
				presentation: isMobile ? 'bottom-sheet' : 'spotlight',
			},
			...(isMobile
				? [
						{
							title: i18n._(MOBILE_STATUS_ACCESS_TITLE),
							description: i18n._(MOBILE_STATUS_ACCESS_DESCRIPTION),
							illustration: 'presence' as const,
							presentation: 'bottom-sheet' as const,
						},
					]
				: []),
		],
	};
}

export function createStatusFeatureTour(i18n: I18n, isMobile: boolean): FeatureDiscoveryTour {
	return createOneStepTour(
		i18n,
		'presence-status-v1',
		STATUS_TITLE,
		STATUS_DESCRIPTION,
		'presence',
		isMobile ? 'bottom-sheet' : 'spotlight',
		isMobile ? undefined : '[data-feature-discovery-target="presence-status-options"]',
	);
}

export function createCreateCommunityFeatureTour(i18n: I18n): FeatureDiscoveryTour {
	return {
		id: 'create-community-v1',
		steps: [
			{
				title: i18n._(CREATE_COMMUNITY_TITLE),
				description: i18n._(CREATE_COMMUNITY_DESCRIPTION),
				illustration: 'community-create',
				targetSelector: '[data-feature-discovery-target="community-create-name"]',
				presentation: 'spotlight',
			},
			{
				title: i18n._(CREATE_COMMUNITY_ACTION_TITLE),
				description: i18n._(CREATE_COMMUNITY_ACTION_DESCRIPTION),
				illustration: 'community-create',
				targetSelector: '[data-feature-discovery-target="community-create-submit"]',
				presentation: 'spotlight',
			},
		],
	};
}

export function createCommunityCreatedFeatureTour(i18n: I18n, isMobile: boolean): FeatureDiscoveryTour {
	return createOneStepTour(
		i18n,
		'community-created-v1',
		COMMUNITY_CREATED_TITLE,
		COMMUNITY_CREATED_DESCRIPTION,
		'community-create',
		isMobile ? 'bottom-sheet' : 'center',
	);
}

export function createJoinCommunityFeatureTour(i18n: I18n): FeatureDiscoveryTour {
	return createOneStepTour(
		i18n,
		'join-community-v1',
		JOIN_COMMUNITY_TITLE,
		JOIN_COMMUNITY_DESCRIPTION,
		'community-join',
		'spotlight',
		'[data-feature-discovery-target="community-join-invite"]',
	);
}

export function createGroupChatFeatureTour(i18n: I18n): FeatureDiscoveryTour {
	return createOneStepTour(
		i18n,
		'group-chat-create-v1',
		GROUP_CHAT_TITLE,
		GROUP_CHAT_DESCRIPTION,
		'group-chat',
		'spotlight',
		'[data-feature-discovery-target="group-chat-friend-search"]',
	);
}

export function createCommunitySettingsFeatureTour(i18n: I18n, isMobile: boolean): FeatureDiscoveryTour {
	return createOneStepTour(
		i18n,
		'community-settings-v1',
		COMMUNITY_SETTINGS_TITLE,
		COMMUNITY_SETTINGS_DESCRIPTION,
		'community-settings',
		isMobile ? 'bottom-sheet' : 'center',
	);
}
