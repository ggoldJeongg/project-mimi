import { useState } from "react";
import { JOINT_AXES, JOINT_LIMIT_DEG, findJointsOutOfRange } from "@mimi/protocol";
import type { JointAxis } from "@mimi/protocol";
import RobotView from "./RobotView";
import { useRobotConnection } from "./useRobotConnection";
import styles from "./App.module.css";

const fmt = (n: number) => n.toFixed(1);

// 입력값은 문자열로 들고 있는다: type=number + 즉시 Number 변환은 "-"·"24." 같은
// 중간 입력을 0으로 덮어 음수·소수를 못 치게 만든다. 변환은 MOVE 시점에만.
type TargetInput = Record<JointAxis, string>;
const ZERO_INPUT: TargetInput = { j1: "0", j2: "0", j3: "0" };

export default function App() {
  const { status, actual, move, stop } = useRobotConnection();
  const [target, setTarget] = useState<TargetInput>(ZERO_INPUT);
  const [inputError, setInputError] = useState<string | null>(null);

  const statusClass = { CONNECTED: styles.ok, "NO DATA": styles.warn, DISCONNECTED: styles.crit }[status];
  const offline = status === "DISCONNECTED";

  const handleMove = () => {
    const joints = { j1: Number(target.j1), j2: Number(target.j2), j3: Number(target.j3) };
    // text 입력이라 숫자가 아닐 수 있는데, 그것도 이 검사에서 함께 걸린다(NaN → 위반).
    const outOfRange = findJointsOutOfRange(joints);
    if (outOfRange.length > 0) {
      const detail = outOfRange
        .map((a) => `${a.toUpperCase()} ${JOINT_LIMIT_DEG[a].min}~${JOINT_LIMIT_DEG[a].max}°`)
        .join(", ");
      setInputError(`${detail} 범위의 숫자만 보낼 수 있습니다`);
      return;
    }
    setInputError(null);
    move(joints);
  };
  const setAxis = (axis: JointAxis, value: string) => setTarget((t) => ({ ...t, [axis]: value }));

  return (
    <main className={styles.app}>
      <h1>project mimi</h1>

      <div className={styles.layout}>
        <div className={styles.viewport}>
          <RobotView joints={actual} />
        </div>

        <div className={styles.panel}>
          <p>
            상태: <span className={`${styles.badge} ${statusClass}`}>● {status}</span>
          </p>

          <section>
            <h2 className={styles.h2}>Actual (로봇 현재값)</h2>
            <table className={styles.table}>
              <tbody>
                {JOINT_AXES.map((a) => (
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
            {JOINT_AXES.map((a) => (
              <label key={a} className={styles.label}>
                <span className={styles.axisName}>{a}</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={target[a]}
                  onChange={(e) => setAxis(a, e.target.value)}
                  className={styles.input}
                />{" "}
                °{" "}
                <span className={styles.limitHint}>
                  {JOINT_LIMIT_DEG[a].min}~{JOINT_LIMIT_DEG[a].max}
                </span>
              </label>
            ))}
            <div className={styles.actions}>
              <button onClick={handleMove} disabled={offline}>
                MOVE
              </button>
              <button onClick={stop} disabled={offline} className={styles.stop}>
                STOP
              </button>
            </div>
            {inputError && <p className={styles.error}>⚠ {inputError}</p>}
          </section>
        </div>
      </div>
    </main>
  );
}
