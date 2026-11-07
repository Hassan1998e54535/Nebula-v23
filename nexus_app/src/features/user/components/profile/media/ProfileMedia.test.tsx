// @vitest-environment happy-dom
// SPDX-License-Identifier: Nebula

import type {ProfileCustomization} from '@nexus/schema/src/domains/user/ProfileCustomizationSchemas';
import {act, type ReactNode} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {readFileSync} from 'node:fs';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

const mocks = vi.hoisted(() => ({setReducedMotion: vi.fn()}));

vi.mock('@app/features/accessibility/state/Accessibility', async () => {
 const {observable} = await import('mobx');
 const accessibility = observable({useReducedMotion: false});
 mocks.setReducedMotion.mockImplementation((reduced: boolean) => {
  accessibility.useReducedMotion = reduced;
 });
 return {default: accessibility};
});
vi.mock('@lingui/react/macro', () => ({
 Trans: ({children}: {children: ReactNode}) => children,
}));
vi.mock('./ProfileFrameFox', () => ({
 default: ({reducedMotion}: {reducedMotion: boolean}) => <span data-frame-reduced-motion={String(reducedMotion)} />,
}));
vi.mock('./ProfileFrameLion', () => ({
 default: ({reducedMotion}: {reducedMotion: boolean}) => <span data-frame-reduced-motion={String(reducedMotion)} />,
}));

import {
 AvatarDecorationMedia,
 NameplateMedia,
 ProfileEffectMedia,
 ProfileFrameMedia,
} from '@app/features/user/components/profile/media/ProfileMedia';
import {ProfileCardLayout} from '@app/features/user/components/profile/profile_card/ProfileCardLayout';

let container: HTMLDivElement;
let root: Root;

function render(node: ReactNode) {
 act(() => root.render(node));
}

async function renderAndWaitForLazyMedia(node: ReactNode) {
 await act(async () => {
  root.render(node);
  await new Promise((resolve) => setTimeout(resolve, 0));
 });
}

beforeEach(() => {
 (globalThis as {IS_REACT_ACT_ENVIRONMENT?: boolean}).IS_REACT_ACT_ENVIRONMENT = true;
 mocks.setReducedMotion(false);
 container = document.createElement('div');
 document.body.append(container);
 root = createRoot(container);
});

afterEach(() => {
 act(() => root.unmount());
 container.remove();
 vi.restoreAllMocks();
});

