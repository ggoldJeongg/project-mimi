// 실행: npm test -w @mimi/gateway (vitest)
import { test, expect } from "vitest";
import { parseTelemetry } from "./parser";

test("정상 입력: 완료 기준 예시", () => {
  expect(parseTelemetry("2450;1000;-725;")).toEqual({
    j1: 24.5,
    j2: 10,
    j3: -7.25,
  });
});

test("0 값", () => {
  expect(parseTelemetry("0;0;0;")).toEqual({ j1: 0, j2: 0, j3: 0 });
});

test("음수 입력", () => {
  expect(parseTelemetry("-9000;1800;-4500;")).toEqual({
    j1: -90,
    j2: 18,
    j3: -45,
  });
});

test("끝 세미콜론 없이 와도 파싱된다", () => {
  expect(parseTelemetry("2450;1000;-725")).toEqual({
    j1: 24.5,
    j2: 10,
    j3: -7.25,
  });
});

test("값 개수가 적으면 null", () => {
  expect(parseTelemetry("2450;1000;")).toBeNull();
});

test("값 개수가 많으면 null", () => {
  expect(parseTelemetry("2450;1000;-725;500;")).toBeNull();
});

test("숫자가 아닌 값이 섞이면 null", () => {
  expect(parseTelemetry("2450;abc;-725;")).toBeNull();
});

test("빈 문자열은 null", () => {
  expect(parseTelemetry("")).toBeNull();
});
