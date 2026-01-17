import { line } from './shapes.js';

export class Wall {
  constructor(ctx, x1, y1, x2, y2) {
    this.x1 = x1;
    this.y1 = y1;
    this.x2 = x2;
    this.y2 = y2;

    this.drawWall = line(ctx, '#fff');
  }

  draw() {
    this.drawWall(this.x1, this.y1, this.x2, this.y2);
  }
}