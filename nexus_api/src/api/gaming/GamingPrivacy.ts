// SPDX-License-Identifier: Nebula

export function resolveHiddenGamingGuildIds(
	requestedGuildIds: Array<string> | undefined,
	existingGuildIds: Array<string>,
	memberGuildIds: Iterable<string>,
): Array<string> {
	const members = new Set(memberGuildIds);
	return [...new Set((requestedGuildIds ?? existingGuildIds).filter((guildId) => members.has(guildId)))].sort();
}

export function shouldShareGamingActivityInGuild(
	shareWithGuilds: boolean,
	hiddenGuildIds: ReadonlyArray<string>,
	guildId: string,
): boolean {
	return shareWithGuilds && !hiddenGuildIds.includes(guildId);
}
