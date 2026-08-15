// 실행: npm test -w @mimi/gateway (vitest)
import { test, expect } from "vitest";
import { encodeCommand, encodeStop } from "./command";

test("degree → raw 인코딩 (parser 정상 예시의 역방향)", () => {
  expect(encodeCommand({ j1: 24.5, j2: 10, j3: -7.25 })).toBe(
    "target;2450;1000;-725;",
  );
});

test("0 값", () => {
  expect(encodeCommand({ j1: 0, j2: 0, j3: 0 })).toBe("target;0;0;0;");
});

test("음수 각도", () => {
  expect(encodeCommand({ j1: -90, j2: 18, j3: -45 })).toBe(
    "target;-9000;1800;-4500;",
  );
});

test("소수는 정수로 반올림된다", () => {
  // 24.567° × 100 = 2456.7 → 2457
  expect(encodeCommand({ j1: 24.567, j2: 0, j3: 0 })).toBe("target;2457;0;0;");
});

test("stop = 리터럴 문자열 (태그/세미콜론 없음)", () => {
  expect(encodeStop()).toBe("stop");
});
