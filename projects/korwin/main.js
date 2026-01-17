import { generateText } from './generateText.js';

(() => {
  function generateAndPrint() {
    const text = generateText();
    document.querySelector('#text').innerHTML = text;
  }

  document.querySelector('#generate').addEventListener('click', generateAndPrint);

  generateAndPrint();
})();