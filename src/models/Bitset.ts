/**
 * Holds a set of bits with efficient set operations.
 */
export default class Bitset {
  /**
   * Creates an empty set.
   */
  static empty() {
    return new this(0, 0);
  }

  /**
   * Creates a set holding the given number of set bits.
   */
  static full(size: number) {
    return this.of((1 << size) - 1);
  }

  /**
   * Creates a set using the given bit pattern.
   */
  static of(bits: number) {
    return new this(bits, countBits(bits));
  }

  /**
   * Creates a set from a string of 1s and 0s.
   */
  static from(s: string) {
    let bits = 0;
    for (const bit of s) {
      if (bit === "1") {
        bits += 1;
      }
      bits <<= 1;
    }
    bits >>= 1;
    return this.of(bits);
  }

  private _bits: number;
  private _size: number;

  private constructor(bits: number = 0, size: number) {
    this._bits = bits;
    this._size = size;
  }

  get size(): number {
    return this._size;
  }

  get bits(): number {
    return this._bits;
  }

  set(index: number): Bitset {
    const bit = 1 << index;
    if (!(this._bits & bit)) {
      this._bits += bit;
      this._size += 1;
    }
    return this;
  }

  unset(index: number): Bitset {
    const bit = 1 << index;
    if (this._bits & bit) {
      this._bits -= bit;
      this._size -= 1;
    }
    return this;
  }

  isset(index: number): boolean {
    const bit = 1 << index;
    return (this._bits & bit) > 0;
  }

  equals(other: Bitset): boolean {
    return this._bits === other._bits;
  }

  union(other: Bitset): Bitset {
    return Bitset.of(this._bits | other._bits);
  }

  intersect(other: Bitset): Bitset {
    return Bitset.of(this._bits & other._bits);
  }

  diff(other: Bitset): Bitset {
    return Bitset.of(this._bits - (this._bits & other._bits));
  }

  clone(): Bitset {
    return new Bitset(this._bits, this._size);
  }
}

/**
 * Returns the number of 1 bits in the given number.
 */
function countBits(bits: number): number {
  let count = 0;
  while (bits) {
    count += bits & 1;
    bits >>= 1;
  }
  return count;
}
