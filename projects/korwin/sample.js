export function sample(array) {
  const len = array.length;
  const randomIndex = Math.floor((Math.random() * len));

  return array[randomIndex];
}