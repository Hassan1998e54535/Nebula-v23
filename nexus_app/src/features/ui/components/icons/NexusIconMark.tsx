// SPDX-License-Identifier: Nebula

import {msg} from '@lingui/core/macro';
import type React from 'react';

export const APPLICATION_ICON_DESCRIPTOR = msg({
	message: '{productName} application icon',
	comment: 'Accessible label for the NEXUS application icon.',
});

export const NEXUSIconMark = (props: React.SVGProps<SVGSVGElement>) => (
	<svg
		xmlns="http://www.w3.org/2000/svg"
		viewBox="0 0 512 512"
		role="img"
		data-flx="ui.icons.nexus-icon.img"
		{...props}
	>
		<rect fill="var(--brand-primary)" height={512} rx={256} width={512} data-flx="ui.icons.nexus-icon.rect" />
		<path
			d="M160 352V160L352 352V160"
			fill="none"
			stroke="var(--brand-primary-fill)"
			strokeLinecap="round"
			strokeLinejoin="round"
			strokeWidth={48}
			data-flx="ui.icons.nexus-icon.path"
		/>
	</svg>
);
