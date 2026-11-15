// SPDX-License-Identifier: Nebula

import GamingActivityPrivacyPanel, {type GamingActivityGuildRow} from '@app/features/gaming/GamingActivityPrivacyPanel';
import {fetchGamingProfile, saveGamingProfile} from '@app/features/gaming/GamingClient';
import {
	type GamingDetectionPreferences,
	type GamingProcessRegistration,
	getGamingDetectionPreferences,
	removeGamingProcessRegistration,
	saveGamingDetectionPreferences,
	storeGamingActivity,
} from '@app/features/gaming/GamingPresenceHeartbeat';
import type {GamingEntry, GamingProfile} from '@app/features/gaming/GamingTypes';
import Guilds from '@app/features/guild/state/Guilds';
import {getElectronAPI} from '@app/features/ui/utils/NativeUtils';
import Users from '@app/features/user/state/Users';
import * as AvatarUtils from '@app/features/user/utils/AvatarUtils';
import {Trans, useLingui} from '@lingui/react/macro';
import {observer} from 'mobx-react-lite';
import {useCallback, useEffect, useState} from 'react';

function stripControlCharacters(value: string): string {
	return Array.from(value)
		.filter((character) => {
			const codePoint = character.codePointAt(0)!;
			return codePoint > 0x1f && codePoint !== 0x7f;
		})
		.join('');
}

