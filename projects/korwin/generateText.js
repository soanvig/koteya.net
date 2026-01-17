import { textDb } from './textDb.js';
import { sample } from './sample.js';

export function generateText() {
  const texts = textDb.map(sample);

  return texts.join(' ');
}