describe('profile media motion preferences', () => {
 it('uses the app reduced-motion preference for effects and nameplates', () => {
  const nameplateSettings = {
   nameplate: 'nameplate-01',
   nameplateImage: null,
   nameplateCrop: null,
   nameplateUploads: [],
  } satisfies ProfileCustomization['nameplateSettings'];

  render(
   <>
    <ProfileEffectMedia effectId="nexus-pulse" />
    <NameplateMedia settings={nameplateSettings} />
   </>,
  );
  expect(container.querySelector('video[src*="nexus-pulse"]')).not.toBeNull();
  expect(container.querySelector('img[src*="animated.webp"]')).not.toBeNull();

  act(() => mocks.setReducedMotion(true));
  expect(container.querySelector('video[src*="nexus-pulse"]')).toBeNull();
  expect(container.querySelector('img[src*="thumbnail.webp"]')).not.toBeNull();
  expect(container.querySelector('img[src*="poster.webp"]')).not.toBeNull();
 });

 it('keeps an avatar decoration visible as a captured still frame when motion is reduced', () => {
  const drawImage = vi.fn();
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({drawImage} as unknown as CanvasRenderingContext2D);
  vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/png;base64,still');
  act(() => mocks.setReducedMotion(true));

  render(<AvatarDecorationMedia decoration="a_363732b221f45aa7e81b3be945c6e072" size={48} />);
  const animatedImage = container.querySelector<HTMLImageElement>('img[style*="visibility: hidden"]');
  expect(animatedImage).not.toBeNull();
  Object.defineProperties(animatedImage, {
   complete: {configurable: true, value: true},
   naturalWidth: {configurable: true, value: 48},
   naturalHeight: {configurable: true, value: 48},
  });
  act(() => animatedImage?.dispatchEvent(new Event('load', {bubbles: false})));

  expect(drawImage).toHaveBeenCalledOnce();
  expect(container.querySelector('img[src="data:image/png;base64,still"]')).not.toBeNull();
  expect(container.querySelector('img[style*="visibility: hidden"]')).toBeNull();
 });

 it('freezes uploaded animated nameplates on their first frame', () => {
  const drawImage = vi.fn();
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({drawImage} as unknown as CanvasRenderingContext2D);
  vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/png;base64,nameplate-still');
  act(() => mocks.setReducedMotion(true));

  const nameplateSettings = {
   nameplate: 'custom',
   nameplateImage: 'uploads/custom-animated.webp',
   nameplateCrop: null,
   nameplateUploads: [{filename: 'uploads/custom-animated.webp', animated: true}],
  } satisfies ProfileCustomization['nameplateSettings'];
  render(<NameplateMedia settings={nameplateSettings} />);
  const animatedImage = container.querySelector<HTMLImageElement>('img[src="uploads/custom-animated.webp"]');
  expect(animatedImage?.style.visibility).toBe('hidden');
  Object.defineProperties(animatedImage, {
   complete: {configurable: true, value: true},
   naturalWidth: {configurable: true, value: 64},
   naturalHeight: {configurable: true, value: 32},
  });
  act(() => animatedImage?.dispatchEvent(new Event('load', {bubbles: false})));

  expect(drawImage).toHaveBeenCalledOnce();
  expect(container.querySelector('img[src="data:image/png;base64,nameplate-still"]')).not.toBeNull();
  expect(container.querySelector('img[src="uploads/custom-animated.webp"]')).toBeNull();
 });

 it('uses the still image for legacy video nameplates when motion is reduced', () => {
  const nameplateSettings = {
   nameplate: 'raven-ascent',
   nameplateImage: null,
   nameplateCrop: null,
   nameplateUploads: [],
  } satisfies ProfileCustomization['nameplateSettings'];
  render(<NameplateMedia settings={nameplateSettings} />);
  expect(container.querySelector('video[src*="nameplate-raven-ascent.mp4"]')).not.toBeNull();

  act(() => mocks.setReducedMotion(true));
  expect(container.querySelector('video[src*="nameplate-raven-ascent.mp4"]')).toBeNull();
  expect(container.querySelector('img[src*="nameplate-raven-ascent.png"]')).not.toBeNull();
 });

 it('passes the app preference through to animated profile frame players', async () => {
  act(() => mocks.setReducedMotion(true));
  await renderAndWaitForLazyMedia(<ProfileFrameMedia frame="fox" size={72} />);
  expect(container.querySelector('[data-frame-reduced-motion="true"]')).not.toBeNull();

  await act(async () => {
   mocks.setReducedMotion(false);
   await new Promise((resolve) => setTimeout(resolve, 0));
  });
  await renderAndWaitForLazyMedia(<ProfileFrameMedia frame="fox" size={72} />);
  expect(container.querySelector('[data-frame-reduced-motion="false"]')).not.toBeNull();
 });

 it('keeps profile controls clickable above decorative media layers', () => {
  const onClick = vi.fn();
  act(() => mocks.setReducedMotion(true));
  render(
   <ProfileCardLayout
    borderColor="#123456"
    profileEffectLayers={['nexus-pulse']}
    profileFrameLayers={[]}
   >
    <button type="button" onClick={onClick}>Open profile</button>
   </ProfileCardLayout>,
  );

  const effectLayer = container.querySelector<HTMLElement>('span[aria-hidden="true"]');
  expect(effectLayer?.style.pointerEvents).toBe('none');
  container.querySelector('button')?.click();
  expect(onClick).toHaveBeenCalledOnce();

  const styles = readFileSync('./src/features/user/components/profile/media/ProfileMedia.module.css', 'utf8');
  expect(styles).toMatch(/pc-profile-frame-canvas[\s\S]*?pointer-events:\s*none/u);
  expect(styles).toMatch(/pc-lion-back-layer[\s\S]*?pointer-events:\s*none/u);
  expect(styles).toMatch(/pc-lion-front-layer[\s\S]*?pointer-events:\s*none/u);
 });
});
