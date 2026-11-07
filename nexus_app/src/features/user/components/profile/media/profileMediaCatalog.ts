// Media definitions adapted from the owner's original NEXUS source bundle.
import {ANIMATED_AVATAR_DECORATION_PRESETS} from './avatarDecorationAssets';
import {DISCORD_PROFILE_EFFECTS} from './profileEffectDefinitions';

export interface ProfileEffectAnimationSegment {
 assetUrl: string; durationMs: number; phase: 'intro' | 'loop';
}
export interface ProfileEffectDefinition {
 id: string; name: string; type: 'apng' | 'rive' | 'webm';
 assetUrl: string; thumbnailUrl?: string; posterUrl?: string;
 durationMs?: number; loop?: boolean; enabled?: boolean; layer?: string;
 fit?: 'cover' | 'contain' | 'fill';
 segments?: readonly ProfileEffectAnimationSegment[];
 [key: string]: unknown;
}
export const profileAssetUrl = (path: string) => {
 if (path.startsWith('/assets/profile-media/')) return path;
 if (/^(https?:|blob:|data:)/i.test(path)) return path;
 return `/assets/profile-media/${path.replace(/^\/+/, '')}`;
};
export const DECORATIONS = ANIMATED_AVATAR_DECORATION_PRESETS;
const legacyPlates = [
 ['moonlight', 'Moonlight', 'moonlight.jpg'], ['purple-flame', 'Purple Flame', 'purple-flame.jpg'],
 ['black-birds', 'Black Birds', 'black-birds.jpg'], ['raven-ascent', 'Raven Ascent', 'raven-ascent.mp4'],
 ['raven-ascent-still', 'Raven Ascent · Still', 'raven-ascent.png'], ['eclipse', 'Solar Eclipse', 'eclipse.jpg'],
 ['ocean', 'Ocean Wave', 'ocean.jpg'], ['falling-stars', 'Falling Stars', 'falling-stars.jpg'],
 ['aurora', 'Northern Lights', 'aurora.jpg'], ['golden-dust', 'Golden Dust', 'golden-dust.jpg'],
 ['neon-waves', 'Neon City', 'neon-city.jpg'], ['snow-forest', 'Snow Forest', 'snow-forest.jpg'],
] as const;
export const NAMEPLATES: Array<{id: string; label: string; src: string; type: 'video' | 'image'; thumbnail?: string; fallback?: string; description?: string}> = [
 ...Array.from({length: 26}, (_, i) => {
  const number = String(i + 1).padStart(2, '0');
  return {id: `nameplate-${number}`, label: `Nameplate ${number}`, src: profileAssetUrl(`nameplates/community-pack/nameplate-${number}.webm`), thumbnail: profileAssetUrl(`nameplates/community-pack/nameplate-${number}.poster.webp`), fallback: profileAssetUrl(`nameplates/community-pack/nameplate-${number}.animated.webp`), type: 'video' as const, description: 'Original animated nameplate'};
 }),
  ...legacyPlates.map(([id, label, file]) => ({
   id, label, src: profileAssetUrl(`nameplates/nameplate-${file}`),
   type: file.endsWith('.mp4') ? 'video' as const : 'image' as const,
   ...(id === 'raven-ascent' ? {thumbnail: profileAssetUrl('nameplates/nameplate-raven-ascent.png')} : {}),
  })),
];
export const PROFILE_EFFECTS = [
 {id: 'nexus-pulse', name: 'NEXUS Pulse', type: 'webm', src: profileAssetUrl('profile-effects/nexus-pulse/effect.webm'), thumbnail: profileAssetUrl('profile-effects/nexus-pulse/thumbnail.webp'), loop: false, duration: 2800},
 ...['ocean-life', 'a-sassy-crocodile', 'swimming-fish'].map((id) => ({
  id, name: id.split('-').map((word) => word[0].toUpperCase() + word.slice(1)).join(' '), type: 'rive',
  src: profileAssetUrl(`profile-effects/${id}/${id}.riv`), thumbnail: profileAssetUrl(`profile-effects/${id}/thumbnail.png`), loop: true, duration: 6000,
 })),
 ...DISCORD_PROFILE_EFFECTS.map((effect) => ({
  ...effect, src: profileAssetUrl(effect.assetUrl), thumbnail: effect.thumbnailUrl ? profileAssetUrl(effect.thumbnailUrl) : undefined,
  duration: effect.durationMs, segments: effect.segments?.map((segment) => ({...segment, assetUrl: profileAssetUrl(segment.assetUrl)})),
 })),
];
export const FRAMES = [
 {id: 'none', name: 'No Frame', description: 'Standard card'},
 {id: 'fox', name: 'Fox 3D', description: 'Original depth-aware animated fox'},
 {id: 'lion', name: 'Lion', description: 'Original animated lion', thumbnail: profileAssetUrl('models/profile-frames/lion-profile-seated.png')},
];
export const resolveNameplateId = (id: string) =>
 ({signal: 'purple-flame', orbit: 'falling-stars', horizon: 'aurora', 'cyber-grid': 'snow-forest'} as Record<string, string>)[id] ?? id;