function GamingTab() {
	const {i18n} = useLingui();
	const userId = Users.currentUserId ?? '';
	const nativeApi = getElectronAPI();
	const detectionAvailable = Boolean(nativeApi?.getRunningGameProcessNames);
	const [profile, setProfile] = useState<GamingProfile | null>(null);
	const [detectionPreferences, setDetectionPreferences] = useState<GamingDetectionPreferences>({
		enabled: false,
		registrations: [],
		suppressed_process_names: [],
		suppressed_game_ids: [],
		suppressed_game_names: [],
	});
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [searchQuery, setSearchQuery] = useState('');
	const [runningProcesses, setRunningProcesses] = useState<Array<string>>([]);
	const [selectedProcess, setSelectedProcess] = useState('');
	const [processTitle, setProcessTitle] = useState('');
	const [processLoading, setProcessLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let mounted = true;
		setDetectionPreferences(getGamingDetectionPreferences(userId));
		void fetchGamingProfile()
			.then((next) => {
				if (mounted) setProfile(next);
			})
			.catch(() => {
				if (mounted) setError(i18n._('Could not load your gaming settings. Please try again.'));
			})
			.finally(() => {
				if (mounted) setLoading(false);
			});
		return () => {
			mounted = false;
		};
	}, [i18n, userId]);

	const guildRows: Array<GamingActivityGuildRow> = Guilds.getGuilds()
		.map((guild) => ({
			id: guild.id,
			name: guild.name,
			iconUrl: guild.icon ? AvatarUtils.getGuildIconURL({id: guild.id, icon: guild.icon}) : undefined,
			memberCount: guild.memberCount,
			isSharing: !(profile?.hidden_guild_ids ?? []).includes(guild.id),
		}))
		.sort((left, right) => left.name.localeCompare(right.name, undefined, {sensitivity: 'base'}));

	const persistPrivacy = useCallback(
		async (shareWithGuilds: boolean, hiddenGuildIds: Array<string>) => {
			if (!profile || saving) return;
			setSaving(true);
			setError(null);
			try {
				const next = await saveGamingProfile(profile.games, shareWithGuilds, hiddenGuildIds);
				setProfile(next);
				if (next.activity) {
					storeGamingActivity(userId, next.activity.game, shareWithGuilds, next.activity.started_at);
				}
			} catch {
				setError(i18n._('Could not save your gaming settings. Please try again.'));
			} finally {
				setSaving(false);
			}
		},
		[i18n, profile, saving, userId],
	);

	const setAutomaticDetection = useCallback(
		(enabled: boolean) => {
			if (!detectionAvailable) return;
			const next = {...detectionPreferences, enabled};
			if (saveGamingDetectionPreferences(userId, next)) {
				setDetectionPreferences(next);
				setError(null);
			} else {
				setError(i18n._('Could not save local game detection settings.'));
			}
		},
		[detectionAvailable, detectionPreferences, i18n, userId],
	);

	const setActivitySharing = useCallback(
		(shareWithGuilds: boolean) => {
			if (!profile) return;
			void persistPrivacy(shareWithGuilds, profile.hidden_guild_ids ?? []);
		},
		[persistPrivacy, profile],
	);

	const setGuildSharing = useCallback(
		(guildId: string, isSharing: boolean) => {
			if (!profile) return;
			const hiddenGuildIds = new Set(profile.hidden_guild_ids ?? []);
			if (isSharing) hiddenGuildIds.delete(guildId);
			else hiddenGuildIds.add(guildId);
			void persistPrivacy(profile.share_with_guilds, [...hiddenGuildIds]);
		},
		[persistPrivacy, profile],
	);

	const toggleAllGuilds = useCallback(
		(isSharing: boolean) => {
			if (!profile) return;
			void persistPrivacy(profile.share_with_guilds, isSharing ? [] : Guilds.getGuildIds());
		},
		[persistPrivacy, profile],
	);

	const refreshRunningProcesses = useCallback(async () => {
		if (!nativeApi?.getRunningGameProcessNames) return;
		setProcessLoading(true);
		setError(null);
		try {
			const processes = await nativeApi.getRunningGameProcessNames();
			setRunningProcesses(processes);
			setSelectedProcess((current) => (current && processes.includes(current) ? current : (processes[0] ?? '')));
		} catch {
			setError(i18n._('Could not read running apps on this computer.'));
		} finally {
			setProcessLoading(false);
		}
	}, [i18n, nativeApi]);

	const linkRunningProcess = useCallback(() => {
		const title = stripControlCharacters(processTitle).trim().replace(/\s+/gu, ' ').slice(0, 80);
		if (!title || !selectedProcess) return;
		const gameId = `manual:${title.normalize('NFKC').toLocaleLowerCase()}`;
		const game: GamingEntry = {id: gameId, name: title, platform: 'computer'};
		const registration: GamingProcessRegistration = {game, process_name: selectedProcess};
		const next: GamingDetectionPreferences = {
			...detectionPreferences,
			registrations: [
				...detectionPreferences.registrations.filter(
					(existing) => existing.game.id !== game.id && existing.process_name !== selectedProcess,
				),
				registration,
			],
		};
		if (saveGamingDetectionPreferences(userId, next)) {
			setDetectionPreferences(next);
			setProcessTitle('');
			setError(null);
		} else {
			setError(i18n._('Could not save local game detection settings.'));
		}
	}, [detectionPreferences, i18n, processTitle, selectedProcess, userId]);

	const removeLinkedProcess = useCallback(
		(gameId: string) => {
			if (removeGamingProcessRegistration(userId, gameId)) {
				setDetectionPreferences(getGamingDetectionPreferences(userId));
				setError(null);
			} else {
				setError(i18n._('Could not save local game detection settings.'));
			}
		},
		[i18n, userId],
	);

	if (loading) {
		return (
			<div aria-live="polite">
				<p>
					<Trans>Loading game detection settings…</Trans>
				</p>
			</div>
		);
	}

	return (
		<GamingActivityPrivacyPanel
			busy={saving}
			detectionAvailable={detectionAvailable}
			detectionEnabled={detectionPreferences.enabled}
			error={error}
			guilds={guildRows}
			loading={false}
			onDetectionEnabledChange={setAutomaticDetection}
			onGuildSharingChange={setGuildSharing}
			onLinkProcess={linkRunningProcess}
			onProcessSelectionChange={setSelectedProcess}
			onProcessTitleChange={setProcessTitle}
			onRefreshProcesses={() => void refreshRunningProcesses()}
			onRemoveProcess={removeLinkedProcess}
			onSearchChange={setSearchQuery}
			onShareWithServersChange={setActivitySharing}
			onToggleAllGuilds={toggleAllGuilds}
			processLoading={processLoading}
			processTitle={processTitle}
			registeredProcesses={detectionPreferences.registrations.map((registration) => ({
				gameId: registration.game.id,
				gameName: registration.game.name,
				processName: registration.process_name,
			}))}
			runningProcesses={runningProcesses}
			searchQuery={searchQuery}
			selectedProcess={selectedProcess}
			shareWithServers={Boolean(profile?.share_with_guilds)}
		/>
	);
}

export default observer(GamingTab);
