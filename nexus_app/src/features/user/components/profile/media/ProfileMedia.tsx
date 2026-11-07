// Visual-only adapters for the owner's original profile artwork and players.
// These components never upload, mutate an account, or save profile settings.
import Accessibility from '@app/features/accessibility/state/Accessibility';
import type {ProfileCustomization} from '@nexus/schema/src/domains/user/ProfileCustomizationSchemas';
import {observer} from 'mobx-react-lite';
import {lazy, Suspense, useRef, useState, type CSSProperties, type RefObject} from 'react';
import {DECORATIONS, NAMEPLATES, PROFILE_EFFECTS, resolveNameplateId} from './profileMediaCatalog';
import styles from './ProfileMedia.module.css';
import ApngEffectMedia from './ApngEffectMedia';
type NameplateSettings = ProfileCustomization['nameplateSettings'];

const RiveEffectMedia = lazy(() => import('./RiveEffectMedia'));
const Fox = lazy(() => import('./ProfileFrameFox'));
const Lion = lazy(() => import('./ProfileFrameLion'));

export const AvatarDecorationMedia = observer(function AvatarDecorationMedia({
 decoration, size,
}: {decoration: string; size?: number}) {
 const reduced = Accessibility.useReducedMotion;
 if (!decoration || decoration === 'none') return null;
 const preset = DECORATIONS.find((item) => item.id === decoration);
 if (!preset) return null;
 const style = {
  width: size ? size * preset.scale : `${preset.scale * 100}%`,
  height: size ? size * preset.scale : `${preset.scale * 100}%`,
  pointerEvents: 'none' as const,
 };
 return reduced
  ? <StaticAvatarDecoration src={preset.src} style={style} />
  : <img className={styles.decoration} src={preset.src} alt="" draggable={false} aria-hidden="true" style={style} />;
});

function StaticAvatarDecoration({src, style}: {src: string; style: CSSProperties}) {
 const [poster, setPoster] = useState<string | null>(null);
 const [captureComplete, setCaptureComplete] = useState(false);
 const captureFirstFrame = (image: HTMLImageElement) => {
  if (!image.complete || image.naturalWidth === 0) {
   setCaptureComplete(true);
   return;
  }
  try {
   const canvas = document.createElement('canvas');
   canvas.width = image.naturalWidth;
   canvas.height = image.naturalHeight;
   const context = canvas.getContext('2d');
   if (!context) {
    setCaptureComplete(true);
    return;
   }
   context.drawImage(image, 0, 0);
   setPoster(canvas.toDataURL('image/png'));
   setCaptureComplete(true);
  } catch {
   setCaptureComplete(true);
   // Do not leave the animated source mounted if it cannot be frozen.
  }
 };
 return (
  poster
   ? <img className={styles.decoration} src={poster} alt="" draggable={false} aria-hidden="true" style={style} />
   : !captureComplete
    ? <img
      className={styles.decoration}
      src={src}
      alt=""
      draggable={false}
      aria-hidden="true"
      onLoad={(event) => captureFirstFrame(event.currentTarget)}
      onError={() => setCaptureComplete(true)}
      style={{...style, visibility: 'hidden'}}
     />
    : null
 );
}

export const NameplateMedia = observer(function NameplateMedia({settings}: {settings: NameplateSettings}) {
 const id = resolveNameplateId(settings.nameplate);
 const preset = NAMEPLATES.find((item) => item.id === id);
 const custom = id === 'custom' && settings.nameplateImage;
 const src = custom || preset?.src;
 const reduced = Accessibility.useReducedMotion;
 const customUpload = custom ? settings.nameplateUploads?.find((item) => item.filename === custom) : undefined;
 // These VP9 files contain an opaque matte. Use their original alpha-preserving
 // animated WebP on every browser, including WebKit, instead of blending black away.
 const transparentAnimation = !custom && preset?.fallback && /^nameplate-\d{2}$/u.test(preset.id)
  ? preset.fallback : undefined;
 if (!src) return null;
 const video = custom
  ? customUpload?.animated && /\.(webm|mp4)(\?|$)/i.test(custom)
  : preset?.type === 'video';
 const animatedImage = Boolean(custom && customUpload?.animated && !video);
 return <NameplateAsset key={src} src={transparentAnimation ? (reduced ? preset?.thumbnail ?? transparentAnimation : transparentAnimation) : src}
  poster={preset?.thumbnail} fallback={preset?.fallback ?? preset?.thumbnail ?? src}
  video={Boolean(video) && !transparentAnimation} animatedImage={animatedImage} reduced={reduced}/>;
});

function NameplateAsset({src, poster, fallback, video, animatedImage, reduced}: {
 src: string; poster?: string; fallback: string; video: boolean; animatedImage: boolean; reduced: boolean;
}) {
 const [failed, setFailed] = useState(false);
 const reducedVideoPoster = poster ?? (/\.(webm|mp4)(\?|$)/i.test(fallback) ? undefined : fallback);
 return (
   <span className={styles.nameplate} aria-hidden="true" style={{pointerEvents: 'none'}}>
    {animatedImage && reduced ? <StaticNameplateImage src={src} />
     : video && !failed && !reduced ? <video src={src} poster={poster} muted playsInline autoPlay loop preload="metadata" onError={() => setFailed(true)} />
     : video ? (reducedVideoPoster ? <img src={reduced ? reducedVideoPoster : fallback} alt="" /> : null)
    : <img src={src} alt="" loading="lazy" onError={() => setFailed(true)} />}
   </span>
 );
}

