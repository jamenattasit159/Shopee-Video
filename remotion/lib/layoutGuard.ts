export interface RectZone {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const SAFE_ZONE = {
  top: 190,
  bottom: 1520,
  left: 68,
  right: 910,
};

export function redZoneRects(width = 1080, height = 1920) {
  const sx = width / 1080, sy = height / 1920;
  return {
    top: { x: 0, y: 0, width, height: SAFE_ZONE.top * sy },
    bottom: { x: 0, y: SAFE_ZONE.bottom * sy, width, height: height - SAFE_ZONE.bottom * sy },
    right: { x: SAFE_ZONE.right * sx, y: SAFE_ZONE.top * sy, width: width - SAFE_ZONE.right * sx, height: (SAFE_ZONE.bottom - SAFE_ZONE.top) * sy },
  };
}

/**
 * Checks if two bounding boxes collide
 */
export function checkCollision(a: RectZone, b: RectZone): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

/**
 * Automatically adjusts Y position of second element if collision is detected
 */
export function resolveVerticalCollision(
  anchor: RectZone,
  moving: RectZone,
  margin = 24
): number {
  if (checkCollision(anchor, moving)) {
    console.warn(
      `[LayoutGuard] Collision detected between zones. Repositioning element.`
    );
    // Push moving zone below anchor
    return anchor.y + anchor.height + margin;
  }
  return moving.y;
}
