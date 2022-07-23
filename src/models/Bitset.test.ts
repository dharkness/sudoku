import Bitset from "./Bitset";

describe("bitset.empty()", () => {
  it("should have zero size", function () {
    expect(Bitset.empty().size).toBe(0);
  });

  it("should have zero bits", function () {
    expect(Bitset.empty().bits).toBe(0);
  });

  it("should have no bits set", function () {
    for (let i = 0; i < 10; i++) {
      expect(Bitset.empty().isset(i)).toBe(false);
    }
  });

  it("should equal itself", function () {
    expect(Bitset.empty().equals(Bitset.empty())).toBe(true);
  });
});

describe("bitset.full()", () => {
  it("should have given size", function () {
    expect(Bitset.full(8).size).toBe(8);
  });

  it("should have given bits", function () {
    expect(Bitset.full(8).bits).toBe(0b11111111);
  });

  it("should have given bits set", function () {
    for (let i = 0; i < 8; i++) {
      expect(Bitset.full(8).isset(i)).toBe(true);
    }
  });

  it("should have no later bits set", function () {
    for (let i = 8; i < 18; i++) {
      expect(Bitset.full(8).isset(i)).toBe(false);
    }
  });

  it("should equal itself", function () {
    expect(Bitset.full(8).equals(Bitset.full(8))).toBe(true);
  });
});

describe("bitset.of()", () => {
  it("should have correct size", function () {
    expect(Bitset.of(0b10110).size).toBe(3);
  });

  it("should have given bits", function () {
    expect(Bitset.of(0b10110).bits).toBe(0b10110);
  });

  it("should have correct bits set", function () {
    const set = Bitset.of(0b10110);
    expect(set.isset(0)).toBe(false);
    expect(set.isset(1)).toBe(true);
    expect(set.isset(2)).toBe(true);
    expect(set.isset(3)).toBe(false);
    expect(set.isset(4)).toBe(true);
  });

  it("should have no later bits set", function () {
    const set = Bitset.of(0b10110);
    for (let i = 5; i < 10; i++) {
      expect(set.isset(i)).toBe(false);
    }
  });

  it("should equal itself", function () {
    expect(Bitset.of(0b10110).equals(Bitset.of(0b10110))).toBe(true);
  });
});

describe("bitset.from()", () => {
  it("should have correct size", function () {
    expect(Bitset.from("10110").size).toBe(3);
  });

  it("should have correct size", function () {
    expect(Bitset.from("10110").bits).toBe(0b10110);
  });

  it("should have correct bits set", function () {
    const set = Bitset.from("10110");
    expect(set.isset(0)).toBe(false);
    expect(set.isset(1)).toBe(true);
    expect(set.isset(2)).toBe(true);
    expect(set.isset(3)).toBe(false);
    expect(set.isset(4)).toBe(true);
  });

  it("should have no later bits set", function () {
    const set = Bitset.from("10110");
    for (let i = 5; i < 10; i++) {
      expect(set.isset(i)).toBe(false);
    }
  });

  it("should equal itself", function () {
    expect(Bitset.from("10110").equals(Bitset.from("10110"))).toBe(true);
  });
});

describe("bitset.set()", () => {
  it("should set an unset bit", function () {
    expect(Bitset.of(0b10110).set(3).isset(3)).toBe(true);
    expect(Bitset.of(0b10110).set(3).bits).toBe(0b11110);
  });

  it("should increase size when setting an unset bit", function () {
    expect(Bitset.of(0b10110).set(3).size).toBe(4);
  });

  it("should not change a set bit", function () {
    expect(Bitset.of(0b11010).set(3).isset(3)).toBe(true);
    expect(Bitset.of(0b11010).set(3).bits).toBe(0b11010);
  });

  it("should not increase size when setting a set bit", function () {
    expect(Bitset.of(0b11010).set(3).size).toBe(3);
  });
});

describe("bitset.unset()", () => {
  it("should unset a set bit", function () {
    expect(Bitset.of(0b11010).unset(3).isset(3)).toBe(false);
    expect(Bitset.of(0b11010).unset(3).bits).toBe(0b10010);
  });

  it("should decrease size when setting a set bit", function () {
    expect(Bitset.of(0b11010).unset(3).size).toBe(2);
  });

  it("should not change an unset bit", function () {
    expect(Bitset.of(0b10010).unset(3).isset(3)).toBe(false);
    expect(Bitset.of(0b10010).unset(3).bits).toBe(0b10010);
  });

  it("should not decrease size when setting an unset bit", function () {
    expect(Bitset.of(0b10010).unset(3).size).toBe(2);
  });
});

describe("bitset.clone()", () => {
  const set = Bitset.of(0b10110);

  it("should have same size", function () {
    expect(set.clone().size).toBe(set.size);
  });

  it("should have same bits", function () {
    expect(set.clone().bits).toBe(set.bits);
  });

  it("should equal itself", function () {
    expect(set.clone().equals(set)).toBe(true);
  });
});

describe("bitset.union()", () => {
  it("should keep bit set in either set", function () {
    expect(Bitset.of(0b0).union(Bitset.of(0b1)).isset(0)).toBe(true);
    expect(Bitset.of(0b1).union(Bitset.of(0b0)).isset(0)).toBe(true);
    expect(Bitset.of(0b1).union(Bitset.of(0b1)).isset(0)).toBe(true);
  });

  it("should clear bit unset in both sets", function () {
    expect(Bitset.of(0b0).union(Bitset.of(0b0)).isset(0)).toBe(false);
  });

  it("should be unchanged when applied to itself", function () {
    const set = Bitset.of(0b10110);

    expect(set.union(set).equals(set)).toBe(true);
  });
});

describe("bitset.intersect()", () => {
  it("should keep bit set in both sets", function () {
    expect(Bitset.of(0b1).intersect(Bitset.of(0b1)).isset(0)).toBe(true);
  });

  it("should clear bit unset in either set", function () {
    expect(Bitset.of(0b0).intersect(Bitset.of(0b0)).isset(0)).toBe(false);
    expect(Bitset.of(0b0).intersect(Bitset.of(0b1)).isset(0)).toBe(false);
    expect(Bitset.of(0b1).intersect(Bitset.of(0b0)).isset(0)).toBe(false);
  });

  it("should be unchanged when applied to itself", function () {
    const set = Bitset.of(0b10110);

    expect(set.intersect(set).equals(set)).toBe(true);
  });
});

describe("bitset.diff()", () => {
  it("should keep first bit when unset in second set", function () {
    expect(Bitset.of(0b0).diff(Bitset.of(0b0)).isset(0)).toBe(false);
    expect(Bitset.of(0b1).diff(Bitset.of(0b0)).isset(0)).toBe(true);
  });

  it("should clear first bit when set in second set", function () {
    expect(Bitset.of(0b0).diff(Bitset.of(0b1)).isset(0)).toBe(false);
    expect(Bitset.of(0b1).diff(Bitset.of(0b1)).isset(0)).toBe(false);
  });

  it("should be empty when applied to itself", function () {
    const set = Bitset.of(0b10110);

    expect(set.diff(set).equals(Bitset.empty())).toBe(true);
  });
});

export {};
