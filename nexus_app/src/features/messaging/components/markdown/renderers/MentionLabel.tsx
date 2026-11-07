// SPDX-License-Identifier: Nebula

import mentionRendererStyles from '@app/features/theme/styles/MentionRenderer.module.css';
import type React from 'react';

const ICON_LABEL_JOINER = '\u2060';

interface MentionLabelProps {
	icon?: React.ReactNode;
	children: React.ReactNode;
}

export function MentionLabel({icon, children}: MentionLabelProps): React.ReactElement {
	return (
		<>
			{icon}
			{icon == null ? null : (
				<span data-flx="messaging.markdown.renderers.mention-label.joiner">{ICON_LABEL_JOINER}</span>
			)}
			<span className={mentionRendererStyles.label} data-flx="messaging.markdown.renderers.mention-label.span">
				{children}
			</span>
		</>
	);
}
