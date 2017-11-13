export function removeByIdx(array, index) {
  if (index > -1) {
    array.splice(index, 1);
  }
  return array;
}

export default removeByIdx;

