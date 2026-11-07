export interface RoundedRectTrack {
  segments: RoundedRectSegment[];
  length: number;
}

export interface RoundedRectPoint {
  x: number;
  y: number;
  dx: number;
  dy: number;
}

type RoundedRectSegment =
  | { kind: 'line'; length: number; x: number; y: number; dx: number; dy: number }
  | { kind: 'arc'; length: number; x: number; y: number; radius: number; start: number; direction: 1 | -1 };

export function createRoundedRectTrack(left: number, top: number, width: number, height: number, radius: number): RoundedRectTrack {
  const right = left + Math.max(0, width);
  const bottom = top + Math.max(0, height);
  const r = Math.max(0, Math.min(radius, width / 2, height / 2));
  const segments: RoundedRectSegment[] = [];

  const line = (x1: number, y1: number, x2: number, y2: number) => {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const length = Math.hypot(dx, dy);
    if (length > 0.01) segments.push({ kind: 'line', length, x: x1, y: y1, dx: dx / length, dy: dy / length });
  };
  const arc = (x: number, y: number, start: number, direction: 1 | -1) => {
    if (r > 0.01) segments.push({ kind: 'arc', length: r * Math.PI / 2, x, y, radius: r, start, direction });
  };

  line(left + r, top, right - r, top);
  arc(right - r, top + r, -Math.PI / 2, 1);
  line(right, top + r, right, bottom - r);
  arc(right - r, bottom - r, 0, 1);
  line(right - r, bottom, left + r, bottom);
  arc(left + r, bottom - r, Math.PI / 2, 1);
  line(left, bottom - r, left, top + r);
  arc(left + r, top + r, Math.PI, 1);

  return { segments, length: segments.reduce((total, segment) => total + segment.length, 0) };
}

export function pointOnRoundedRectTrack(track: RoundedRectTrack, progress: number): RoundedRectPoint {
  if (track.length <= 0 || track.segments.length === 0) return { x: 0, y: 0, dx: 1, dy: 0 };
  const normalized = ((progress % 1) + 1) % 1;
  let distance = normalized * track.length;

  for (const segment of track.segments) {
    if (distance > segment.length) {
      distance -= segment.length;
      continue;
    }

    const t = Math.min(1, distance / segment.length);
    if (segment.kind === 'line') {
      return {
        x: segment.x + segment.dx * distance,
        y: segment.y + segment.dy * distance,
        dx: segment.dx,
        dy: segment.dy,
      };
    }

    const angle = segment.start + segment.direction * t * Math.PI / 2;
    return {
      x: segment.x + segment.radius * Math.cos(angle),
      y: segment.y + segment.radius * Math.sin(angle),
      dx: -Math.sin(angle) * segment.direction,
      dy: Math.cos(angle) * segment.direction,
    };
  }

  return { x: 0, y: 0, dx: 1, dy: 0 };
}

export function nearestRoundedRectTrackProgress(
  track: RoundedRectTrack,
  x: number,
  y: number,
  samples = 1024,
): number {
  if (track.length <= 0) return 0;
  let nearestProgress = 0;
  let nearestDistance = Number.POSITIVE_INFINITY;
  for (let index = 0; index < samples; index += 1) {
    const progress = index / samples;
    const point = pointOnRoundedRectTrack(track, progress);
    const distance = (point.x - x) ** 2 + (point.y - y) ** 2;
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestProgress = progress;
    }
  }
  return nearestProgress;
}
