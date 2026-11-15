// SPDX-License-Identifier: Nebula

import {remFromPx} from '@app/features/theme/layout/RemFromPx';
import {Trans} from '@lingui/react/macro';
import type React from 'react';

interface StreamStartedIllustrationProps {
	className?: string;
	style?: React.CSSProperties;
	compact?: boolean;
}

export const StreamStartedIllustration: React.FC<StreamStartedIllustrationProps> = ({
	className,
	style,
	compact = false,
}) => {
	return (
		<div
			className={className}
			style={{
				display: 'flex',
				flexDirection: 'column',
				alignItems: 'center',
				justifyContent: 'center',
				width: '100%',
				height: '100%',
				minHeight: compact ? remFromPx(110) : remFromPx(150),
				padding: '0.75rem',
				textAlign: 'center',
				boxSizing: 'border-box',
				...style,
			}}
		>
			<svg
				viewBox="0 0 280 120"
				fill="none"
				xmlns="http://www.w3.org/2000/svg"
				style={{
					width: compact ? '160px' : '210px',
					height: 'auto',
					maxHeight: compact ? '75px' : '95px',
					filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.25))',
				}}
			>
				{/* Background organic shape */}
				<path
					d="M30 75C20 75 10 70 8 50C6 28 35 15 80 12C140 8 230 14 260 35C275 48 270 75 250 82C220 90 60 85 30 75Z"
					fill="rgba(255, 255, 255, 0.07)"
				/>

				{/* Left: Cinema / Deck Chair */}
				<g transform="translate(42, 38)">
					{/* Chair legs/frame */}
					<line x1="8" y1="52" x2="26" y2="12" stroke="#8A929B" strokeWidth="3" strokeLinecap="round" />
					<line x1="26" y1="12" x2="56" y2="46" stroke="#8A929B" strokeWidth="3" strokeLinecap="round" />
					<line x1="14" y1="46" x2="48" y2="46" stroke="#8A929B" strokeWidth="2.5" strokeLinecap="round" />
					<line x1="48" y1="46" x2="38" y2="52" stroke="#8A929B" strokeWidth="2.5" strokeLinecap="round" />
					{/* Chair fabric back / seat with checkered texture */}
					<rect
						x="24"
						y="10"
						width="32"
						height="34"
						rx="3"
						transform="rotate(-15 24 10)"
						fill="#E3E5E8"
						stroke="#B5BAC1"
						strokeWidth="1.5"
					/>
					{/* Seat check lines */}
					<line x1="29" y1="12" x2="55" y2="22" stroke="#C4C9CE" strokeWidth="1" />
					<line x1="33" y1="20" x2="59" y2="30" stroke="#C4C9CE" strokeWidth="1" />
					<line x1="37" y1="28" x2="63" y2="38" stroke="#C4C9CE" strokeWidth="1" />
					{/* Little dark silhouette friend 1 sitting */}
					<ellipse cx="44" cy="27" rx="3.5" ry="5.5" fill="#1E1F22" />
					<circle cx="44" cy="20" r="2.5" fill="#1E1F22" />
					{/* Little dark silhouette friend 2 sitting */}
					<ellipse cx="52" cy="30" rx="3.5" ry="5.5" fill="#1E1F22" />
					<circle cx="52" cy="23" r="2.5" fill="#1E1F22" />
				</g>

				{/* Middle: Soda Drink Cup with Straw */}
				<g transform="translate(112, 52)">
					{/* Cup body (tapered) */}
					<polygon points="6,16 22,16 19,42 9,42" fill="#F0B232" rx="2" />
					{/* Cup lid */}
					<rect x="4" y="13" width="20" height="4" rx="2" fill="#FFFFFF" opacity="0.9" />
					{/* Straw */}
					<path
						d="M14 13L16 2L24 0"
						stroke="#F47B67"
						strokeWidth="2.5"
						strokeLinecap="round"
						strokeLinejoin="round"
					/>
				</g>

				{/* Right: Retro Computer Monitor with Countdown "10" */}
				<g transform="translate(142, 22)">
					{/* Monitor Base & Pedestal */}
					<rect x="36" y="62" width="8" height="14" fill="#313338" />
					<rect x="24" y="74" width="32" height="4" rx="2" fill="#4E5058" />

					{/* Monitor Bezel */}
					<rect x="4" y="2" width="72" height="62" rx="4" fill="#1E1F22" stroke="#35373C" strokeWidth="2" />

					{/* Inner screen glass (blue tint) */}
					<rect x="10" y="8" width="60" height="50" rx="3" fill="#6A8BB0" />

					{/* Film countdown crosshairs & circle */}
					<circle cx="40" cy="33" r="20" stroke="#FFFFFF" strokeWidth="1.5" strokeOpacity="0.65" fill="none" />
					<line x1="40" y1="13" x2="40" y2="53" stroke="#FFFFFF" strokeWidth="1" strokeOpacity="0.45" />
					<line x1="20" y1="33" x2="60" y2="33" stroke="#FFFFFF" strokeWidth="1" strokeOpacity="0.45" />

					{/* Bold "10" countdown text */}
					<text
						x="40"
						y="40"
						textAnchor="middle"
						fill="#FFFFFF"
						fontSize="18"
						fontFamily="sans-serif"
						fontWeight="900"
						letterSpacing="-0.5"
					>
						10
					</text>
				</g>

				{/* Sparkle Stars */}
				<g fill="#A3B3C2" opacity="0.8">
					{/* Star 1 left */}
					<path d="M102 36L103.5 39.5L107 41L103.5 42.5L102 46L100.5 42.5L97 41L100.5 39.5Z" />
					{/* Star 2 right */}
					<path d="M228 62L229.5 64.5L232 65.5L229.5 66.5L228 69L226.5 66.5L224 65.5L226.5 64.5Z" />
					{/* Small star 3 */}
					<circle cx="95" cy="58" r="1.5" fill="#FFFFFF" opacity="0.5" />
				</g>
			</svg>

			<span
				style={{
					marginTop: '0.4rem',
					fontSize: compact ? '0.78rem' : '0.85rem',
					fontWeight: 600,
					color: 'var(--text-primary, #ffffff)',
					lineHeight: 1.3,
				}}
			>
				<Trans>Stream just started. Get in here!</Trans>
			</span>
		</div>
	);
};
