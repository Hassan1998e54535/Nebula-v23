import { useCallback, useEffect, useRef, useState } from 'react';
import type { ProfileEffectAnimationSegment } from './profileMediaCatalog';
import { profileAssetUrl as resolveProfileEffectAsset } from './profileMediaCatalog';

function ApngSegment({
  effectId,
  segment,
  cycleKey = 0,
  onIntroComplete,
}: {
  effectId: string;
  segment: ProfileEffectAnimationSegment;
  cycleKey?: number;
  onIntroComplete?: () => void;
}) {
  const [loaded, setLoaded] = useState(false);
  const [visible, setVisible] = useState(true);
  const completed = useRef(false);
  const baseSrc = resolveProfileEffectAsset(segment.assetUrl);
  const src = baseSrc ? `${baseSrc}${baseSrc.includes('?') ? '&' : '?'}c=${cycleKey}` : '';

  const finishIntro = useCallback(() => {
    if (completed.current) return;
    completed.current = true;
    setVisible(false);
    onIntroComplete?.();
  }, [onIntroComplete]);

  useEffect(() => {
    if (!loaded || segment.phase !== 'intro') return;
    const timer = window.setTimeout(finishIntro, segment.durationMs);
    return () => window.clearTimeout(timer);
  }, [finishIntro, loaded, segment.durationMs, segment.phase]);

  if (!src || !visible) return null;
  return (
    <img
      className="pc-effect-apng-segment"
      src={src}
      alt=""
      aria-hidden="true"
      loading="eager"
      onLoad={() => setLoaded(true)}
      onError={() => {
        console.error(`[ProfileEffect] APNG segment failed to load for "${effectId}".`, src);
        if (segment.phase === 'intro') finishIntro();
        else setVisible(false);
      }}
    />
  );
}

export default function ApngEffectMedia({
  effectId,
  segments,
  cycleKey = 0,
}: {
  effectId: string;
  segments: readonly ProfileEffectAnimationSegment[];
  cycleKey?: number;
}) {
  const introCount = segments.filter((segment) => segment.phase === 'intro').length;
  const [introComplete, setIntroComplete] = useState(introCount === 0);
  const completedIntroSegments = useRef(new Set<string>());
  const markIntroComplete = useCallback((key: string) => {
    completedIntroSegments.current.add(key);
    if (completedIntroSegments.current.size >= introCount) setIntroComplete(true);
  }, [introCount]);

  useEffect(() => {
    completedIntroSegments.current.clear();
    setIntroComplete(introCount === 0);
  }, [cycleKey, introCount]);

  if (segments.length === 0) {
    console.error(`[ProfileEffect] APNG effect "${effectId}" has no animation segments.`);
    return null;
  }

  return (
    <>
      {segments.map((segment, index) => (
        segment.phase === 'loop' && !introComplete ? null : (
        <ApngSegment
          key={`${segment.assetUrl}:${index}:${cycleKey}`}
          effectId={effectId}
          segment={segment}
          cycleKey={cycleKey}
          onIntroComplete={
            segment.phase === 'intro'
              ? () => markIntroComplete(`${segment.assetUrl}:${index}`)
              : undefined
          }
        />
        )
      ))}
    </>
  );
}