function StaticNameplateImage({src}: {src: string}) {
 const [poster, setPoster] = useState<string | null>(null);
 const [captureComplete, setCaptureComplete] = useState(false);
 const captureFirstFrame = (image: HTMLImageElement) => {
  if (!image.complete || image.naturalWidth === 0) {
   setCaptureComplete(true);
   return;
  }
  try {
   const canvas = document.createElement('canvas');
   canvas.width = image.naturalWidth;
   canvas.height = image.naturalHeight;
   const context = canvas.getContext('2d');
   if (!context) {
    setCaptureComplete(true);
    return;
   }
   context.drawImage(image, 0, 0);
   setPoster(canvas.toDataURL('image/png'));
   setCaptureComplete(true);
  } catch {
   setCaptureComplete(true);
   // Do not fall back to animated custom media when reduced motion is enabled.
  }
 };
 const stillStyle: CSSProperties = {position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover'};
 return (
  poster
   ? <img src={poster} alt="" style={stillStyle} />
   : !captureComplete
    ? <img
      src={src}
      alt=""
      onLoad={(event) => captureFirstFrame(event.currentTarget)}
      onError={() => setCaptureComplete(true)}
      style={{...stillStyle, visibility: 'hidden'}}
     />
    : null
 );
}

export const ProfileEffectMedia = observer(function ProfileEffectMedia({
 effectId,
 replayKey = 0,
 zIndex = 8,
}: {
 effectId: string | null | undefined;
 replayKey?: number;
 zIndex?: number;
}) {
 const effect = PROFILE_EFFECTS.find((item) => item.id === effectId);
  const reduced = Accessibility.useReducedMotion;
 if (!effect) return null;
  return <ProfileEffectLayer key={`${effectId}:${replayKey}`} effect={effect} reduced={reduced} replayKey={replayKey} zIndex={zIndex}/>;
});

function ProfileEffectLayer({effect, reduced, replayKey, zIndex}: {
 effect: (typeof PROFILE_EFFECTS)[number];
 reduced: boolean;
 replayKey: number;
  zIndex: number;
}) {
 const [finished, setFinished] = useState(false);
 const [failed, setFailed] = useState(false);
 if (failed) {
  return effect.thumbnail ? <span className={styles.effect} style={{zIndex, pointerEvents: 'none'}} aria-hidden="true"><img src={effect.thumbnail} alt="" /></span> : null;
 }
 if (finished) return null;
  return <span className={styles.effect} style={{zIndex, pointerEvents: 'none'}} aria-hidden="true">
  {reduced ? (effect.thumbnail ? <img src={effect.thumbnail} alt="" /> : null)
   : effect.type === 'webm' ? <video src={effect.src} muted autoPlay playsInline loop={effect.loop}
     onEnded={() => {if (!effect.loop) setFinished(true);}} onError={() => setFailed(true)} />
   : effect.type === 'rive' ? <Suspense fallback={null}><RiveEffectMedia src={effect.src} durationMs={effect.duration ?? 6000}
     loop={effect.loop ?? true} fit="cover" onFinish={() => {if (!effect.loop) setFinished(true);}} /></Suspense>
   : 'segments' in effect && effect.segments ? <ApngEffectMedia effectId={effect.id} segments={effect.segments} cycleKey={replayKey} /> : null}
 </span>;
}

export const ProfileFrameMedia = observer(function ProfileFrameMedia({frame, size, cardRef, replayKey = 0}: {
 frame: string; size?: number; cardRef?: RefObject<HTMLElement | null>; replayKey?: number;
}) {
 const localCardRef = useRef<HTMLSpanElement>(null);
  const reduced = Accessibility.useReducedMotion;
 const selected = ({orbit: 'fox', snake: 'lion'} as Record<string, string>)[frame] ?? frame;
 if (selected === 'none' || !['fox', 'lion'].includes(selected)) return null;
 const target = cardRef ?? localCardRef;
  const player = <Suspense fallback={null}>
   {selected === 'fox' ? <Fox key={`${replayKey}:${reduced}`} cardRef={target} frameId="fox" glowColor="rgba(255, 255, 255, 0.15)" reducedMotion={reduced} />
    : <Lion key={`${replayKey}:${reduced}`} cardRef={target} replayKey={replayKey} repeat={true} reducedMotion={reduced} />}
 </Suspense>;
  if (cardRef) return player;
 return <span className={styles.frameThumbnail} ref={localCardRef} style={{width: size ?? 88, height: size ?? 88, pointerEvents: 'none'}}>
  <span className={styles.thumbnailCard} />
  {selected === 'lion' && <img src="/assets/profile-media/models/profile-frames/lion-profile-seated.png" alt="" />}
  {player}
 </span>;
});
