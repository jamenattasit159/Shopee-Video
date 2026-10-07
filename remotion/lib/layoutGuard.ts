export interface RectZone {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const SAFE_ZONE = {
  top: 180,
  bottom: 1520, // 1920 - 400
  left: 60,
  right: 940, // 1080 - 140
};

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
