import { Player } from './Player.js';
import { Wall } from './Wall.js';

const width = window.innerWidth;
const height = window.innerHeight;

const canvas = document.getElementsByTagName('canvas')[0];
canvas.width = width;
canvas.height = height;
const ctx = canvas.getContext('2d');

const walls = [
  new Wall(ctx, 500, 100, 500, 500),
  new Wall(ctx, 100, 300, 500, 1000),
  new Wall(ctx, 300, 300, 100, 1000),
  new Wall(ctx, 0, 0, 0, height),
  new Wall(ctx, 0, height, width, height),
  new Wall(ctx, width, height, width, 0),
  new Wall(ctx, width, 0, 0, 0),
];

const clear = () => {
  ctx.clearRect(0, 0, width, height);
}

const player = new Player(ctx);

const loop = (t) => {
  clear();
  // const tNormalized = (t / 200) % (Math.PI * 2);
  // const color = `hsla(${tNormalized}rad, 100%, 50%, 1)`;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, width, height);

  player.draw();
  walls.forEach(wall => wall.draw());
  player.drawRays(walls, t);

  window.requestAnimationFrame(loop);
}


player.setPosition(width / 2, height / 2);

window.addEventListener('mousemove', (e) => {
  player.setPosition(e.x, e.y);
});

loop(0);
