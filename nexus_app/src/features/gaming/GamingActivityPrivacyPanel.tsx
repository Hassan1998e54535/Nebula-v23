// SPDX-License-Identifier: Nebula

import styles from '@app/features/gaming/GamingActivityPrivacyPanel.module.css';
import {Switch} from '@app/features/ui/components/form/FormSwitch';
import {Trans, useLingui} from '@lingui/react/macro';
import {GameControllerIcon, MagnifyingGlassIcon, ShieldCheckIcon, UsersThreeIcon} from '@phosphor-icons/react';

export interface GamingActivityGuildRow {
	id: string;
	name: string;
	iconUrl?: string;
	memberCount?: number;
	isSharing: boolean;
}

export interface GamingActivityPrivacyPanelProps {
	detectionEnabled: boolean;
	detectionAvailable: boolean;
	shareWithServers: boolean;
	guilds: Array<GamingActivityGuildRow>;
	runningProcesses: Array<string>;
	registeredProcesses: Array<{gameId: string; gameName: string; processName: string}>;
	processTitle: string;
	selectedProcess: string;
	searchQuery: string;
	busy?: boolean;
	processLoading?: boolean;
	loading?: boolean;
	error?: string | null;
	onDetectionEnabledChange: (enabled: boolean) => void;
	onShareWithServersChange: (enabled: boolean) => void;
	onGuildSharingChange: (guildId: string, isSharing: boolean) => void;
	onSearchChange: (query: string) => void;
	onToggleAllGuilds: (isSharing: boolean) => void;
	onRefreshProcesses: () => void;
	onProcessTitleChange: (title: string) => void;
	onProcessSelectionChange: (processName: string) => void;
	onLinkProcess: () => void;
	onRemoveProcess: (gameId: string) => void;
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
	detectionAvailable,
	shareWithServers,
	guilds,
	runningProcesses,
	registeredProcesses,
	processTitle,
	selectedProcess,
	searchQuery,
	busy = false,
	processLoading = false,
	loading = false,
	error,
	onDetectionEnabledChange,
	onShareWithServersChange,
	onGuildSharingChange,
	onSearchChange,
	onToggleAllGuilds,
	onRefreshProcesses,
	onProcessTitleChange,
	onProcessSelectionChange,
	onLinkProcess,
	onRemoveProcess,
}: GamingActivityPrivacyPanelProps) {
	const {i18n} = useLingui();
	const visibleGuilds = guilds.filter((guild) =>
		guild.name.toLocaleLowerCase().includes(searchQuery.trim().toLocaleLowerCase()),
	);
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
							{detectionAvailable ? (
								<Trans>
									Steam games and supported PC games are detected locally. Detection runs only on this computer.
								</Trans>
							) : (
								<Trans>Automatic detection needs the NEXUS desktop app on the computer where you play.</Trans>
							)}
						</p>
					</div>
					<Switch
						ariaLabel={i18n._('Detect games on this device')}
						className={styles.switchControl}
						compact
						disabled={!detectionAvailable || loading || busy}
						onChange={onDetectionEnabledChange}
						value={detectionEnabled}
					/>
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
							<Trans>
								This master switch controls all servers. You can keep activity hidden in individual servers below.
							</Trans>
						</p>
					</div>
					<Switch
						ariaLabel={i18n._('Share game activity with your servers')}
						className={styles.switchControl}
						compact
						disabled={loading || busy}
						onChange={onShareWithServersChange}
						value={shareWithServers}
					/>
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
							disabled={loading || busy || guilds.length === 0 || allGuildsSharing}
							onClick={() => onToggleAllGuilds(true)}
							type="button"
						>
							<Trans>Share in all</Trans>
						</button>
						<button
							className={styles.bulkButton}
							disabled={loading || busy || guilds.length === 0 || guilds.every((guild) => !guild.isSharing)}
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
						disabled={loading || busy}
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
					<div className={styles.skeletonList} aria-label={i18n._('Loading server sharing settings')} role="status">
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
										{guild.isSharing ? (
											shareWithServers ? (
												<Trans>Shared</Trans>
											) : (
												<Trans>Allowed when enabled</Trans>
											)
										) : (
											<Trans>Hidden</Trans>
										)}
									</span>
									<Switch
										ariaLabel={i18n._('Share game activity in {serverName}', {serverName: guild.name})}
										className={styles.switchControl}
										compact
										disabled={loading || busy}
										onChange={(isSharing) => onGuildSharingChange(guild.id, isSharing)}
										value={guild.isSharing}
									/>
								</div>
							</li>
						))}
					</ul>
				) : (
					<div className={styles.emptyState}>
						<UsersThreeIcon aria-hidden="true" size={24} />
						<strong>
							{guilds.length === 0 ? (
								<Trans>No servers to manage yet</Trans>
							) : (
								<Trans>No servers match that search</Trans>
							)}
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

			{detectionAvailable && (
				<details className={styles.manualLink}>
					<summary className={styles.manualSummary}>
						<span>
							<strong>
								<Trans>Not detecting a game?</Trans>
							</strong>
							<span>
								<Trans>Link a running app once for games outside Steam.</Trans>
							</span>
						</span>
					</summary>
					<div className={styles.manualContent}>
						<p>
							<Trans>
								Steam games are detected automatically. For another PC game, scan running apps and link its process to a
								display name. This list stays on this computer.
							</Trans>
						</p>
						<div className={styles.processForm}>
							<label>
								<span>
									<Trans>Game name</Trans>
								</span>
								<input
									autoComplete="off"
									maxLength={80}
									onChange={(event) => onProcessTitleChange(event.currentTarget.value)}
									placeholder={i18n._('For example, a game title')}
									value={processTitle}
								/>
							</label>
							<label>
								<span>
									<Trans>Running app</Trans>
								</span>
								<select
									onChange={(event) => onProcessSelectionChange(event.currentTarget.value)}
									value={selectedProcess}
								>
									<option value="">
										{i18n._(processLoading ? 'Scanning running apps…' : 'Scan to find a running app')}
									</option>
									{runningProcesses.map((processName) => (
										<option key={processName} value={processName}>
											{processName}
										</option>
									))}
								</select>
							</label>
							<div className={styles.processActions}>
								<button disabled={busy || processLoading} onClick={onRefreshProcesses} type="button">
									{processLoading ? <Trans>Scanning…</Trans> : <Trans>Scan running apps</Trans>}
								</button>
								<button
									className={styles.primaryAction}
									disabled={busy || !processTitle.trim() || !selectedProcess}
									onClick={onLinkProcess}
									type="button"
								>
									<Trans>Link game</Trans>
								</button>
							</div>
						</div>
						{registeredProcesses.length > 0 && (
							<ul className={styles.registeredList}>
								{registeredProcesses.map((registration) => (
									<li key={registration.gameId}>
										<span>
											<strong>{registration.gameName}</strong>
											<small>{registration.processName}</small>
										</span>
										<button
											aria-label={i18n._('Remove {gameName} app link', {gameName: registration.gameName})}
											disabled={busy}
											onClick={() => onRemoveProcess(registration.gameId)}
											type="button"
										>
											<Trans>Remove</Trans>
										</button>
									</li>
								))}
							</ul>
						)}
					</div>
				</details>
			)}

			<aside className={styles.privacyNote}>
				<ShieldCheckIcon aria-hidden="true" size={18} weight="duotone" />
				<p>
					<strong>
						<Trans>Private by default</Trans>
					</strong>
					<Trans>
						Turning off a server hides your game activity there without changing detection or other server settings.
					</Trans>
				</p>
			</aside>
		</div>
	);
}

export default GamingActivityPrivacyPanel;
