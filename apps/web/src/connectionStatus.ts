// 연결 상태 판정과 표기. 순수 함수라 단위 테스트한다(기획서 §22).
// 색상만으로 구분하지 않기 위해 상태마다 아이콘·텍스트를 함께 정의한다.

/** 마지막 수신 후 이 시간이 지나면 소켓이 열려 있어도 데이터가 없는 것으로 본다. */
export const STALE_MS = 1500;

/** 이 횟수를 넘게 연속 실패하면 "재연결 중"이 아니라 "연결 끊김"으로 승격한다. */
export const GIVE_UP_ATTEMPTS = 5;

export type ConnectionStatus = "LOADING" | "CONNECTED" | "NO_DATA" | "RECONNECTING" | "DISCONNECTED";

export interface ConnectionInput {
  /** 소켓이 열려 있는가. */
  open: boolean;
  /** 한 번이라도 연결에 성공한 적이 있는가. 최초 로딩과 재연결을 가른다. */
  everConnected: boolean;
  /** 마지막 텔레메트리 수신 후 경과(ms). 수신 이력이 없으면 Infinity. */
  sinceLastDataMs: number;
  /** 연속 연결 실패 횟수. 성공하면 0으로 돌아간다. */
  failedAttempts: number;
}

export function deriveStatus({
  open,
  everConnected,
  sinceLastDataMs,
  failedAttempts,
}: ConnectionInput): ConnectionStatus {
  if (open) return sinceLastDataMs <= STALE_MS ? "CONNECTED" : "NO_DATA";
  // 첫 시도가 아직 성공도 실패도 안 한 구간. 여기서 DISCONNECTED를 띄우면 깜빡인다.
  if (!everConnected && failedAttempts === 0) return "LOADING";
  return failedAttempts < GIVE_UP_ATTEMPTS ? "RECONNECTING" : "DISCONNECTED";
}

/**
 * 화면의 숫자를 현재값으로 믿어도 되는가.
 * false면 마지막 수신값이 남아 있어도 정상값처럼 보이면 안 된다(이슈 #13).
 */
export const isLive = (status: ConnectionStatus) => status === "CONNECTED";

/**
 * 소켓이 열려 있어 명령이 실제로 나갈 수 있는가.
 * NO_DATA는 로봇 신호만 끊긴 것이라 게이트웨이로 STOP은 보낼 수 있어야 한다.
 */
export const isSocketOpen = (status: ConnectionStatus) =>
  status === "CONNECTED" || status === "NO_DATA";

/** "마지막 수신 3.2초 전"의 시간 부분. 값이 얼마나 낡았는지 사용자가 바로 알게 한다. */
export function formatAge(ms: number): string {
  if (!Number.isFinite(ms)) return "수신 없음";
  if (ms < 1000) return "방금";
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}초 전`;
  return `${Math.floor(ms / 60_000)}분 전`;
}

export type StatusTone = "ok" | "warn" | "crit" | "idle";

export interface StatusPresentation {
  /** 아이콘만으로도, 텍스트만으로도 상태를 알 수 있어야 한다. */
  icon: string;
  label: string;
  tone: StatusTone;
  /** 사용자가 다음에 뭘 해야 하는지. */
  hint: string;
}

export const STATUS_PRESENTATION: Record<ConnectionStatus, StatusPresentation> = {
  LOADING: { icon: "◌", label: "연결 중", tone: "idle", hint: "게이트웨이에 접속하고 있습니다" },
  CONNECTED: { icon: "●", label: "정상", tone: "ok", hint: "로봇 데이터를 실시간으로 받고 있습니다" },
  NO_DATA: {
    icon: "◍",
    label: "데이터 없음",
    tone: "warn",
    hint: "게이트웨이는 연결됐지만 로봇 신호가 끊겼습니다",
  },
  RECONNECTING: { icon: "◌", label: "재연결 중", tone: "warn", hint: "게이트웨이에 다시 접속하는 중입니다" },
  DISCONNECTED: {
    icon: "✕",
    label: "연결 끊김",
    tone: "crit",
    hint: "게이트웨이가 실행 중인지 확인하세요",
  },
};
