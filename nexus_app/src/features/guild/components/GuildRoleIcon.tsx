// SPDX-License-Identifier: Nebula

import type {GuildRole} from '@app/features/guild/models/GuildRole';
import * as ColorUtils from '@app/features/theme/utils/ColorUtils';
import type {CSSProperties} from 'react';

interface GuildRoleIconProps {
	role: Pick<GuildRole, 'icon' | 'unicodeEmoji' | 'color'>;
	size?: number;
	className?: string;
	style?: CSSProperties;
}

export function GuildRoleIcon({role, size = 16, className, style}: GuildRoleIconProps) {
	const iconStyle: CSSProperties = {
		alignItems: 'center',
		backgroundColor: role.color ? ColorUtils.int2rgb(role.color) : 'var(--text-tertiary)',
		borderRadius: '50%',
		display: 'inline-flex',
		flex: '0 0 auto',
		height: size,
		justifyContent: 'center',
		overflow: 'hidden',
		width: size,
		...style,
	};

	if (role.icon) {
		return (
			<img
				alt=""
				aria-hidden="true"
				className={className}
				draggable={false}
				src={role.icon}
				style={{...iconStyle, objectFit: 'contain'}}
				width={size}
				height={size}
			/>
		);
	}

	if (role.unicodeEmoji) {
		return (
			<span
				aria-hidden="true"
				className={className}
				style={{...iconStyle, backgroundColor: 'transparent', fontSize: size * 0.9, lineHeight: 1}}
			>
				{role.unicodeEmoji}
			</span>
		);
	}

	return <span aria-hidden="true" className={className} style={iconStyle} />;
}
