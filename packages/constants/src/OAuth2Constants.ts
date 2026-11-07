// SPDX-License-Identifier: Nebula

export const OAuth2Scopes = ['identify', 'email', 'guilds', 'connections', 'bot'] as const;

export type OAuth2Scope = (typeof OAuth2Scopes)[number];
