export default class Maybe<T> {
  static some<T>(value: NonNullable<T>) {
    if (value == null) {
      throw Error("Provided value must not be null");
    }
    return new Maybe(value);
  }

  static none<T>() {
    return new Maybe<T>(null);
  }

  static fromValue<T>(value: T | null) {
    return value == null
      ? Maybe.none<T>()
      : Maybe.some(value as NonNullable<T>);
  }

  private constructor(private value: NonNullable<T> | null) {}

  isSome(): boolean {
    return this.value !== null;
  }

  isNone(): boolean {
    return this.value === null;
  }

  orElse(fallback: NonNullable<T>): NonNullable<T> {
    return this.isSome() ? (this.value as NonNullable<T>) : fallback;
  }

  orUndefined(): NonNullable<T> | undefined {
    return this.isSome() ? (this.value as NonNullable<T>) : undefined;
  }

  orNull(): NonNullable<T> | null {
    return this.isSome() ? (this.value as NonNullable<T>) : null;
  }

  orCompute(f: () => NonNullable<T>): NonNullable<T> {
    return this.isSome() ? (this.value as NonNullable<T>) : f();
  }

  orThrow(msg?: string): NonNullable<T> {
    return this.isNone()
      ? ((): never => {
          throw new Error(msg);
        })()
      : (this.value as NonNullable<T>);
  }

  map<U>(f: (t: NonNullable<T>) => U): Maybe<U> {
    return this.isNone()
      ? Maybe.none<U>()
      : Maybe.fromValue<U>(f(this.value as NonNullable<T>));
  }

  mapTo<U>(u: U | null): Maybe<U> {
    return this.isNone() ? Maybe.none<U>() : Maybe.fromValue<U>(u);
  }

  flatMap<U>(f: (t: NonNullable<T>) => Maybe<U>): Maybe<U> {
    return this.isNone() ? Maybe.none<U>() : f(this.value as NonNullable<T>);
  }
}
