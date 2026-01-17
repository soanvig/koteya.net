import { dot } from './shapes.js';
import { Ray } from './Ray.js';
import { intersection } from './intersection.js';
import { distance } from './geometry.js';

export class Player {
  constructor(ctx) {
    this.x = 0;
    this.y = 0;
    this.ctx = ctx;
    this.drawPlayer = dot(ctx, '#fff', 5);

    this.rays = [];
    for (let i = 0; i < 360; i += 1) {
      const angle = i / 180 * Math.PI;
      this.rays.push(new Ray(ctx, this.x, this.y, angle));
    }
  }

  setPosition(x, y) {
    this.x = x;
    this.y = y;
    this.rays.forEach((ray) => ray.setPosition(x, y));
  }

  draw() {
    this.drawPlayer(this.x, this.y);
  }

  drawRays(walls, t) {
    this.rays.forEach((ray) => {
      let Plength = Infinity;
      let intersectionWall;
      let Px;
      let Py;

      walls.forEach((wall) => {
        const intersect = intersection(wall, ray);
        if (intersect.intersecting) {
          const l = distance(
            intersect.Px,
            intersect.Py,
            ray.x1,
            ray.y1
          );

          if (l < Plength) {
            Px = intersect.Px;
            Py = intersect.Py;
            Plength = l;
            intersectionWall = wall;
          }
        }
      });

      if (Plength !== Infinity) {
        ray.draw(Px, Py, (t / 300) % (Math.PI * 2));
      }
    });
  }
}