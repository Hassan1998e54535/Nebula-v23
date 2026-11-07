import { useEffect, useMemo, useState } from 'react';
import { Alignment, EventType, Fit, Layout, RuntimeLoader, useRive } from '@rive-app/react-canvas';

// Use the matching installed runtime instead of relying on an external CDN.
RuntimeLoader.setWasmUrl('/assets/profile-media/runtime/rive.wasm');

export default function RiveEffectMedia({
  src,
  artboard,
  animationName,
  stateMachineName,
  stateMachineInputValues,
  stateMachineSequence,
  durationMs,
  loop,
  fit = 'cover',
  onFinish,
}: {
  src: string;
  artboard?: string;
  animationName?: string;
  stateMachineName?: string;
  stateMachineInputValues?: Readonly<Record<string, number | boolean>>;
  stateMachineSequence?: {
    enterDelayMs: number;
    enterValues: Readonly<Record<string, number | boolean>>;
    holdMs: number;
    exitValues: Readonly<Record<string, number | boolean>>;
    exitDurationMs: number;
  };
  durationMs: number;
  loop: boolean;
  fit?: 'cover' | 'contain' | 'fill';
  onFinish: () => void;
}) {
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const layout = useMemo(() => new Layout({
    fit: fit === 'contain' ? Fit.Contain : fit === 'fill' ? Fit.Fill : Fit.Cover,
    alignment: Alignment.Center,
  }), [fit]);
  const { rive, RiveComponent } = useRive({
    src,
    artboard,
    autoplay: false,
    layout,
    animations: animationName ? [animationName] : undefined,
    stateMachines: stateMachineName ? [stateMachineName] : undefined,
    useOffscreenRenderer: false,
    onLoad: () => setReady(true),
    onLoadError: () => {
      console.error(`[ProfileEffect] Failed to load Rive asset "${src}". Check the file URL and Rive asset validity.`);
      setFailed(true);
    },
  });

  useEffect(() => {
    if (!rive || !ready) return;
    const playbackName = animationName ?? stateMachineName;
    rive.stop();
    const inputs = stateMachineName ? rive.stateMachineInputs(stateMachineName) ?? [] : [];
    const applyInputValues = (values?: Readonly<Record<string, number | boolean>>) => {
      if (!values) return true;
      for (const [name, value] of Object.entries(values)) {
        const input = inputs.find((candidate) => candidate.name === name);
        if (!input || typeof input.value !== typeof value) {
          console.error(`[ProfileEffect] Rive input "${name}" is missing or has an unexpected type.`);
          return false;
        }
        input.value = value;
      }
      return true;
    };
    if (!playbackName || (stateMachineSequence && !stateMachineName) || !applyInputValues(stateMachineInputValues)) {
      rive.stop();
      onFinish();
      return;
    }
    rive.play(playbackName);
    if (stateMachineSequence) {
      const enterTimer = window.setTimeout(() => {
        if (!applyInputValues(stateMachineSequence.enterValues)) {
          rive.stop();
          onFinish();
        }
      }, stateMachineSequence.enterDelayMs);
      const exitTimer = window.setTimeout(() => {
        if (!applyInputValues(stateMachineSequence.exitValues)) {
          rive.stop();
          onFinish();
        }
      }, stateMachineSequence.enterDelayMs + stateMachineSequence.holdMs);
      const finishTimer = window.setTimeout(() => {
        rive.stop();
        onFinish();
      }, stateMachineSequence.enterDelayMs + stateMachineSequence.holdMs + stateMachineSequence.exitDurationMs);
      return () => {
        window.clearTimeout(enterTimer);
        window.clearTimeout(exitTimer);
        window.clearTimeout(finishTimer);
        rive.stop();
      };
    }
    if (loop) {
      let active = true;
      let restarting = false;
      let restartTimer = 0;
      const restartIfStopped = () => {
        if (!active || restarting || rive.isPlaying) return;
        restarting = true;
        rive.stop();
        restartTimer = window.setTimeout(() => {
          if (active) rive.play(playbackName);
          restarting = false;
        }, 0);
      };
      rive.on(EventType.Stop, restartIfStopped);
      const restartMonitor = window.setInterval(restartIfStopped, 50);
      return () => {
        active = false;
        window.clearInterval(restartMonitor);
        window.clearTimeout(restartTimer);
        rive.off(EventType.Stop, restartIfStopped);
        rive.stop();
      };
    }
    const timer = window.setTimeout(() => {
      rive.stop();
      onFinish();
    }, durationMs);
    return () => {
      window.clearTimeout(timer);
      rive.stop();
    };
  }, [animationName, durationMs, loop, onFinish, ready, rive, stateMachineInputValues, stateMachineName, stateMachineSequence]);

  useEffect(() => {
    if (failed) onFinish();
  }, [failed, onFinish]);

  if (failed) return null;
  return <RiveComponent className="pc-effect-media" aria-hidden="true" />;
}
