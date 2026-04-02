/**
 * Path Smoothing Utility
 *
 * Transforms raw pathfinding coordinates into cleaner SVG paths by:
 * 1. Axis-snapping — aligning nearly-horizontal/vertical segments
 * 2. Douglas-Peucker simplification — removing redundant collinear points
 * 3. Rounded corners — small quadratic arcs at turns (stays inside corridors)
 *
 * No Catmull-Rom / cubic Bezier — those swing outside corridors and cut rooms.
 */

// ── Axis Snapping ──────────────────────────────────────────────
const AXIS_SNAP_THRESHOLD = 8; // px tolerance

export function axisSnap(points, threshold = AXIS_SNAP_THRESHOLD) {
  if (!points || points.length < 2) return points;

  const out = points.map((p) => ({ ...p }));

  for (let i = 1; i < out.length; i++) {
    const prev = out[i - 1];
    const curr = out[i];
    const dx = Math.abs(curr.x - prev.x);
    const dy = Math.abs(curr.y - prev.y);

    if (dy < threshold && dx > dy) curr.y = prev.y; // snap horizontal
    if (dx < threshold && dy > dx) curr.x = prev.x; // snap vertical
  }

  return out;
}

// ── Douglas-Peucker Simplification ────────────────────────────
function perpendicularDistance(point, lineStart, lineEnd) {
  const dx = lineEnd.x - lineStart.x;
  const dy = lineEnd.y - lineStart.y;
  const lenSq = dx * dx + dy * dy;

  if (lenSq === 0) {
    return Math.hypot(point.x - lineStart.x, point.y - lineStart.y);
  }

  const t = ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) / lenSq;
  const projX = lineStart.x + t * dx;
  const projY = lineStart.y + t * dy;
  return Math.hypot(point.x - projX, point.y - projY);
}

export function douglasPeucker(points, epsilon = 3) {
  if (!points || points.length < 3) return points;

  let maxDist = 0;
  let maxIndex = 0;

  for (let i = 1; i < points.length - 1; i++) {
    const dist = perpendicularDistance(points[i], points[0], points[points.length - 1]);
    if (dist > maxDist) {
      maxDist = dist;
      maxIndex = i;
    }
  }

  if (maxDist > epsilon) {
    const left = douglasPeucker(points.slice(0, maxIndex + 1), epsilon);
    const right = douglasPeucker(points.slice(maxIndex), epsilon);
    return left.slice(0, -1).concat(right);
  }

  return [points[0], points[points.length - 1]];
}

// ── Rounded-Corner Path Builder ───────────────────────────────
// At each interior point (turn), offset the line by `radius` pixels
// and insert a quadratic Bezier arc.  The arc never strays outside
// the triangle formed by two adjacent segments, so it stays inside
// the corridor.

const CORNER_RADIUS = 14; // px — small enough to stay in corridor

function dist(a, b) {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

export function buildRoundedPath(points, radius = CORNER_RADIUS) {
  if (!points || points.length === 0) return "";
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  if (points.length === 2) {
    return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;
  }

  let d = `M ${points[0].x} ${points[0].y}`;

  for (let i = 1; i < points.length - 1; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const next = points[i + 1];

    const dPrev = dist(prev, curr);
    const dNext = dist(curr, next);

    // Clamp radius so it doesn't exceed half the segment length
    const r = Math.min(radius, dPrev / 2, dNext / 2);

    if (r < 2) {
      // Too short for a curve — just line-to the point
      d += ` L ${curr.x} ${curr.y}`;
      continue;
    }

    // Point on the incoming segment, `r` pixels before the corner
    const ratioIn = r / dPrev;
    const beforeX = curr.x + (prev.x - curr.x) * ratioIn;
    const beforeY = curr.y + (prev.y - curr.y) * ratioIn;

    // Point on the outgoing segment, `r` pixels after the corner
    const ratioOut = r / dNext;
    const afterX = curr.x + (next.x - curr.x) * ratioOut;
    const afterY = curr.y + (next.y - curr.y) * ratioOut;

    // Line to the arc start, then a quadratic Bezier with the
    // original corner as the control point
    d += ` L ${beforeX} ${beforeY}`;
    d += ` Q ${curr.x} ${curr.y} ${afterX} ${afterY}`;
  }

  // Final segment to the last point
  const last = points[points.length - 1];
  d += ` L ${last.x} ${last.y}`;

  return d;
}

// ── Room-Node Filter ──────────────────────────────────────────
// Removes intermediate room/classroom nodes from the path so the
// rendered line stays on hallway corridors.  The first and last
// points are always kept (they are the actual start/end rooms).

const ROOM_TYPES = new Set(["room", "classroom"]);

export function filterRoomTransitNodes(points) {
  if (!points || points.length <= 2) return points;

  const out = [points[0]]; // always keep start

  for (let i = 1; i < points.length - 1; i++) {
    const pt = points[i];
    if (pt.type && ROOM_TYPES.has(pt.type)) continue; // skip transit room
    out.push(pt);
  }

  out.push(points[points.length - 1]); // always keep end
  return out;
}

// ── Main Pipeline ────────────────────────────────────────────
/**
 * Full smoothing pipeline: filter rooms → snap → simplify → rounded corners.
 *
 * @param {Array<{x: number, y: number, type?: string}>} rawPoints
 * @param {Object} [options]
 * @param {number} [options.snapThreshold=8]
 * @param {number} [options.simplifyEpsilon=3]
 * @param {number} [options.cornerRadius=14]
 * @returns {string} SVG path d-attribute string
 */
export function smoothPath(rawPoints, options = {}) {
  const {
    snapThreshold = AXIS_SNAP_THRESHOLD,
    simplifyEpsilon = 3,
    cornerRadius = CORNER_RADIUS,
  } = options;

  if (!rawPoints || rawPoints.length < 2) {
    if (rawPoints?.length === 1) return `M ${rawPoints[0].x} ${rawPoints[0].y}`;
    return "";
  }

  // Step 0: Remove intermediate room nodes so path stays on hallways
  let pts = filterRoomTransitNodes(rawPoints);

  // Step 1: Axis-snap nearly aligned segments
  pts = axisSnap(pts, snapThreshold);

  // Step 2: Douglas-Peucker simplification
  pts = douglasPeucker(pts, simplifyEpsilon);

  // Step 3: Rounded corners at turns (stays inside corridors)
  return buildRoundedPath(pts, cornerRadius);
}
