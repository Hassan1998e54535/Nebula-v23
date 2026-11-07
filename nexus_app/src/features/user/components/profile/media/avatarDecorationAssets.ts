const APP_BASE = '/assets/profile-media/';

const UPLOADED_PRESET_IDS = new Set<string>([
  'a_363732b221f45aa7e81b3be945c6e072',
  'a_3bc2102f59a5b25882200da18b4e7b12',
  'a_3cf1ad31f0c0c77a90319c13632d808e',
  'a_445566ed965b2c1632a5b45c92f32d11',
  'a_47202ff223e839a2ecf14a8b0f3ce7a1',
  'a_50b440810b1bbd89f6284f36d40ad0af',
  'a_59cc4926ae2483fa7c714bd36cc5acd9',
  'a_60cb281fac6d8f558efaf6dd9fe4dbe4',
  'a_657d2766be35a27a8239f98c60e414c0',
  'a_6ce16e08392fd882eef1b568f3c4d3d3',
  'a_78f326d95c0193c317470e3e81db81e7',
  'a_798a5bcbb11067e4d9ab339e51d2a16c',
  'a_904b1989077c91fca1168d39bfcaa0a4',
  'a_9cc1c1426ea5478aac7be6cdefdbc568',
  'a_c45abe8c7585fdb41b8d8d4d666f1588',
  'a_c899a523b33e54210c0d5577a35907b4',
  'a_db9baf0ba7cf449d2b027c06309dbe8d',
  'a_e22f8023a51155d8d47012797f20d98c',
  'a_e73462eef71738e4e478a55ccea7823d',
  'a_ea9e485919a47373eb2f05cc4a1d0c0c',
  'a_f1c2e3a6005a8bfc3bec150569f7baca',
  'a_f2cea6597b77a277ff458099d051ba62',
]);

// Scale each locally supplied APNG for its visible artwork, not just its
// square canvas. These values compensate for transparent padding measured
// from each source's first frame; the target visible footprint is ~1.26× the
// avatar's unscaled diameter. CDN-only assets use a slightly enlarged default.
const PRESET_ART_SCALE: Readonly<Record<string, number>> = {
  a_363732b221f45aa7e81b3be945c6e072: 1.27,
  a_3bc2102f59a5b25882200da18b4e7b12: 1.28,
  a_3cf1ad31f0c0c77a90319c13632d808e: 1.32,
  a_445566ed965b2c1632a5b45c92f32d11: 1.27,
  a_47202ff223e839a2ecf14a8b0f3ce7a1: 1.27,
  a_50b440810b1bbd89f6284f36d40ad0af: 1.48,
  a_59cc4926ae2483fa7c714bd36cc5acd9: 1.26,
  a_60cb281fac6d8f558efaf6dd9fe4dbe4: 1.31,
  a_657d2766be35a27a8239f98c60e414c0: 1.32,
  a_6ce16e08392fd882eef1b568f3c4d3d3: 1.26,
  a_78f326d95c0193c317470e3e81db81e7: 1.69,
  a_798a5bcbb11067e4d9ab339e51d2a16c: 1.32,
  a_904b1989077c91fca1168d39bfcaa0a4: 1.26,
  a_9cc1c1426ea5478aac7be6cdefdbc568: 1.59,
  a_c45abe8c7585fdb41b8d8d4d666f1588: 1.26,
  a_c899a523b33e54210c0d5577a35907b4: 1.26,
  a_db9baf0ba7cf449d2b027c06309dbe8d: 1.40,
  a_e22f8023a51155d8d47012797f20d98c: 1.36,
  a_e73462eef71738e4e478a55ccea7823d: 1.27,
  a_ea9e485919a47373eb2f05cc4a1d0c0c: 1.33,
  a_f1c2e3a6005a8bfc3bec150569f7baca: 1.33,
  a_f2cea6597b77a277ff458099d051ba62: 1.26,
};

/**
 * Animated APNG decorations supplied by the user are served locally; the rest
 * of the original catalog remains available from Discord's CDN.
 */
export const ANIMATED_AVATAR_DECORATION_PRESETS = Array.from(UPLOADED_PRESET_IDS).map(
  (id, index) => ({
    id,
    label: `Animated ${String(index + 1).padStart(2, '0')}`,
    scale: PRESET_ART_SCALE[id] ?? 1.42,
    src: UPLOADED_PRESET_IDS.has(id)
      ? `${APP_BASE}avatar-decorations/${id}.png`
      : `https://cdn.discordapp.com/avatar-decoration-presets/${id}.png?size=240&passthrough=true`,
  }),
);

const PRESETS_BY_ID: ReadonlyMap<string, (typeof ANIMATED_AVATAR_DECORATION_PRESETS)[number]> = new Map(
  ANIMATED_AVATAR_DECORATION_PRESETS.map((preset) => [preset.id, preset] as const),
);

export function getAnimatedAvatarDecorationPreset(id: string) {
  return PRESETS_BY_ID.get(id) ?? null;
}

export function getAvatarDecorationScale(id: string) {
  return PRESETS_BY_ID.get(id)?.scale ?? 1.42;
}

/**
 * Finds the visible alpha footprint in an RGBA buffer and returns the image
 * scale needed to make that footprint about 1.26 avatar diameters wide/tall.
 */
export function measureAvatarDecorationScale(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
): number | null {
  if (width <= 0 || height <= 0 || rgba.length < width * height * 4) return null;
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if ((rgba[(y * width + x) * 4 + 3] ?? 0) < 16) continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }

  if (maxX < minX || maxY < minY) return null;
  const visibleFraction = Math.max((maxX - minX + 1) / width, (maxY - minY + 1) / height);
  return Math.max(1.26, Math.min(1.75, Math.round((1.26 / visibleFraction) * 100) / 100));
}

export function getAvatarDecorationLabel(id: string) {
  return getAnimatedAvatarDecorationPreset(id)?.label
    ?? (id === 'none' ? 'None' : id.charAt(0).toUpperCase() + id.slice(1));
}
