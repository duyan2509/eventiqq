export interface BoundingBox {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

export interface ViewState {
  zoom: number
  pan: { x: number; y: number }
}

/**
 * Compute zoom and pan so the bounding box fits inside the canvas centered with padding.
 * Returns a sensible default (zoom 1, no pan) when the bbox is empty or invalid.
 */
export function fitToBoundingBox(
  bbox: BoundingBox,
  canvasWidth: number,
  canvasHeight: number,
  padding = 60,
  maxZoom = 1.5,
  minZoom = 0.2,
): ViewState {
  const contentW = bbox.maxX - bbox.minX
  const contentH = bbox.maxY - bbox.minY
  if (contentW <= 0 || contentH <= 0 || canvasWidth <= 0 || canvasHeight <= 0) {
    return { zoom: 1, pan: { x: 0, y: 0 } }
  }

  const availW = Math.max(canvasWidth - 2 * padding, 1)
  const availH = Math.max(canvasHeight - 2 * padding, 1)
  const fitZoom = Math.min(availW / contentW, availH / contentH)
  const zoom = Math.min(maxZoom, Math.max(minZoom, fitZoom))

  const contentCx = (bbox.minX + bbox.maxX) / 2
  const contentCy = (bbox.minY + bbox.maxY) / 2
  return {
    zoom,
    pan: {
      x: canvasWidth / 2 - contentCx * zoom,
      y: canvasHeight / 2 - contentCy * zoom,
    },
  }
}

/**
 * Compute a bounding box from a list of rect-like items (objects, sections).
 * Each item is parsed via the provided getter that returns {x, y, width, height}.
 */
export function bboxFromRects<T>(
  items: T[],
  getRect: (item: T) => { x: number; y: number; width: number; height: number } | null,
): BoundingBox | null {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  let found = false
  for (const item of items) {
    const r = getRect(item)
    if (!r) continue
    found = true
    if (r.x < minX) minX = r.x
    if (r.y < minY) minY = r.y
    if (r.x + r.width > maxX) maxX = r.x + r.width
    if (r.y + r.height > maxY) maxY = r.y + r.height
  }
  return found ? { minX, minY, maxX, maxY } : null
}

/**
 * Compute a bounding box from a list of points (e.g. flat seats), each padded by `radius`.
 */
export function bboxFromPoints(
  points: { x: number; y: number }[],
  radius = 0,
): BoundingBox | null {
  if (points.length === 0) return null
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const p of points) {
    if (p.x < minX) minX = p.x
    if (p.y < minY) minY = p.y
    if (p.x > maxX) maxX = p.x
    if (p.y > maxY) maxY = p.y
  }
  return { minX: minX - radius, minY: minY - radius, maxX: maxX + radius, maxY: maxY + radius }
}

/**
 * World-space bounding box currently visible in the canvas, given pan/zoom.
 * `margin` (0..1) pads the box by a fraction of its size so seats just outside
 * the viewport are prefetched — smoother panning. Default 0.2 = 20% on each side.
 */
export function viewportWorldBbox(
  canvasWidth: number,
  canvasHeight: number,
  pan: { x: number; y: number },
  zoom: number,
  margin = 0.2,
): BoundingBox {
  const minX = -pan.x / zoom
  const minY = -pan.y / zoom
  const maxX = (canvasWidth - pan.x) / zoom
  const maxY = (canvasHeight - pan.y) / zoom
  const padX = (maxX - minX) * margin
  const padY = (maxY - minY) * margin
  return { minX: minX - padX, minY: minY - padY, maxX: maxX + padX, maxY: maxY + padY }
}

/** True when bbox `inner` lies entirely within `outer`. */
export function bboxContains(outer: BoundingBox, inner: BoundingBox): boolean {
  return inner.minX >= outer.minX && inner.minY >= outer.minY
    && inner.maxX <= outer.maxX && inner.maxY <= outer.maxY
}

/** Merge two bounding boxes; either may be null. */
export function unionBbox(a: BoundingBox | null, b: BoundingBox | null): BoundingBox | null {
  if (!a) return b
  if (!b) return a
  return {
    minX: Math.min(a.minX, b.minX),
    minY: Math.min(a.minY, b.minY),
    maxX: Math.max(a.maxX, b.maxX),
    maxY: Math.max(a.maxY, b.maxY),
  }
}
