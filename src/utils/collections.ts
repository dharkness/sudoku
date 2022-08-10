/**
 * Shuffles the given array in-place and returns it for convenience.
 */
export function shuffle<T>(array: T[]): T[] {
  let currentIndex = array.length,
    randomIndex;

  while (currentIndex != 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;

    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex]!,
      array[currentIndex]!,
    ];
  }

  return array;
}

/**
 * Returns the single value of the given set
 *
 * @throws {Error} If the set is empty or has more than one element
 */
export function singleSetValue<T>(set: Set<T>): T {
  switch (set.size) {
    case 0:
      throw new Error(`Cannot get a single value from an empty set`);
    case 1:
      return set.values().next().value;
    default:
      throw new Error(
        `Cannot get a single value from a set with ${set.size} members`
      );
  }
}

/**
 * Returns a new set containing the elements that are in either set,
 * in the order they appear in the first followed by those that are
 * only in the second.
 */
export function union<T>(a: Set<T>, b: Set<T>): Set<T> {
  const result = new Set<T>(a);

  for (const t of b) {
    result.add(t);
  }

  return result;
}

/**
 * Returns a new set containing the elements that are in both sets,
 * in the order they appear in the first.
 */
export function intersect<T>(a: Set<T>, b: Set<T>): Set<T> {
  const result = new Set<T>();

  for (const t of a) {
    if (b.has(t)) {
      result.add(t);
    }
  }

  return result;
}

/**
 * Returns a new set containing the elements that are in the first set
 * but not in the second, in the order they appear in the first.
 */
export function difference<T>(a: Set<T>, b: Set<T>): Set<T> {
  const result = new Set<T>();

  for (const t of a) {
    if (!b.has(t)) {
      result.add(t);
    }
  }

  return result;
}
