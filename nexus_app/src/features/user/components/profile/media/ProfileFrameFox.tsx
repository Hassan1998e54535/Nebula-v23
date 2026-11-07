import { useEffect, useRef, type RefObject } from 'react';
import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/addons/loaders/GLTFLoader.js';
import { clone as cloneSkinnedModel } from 'three/addons/utils/SkeletonUtils.js';
import { createRoundedRectTrack, nearestRoundedRectTrackProgress, pointOnRoundedRectTrack, type RoundedRectTrack } from './profileFrameMotion';
import { getProfileFrameDefinition, type ProfileFrameDefinition } from './profileFrameRegistry';

const WORLD_UNITS_PER_CSS_PIXEL = 0.01;
const CAMERA_FOV = 36;

const frameAssetPromises = new Map<string, Promise<GLTF>>();

function loadFrameAsset(modelUrl: string): Promise<GLTF> {
  let request = frameAssetPromises.get(modelUrl);
  if (!request) {
    request = new GLTFLoader().loadAsync(modelUrl).catch((error: unknown) => {
      frameAssetPromises.delete(modelUrl);
      throw error;
    });
    frameAssetPromises.set(modelUrl, request);
  }
  return request;
}

function roundedRadius(element: HTMLElement, rect: DOMRect): number {
  const computed = window.getComputedStyle(element).borderTopLeftRadius;
  const localRadius = Number.parseFloat(computed) || 0;
  const scale = element.offsetWidth > 0 ? rect.width / element.offsetWidth : 1;
  return Math.max(0, Math.min(localRadius * scale, rect.width / 2, rect.height / 2));
}

function createFrameTrack(frame: ProfileFrameDefinition, left: number, top: number, width: number, height: number, radius: number) {
  const pathBuilders = {
    'rounded-rectangle': createRoundedRectTrack,
  };
  return pathBuilders[frame.path](left, top, width, height, radius);
}

function createCardOcclusionGeometry(
  canvasWidth: number,
  canvasHeight: number,
  left: number,
  top: number,
  width: number,
  height: number,
  radius: number,
  worldPerPixel: number,
): THREE.ShapeGeometry {
  const inset = Math.min(0.75, width / 8, height / 8);
  const x1 = (left + inset - canvasWidth / 2) * worldPerPixel;
  const x2 = (left + width - inset - canvasWidth / 2) * worldPerPixel;
  const y1 = (canvasHeight / 2 - top - inset) * worldPerPixel;
  const y2 = (canvasHeight / 2 - top - height + inset) * worldPerPixel;
  const corner = Math.max(0, Math.min((radius - inset) * worldPerPixel, (x2 - x1) / 2, (y1 - y2) / 2));
  const shape = new THREE.Shape();

  shape.moveTo(x1 + corner, y1);
  shape.lineTo(x2 - corner, y1);
  shape.quadraticCurveTo(x2, y1, x2, y1 - corner);
  shape.lineTo(x2, y2 + corner);
  shape.quadraticCurveTo(x2, y2, x2 - corner, y2);
  shape.lineTo(x1 + corner, y2);
  shape.quadraticCurveTo(x1, y2, x1, y2 + corner);
  shape.lineTo(x1, y1 - corner);
  shape.quadraticCurveTo(x1, y1, x1 + corner, y1);

  return new THREE.ShapeGeometry(shape, 8);
}

function createContactShadowTexture(): THREE.CanvasTexture {
  const shadowCanvas = document.createElement('canvas');
  shadowCanvas.width = 96;
  shadowCanvas.height = 48;
  const context = shadowCanvas.getContext('2d');
  if (context) {
    const gradient = context.createRadialGradient(48, 24, 2, 48, 24, 24);
    gradient.addColorStop(0, 'rgba(0,0,0,0.58)');
    gradient.addColorStop(0.46, 'rgba(0,0,0,0.30)');
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, shadowCanvas.width, shadowCanvas.height);
  }
  return new THREE.CanvasTexture(shadowCanvas);
}

