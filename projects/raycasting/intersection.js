import { Wall } from './Wall.js';
import { Ray } from './Ray.js';

/**
 * @param {Wall} wall
 * @param {Ray} ray
 */
export function intersection(wall, ray) {
  const tNumerator = (
    (wall.x1 - ray.x1) * (ray.y1 - ray.y2)
    - (wall.y1 - ray.y1) * (ray.x1 - ray.x2)
  );

  const tDenominator = (
    (wall.x1 - wall.x2) * (ray.y1 - ray.y2)
    - (wall.y1 - wall.y2) * (ray.x1 - ray.x2)
  );

  const uNumerator = -1 * (
    (wall.x1 - wall.x2) * (wall.y1 - ray.y1)
    - (wall.y1 - wall.y2) * (wall.x1 - ray.x1)
  );

  const uDenominator = (
    (wall.x1 - wall.x2) * (ray.y1 - ray.y2)
    - (wall.y1 - wall.y2) * (ray.x1 - ray.x2)
  );

  const t = tNumerator / tDenominator;
  const u = uNumerator / uDenominator;

  let Px = null;
  let Py = null;
  const intersecting = (u >= 0 && u <= 1) && (t >= 0 && t <= 1);

  if (intersecting) {
    Px = (wall.x1 + t * (wall.x2 - wall.x1));
    Py = (wall.y1 + t * (wall.y2 - wall.y1));
  }

  return {
    intersecting,
    Px,
    Py,
  };
}