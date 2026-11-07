import { useMemo, type CSSProperties } from 'react';
import type { ProfileAppearance } from '@nexus/schema/src/domains/user/ProfileCustomizationSchemas';
import './profileName.css';
import { getNameEffectSettings, getNameColors } from '../studio/nameStyleColors';

function splitNameIntoCharacters(name: string): string[] {
  const Segmenter = (Intl as unknown as {
    Segmenter?: new (locale?: string | string[], options?: { granularity: 'grapheme' }) => {
      segment: (value: string) => Iterable<{ segment: string }>;
    };
  }).Segmenter;
  return Segmenter
    ? Array.from(new Segmenter(undefined, { granularity: 'grapheme' }).segment(name), (part) => part.segment)
    : Array.from(name);
}

/** One font, palette and animation renderer for both drafts and saved identities. */
export function ProfileDisplayName({ name, appearance: savedAppearance, className = '' }: {
  name: string;
  appearance?: ProfileAppearance | null;
  className?: string;
}) {
  // Older source bundles also carry optional legacy name-motion settings.
  const appearance = savedAppearance as (ProfileAppearance & {
    nameAnimation?: string; nameEffectColors?: string[]; nameAnimationColors?: string[];
  }) | null | undefined;
  const colorStopped = appearance?.nameColorEnabled === false;
  const storedMotion = appearance?.nameAnimation ?? 'off';
  const isColorMotion = storedMotion === 'shimmer' || storedMotion === 'pulse' || storedMotion === 'spectrum';
  const active = appearance?.nameStyleEnabled
    ? colorStopped ? {
      ...appearance,
      nameEffect: 'solid' as const,
      nameAnimation: (isColorMotion ? 'off' : storedMotion),
      nameColorStart: '#dde1e8',
      nameColorEnd: '#dde1e8',
      nameEffectColors: undefined,
      nameAnimationColors: undefined,
      nameEffects: undefined,
    } : appearance
    : undefined;
  const settings = active ? getNameEffectSettings(active) : undefined;
  const colors = active ? getNameColors(active) : [];
  const effectMotion = active && ['shimmer', 'flow', 'pulse', 'spectrum', 'wave', 'bounce', 'flicker', 'comet', 'ripple', 'orbit', 'ember', 'frost'].includes(active.nameEffect);
  const movingCharacters = active?.nameEffect === 'wave' || active?.nameEffect === 'bounce' || active?.nameEffect === 'spectrum' ||
    (!effectMotion && (active?.nameAnimation === 'wave' || active?.nameAnimation === 'bounce'));
  const speedSeconds = settings?.speed === 'slow' ? 4.8 : settings?.speed === 'fast' ? 1.35 : 2.8;
  const directionAngle = settings?.direction === 'left' ? '270deg'
    : settings?.direction === 'up' ? '0deg'
      : settings?.direction === 'down' ? '180deg' : '90deg';
  const flowEndpoints = settings?.direction === 'left' ? ['100% 50%', '0% 50%']
    : settings?.direction === 'up' ? ['50% 100%', '50% 0%']
      : settings?.direction === 'down' ? ['50% 0%', '50% 100%']
        : ['0% 50%', '100% 50%'];
  const intensity = (settings?.intensity ?? 70) / 100;
  const movementDirection = active?.nameEffect === 'wave' || active?.nameEffect === 'bounce'
    ? settings?.direction : 'up';
  const distance = 3 + intensity * 6;
  const shiftX = movementDirection === 'left' ? -distance : movementDirection === 'right' ? distance : 0;
  const shiftY = movementDirection === 'up' ? -distance : movementDirection === 'down' ? distance : 0;
  const characters = movingCharacters ? splitNameIntoCharacters(name) : [];
  // Newly opened cards join the same animation phase as already visible names.
  const animationDelay = useMemo(() => {
    const movingEffect = active?.nameEffect;
    const movingLegacy = active?.nameAnimation;
    const duration = movingEffect && ['shimmer', 'flow', 'pulse', 'spectrum', 'flicker', 'comet', 'ripple', 'orbit', 'ember', 'frost'].includes(movingEffect)
      ? speedSeconds
      : movingLegacy === 'shimmer' || movingLegacy === 'pulse' || movingLegacy === 'spectrum'
        ? speedSeconds
        : 0;
    return duration ? `-${(performance.now() / 1000) % duration}s` : undefined;
  }, [active?.nameAnimation, active?.nameEffect, speedSeconds]);
  return (
    <span
      className={`${active ? 'nx-saved-name ' : ''}${className}`}
      data-font={active?.nameFont}
      data-effect={active?.nameEffect}
      data-motion={active?.nameAnimation}
      data-direction={settings?.direction}
      data-speed={settings?.speed}
      style={active ? {
        '--nx-name-start': colors[0],
        '--nx-name-end': colors[colors.length - 1],
        '--nx-name-gradient': `linear-gradient(${directionAngle}, ${colors.length === 1 ? [colors[0], colors[0]].join(',') : colors.join(',')})`,
        '--nx-name-shine': `linear-gradient(${directionAngle},${colors[0]} 15%,#fff 48%,${colors[colors.length - 1]} 75%)`,
        '--nx-name-duration': `${speedSeconds}s`,
        '--nx-name-intensity': String(intensity),
        '--nx-name-glow': `${2 + 12 * intensity}px`,
        '--nx-name-fade': String(0.25 + 0.7 * intensity),
        '--nx-name-stroke': `${0.6 + 1.6 * intensity}px`,
        '--nx-name-scale': String(1.02 + 0.08 * intensity),
        '--nx-name-shift-x': `${shiftX}px`,
        '--nx-name-shift-y': `${shiftY}px`,
        '--nx-name-recoil-x': `${-shiftX * 0.25}px`,
        '--nx-name-recoil-y': `${-shiftY * 0.25}px`,
        '--nx-name-flow-start': flowEndpoints[0]!,
        '--nx-name-flow-end': flowEndpoints[1]!,
        animationDelay,
      } as CSSProperties : undefined}
      aria-label={movingCharacters ? name : undefined}
      role={movingCharacters ? 'text' : undefined}
    >{movingCharacters ? <span aria-hidden="true">{characters.map((character, index) => (
      <span
        key={`${index}-${character}`}
        className="nx-name-character"
        style={{
          color: active?.nameEffect === 'spectrum' ? colors[index % colors.length] : colors[0],
          animationDelay: `${-((performance.now() / 1000) % speedSeconds) - index * 0.095}s`,
          animationDuration: `${speedSeconds}s`,
        }}
      >{character === ' ' ? '\u00a0' : character}</span>
    ))}</span> : name}</span>
  );
}
