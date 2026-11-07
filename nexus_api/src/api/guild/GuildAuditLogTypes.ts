// SPDX-License-Identifier: Nebula

export interface AuditLogChange<K extends string = string, D = unknown> {
	key: K;
	old_value?: D;
	new_value?: D;
}

export type GuildAuditLogChange = Array<AuditLogChange>;
