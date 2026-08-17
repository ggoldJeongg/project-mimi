import { useEffect, useRef, useState } from "react";
import type { ClientMessage, Joints, StateMessage } from "@mimi/protocol";
import { deriveStatus, type ConnectionStatus } from "./connectionStatus";

const WS_URL = "ws://localhost:8081";
const TICK_MS = 500;
const RETRY_MS = 1000;

/** 차트에 남겨둘 구간. 이보다 오래된 샘플은 버려 메모리를 묶는다. */
export const TELEMETRY_WINDOW_MS = 10_000;

export type { ConnectionStatus };

/** 수신 시각이 찍힌 관절값. state 메시지에 시간이 없어 브라우저가 도착 시각을 찍는다. */
export interface Sample extends Joints {
  t: number;
}

/** gateway와의 연결을 감추고, 로봇 현재값과 명령 수단만 노출 */
export function useRobotConnection() {
  const socketRef = useRef<WebSocket | null>(null);
  const lastRecvRef = useRef(0);

  const [open, setOpen] = useState(false);
  const [everConnected, setEverConnected] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [actual, setActual] = useState<Joints | null>(null);
  const [samples, setSamples] = useState<Sample[]>([]);
  const [, forceTick] = useState(0);

  useEffect(() => {
    let unmounted = false;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;

    const connect = () => {
      const socket = new WebSocket(WS_URL);
      socketRef.current = socket;
      // 닫힌 소켓의 이벤트가 뒤늦게 도착해 새 소켓의 상태를 덮어쓰는 것을 막는다.
      // 특히 failedAttempts가 잘못 올라가면 멀쩡한 연결이 DISCONNECTED로 표시된다.
      const isCurrent = () => socketRef.current === socket;

      socket.onopen = () => {
        if (!isCurrent()) return;
        setOpen(true);
        setEverConnected(true);
        setFailedAttempts(0);
      };

      socket.onmessage = (event) => {
        if (!isCurrent()) return;
        try {
          const msg: StateMessage = JSON.parse(event.data);
          if (msg.type !== "state") return;
          const t = Date.now();
          setActual(msg.joints);
          // 창 밖 샘플을 여기서 버린다. 차트가 버리면 이 배열이 무한히 자란다.
          setSamples((prev) => [...prev, { t, ...msg.joints }].filter((s) => t - s.t <= TELEMETRY_WINDOW_MS));
          lastRecvRef.current = t;
        } catch {
          console.warn("[ws] JSON parse 실패:", event.data);
        }
      };

      // 연결 실패도 error 뒤에 close가 오므로 재시도는 여기 한 곳에서만 건다.
      // gateway는 tsx watch로 돌아 저장할 때마다 재시작한다 → 재연결이 없으면 새로고침 전까지 제어 불가.
      socket.onclose = () => {
        if (!isCurrent()) return;
        setOpen(false);
        setFailedAttempts((n) => n + 1);
        if (!unmounted) retryTimer = setTimeout(connect, RETRY_MS);
      };
    };
    connect();

    // StrictMode(dev)는 effect를 두 번 돌리므로 여기서 안 닫으면 좀비 연결.
    // unmounted를 먼저 세워야 close 핸들러가 재연결을 걸지 않는다.
    return () => {
      unmounted = true;
      clearTimeout(retryTimer);
      socketRef.current?.close();
      socketRef.current = null;
    };
  }, []);

  // 수신이 멈추면 onmessage가 안 와서 타이머로 재렌더해 staleness를 다시 계산
  useEffect(() => {
    const id = setInterval(() => forceTick((t) => t + 1), TICK_MS);
    return () => clearInterval(id);
  }, []);

  const sinceLastDataMs = lastRecvRef.current === 0 ? Infinity : Date.now() - lastRecvRef.current;
  const status = deriveStatus({ open, everConnected, sinceLastDataMs, failedAttempts });

  function send(msg: ClientMessage) {
    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) return;
    socket.send(JSON.stringify(msg));
  }

  return {
    status,
    actual,
    samples,
    /** 마지막 수신 후 경과(ms). 수신 이력이 없으면 Infinity. */
    sinceLastDataMs,
    move: (joints: Joints) => send({ type: "move", joints }),
    stop: () => send({ type: "stop" }),
  };
}
