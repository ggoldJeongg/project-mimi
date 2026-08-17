import { useEffect, useRef, useState } from "react";
import type { Joints, StateMessage, CommandMessage, StopMessage } from "@mimi/protocol";
import styles from "./App.module.css";

const WS_URL = "ws://localhost:8081";
const STALE_MS = 1500; // 마지막 수신 후 이 시간 지나면 NO DATA
const fmt = (n: number) => n.toFixed(1);

// 입력값은 문자열로 들고 있는다: type=number + 즉시 Number 변환은 "-"·"24." 같은
// 중간 입력을 0으로 덮어 음수·소수를 못 치게 만든다. 변환은 MOVE 시점에만.
type TargetInput = Record<keyof Joints, string>;
const ZERO_INPUT: TargetInput = { j1: "0", j2: "0", j3: "0" };

export default function App() {
  // 소켓은 그리는 값이 아니라 보내기 도구라 state가 아닌 ref (재렌더/stale closure 회피).
  const socketRef = useRef<WebSocket | null>(null);
  const lastRecvRef = useRef(0);

  const [connected, setConnected] = useState(false);
  const [actual, setActual] = useState<Joints | null>(null);
  const [target, setTarget] = useState<TargetInput>(ZERO_INPUT);
  const [, forceTick] = useState(0);

  useEffect(() => {
    const socket = new WebSocket(WS_URL);
    socketRef.current = socket;

    socket.onopen = () => setConnected(true);
    socket.onclose = () => setConnected(false);
    socket.onerror = () => setConnected(false);
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

    // StrictMode(dev)는 effect를 두 번 돌리므로 여기서 안 닫으면 좀비 연결.
    return () => socket.close();
  }, []);

  // 수신이 멈추면 onmessage가 안 오니, 타이머로 재렌더해 staleness를 다시 계산한다.
  useEffect(() => {
    const id = setInterval(() => forceTick((t) => t + 1), 500);
    return () => clearInterval(id);
  }, []);

  const stale = Date.now() - lastRecvRef.current > STALE_MS;
  const status = !connected ? "DISCONNECTED" : actual === null || stale ? "NO DATA" : "CONNECTED";
  const statusClass = { CONNECTED: styles.ok, "NO DATA": styles.warn, DISCONNECTED: styles.crit }[status];

  function send(msg: CommandMessage | StopMessage) {
    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) return;
    socket.send(JSON.stringify(msg));
  }

  const handleMove = () => {
    const joints = { j1: Number(target.j1), j2: Number(target.j2), j3: Number(target.j3) };
    // text 입력이라 숫자가 아닐 수 있다 → 로봇에 NaN 명령이 나가지 않게 막는다.
    if (![joints.j1, joints.j2, joints.j3].every(Number.isFinite)) {
      console.warn("[ws] target 값이 올바르지 않음 — 전송 취소:", target);
      return;
    }
    send({ type: "move", joints });
  };
  const handleStop = () => send({ type: "stop" });
  const setAxis = (axis: keyof Joints, value: string) =>
    setTarget((t) => ({ ...t, [axis]: value }));

  const axes: (keyof Joints)[] = ["j1", "j2", "j3"];

  return (
    <main className={styles.app}>
      <h1>project mimi</h1>

      <p>
        상태: <span className={`${styles.badge} ${statusClass}`}>● {status}</span>
      </p>

      <section>
        <h2 className={styles.h2}>Actual (로봇 현재값)</h2>
        <table className={styles.table}>
          <tbody>
            {axes.map((a) => (
              <tr key={a}>
                <td className={styles.axisCell}>{a}</td>
                <td className={styles.valueCell}>{actual ? `${fmt(actual[a])}°` : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className={styles.section}>
        <h2 className={styles.h2}>Target (목표값 입력)</h2>
        {axes.map((a) => (
          <label key={a} className={styles.label}>
            <span className={styles.axisName}>{a}</span>
            <input
              type="text"
              inputMode="decimal"
              value={target[a]}
              onChange={(e) => setAxis(a, e.target.value)}
              className={styles.input}
            />{" "}
            °
          </label>
        ))}
        <div className={styles.actions}>
          <button onClick={handleMove} disabled={!connected}>
            MOVE
          </button>
          <button onClick={handleStop} disabled={!connected} className={styles.stop}>
            STOP
          </button>
        </div>
      </section>
    </main>
  );
}
