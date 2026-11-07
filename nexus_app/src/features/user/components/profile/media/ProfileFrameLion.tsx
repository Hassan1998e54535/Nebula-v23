import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { getProfileFrameDefinition } from './profileFrameRegistry';

interface CardBox {
  left: number;
  top: number;
  width: number;
  height: number;
}

const easeInOut = (value: number) => {
  const t = Math.max(0, Math.min(1, value));
  return t * t * (3 - 2 * t);
};

const needsSinglePlayApngFallback = (() => {
  if (typeof navigator === 'undefined') return false;
  const userAgent = navigator.userAgent;
  const iOS = /iPhone|iPad|iPod/i.test(userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const desktopSafari = /Safari/i.test(userAgent) &&
    !/(Chrome|Chromium|CriOS|FxiOS|EdgiOS|OPiOS)/i.test(userAgent);
  return iOS || desktopSafari;
})();

export default function ProfileFrameLion({
  cardRef,
  replayKey,
  repeat,
  reducedMotion,
}: {
  cardRef: RefObject<HTMLElement | null>;
  replayKey: number;
  repeat: boolean;
  reducedMotion: boolean;
}) {
  const frame = getProfileFrameDefinition('lion');
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const [cardBox, setCardBox] = useState<CardBox | null>(null);
  const [apngMode, setApngMode] = useState<'animation' | 'poster' | 'off'>(() => reducedMotion ? 'poster' : 'animation');
  const [apngCycle, setApngCycle] = useState(0);
  const previousReplayKeyRef = useRef(replayKey);
  const backLayerRef = useRef<HTMLDivElement>(null);
  const backTransformRef = useRef<HTMLDivElement>(null);
  const backVideoRef = useRef<HTMLVideoElement>(null);
  const backApngRef = useRef<HTMLImageElement>(null);
  const frontLayerRef = useRef<HTMLDivElement>(null);
  const frontTransformRef = useRef<HTMLDivElement>(null);
  const frontVideoRef = useRef<HTMLVideoElement>(null);
  const frontApngRef = useRef<HTMLImageElement>(null);
  const shadowRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const card = cardRef.current;
    const host = card?.parentElement;
    if (host instanceof HTMLElement) setPortalTarget(host);
  }, [cardRef]);

  useLayoutEffect(() => {
    const card = cardRef.current;
    const host = portalTarget;
    if (!card || !host) return;

    const measure = () => {
      const cardRect = card.getBoundingClientRect();
      const hostRect = host.getBoundingClientRect();
      const scaleX = hostRect.width / (host.clientWidth || 1) || 1;
      const scaleY = hostRect.height / (host.clientHeight || 1) || 1;
      setCardBox({
        left: (cardRect.left - hostRect.left) / scaleX,
        top: (cardRect.top - hostRect.top) / scaleY,
        width: cardRect.width / scaleX,
        height: cardRect.height / scaleY,
      });
    };

    measure();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    observer?.observe(card);
    observer?.observe(host);
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [cardRef, portalTarget]);

  useEffect(() => {
    if (previousReplayKeyRef.current === replayKey) return;
    previousReplayKeyRef.current = replayKey;
    if (needsSinglePlayApngFallback) {
      setApngMode('animation');
      setApngCycle((cycle) => cycle + 1);
    }
  }, [replayKey]);

  useEffect(() => {
    const back = backVideoRef.current;
    const front = frontVideoRef.current;
    const backApng = backApngRef.current;
    const frontApng = frontApngRef.current;
    const backLayer = backLayerRef.current;
    const frontLayer = frontLayerRef.current;
    const backTransform = backTransformRef.current;
    const frontTransform = frontTransformRef.current;
    const useApng = needsSinglePlayApngFallback;
    if (
      !frame?.videoUrl ||
      !backLayer ||
      !frontLayer ||
      !backTransform ||
      !frontTransform ||
      (useApng ? !backApng || !frontApng : !back || !front)
    ) return;
    const durationSeconds = frame.durationSeconds ?? 9.93;

    let disposed = false;
    let started = false;
    let exitStartedAt = 0;
    let imageStartedAt = 0;
    let animationFrame = 0;
    let restartTimer = 0;
    let imageEndTimer = 0;
    let phase: 'waiting' | 'playing' | 'exiting' | 'finished' = 'waiting';
    let lastScale = 0.82;
    let lastDown = 0;
    let lastDepth = 0;
    const videos = useApng ? [] : [back!, front!];
    const apngImages = useApng ? [backApng!, frontApng!] : [];
    const shadow = shadowRef.current;

    const setTransform = (scale: number, downPercent: number, depth: number) => {
      const transform = `perspective(850px) translate3d(0, ${downPercent}%, ${depth}px) scale(${scale})`;
      backTransform.style.transform = transform;
      frontTransform.style.transform = transform;
    };

    const setVisible = (visible: boolean) => {
      backLayer.style.visibility = visible ? 'visible' : 'hidden';
      frontLayer.style.visibility = visible ? 'visible' : 'hidden';
    };

    const runExit = () => {
      if (disposed || phase === 'exiting' || phase === 'finished') return;
      phase = 'exiting';
      exitStartedAt = performance.now();
      window.cancelAnimationFrame(animationFrame);
      animationFrame = window.requestAnimationFrame(exitFrame);
    };

    const exitFrame = (now: number) => {
      if (disposed) return;
      const progress = easeInOut((now - exitStartedAt) / 560);
      setTransform(
        lastScale + progress * 1.55,
        lastDown + progress * 42,
        lastDepth + progress * 260,
      );
      if (shadow) {
        shadow.style.opacity = String(0.2 * (1 - progress));
        shadow.style.transform = `translate3d(0, ${progress * 40}%, 0) scale(${1 + progress * 0.45})`;
      }
      if (progress < 1) {
        animationFrame = window.requestAnimationFrame(exitFrame);
        return;
      }

      phase = 'finished';
      setVisible(false);
      if (useApng) setApngMode('off');
      if (repeat) {
        started = false;
        restartTimer = window.setTimeout(() => {
          if (useApng) {
            setApngMode('animation');
            setApngCycle((cycle) => cycle + 1);
          } else {
            startCycle();
          }
        }, 2000);
      }
    };

    const animateFrame = () => {
      if (disposed || phase !== 'playing') return;
      if (!document.hidden) {
        const time = useApng ? (performance.now() - imageStartedAt) / 1000 : back!.currentTime;
        if (!useApng && Math.abs(front!.currentTime - time) > 0.035 && front!.readyState >= HTMLMediaElement.HAVE_METADATA) {
          try { front!.currentTime = time; } catch { /* Wait for its first decodable frame. */ }
        }
        const stand = easeInOut((time - 1.9) / 3.1);
        const approach = easeInOut((time - 4.4) / 5.0);
        const closeIn = easeInOut((time - 7.8) / 2.1);
        lastScale = 0.82 + approach * 0.48 + closeIn * 0.28;
        lastDown = stand * 2 + approach * 8 + closeIn * 12;
        lastDepth = approach * 80 + closeIn * 110;
        setTransform(lastScale, lastDown, lastDepth);
        if (shadow) {
          shadow.style.opacity = String(0.08 + stand * 0.12 + approach * 0.08);
          shadow.style.transform = `translate3d(0, ${lastDown * 0.28}%, 0) scale(${1 + approach * 0.45})`;
        }
      }
      animationFrame = window.requestAnimationFrame(animateFrame);
    };

    function startCycle() {
      if (disposed || started) return;
      if (reducedMotion) {
        started = true;
        phase = 'finished';
        setTransform(0.82, 0, 0);
        setVisible(true);
        if (useApng) setApngMode('poster');
        return;
      }
      if (useApng ? apngImages.some((image) => !image.complete || image.naturalWidth === 0) : videos.some((video) => video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA)) return;
      started = true;
      phase = 'playing';
      setVisible(true);
      lastScale = 0.82;
      lastDown = 0;
      lastDepth = 0;
      setTransform(lastScale, 0, 0);
      if (shadow) {
        shadow.style.opacity = '0.08';
        shadow.style.transform = 'translate3d(0, 0, 0) scale(1)';
      }
      if (useApng) {
        imageStartedAt = performance.now();
        animationFrame = window.requestAnimationFrame(animateFrame);
        imageEndTimer = window.setTimeout(runExit, durationSeconds * 1000);
        return;
      }
      for (const video of videos) {
        video.pause();
        try { video.currentTime = 0; } catch { /* Metadata may still be settling. */ }
      }
      void Promise.all(videos.map((video) => video.play())).then(() => {
        if (!disposed && phase === 'playing') animationFrame = window.requestAnimationFrame(animateFrame);
      }).catch((error: unknown) => {
        for (const video of videos) video.pause();
        if (!disposed) {
          phase = 'finished';
          setVisible(false);
          console.warn('[ProfileFrame] The lion preview could not start playback.', error);
        }
      });
    }

    const onMediaReady = () => startCycle();
    const onEnded = () => runExit();
    const onVisibilityChange = () => {
      if (document.hidden) {
        window.cancelAnimationFrame(animationFrame);
        if (useApng && phase === 'playing') {
          window.clearTimeout(imageEndTimer);
          phase = 'waiting';
          started = false;
          setVisible(false);
          setApngMode('off');
        } else {
          for (const video of videos) video.pause();
        }
      } else if (useApng && phase === 'waiting') {
        setApngMode('animation');
        setApngCycle((cycle) => cycle + 1);
      } else if (phase === 'playing') {
        void Promise.all(videos.map((video) => video.play())).then(() => {
          if (!disposed && phase === 'playing') animationFrame = window.requestAnimationFrame(animateFrame);
        }).catch(() => undefined);
      }
    };

    for (const media of useApng ? apngImages : videos) media.addEventListener(useApng ? 'load' : 'canplay', onMediaReady);
    if (!useApng) back!.addEventListener('ended', onEnded);
    document.addEventListener('visibilitychange', onVisibilityChange);
    if (useApng
      ? apngImages.every((image) => image.complete && image.naturalWidth > 0)
      : videos.every((video) => video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA)) startCycle();

    return () => {
      disposed = true;
      window.cancelAnimationFrame(animationFrame);
      window.clearTimeout(restartTimer);
      window.clearTimeout(imageEndTimer);
      for (const media of useApng ? apngImages : videos) media.removeEventListener(useApng ? 'load' : 'canplay', onMediaReady);
      if (!useApng) back!.removeEventListener('ended', onEnded);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      for (const video of videos) {
        video.pause();
        try { video.currentTime = 0; } catch { /* The node is being removed. */ }
      }
    };
  }, [frame, repeat, replayKey, portalTarget, Boolean(cardBox), apngCycle, reducedMotion]);

  if (!frame?.videoUrl || !frame.thumbnailUrl) return null;
  const layerStyle = { visibility: 'hidden' as const };

  return (
    <>
      <div ref={backLayerRef} className="pc-lion-back-layer" style={layerStyle} aria-hidden="true">
        <div ref={shadowRef} className="pc-lion-contact-shadow" />
        <div ref={backTransformRef} className="pc-lion-video-box">
          {needsSinglePlayApngFallback
            ? apngMode !== 'off' && frame.animatedImageUrl && (
              <img
                key={`back-${replayKey}-${apngCycle}`}
                ref={backApngRef}
                className="pc-lion-video"
                src={apngMode === 'poster'
                  ? frame.thumbnailUrl
                  : frame.animatedImageUrl}
                alt=""
                aria-hidden="true"
              />
            )
            : (
              <video
                ref={backVideoRef}
                className="pc-lion-video"
                src={frame.videoUrl}
                poster={frame.thumbnailUrl}
                muted
                playsInline
                preload="auto"
                aria-hidden="true"
              />
            )}
        </div>
      </div>
      {portalTarget && cardBox && createPortal(
        <div
          ref={frontLayerRef}
          className="pc-lion-front-layer"
          style={{
            left: cardBox.left,
            top: cardBox.top,
            width: cardBox.width,
            height: cardBox.height,
            clipPath: 'inset(43% -85% -120% -85% round 24px)',
            ...layerStyle,
          }}
          aria-hidden="true"
        >
          <div ref={frontTransformRef} className="pc-lion-video-box">
            {needsSinglePlayApngFallback
              ? apngMode !== 'off' && frame.animatedImageUrl && (
                <img
                  key={`front-${replayKey}-${apngCycle}`}
                  ref={frontApngRef}
                  className="pc-lion-video pc-lion-video--front"
                  src={apngMode === 'poster'
                    ? frame.thumbnailUrl
                    : frame.animatedImageUrl}
                  alt=""
                  aria-hidden="true"
                />
              )
              : (
                <video
                  ref={frontVideoRef}
                  className="pc-lion-video pc-lion-video--front"
                  src={frame.videoUrl}
                  poster={frame.thumbnailUrl}
                  muted
                  playsInline
                  preload="auto"
                  aria-hidden="true"
                />
              )}
          </div>
        </div>,
        portalTarget,
      )}
    </>
  );
}
