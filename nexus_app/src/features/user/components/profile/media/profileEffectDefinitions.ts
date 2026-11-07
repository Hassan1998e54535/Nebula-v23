import type { ProfileEffectAnimationSegment, ProfileEffectDefinition } from './profileMediaCatalog';

const createDiscordEffect = (
  slug: string,
  name: string,
  segments: readonly ProfileEffectAnimationSegment[],
): ProfileEffectDefinition => {
  const firstSegment = segments[0];
  if (!firstSegment) throw new Error(`Profile effect ${slug} has no animation segments.`);
  const introDuration = Math.max(0, ...segments.filter((segment) => segment.phase === 'intro').map((segment) => segment.durationMs));
  return {
    id: `discord-${slug}`,
    name,
    description: `Animated ${name} profile effect.`,
    type: 'apng',
    assetUrl: segments.find((segment) => segment.phase === 'intro')?.assetUrl ?? firstSegment.assetUrl,
    posterUrl: `/profile-effects/discord-pack/${slug}/thumbnail.png`,
    thumbnailUrl: `/profile-effects/discord-pack/${slug}/thumbnail.png`,
    durationMs: introDuration || firstSegment.durationMs,
    loop: true,
    trigger: 'profile-open',
    layer: 'overlay',
    fit: 'fill',
    segments,
    defaultGrant: true,
    enabled: true,
  };
};

