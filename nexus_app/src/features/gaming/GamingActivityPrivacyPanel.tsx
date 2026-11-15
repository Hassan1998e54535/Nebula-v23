// SPDX-License-Identifier: Nebula

import styles from '@app/features/gaming/GamingActivityPrivacyPanel.module.css';
import {Trans, useLingui} from '@lingui/react/macro';
import {
	GameControllerIcon,
	MagnifyingGlassIcon,
	ShieldCheckIcon,
	UsersThreeIcon,
} from '@phosphor-icons/react';

export interface GamingActivityGuildRow {
	id: string;
	name: string;
	iconUrl?: string;
	memberCount?: number;
	isSharing: boolean;
}

export interface GamingActivityPrivacyPanelProps {
	detectionEnabled: boolean;
	shareWithServers: boolean;
	guilds: GamingActivityGuildRow[];
	searchQuery: string;
	loading?: boolean;
	error?: string | null;
	onDetectionEnabledChange: (enabled: boolean) => void;
	onShareWithServersChange: (enabled: boolean) => void;
	onGuildSharingChange: (guildId: string, isSharing: boolean) => void;
	onSearchChange: (query: string) => void;
	onToggleAllGuilds: (isSharing: boolean) => void;
}

function initials(name: string): string {
	return name
		.trim()
		.split(/\s+/)
		.slice(0, 2)
		.map((part) => part[0] ?? '')
		.join('')
		.toUpperCase();
}

