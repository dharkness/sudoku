import Maybe from "./maybe";

describe("Maybe.none()", () => {
  const none = Maybe.none<number>();

  it("should be none", function () {
    expect(none.isNone()).toBe(true);
  });

  it("should not be some", function () {
    expect(none.isSome()).toBe(false);
  });

  it("orElse() should return fallback", function () {
    expect(none.orElse(5)).toBe(5);
  });

  it("orUndefined() should return undefined", function () {
    expect(none.orUndefined()).toBeUndefined();
  });

  it("orNull() should return null", function () {
    expect(none.orNull()).toBeNull();
  });

  it("orCompute() should return computed value", function () {
    expect(none.orCompute(() => 5)).toBe(5);
  });

  it("orThrow() should throw error", function () {
    expect(() => none.orThrow("you got fail")).toThrow("you got fail");
  });

  it("map() should return none", function () {
    expect(none.map((t): string => t.toString()).isNone()).toBe(true);
  });

  it("mapTo() should return none", function () {
    expect(none.mapTo("42").isNone()).toBe(true);
  });

  it("flatMap() should return none", function () {
    expect(none.flatMap((t) => Maybe.some(t.toString())).isNone()).toBe(true);
  });
});

describe("Maybe.some()", () => {
  const some = Maybe.some<number>(5);

  it("should not be none", function () {
    expect(some.isNone()).toBe(false);
  });

  it("should be some", function () {
    expect(some.isSome()).toBe(true);
  });

  it("orElse() should return value", function () {
    expect(some.orElse(42)).toBe(5);
  });

  it("orUndefined() should return value", function () {
    expect(some.orUndefined()).toBe(5);
  });

  it("orNull() should return value", function () {
    expect(some.orNull()).toBe(5);
  });

  it("orCompute() should return value", function () {
    expect(some.orCompute(() => 42)).toBe(5);
  });

  it("orThrow() should not throw error", function () {
    expect(() => some.orThrow("you got fail")).not.toThrow("you got fail");
    expect(some.orThrow("you got fail")).toBe(5);
  });

  it("map() should return mapped value", function () {
    expect(some.map((t): string => t.toString()).orNull()).toBe("5");
  });

  it("map(() => null) should return none", function () {
    expect(some.map((t): string | null => null).isNone()).toBe(true);
  });

  it("mapTo() should return mapped value", function () {
    expect(some.mapTo("42").orNull()).toBe("42");
  });

  it("mapTo(null) should return none", function () {
    expect(some.mapTo(null).isNone()).toBe(true);
  });

  it("flatMap() should return mapped value", function () {
    expect(some.flatMap((t) => Maybe.some(t.toString())).orNull()).toBe("42");
  });

  it("flatMap(() => none) should return none", function () {
    expect(some.flatMap((t) => Maybe.none()).isNone()).toBe(true);
  });
});