export const DISCORD_PROFILE_EFFECTS: readonly ProfileEffectDefinition[] = [
  createDiscordEffect('splash', 'Splash', [
    { assetUrl: '/profile-effects/discord-pack/splash/intro.png', durationMs: 2880, phase: 'intro' },
    { assetUrl: '/profile-effects/discord-pack/splash/loop.png', durationMs: 2880, phase: 'loop' },
  ]),
  createDiscordEffect('earthquake', 'Earthquake', [
    { assetUrl: '/profile-effects/discord-pack/earthquake/intro.png', durationMs: 2880, phase: 'intro' },
    { assetUrl: '/profile-effects/discord-pack/earthquake/loop.png', durationMs: 2880, phase: 'loop' },
  ]),
  createDiscordEffect('magic-girl', 'Magic Girl', [
    { assetUrl: '/profile-effects/discord-pack/magic-girl/intro.png', durationMs: 2880, phase: 'intro' },
    { assetUrl: '/profile-effects/discord-pack/magic-girl/loop.png', durationMs: 2880, phase: 'loop' },
  ]),
  createDiscordEffect('sakura', 'Sakura', [
    { assetUrl: '/profile-effects/discord-pack/sakura/intro.png', durationMs: 3000, phase: 'intro' },
    { assetUrl: '/profile-effects/discord-pack/sakura/loop.png', durationMs: 2880, phase: 'loop' },
  ]),
  createDiscordEffect('sayan', 'Sayan', [
    { assetUrl: '/profile-effects/discord-pack/sayan/intro.png', durationMs: 2400, phase: 'intro' },
    { assetUrl: '/profile-effects/discord-pack/sayan/loop.png', durationMs: 2480, phase: 'loop' },
  ]),
  createDiscordEffect('shuriken', 'Shuriken', [
    { assetUrl: '/profile-effects/discord-pack/shuriken/intro3.png', durationMs: 2880, phase: 'intro' },
    { assetUrl: '/profile-effects/discord-pack/shuriken/loop3.png', durationMs: 2000, phase: 'loop' },
  ]),
  createDiscordEffect('vines', 'Vines', [
    { assetUrl: '/profile-effects/discord-pack/vines/intro-glow.png', durationMs: 2573, phase: 'intro' },
    { assetUrl: '/profile-effects/discord-pack/vines/intro.png', durationMs: 3071, phase: 'intro' },
    { assetUrl: '/profile-effects/discord-pack/vines/loop.png', durationMs: 2988, phase: 'loop' },
  ]),
  createDiscordEffect('fairy', 'Fairy', [
    { assetUrl: '/profile-effects/discord-pack/fairy/loop.png', durationMs: 2880, phase: 'loop' },
  ]),
  createDiscordEffect('cereal', 'Cereal', [
    { assetUrl: '/profile-effects/discord-pack/cereal/intro.png', durationMs: 2880, phase: 'intro' },
    { assetUrl: '/profile-effects/discord-pack/cereal/loop.png', durationMs: 2880, phase: 'loop' },
  ]),
  createDiscordEffect('plate', 'Plate', [
    { assetUrl: '/profile-effects/discord-pack/plate/intro.png', durationMs: 2880, phase: 'intro' },
    { assetUrl: '/profile-effects/discord-pack/plate/loop.png', durationMs: 2880, phase: 'loop' },
  ]),
  createDiscordEffect('punk-girl', 'Punk Girl', [
    { assetUrl: '/profile-effects/discord-pack/punk-girl/intro.png', durationMs: 2573, phase: 'intro' },
    { assetUrl: '/profile-effects/discord-pack/punk-girl/loop.png', durationMs: 2000, phase: 'loop' },
  ]),
  createDiscordEffect('ghost-skull', 'Ghost Skull', [
    { assetUrl: '/profile-effects/discord-pack/ghost-skull/intro.png', durationMs: 2880, phase: 'intro' },
    { assetUrl: '/profile-effects/discord-pack/ghost-skull/loop.png', durationMs: 2880, phase: 'loop' },
  ]),
  createDiscordEffect('zombie-slime', 'Zombie Slime', [
    { assetUrl: '/profile-effects/discord-pack/zombie-slime/intro.png', durationMs: 2880, phase: 'intro' },
    { assetUrl: '/profile-effects/discord-pack/zombie-slime/loop.png', durationMs: 2880, phase: 'loop' },
  ]),
  createDiscordEffect('leaves', 'Leaves', [
    { assetUrl: '/profile-effects/discord-pack/leaves/intro-branch.png', durationMs: 2988, phase: 'intro' },
    { assetUrl: '/profile-effects/discord-pack/leaves/intro-leaves.png', durationMs: 2988, phase: 'intro' },
    { assetUrl: '/profile-effects/discord-pack/leaves/loop.png', durationMs: 3984, phase: 'loop' },
  ]),
  createDiscordEffect('rain', 'Rain', [
    { assetUrl: '/profile-effects/discord-pack/rain/intro.png', durationMs: 2880, phase: 'intro' },
    { assetUrl: '/profile-effects/discord-pack/rain/loop.png', durationMs: 2880, phase: 'loop' },
  ]),
  createDiscordEffect('deck-the-halls', 'Deck the Halls', [
    { assetUrl: '/profile-effects/discord-pack/deck-the-halls/intro.png', durationMs: 1680, phase: 'intro' },
    { assetUrl: '/profile-effects/discord-pack/deck-the-halls/loop.png', durationMs: 1250, phase: 'loop' },
  ]),
  createDiscordEffect('snowy-shenanigans', 'Snowy Shenanigans', [
    { assetUrl: '/profile-effects/discord-pack/snowy-shenanigans/intro.png', durationMs: 4167, phase: 'intro' },
    { assetUrl: '/profile-effects/discord-pack/snowy-shenanigans/loop.png', durationMs: 8333, phase: 'loop' },
  ]),
  createDiscordEffect('goozilla', 'Gozilla', [
    { assetUrl: '/profile-effects/discord-pack/goozilla/intro-claw.png', durationMs: 4250, phase: 'intro' },
    { assetUrl: '/profile-effects/discord-pack/goozilla/intro-slime.png', durationMs: 4250, phase: 'intro' },
    { assetUrl: '/profile-effects/discord-pack/goozilla/loop.png', durationMs: 3000, phase: 'loop' },
  ]),
  createDiscordEffect('heartzilla', 'Heartzilla', [
    { assetUrl: '/profile-effects/discord-pack/heartzilla/intro.png', durationMs: 3750, phase: 'intro' },
    { assetUrl: '/profile-effects/discord-pack/heartzilla/loop.png', durationMs: 4000, phase: 'loop' },
  ]),
  createDiscordEffect('monster-pop', 'Monster Pop', [
    { assetUrl: '/profile-effects/discord-pack/monster-pop/intro-glass.png', durationMs: 3917, phase: 'intro' },
    { assetUrl: '/profile-effects/discord-pack/monster-pop/intro-monster.png', durationMs: 3917, phase: 'intro' },
    { assetUrl: '/profile-effects/discord-pack/monster-pop/loop.png', durationMs: 2083, phase: 'loop' },
  ]),
  createDiscordEffect('cyberpunk-nightrunner', 'Cyberpunk Nightrunner', [
    { assetUrl: '/profile-effects/discord-pack/cyberpunk-nightrunner/intro.png', durationMs: 2960, phase: 'intro' },
    { assetUrl: '/profile-effects/discord-pack/cyberpunk-nightrunner/idle.png', durationMs: 3083, phase: 'loop' },
  ]),
  createDiscordEffect('cyberpunk-uplinkerror', 'Cyberpunk Uplink Error', [
    { assetUrl: '/profile-effects/discord-pack/cyberpunk-uplinkerror/intro.png', durationMs: 2880, phase: 'intro' },
    { assetUrl: '/profile-effects/discord-pack/cyberpunk-uplinkerror/idle.png', durationMs: 3000, phase: 'loop' },
  ]),
  createDiscordEffect('dragon-dance', 'Dragon Dance', [
    { assetUrl: '/profile-effects/discord-pack/dragon-dance/intro.png', durationMs: 3200, phase: 'intro' },
    { assetUrl: '/profile-effects/discord-pack/dragon-dance/loop.png', durationMs: 9120, phase: 'loop' },
  ]),
  createDiscordEffect('fortune-flurry', 'Fortune Flurry', [
    { assetUrl: '/profile-effects/discord-pack/fortune-flurry/frame.png', durationMs: 2880, phase: 'intro' },
    { assetUrl: '/profile-effects/discord-pack/fortune-flurry/intro.png', durationMs: 2880, phase: 'intro' },
    { assetUrl: '/profile-effects/discord-pack/fortune-flurry/loop.png', durationMs: 10000, phase: 'loop' },
  ]),
  createDiscordEffect('midnight-celebration', 'Midnight Celebration', [
    { assetUrl: '/profile-effects/discord-pack/midnight-celebration/frame.png', durationMs: 2880, phase: 'intro' },
    { assetUrl: '/profile-effects/discord-pack/midnight-celebration/intro.png', durationMs: 2880, phase: 'intro' },
    { assetUrl: '/profile-effects/discord-pack/midnight-celebration/fireworks.png', durationMs: 2988, phase: 'loop' },
  ]),
  createDiscordEffect('rock-slide', 'Rock Slide', [
    { assetUrl: '/profile-effects/discord-pack/rock-slide/intro.png', durationMs: 2960, phase: 'intro' },
    { assetUrl: '/profile-effects/discord-pack/rock-slide/idle.png', durationMs: 2988, phase: 'loop' },
  ]),
  createDiscordEffect('vortex', 'Vortex', [
    { assetUrl: '/profile-effects/discord-pack/vortex/intro.png', durationMs: 2880, phase: 'intro' },
    { assetUrl: '/profile-effects/discord-pack/vortex/idle.png', durationMs: 2988, phase: 'loop' },
  ]),
  createDiscordEffect('mastery', 'Mastery', [
    { assetUrl: '/profile-effects/discord-pack/mastery/intro.png', durationMs: 2880, phase: 'intro' },
    { assetUrl: '/profile-effects/discord-pack/mastery/idle.png', durationMs: 2988, phase: 'loop' },
  ]),
  createDiscordEffect('boost-relic', 'Boost Relic', [
    { assetUrl: '/profile-effects/discord-pack/boost-relic/intro.png', durationMs: 2880, phase: 'intro' },
    { assetUrl: '/profile-effects/discord-pack/boost-relic/loop.png', durationMs: 2880, phase: 'loop' },
  ]),
  createDiscordEffect('cyberspace', 'Cyberspace', [
    { assetUrl: '/profile-effects/discord-pack/cyberspace/intro.png', durationMs: 2880, phase: 'intro' },
    { assetUrl: '/profile-effects/discord-pack/cyberspace/loop.png', durationMs: 2880, phase: 'loop' },
  ]),
];