export default function ProfileFrameFox({ cardRef, frameId, glowColor, reducedMotion }: {
  cardRef: RefObject<HTMLElement | null>;
  frameId: string;
  glowColor: string;
  reducedMotion: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frame = getProfileFrameDefinition(frameId);

  useEffect(() => {
    const canvas = canvasRef.current;
    const card = cardRef.current;
    if (!canvas || !card || !frame) return;

    let disposed = false;
    let animationFrame = 0;
    let renderer: THREE.WebGLRenderer | null = null;
    let mixer: THREE.AnimationMixer | null = null;
    let modelRoot: THREE.Group | null = null;
    let model: THREE.Group | null = null;
    let rimLight: THREE.PointLight | null = null;
    let camera: THREE.PerspectiveCamera | null = null;
    let scene: THREE.Scene | null = null;
    let occlusionMesh: THREE.Mesh<THREE.ShapeGeometry, THREE.MeshBasicMaterial> | null = null;
    let contactShadow: THREE.Sprite | null = null;
    let contactShadowTexture: THREE.CanvasTexture | null = null;
    let lastFrameTime = 0;
    let startTime = 0;
    let renderedWidth = 0;
    let renderedHeight = 0;
    let cameraDistance = 1;
    let worldPerPixel = WORLD_UNITS_PER_CSS_PIXEL;
    let track: RoundedRectTrack = { segments: [], length: 0 };
    let trackKey = '';
    let modelHeight = 1;
    let modelCenter = new THREE.Vector3();
    let modelBottom = 0;
    let modelYaw = 0;
    let modelRoll = 0;
    let entryProgress = 0;
    let targetModelSizeCss = 34;
    const ownedMaterials: THREE.Material[] = [];
    const fadeMaterials: THREE.Material[] = [];

    const resizeAndTrack = () => {
      if (!renderer || !camera) return false;
      const canvasRect = canvas.getBoundingClientRect();
      const cardRect = card.getBoundingClientRect();
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      if (width < 1 || height < 1 || cardRect.width < 1 || cardRect.height < 1) return false;
      const scaleX = canvasRect.width / width || 1;
      const scaleY = canvasRect.height / height || 1;

      const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.6);
      if (Math.abs(width - renderedWidth) > 0.5 || Math.abs(height - renderedHeight) > 0.5) {
        renderedWidth = width;
        renderedHeight = height;
        renderer.setPixelRatio(pixelRatio);
        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        const visibleWorldHeight = height * WORLD_UNITS_PER_CSS_PIXEL;
        cameraDistance = visibleWorldHeight / (2 * Math.tan(THREE.MathUtils.degToRad(CAMERA_FOV / 2)));
        camera.position.set(0, 0, cameraDistance);
        camera.lookAt(0, 0, 0);
        camera.updateProjectionMatrix();
        worldPerPixel = visibleWorldHeight / height;
      }

      const left = (cardRect.left - canvasRect.left) / scaleX;
      const top = (cardRect.top - canvasRect.top) / scaleY;
      const cardWidth = cardRect.width / scaleX;
      const cardHeight = cardRect.height / scaleY;
      const radius = roundedRadius(card, cardRect) / Math.min(scaleX, scaleY);
      const nextTrackKey = [width, height, left, top, cardWidth, cardHeight, radius].map((value) => value.toFixed(1)).join(':');
      if (nextTrackKey !== trackKey) {
        trackKey = nextTrackKey;
        track = createFrameTrack(frame, left, top, cardWidth, cardHeight, radius);
        if (model) {
          targetModelSizeCss = frame.fitAxis === 'length'
            ? cardWidth * (frame.trackFraction ?? 0.2)
            : Math.min(72, Math.max(42, Math.min(cardWidth * 0.18, cardHeight * 0.1)));
          const scale = targetModelSizeCss * worldPerPixel / modelHeight;
          model.scale.setScalar(scale);
          if (frame.fitAxis === 'length') {
            const centerOffset = modelCenter.clone()
              .applyAxisAngle(new THREE.Vector3(0, 0, 1), modelRoll)
              .applyAxisAngle(new THREE.Vector3(0, 1, 0), modelYaw);
            model.position.copy(centerOffset.multiplyScalar(-scale));
          } else {
            model.position.set(-modelCenter.x * scale, -modelBottom * scale, -modelCenter.z * scale);
          }
        }
        entryProgress = frame.entrySeconds
          ? nearestRoundedRectTrackProgress(track, left + cardWidth / 2, top + cardHeight)
          : 0;
        if (scene) {
          const geometry = createCardOcclusionGeometry(
            width,
            height,
            left,
            top,
            cardWidth,
            cardHeight,
            radius,
            worldPerPixel,
          );
          if (occlusionMesh) {
            occlusionMesh.geometry.dispose();
            occlusionMesh.geometry = geometry;
          } else {
            occlusionMesh = new THREE.Mesh(
              geometry,
              new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: true, depthTest: true, side: THREE.DoubleSide }),
            );
            occlusionMesh.renderOrder = 0;
            scene.add(occlusionMesh);
          }
        }
      }
      return track.length > 0;
    };

    const start = async () => {
      const modelUrl = frame.modelUrl;
      if (!modelUrl) return;
      try {
        const gltf = await loadFrameAsset(modelUrl);
        if (disposed) return;

        const animationClip = frame.animationPattern
          ? gltf.animations.find((clip) => frame.animationPattern!.test(clip.name))
          : undefined;
        if (frame.animationPattern && !animationClip) {
          throw new Error(`The ${frame.label} model does not contain its configured animation.`);
        }
        if (!animationClip) {
          throw new Error(`The ${frame.label} model has no animation configured.`);
        }

        renderer = new THREE.WebGLRenderer({
          canvas,
          alpha: true,
          antialias: true,
          powerPreference: 'low-power',
        });
        renderer.setClearColor(0x000000, 0);
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.15;

        scene = new THREE.Scene();
        camera = new THREE.PerspectiveCamera(CAMERA_FOV, 1, 0.05, 100);
        scene.add(new THREE.HemisphereLight(0xfff5ee, 0x201820, 2.4));

        const keyLight = new THREE.DirectionalLight(0xffffff, 3.2);
        keyLight.position.set(-2.5, 3.5, 6);
        scene.add(keyLight);

        rimLight = new THREE.PointLight(new THREE.Color(glowColor), 3.6, 8, 2);
        scene.add(rimLight);
        contactShadowTexture = createContactShadowTexture();
        contactShadow = new THREE.Sprite(new THREE.SpriteMaterial({
          map: contactShadowTexture,
          color: 0x10120f,
          transparent: true,
          opacity: 0.25,
          depthTest: true,
          depthWrite: false,
          toneMapped: false,
        }));
        contactShadow.renderOrder = 0.5;
        scene.add(contactShadow);

        modelRoot = new THREE.Group();
        model = cloneSkinnedModel(gltf.scene) as THREE.Group;
        const bounds = new THREE.Box3().setFromObject(model);
        const size = bounds.getSize(new THREE.Vector3());
        modelCenter = bounds.getCenter(new THREE.Vector3());
        modelBottom = bounds.min.y;
        modelHeight = Math.max(
          frame.fitAxis === 'length' ? Math.max(size.x, size.y, size.z) : size.y,
          0.001,
        );
        modelYaw = 0;
        modelRoll = 0;
        if (frame.fitAxis === 'length') {
          if (size.y >= size.x && size.y >= size.z) modelRoll = -Math.PI / 2;
          else if (size.z >= size.x && size.z >= size.y) modelYaw = Math.PI / 2;
        } else if (size.z > size.x) {
          modelYaw = Math.PI / 2;
        }
        model.rotation.set(0, modelYaw, modelRoll);

        model.traverse((node) => {
          const mesh = node as THREE.Mesh;
          if (!mesh.isMesh) return;
          const cloneMaterial = (material: THREE.Material) => {
            const cloned = material.clone();
            ownedMaterials.push(cloned);
            cloned.transparent = true;
            cloned.opacity = 1;
            cloned.depthWrite = true;
            fadeMaterials.push(cloned);
            cloned.needsUpdate = true;
            return cloned;
          };
          mesh.material = Array.isArray(mesh.material)
            ? mesh.material.map(cloneMaterial)
            : cloneMaterial(mesh.material);
          mesh.renderOrder = 1;
        });

        modelRoot.add(model);
        scene.add(modelRoot);
        if (animationClip) {
          mixer = new THREE.AnimationMixer(model);
          mixer.clipAction(animationClip).play();
        }

        if (disposed) return;
        resizeAndTrack();
        startTime = performance.now();
        lastFrameTime = startTime;

        if (reducedMotion) {
          const stillPoint = pointOnRoundedRectTrack(track, entryProgress);
          const stillAngle = Math.atan2(-stillPoint.dy, stillPoint.dx);
          modelRoot.rotation.z = stillAngle;
          modelRoot.position.set(
            (stillPoint.x - renderedWidth / 2) * worldPerPixel,
            (renderedHeight / 2 - stillPoint.y) * worldPerPixel,
            0,
          );
          mixer?.update(0.12);
          renderer.render(scene, camera);
          return;
        }

        const animate = (now: number) => {
          if (disposed || !renderer || !scene || !camera || !modelRoot) return;
          animationFrame = window.requestAnimationFrame(animate);
          if (document.hidden) {
            lastFrameTime = now;
            return;
          }
          if (!resizeAndTrack()) return;

          const delta = Math.min(Math.max((now - lastFrameTime) / 1000, 0), 0.05);
          lastFrameTime = now;
          mixer?.update(delta);

          const entrySeconds = frame.entrySeconds ?? 0;
          const cycleSeconds = entrySeconds + frame.orbitSeconds + frame.burstSeconds;
          const elapsed = ((now - startTime) / 1000) % cycleSeconds;
          const entryActive = entrySeconds > 0 && elapsed < entrySeconds;
          const orbitElapsed = Math.max(0, elapsed - entrySeconds);
          const orbitProgress = Math.min(orbitElapsed / frame.orbitSeconds, 1);
          const trackProgress = frame.entrySeconds ? entryProgress + orbitProgress : orbitProgress;
          const point = pointOnRoundedRectTrack(track, trackProgress);
          const angle = Math.atan2(-point.dy, point.dx);
          modelRoot.rotation.z = angle;

          const width = renderedWidth;
          const height = renderedHeight;
          const entryEase = entryActive ? (elapsed / entrySeconds) ** 2 * (3 - 2 * elapsed / entrySeconds) : 1;
          const x = entryActive
            ? THREE.MathUtils.lerp(width / 2, point.x, entryEase) - width / 2
            : point.x - width / 2;
          const y = entryActive
            ? height / 2 - THREE.MathUtils.lerp(point.y + targetModelSizeCss * 0.38, point.y, entryEase)
            : height / 2 - point.y;
          const depthAmplitude = targetModelSizeCss * worldPerPixel * 0.32;
          const orbitDepth = Math.sin(trackProgress * Math.PI * 2) * depthAmplitude;

          let opacity = entryActive
            ? entryEase
            : orbitElapsed < 0.18 ? orbitElapsed / 0.18 : 1;
          let burstScale = 1;
          let burstTurn = 0;
          let burstDepth = 0;
          if (orbitElapsed > frame.orbitSeconds) {
            const burstProgress = Math.min((orbitElapsed - frame.orbitSeconds) / frame.burstSeconds, 1);
            const eased = 1 - (1 - burstProgress) ** 3;
            burstDepth = cameraDistance * (frame.burstDepth ?? 0.28) * eased;
            burstScale = 1 + eased * ((frame.burstScale ?? 1.06) - 1);
            burstTurn = eased;
            if (burstProgress > 0.78) opacity *= Math.max(0, 1 - (burstProgress - 0.78) / 0.22);
          }
          modelRoot.position.set(x * worldPerPixel, y * worldPerPixel, orbitDepth + burstDepth);
          if (frame.burstFaceCamera && model) {
            model.rotation.set(0, modelYaw * (1 - burstTurn), modelRoll);
          }
          modelRoot.scale.setScalar(burstScale);
          for (const material of fadeMaterials) material.opacity = opacity;
          if (contactShadow) {
            const shadowScale = targetModelSizeCss * worldPerPixel;
            contactShadow.position.set(
              modelRoot.position.x,
              modelRoot.position.y - shadowScale * 0.055,
              orbitDepth < 0 ? orbitDepth - 0.012 : 0.018,
            );
            contactShadow.scale.set(shadowScale * 1.18, shadowScale * 0.42, 1);
            contactShadow.material.opacity = opacity * (orbitDepth < 0 ? 0.16 : 0.3);
          }
          if (rimLight) {
            rimLight.position.set(modelRoot.position.x, modelRoot.position.y, modelRoot.position.z + 0.16);
            rimLight.intensity = 2.8 * opacity;
          }
          renderer.render(scene, camera);
        };

        animationFrame = window.requestAnimationFrame(animate);
      } catch (error) {
        if (!disposed) console.error(`[ProfileFrame] Could not start the ${frame.label} animation.`, error);
      }
    };

    void start();
    return () => {
      disposed = true;
      window.cancelAnimationFrame(animationFrame);
      mixer?.stopAllAction();
      renderer?.dispose();
      for (const material of ownedMaterials) material.dispose();
      if (occlusionMesh) {
        occlusionMesh.geometry.dispose();
        occlusionMesh.material.dispose();
      }
      contactShadow?.material.dispose();
      contactShadowTexture?.dispose();
      scene?.clear();
    };
  }, [cardRef, frame, frameId, glowColor, reducedMotion]);

  if (!frame) return null;
  return <canvas ref={canvasRef} className="pc-profile-frame-canvas" aria-hidden="true" />;
}
