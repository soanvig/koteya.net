import { line } from './shapes.js';

export class Ray {
  constructor(ctx, x, y, arc) {
    this.x1 = x;
    this.y1 = y;
    this.x2 = x;
    this.y2 = y;
    this.arc = arc;
    this.drawRay = line(ctx);
  }

  setPosition(x, y) {
    this.x1 = x;
    this.y1 = y;

    const length = 1500;
    this.x2 = Math.cos(this.arc) * length + this.x1;
    this.y2 = Math.sin(this.arc) * length + this.y1;
  }

  draw(x2, y2, hue) {
    const color = `hsla(${this.arc + hue}rad, 100%, 50%, 1)`;
    this.drawRay(this.x1, this.y1, x2, y2, color);
  }
}