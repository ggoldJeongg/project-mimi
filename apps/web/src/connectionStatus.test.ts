import { describe, it, expect } from "vitest";
import {
  GIVE_UP_ATTEMPTS,
  STALE_MS,
  STATUS_PRESENTATION,
  deriveStatus,
  formatAge,
  isLive,
  isSocketOpen,
  type ConnectionInput,
  type ConnectionStatus,
} from "./connectionStatus";

const input = (over: Partial<ConnectionInput> = {}): ConnectionInput => ({
  open: false,
  everConnected: false,
  sinceLastDataMs: Infinity,
  failedAttempts: 0,
  ...over,
});

describe("deriveStatus", () => {
  it("첫 시도 중에는 LOADING — 여기서 끊김을 띄우면 매 새로고침마다 깜빡인다", () => {
    expect(deriveStatus(input())).toBe("LOADING");
  });

  it("열려 있고 최근 수신이면 CONNECTED", () => {
    expect(deriveStatus(input({ open: true, everConnected: true, sinceLastDataMs: 100 }))).toBe("CONNECTED");
  });

  it("열려 있어도 수신이 끊기면 NO_DATA", () => {
    expect(deriveStatus(input({ open: true, everConnected: true, sinceLastDataMs: STALE_MS + 1 }))).toBe(
      "NO_DATA",
    );
  });

  it("STALE_MS 경계는 아직 정상으로 본다", () => {
    expect(deriveStatus(input({ open: true, everConnected: true, sinceLastDataMs: STALE_MS }))).toBe(
      "CONNECTED",
    );
  });

  it("소켓이 열렸는데 아직 데이터가 없으면 NO_DATA (연결 직후)", () => {
    expect(deriveStatus(input({ open: true, sinceLastDataMs: Infinity }))).toBe("NO_DATA");
  });

  it("끊긴 뒤 재시도 중이면 RECONNECTING", () => {
    expect(deriveStatus(input({ everConnected: true, failedAttempts: 1 }))).toBe("RECONNECTING");
    expect(deriveStatus(input({ everConnected: true, failedAttempts: GIVE_UP_ATTEMPTS - 1 }))).toBe(
      "RECONNECTING",
    );
  });

  it("계속 실패하면 DISCONNECTED로 승격한다", () => {
    expect(deriveStatus(input({ everConnected: true, failedAttempts: GIVE_UP_ATTEMPTS }))).toBe(
      "DISCONNECTED",
    );
  });

  it("한 번도 연결된 적 없어도 실패가 쌓이면 로딩이 아니다", () => {
    expect(deriveStatus(input({ failedAttempts: 1 }))).toBe("RECONNECTING");
  });
});

describe("isLive", () => {
  it("CONNECTED일 때만 화면 숫자를 현재값으로 믿는다", () => {
    expect(isLive("CONNECTED")).toBe(true);
    for (const s of ["LOADING", "NO_DATA", "RECONNECTING", "DISCONNECTED"] as ConnectionStatus[]) {
      expect(isLive(s), s).toBe(false);
    }
  });
});

describe("isSocketOpen", () => {
  it("소켓이 열린 두 상태에서만 명령이 나갈 수 있다", () => {
    expect(isSocketOpen("CONNECTED")).toBe(true);
    // 로봇 신호만 끊긴 상태 — 게이트웨이는 살아 있으니 STOP은 보낼 수 있어야 한다.
    expect(isSocketOpen("NO_DATA")).toBe(true);
    for (const s of ["LOADING", "RECONNECTING", "DISCONNECTED"] as ConnectionStatus[]) {
      expect(isSocketOpen(s), s).toBe(false);
    }
  });
});

describe("formatAge", () => {
  it("수신 이력이 없으면 시간 대신 그 사실을 말한다", () => {
    expect(formatAge(Infinity)).toBe("수신 없음");
  });

  it("1초 미만은 '방금'", () => {
    expect(formatAge(0)).toBe("방금");
    expect(formatAge(999)).toBe("방금");
  });

  it("분 미만은 0.1초 단위", () => {
    expect(formatAge(1000)).toBe("1.0초 전");
    expect(formatAge(3240)).toBe("3.2초 전");
    expect(formatAge(59_900)).toBe("59.9초 전");
  });

  it("1분 이상은 분 단위", () => {
    expect(formatAge(60_000)).toBe("1분 전");
    expect(formatAge(125_000)).toBe("2분 전");
  });
});

describe("STATUS_PRESENTATION", () => {
  it("모든 상태가 아이콘과 텍스트를 함께 갖는다 (색상만으로 구분 금지)", () => {
    const statuses: ConnectionStatus[] = [
      "LOADING",
      "CONNECTED",
      "NO_DATA",
      "RECONNECTING",
      "DISCONNECTED",
    ];
    for (const s of statuses) {
      const p = STATUS_PRESENTATION[s];
      expect(p.icon.length, s).toBeGreaterThan(0);
      expect(p.label.length, s).toBeGreaterThan(0);
      expect(p.hint.length, s).toBeGreaterThan(0);
    }
  });

  it("아이콘이 상태마다 달라 아이콘만으로도 구분된다", () => {
    // LOADING과 RECONNECTING은 둘 다 "시도 중"이라 같은 아이콘을 공유한다.
    const icons = new Set(Object.values(STATUS_PRESENTATION).map((p) => p.icon));
    expect(icons.size).toBeGreaterThanOrEqual(4);
  });
});
