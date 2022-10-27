// noinspection JSUnusedGlobalSymbols

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
 * @throws {Error} If the set does not have exactly one element
 */
export function singleSetValue<T>(set: Set<T>): T {
  if (set.size !== 1) {
    throw new Error(`Set must have 1 element but has ${set.size}`);
  }

  return set.values().next().value;
}

/**
 * Returns the pair of values of the given set
 *
 * @throws {Error} If the set does not have exactly two elements
 */
export function twoSetValues<T>(set: Set<T>): [T, T] {
  if (set.size !== 2) {
    throw new Error(`Set must have 2 elements but has ${set.size}`);
  }

  return [...set.values()] as [T, T];
}

/**
 * Returns the pair of values of the given set
 *
 * @throws {Error} If the set does not have exactly two elements
 */
export function threeSetValues<T>(set: Set<T>): [T, T, T] {
  if (set.size !== 3) {
    throw new Error(`Set must have 3 elements but has ${set.size}`);
  }

  return [...set.values()] as [T, T, T];
}

/**
 * Returns a copy of the given set with the given element added
 * even if it doesn't currently contain the element.
 */
export function including<T>(set: Set<T>, t: T): Set<T> {
  const clone = new Set(set);
  clone.add(t);
  return clone;
}

/**
 * Returns a copy of the given set with the given element removed
 * even if it doesn't currently contain the element.
 */
export function excluding<T>(set: Set<T>, t: T): Set<T> {
  const clone = new Set(set);
  clone.delete(t);
  return clone;
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

/**
 * Returns true if both sets contain the same elements by identity.
 */
export function areEqual<T>(a: Set<T>, b: Set<T>): boolean {
  if (a.size !== b.size) {
    return false;
  }

  for (const t of a) {
    if (!b.has(t)) {
      return false;
    }
  }

  return true;
}

export function hasEvery<T>(subset: Set<T>, set: Set<T>): boolean {
  for (const t of subset) {
    if (!set.has(t)) {
      return false;
    }
  }

  return true;
}

/**
 * Returns a list of every distinct pairing of the elements of the given set.
 * Each pair of elements will be returned exactly once.
 */
export function distinctPairs<T>(set: Set<T>): [T, T][] {
  const list = [...set];
  const pairs = [] as [T, T][];

  if (list.length >= 2) {
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        pairs.push([list[i]!, list[j]!]);
      }
    }
  }

  return pairs;
}

/**
 * Returns a list of every distinct triple of the elements of the given set.
 * Each triple of elements will be returned exactly once.
 */
export function distinctTriples<T>(set: Set<T>): [T, T, T][] {
  const list = [...set];
  const triples = [] as [T, T, T][];

  if (list.length >= 3) {
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        for (let k = j + 1; k < list.length; k++) {
          triples.push([list[i]!, list[j]!, list[k]!]);
        }
      }
    }
  }

  return triples;
}

/**
 * Returns a list of every pairing of each element of the first set
 * with each element of the second set.
 */
export function combinePairs<T>(a: Set<T>, b: Set<T>): [T, T][] {
  return Array.from(a).reduce(
    (list: [T, T][], a: T) => [
      ...list,
      ...Array.from(b).map((b: T) => [a, b] as [T, T]),
    ],
    [] as [T, T][]
  );
}

/**
 * Returns a new map of sets containing only the non-empty values.
 */
export function withoutEmptySets<T, U>(map: Map<T, Set<U>>): Map<T, Set<U>> {
  return new Map([...map.entries()].filter(([_, cells]) => cells.size > 0));
}

/**
 * Returns a new map containing the same keys mapped to clones of the same values.
 *
 * TODO Add cloneKey?
 */
export function deepCloneMap<K, V>(map: Map<K, V>, cloneValue?: (v: V) => V) {
  return new Map(
    cloneValue ? [...map.entries()].map(([k, v]) => [k, cloneValue(v)]) : map
  );
}

/**
 * Returns a new map containing the same keys mapped to clones of the same sets,
 * possibly cloning each sets' items.
 *
 * TODO Add cloneKey?
 */
export function deepCloneMapOfSets<K, V>(
  map: Map<K, Set<V>>,
  cloneValue?: (v: V) => V
) {
  return deepCloneMap(map, (set) =>
    cloneValue ? new Set([...set].map(cloneValue)) : new Set(set)
  );
}

/**
 * Returns a new map containing the entries whose keys are in the set,
 * in the order they appear in the map.
 */
export function intersectMap<K, V>(set: Set<K>, map: Map<K, V>): Map<K, V> {
  const result = new Map<K, V>();

  for (const [k, v] of map) {
    if (set.has(k)) {
      result.set(k, v);
    }
  }

  return result;
  // return new Map([...map.entries()].filter(([k]) => set.has(k)));
}

/**
 * Provides a two-level nested map (map of maps).
 */
export class NestedMap<K1, K2, V> {
  static fromArrays<K1, K2, V>(k1s: K1[], k2s: K2[], v: (k1: K1, k2: K2) => V) {
    return new this(
      k1s.map((k1) => [k1, new Map(k2s.map((k2) => [k2, v(k1, k2)]))])
    );
  }

  // static generate<T, U, V>(
  //   ts: Iterable<T>,
  //   us: Iterable<U>,
  //   generator: (t: T, u: U) => V
  // ) {
  //   return new this(ts.forEach);
  // }

  map: Map<K1, Map<K2, V>>;

  constructor(entries?: Iterable<[K1, Map<K2, V>]>) {
    this.map = new Map(entries);
  }

  has(k1: K1, k2: K2): boolean {
    return this.map.get(k1)?.has(k2) ?? false;
  }

  get(k1: K1, k2: K2): V | undefined {
    return this.map.get(k1)?.get(k2);
  }

  set(k1: K1, k2: K2, v: V): NestedMap<K1, K2, V> {
    const inner = this.map.get(k1);

    if (inner) {
      inner.set(k2, v);
    } else {
      this.map.set(k1, new Map([[k2, v]]));
    }

    return this;
  }

  setMany(k1: K1, k2s: K2[], v: (k1: K1, k2: K2) => V): NestedMap<K1, K2, V> {
    const inner = this.map.get(k1);

    if (inner) {
      k2s.forEach((k2) => inner.set(k2, v(k1, k2)));
    } else {
      this.map.set(k1, new Map(k2s.map((k2) => [k2, v(k1, k2)])));
    }

    return this;
  }

  delete(k1: K1, k2: K2, deleteEmpty?: boolean) {
    const inner = this.map.get(k1);

    if (inner) {
      if (inner.delete(k2)) {
        if (deleteEmpty && !inner.size) {
          this.map.delete(k1);
        }
        return true;
      }
    }

    return false;
  }
}
