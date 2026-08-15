import { useEffect, useRef, useState } from "react";
import type { ClientMessage, Joints, StateMessage } from "@mimi/protocol";

const WS_URL = "ws://localhost:8081";
const STALE_MS = 1500; // 마지막 수신 후 이 시간 지나면 NO DATA
const TICK_MS = 500;
const RETRY_MS = 1000;

export type ConnectionStatus = "CONNECTED" | "NO DATA" | "DISCONNECTED";

/** gateway와의 연결을 감추고, 로봇 현재값과 명령 수단만 노출 */
export function useRobotConnection() {
  const socketRef = useRef<WebSocket | null>(null);
  const lastRecvRef = useRef(0);

  const [connected, setConnected] = useState(false);
  const [actual, setActual] = useState<Joints | null>(null);
  const [, forceTick] = useState(0);

  useEffect(() => {
    let unmounted = false;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;

    const connect = () => {
      const socket = new WebSocket(WS_URL);
      socketRef.current = socket;

      socket.onopen = () => setConnected(true);
      socket.onmessage = (event) => {
        try {
          const msg: StateMessage = JSON.parse(event.data);
          if (msg.type !== "state") return;
          setActual(msg.joints);
          lastRecvRef.current = Date.now();
        } catch {
          console.warn("[ws] JSON parse 실패:", event.data);
        }
      };
      // 연결 실패도 error 뒤에 close가 오므로 재시도는 여기 한 곳에서만 건다.
      // gateway는 tsx watch로 돌아 저장할 때마다 재시작한다 → 재연결이 없으면 새로고침 전까지 제어 불가.
      socket.onclose = () => {
        setConnected(false);
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
    };
  }, []);

  // 수신이 멈추면 onmessage가 안 와서 타이머로 재렌더해 staleness를 다시 계산
  useEffect(() => {
    const id = setInterval(() => forceTick((t) => t + 1), TICK_MS);
    return () => clearInterval(id);
  }, []);

  const stale = Date.now() - lastRecvRef.current > STALE_MS;
  const status: ConnectionStatus = !connected
    ? "DISCONNECTED"
    : actual === null || stale
      ? "NO DATA"
      : "CONNECTED";

  function send(msg: ClientMessage) {
    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) return;
    socket.send(JSON.stringify(msg));
  }

  return {
    status,
    actual,
    move: (joints: Joints) => send({ type: "move", joints }),
    stop: () => send({ type: "stop" }),
  };
}
