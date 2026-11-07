// SPDX-License-Identifier: Nebula

import DeveloperOptions from '@app/features/devtools/state/DeveloperOptions';
import * as UserProfileCommands from '@app/features/user/commands/UserProfileCommands';
import type {Profile} from '@app/features/user/models/Profile';
import UserProfile from '@app/features/user/state/UserProfile';
import {useEffect, useState} from 'react';

interface UseUserProfileSurfaceStateOptions {
	userId: string;
	guildId?: string;
	enabled: boolean;
	fallbackProfile: Profile;
	onError?: (error: unknown) => void;
}

interface UserProfileSurfaceState {
	profile: Profile | null;
	profileLoadError: boolean;
	isProfileLoading: boolean;
	showProfileSkeleton: boolean;
}

const PROFILE_LOAD_DELAY_MS = 3000;

export function useUserProfileSurfaceState({
	userId,
	guildId,
	enabled,
	fallbackProfile,
	onError,
}: UseUserProfileSurfaceStateOptions): UserProfileSurfaceState {
	const cachedProfile = enabled ? UserProfile.getProfile(userId, guildId) : null;
	const [profile, setProfile] = useState<Profile | null>(() => {
		if (!enabled) {
			return fallbackProfile;
		}
		return cachedProfile;
	});
	const [profileLoadError, setProfileLoadError] = useState(false);
	const [isProfileLoading, setIsProfileLoading] = useState(() => enabled && !cachedProfile);

	useEffect(() => {
		let cancelled = false;
		if (!enabled) {
			setProfile(fallbackProfile);
			setProfileLoadError(false);
			setIsProfileLoading(false);
			return () => {
				cancelled = true;
			};
		}
		if (cachedProfile) {
			setProfile(cachedProfile);
			setProfileLoadError(false);
			setIsProfileLoading(false);
			return () => {
				cancelled = true;
			};
		}
		setProfile(null);
		setProfileLoadError(false);
		setIsProfileLoading(true);
		const fetchProfile = async () => {
			try {
				if (DeveloperOptions.slowProfileLoad) {
					await new Promise((resolve) => setTimeout(resolve, PROFILE_LOAD_DELAY_MS));
				}
				if (cancelled) {
					return;
				}
				const fetchedProfile = await UserProfileCommands.fetch(userId, guildId);
				if (cancelled) {
					return;
				}
				setProfile(fetchedProfile);
				setProfileLoadError(false);
			} catch (error) {
				if (cancelled) {
					return;
				}
				onError?.(error);
				setProfile(UserProfile.getProfile(userId, guildId) ?? fallbackProfile);
				setProfileLoadError(true);
			} finally {
				if (!cancelled) {
					setIsProfileLoading(false);
				}
			}
		};
		void fetchProfile();
		return () => {
			cancelled = true;
		};
	}, [cachedProfile, enabled, fallbackProfile, guildId, onError, userId]);

	return {
		profile,
		profileLoadError,
		isProfileLoading,
		showProfileSkeleton: DeveloperOptions.forceProfileSkeletons || (enabled && isProfileLoading && !profile),
	};
}
