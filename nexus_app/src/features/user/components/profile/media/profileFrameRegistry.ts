type ProfileCardFrame = string;

export interface ProfileFrameDefinition {
  label: string;
  description: string;
  accentColor: string;
  modelUrl?: string;
  videoUrl?: string;
  animatedImageUrl?: string;
  thumbnailUrl?: string;
  durationSeconds?: number;
  animationPattern?: RegExp;
  fitAxis?: 'height' | 'length';
  trackFraction?: number;
  thumbnailFocus?: 'head' | 'center';
  entrySeconds?: number;
  orbitSeconds: number;
  burstSeconds: number;
  burstScale?: number;
  burstDepth?: number;
  burstFaceCamera?: boolean;
  path: 'rounded-rectangle';
  attribution?: {
    author: string;
    sourceUrl: string;
    license: string;
    licenseUrl: string;
  };
}

export const PROFILE_FRAME_REGISTRY: Record<string, ProfileFrameDefinition> = {
  fox: {
    label: 'Fox 3D',
    description: 'Native fox walk with a depth-aware card orbit',
    accentColor: '#ff9b45',
    modelUrl: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Fox/glTF-Binary/Fox.glb',
    animationPattern: /walk/i,
    entrySeconds: 0.6,
    orbitSeconds: 9.2,
    burstSeconds: 1.4,
    burstScale: 1.04,
    burstDepth: 0.24,
    fitAxis: 'height',
    path: 'rounded-rectangle',
    attribution: {
      author: 'PixelMannen (fox model); tomkranis (rigging and animation)',
      sourceUrl: 'https://github.com/KhronosGroup/glTF-Sample-Models/tree/main/2.0/Fox',
      license: 'CC0 (model) / CC-BY 4.0 (rigging and animation)',
      licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
    },
  },
  lion: {
    label: 'Lion',
    description: 'Seated rise and forward approach',
    accentColor: '#f6b45d',
    videoUrl: '/assets/profile-media/models/profile-frames/lion-profile-emerge.webm',
    animatedImageUrl: '/assets/profile-media/models/profile-frames/lion-profile-emerge.png',
    thumbnailUrl: '/assets/profile-media/models/profile-frames/lion-profile-seated.png',
    durationSeconds: 9.93,
    orbitSeconds: 0,
    burstSeconds: 0,
    path: 'rounded-rectangle',
  },
};

export const PROFILE_FRAME_OPTIONS = [
  { id: 'none', label: 'No Frame', description: 'Standard profile card without a 3D model', accentColor: '#6fe3d0', attribution: undefined, thumbnailUrl: undefined },
  ...Object.entries(PROFILE_FRAME_REGISTRY).map(([id, frame]) => ({
    id,
    label: frame.label,
    description: frame.description,
    accentColor: frame.accentColor,
    attribution: frame.attribution,
    thumbnailUrl: frame.thumbnailUrl,
  })),
];

const LEGACY_FRAME_ALIASES: Record<string, string> = { orbit: 'fox', snake: 'lion' };

function resolveFrameId(frameId: string): string {
  return Object.prototype.hasOwnProperty.call(LEGACY_FRAME_ALIASES, frameId)
    ? LEGACY_FRAME_ALIASES[frameId]!
    : frameId;
}

export function getProfileFrameDefinition(frameId: string | null | undefined): ProfileFrameDefinition | undefined {
  if (!frameId) return undefined;
  const resolvedId = resolveFrameId(frameId);
  if (!Object.prototype.hasOwnProperty.call(PROFILE_FRAME_REGISTRY, resolvedId)) return undefined;
  return PROFILE_FRAME_REGISTRY[resolvedId];
}

export function normalizeProfileFrameSelection(frameId: string | null | undefined): ProfileCardFrame {
  if (!frameId || frameId === 'none') return 'none';
  const resolvedId = resolveFrameId(frameId);
  return getProfileFrameDefinition(resolvedId) ? resolvedId as ProfileCardFrame : 'none';
}
