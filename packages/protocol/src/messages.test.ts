import { describe, it, expect } from "vitest";
import { findJointsOutOfRange } from "./messages";

describe("findJointsOutOfRange", () => {
  it("범위 안이면 빈 배열", () => {
    expect(findJointsOutOfRange({ j1: 24.5, j2: 0, j3: -90 })).toEqual([]);
  });

  it("경계값은 허용 (j1·j3 ±180, j2 ±90)", () => {
    expect(findJointsOutOfRange({ j1: -180, j2: 90, j3: 180 })).toEqual([]);
    expect(findJointsOutOfRange({ j1: 180, j2: -90, j3: -180 })).toEqual([]);
  });

  it("j2는 ±90을 넘으면 위반 — 다른 축이면 통과할 값", () => {
    expect(findJointsOutOfRange({ j1: 120, j2: 120, j3: 120 })).toEqual(["j2"]);
    expect(findJointsOutOfRange({ j1: 0, j2: -90.1, j3: 0 })).toEqual(["j2"]);
  });

  it("한계를 넘은 축만 보고한다", () => {
    expect(findJointsOutOfRange({ j1: 200, j2: 0, j3: -180.1 })).toEqual(["j1", "j3"]);
  });

  it("숫자가 아니거나 빠진 값도 위반", () => {
    expect(findJointsOutOfRange({ j1: NaN, j2: Infinity, j3: 0 })).toEqual(["j1", "j2"]);
    expect(findJointsOutOfRange({})).toEqual(["j1", "j2", "j3"]);
    expect(findJointsOutOfRange(undefined)).toEqual(["j1", "j2", "j3"]);
  });
});