function GamingActivityPrivacyPanel({
	detectionEnabled,
	shareWithServers,
	guilds,
	searchQuery,
	loading = false,
	error,
	onDetectionEnabledChange,
	onShareWithServersChange,
	onGuildSharingChange,
	onSearchChange,
	onToggleAllGuilds,
}: GamingActivityPrivacyPanelProps) {
	const {i18n} = useLingui();
	const visibleGuilds = guilds.filter((guild) => guild.name.toLocaleLowerCase().includes(searchQuery.trim().toLocaleLowerCase()));
	const allGuildsSharing = guilds.length > 0 && guilds.every((guild) => guild.isSharing);

	return (
		<div className={styles.root}>
			<header className={styles.header}>
				<div className={styles.eyebrow}>
					<ShieldCheckIcon aria-hidden="true" size={15} weight="bold" />
					<Trans>YOUR ACTIVITY, YOUR CALL</Trans>
				</div>
				<h2>
					<GameControllerIcon aria-hidden="true" size={24} weight="duotone" />
					<Trans>Game activity privacy</Trans>
				</h2>
				<p className={styles.intro}>
					<Trans>Choose what NEXUS detects and where your game activity is visible.</Trans>
				</p>
			</header>

			<section className={styles.globalSettings} aria-label={i18n._('General game activity settings')}>
				<div className={styles.settingRow}>
					<div className={styles.settingMark} aria-hidden="true">
						<GameControllerIcon size={21} weight="duotone" />
					</div>
					<div className={styles.settingCopy}>
						<h3>
							<Trans>Detect games on this device</Trans>
						</h3>
						<p>
							<Trans>When on, NEXUS checks supported games locally and can show the game you are playing.</Trans>
						</p>
					</div>
					<label className={styles.switch} aria-label={i18n._('Detect games on this device')}>
						<input
							checked={detectionEnabled}
							disabled={loading}
							onChange={(event) => onDetectionEnabledChange(event.currentTarget.checked)}
							type="checkbox"
						/>
						<span className={styles.switchTrack} aria-hidden="true">
							<span className={styles.switchThumb} />
						</span>
					</label>
				</div>

				<div className={styles.settingRow}>
					<div className={styles.settingMark} aria-hidden="true">
						<UsersThreeIcon size={21} weight="duotone" />
					</div>
					<div className={styles.settingCopy}>
						<h3>
							<Trans>Share with your servers</Trans>
						</h3>
						<p>
							<Trans>Allow server members to see your game activity. You can still turn sharing off for individual servers below.</Trans>
						</p>
					</div>
					<label className={styles.switch} aria-label={i18n._('Share game activity with your servers')}>
						<input
							checked={shareWithServers}
							disabled={loading}
							onChange={(event) => onShareWithServersChange(event.currentTarget.checked)}
							type="checkbox"
						/>
						<span className={styles.switchTrack} aria-hidden="true">
							<span className={styles.switchThumb} />
						</span>
					</label>
				</div>
			</section>

			<section className={styles.guildSection} aria-labelledby="gaming-privacy-guilds-title" aria-busy={loading}>
				<div className={styles.guildHeader}>
					<div>
						<div className={styles.sectionKicker}>
							<Trans>PER-SERVER CONTROLS</Trans>
						</div>
						<h3 id="gaming-privacy-guilds-title">
							<Trans>Where activity is shared</Trans>
						</h3>
						<p className={styles.sectionDescription}>
							<Trans>Turn sharing off anywhere you want more privacy.</Trans>
						</p>
					</div>
					<div className={styles.bulkActions}>
						<button
							className={styles.bulkButton}
							disabled={loading || guilds.length === 0 || allGuildsSharing}
							onClick={() => onToggleAllGuilds(true)}
							type="button"
						>
							<Trans>Share in all</Trans>
						</button>
						<button
							className={styles.bulkButton}
							disabled={loading || guilds.length === 0 || guilds.every((guild) => !guild.isSharing)}
							onClick={() => onToggleAllGuilds(false)}
							type="button"
						>
							<Trans>Hide in all</Trans>
						</button>
					</div>
				</div>

				<label className={styles.searchBox}>
					<MagnifyingGlassIcon aria-hidden="true" size={18} />
					<span className={styles.visuallyHidden}>
						<Trans>Search servers</Trans>
					</span>
					<input
						autoComplete="off"
						disabled={loading}
						onChange={(event) => onSearchChange(event.currentTarget.value)}
						placeholder={i18n._('Find a server')}
						type="search"
						value={searchQuery}
					/>
					{searchQuery.length > 0 && (
						<button
							aria-label={i18n._('Clear server search')}
							className={styles.clearSearch}
							onClick={() => onSearchChange('')}
							type="button"
						>
							×
						</button>
					)}
				</label>

				{error && (
					<div className={styles.error} role="alert">
						<ShieldCheckIcon aria-hidden="true" size={18} />
						<p>{error}</p>
					</div>
				)}

				{loading ? (
					<div className={styles.skeletonList} aria-label={i18n._('Loading server sharing settings')}>
						{[0, 1, 2].map((item) => (
							<div className={styles.skeletonRow} key={item}>
								<span className={styles.skeletonIcon} />
								<span className={styles.skeletonText} />
								<span className={styles.skeletonSwitch} />
							</div>
						))}
					</div>
				) : visibleGuilds.length > 0 ? (
					<ul className={styles.guildList}>
						{visibleGuilds.map((guild) => (
							<li className={styles.guildRow} key={guild.id}>
								<div className={styles.guildIdentity}>
									<span className={styles.guildIcon} aria-hidden="true">
										<span>{initials(guild.name)}</span>
										{guild.iconUrl && <img alt="" loading="lazy" src={guild.iconUrl} />}
									</span>
									<span className={styles.guildDetails}>
										<strong>{guild.name}</strong>
										{typeof guild.memberCount === 'number' && (
											<span className={styles.memberCount}>
												<Trans>{i18n.number(guild.memberCount)} members</Trans>
											</span>
										)}
									</span>
								</div>
								<div className={styles.guildControl}>
									<span className={styles.sharingState} data-sharing={guild.isSharing}>
										{guild.isSharing ? <Trans>Shared</Trans> : <Trans>Hidden</Trans>}
									</span>
									<label className={styles.switch} aria-label={i18n._('Share game activity in {serverName}', {serverName: guild.name})}>
										<input
											checked={guild.isSharing}
											disabled={loading}
											onChange={(event) => onGuildSharingChange(guild.id, event.currentTarget.checked)}
											type="checkbox"
										/>
										<span className={styles.switchTrack} aria-hidden="true">
											<span className={styles.switchThumb} />
										</span>
									</label>
								</div>
							</li>
						))}
					</ul>
				) : (
					<div className={styles.emptyState}>
						<UsersThreeIcon aria-hidden="true" size={24} />
						<strong>
							{guilds.length === 0 ? <Trans>No servers to manage yet</Trans> : <Trans>No servers match that search</Trans>}
						</strong>
						<p>
							{guilds.length === 0 ? (
								<Trans>When you join a server, its activity-sharing control will appear here.</Trans>
							) : (
								<Trans>Try another server name.</Trans>
							)}
						</p>
					</div>
				)}
			</section>

			<aside className={styles.privacyNote}>
				<ShieldCheckIcon aria-hidden="true" size={18} weight="duotone" />
				<p>
					<strong>
						<Trans>Private by default</Trans>
					</strong>
					<Trans> Turning off sharing hides your game activity from that server without changing detection on this device.</Trans>
				</p>
			</aside>
		</div>
	);
}

export default GamingActivityPrivacyPanel;
