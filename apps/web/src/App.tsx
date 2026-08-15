import { JOINT_AXES } from "@mimi/protocol";
import RobotView from "./RobotView";
import TargetControl from "./TargetControl";
import TelemetryChart from "./TelemetryChart";
import { useRobotConnection } from "./useRobotConnection";
import styles from "./App.module.css";

const fmt = (n: number) => n.toFixed(1);

export default function App() {
  const { status, actual, samples, move, stop } = useRobotConnection();

  const statusClass = { CONNECTED: styles.ok, "NO DATA": styles.warn, DISCONNECTED: styles.crit }[status];

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

          <TargetControl onMove={move} onStop={stop} disabled={status === "DISCONNECTED"} />
        </div>
      </div>

      <TelemetryChart samples={samples} />
    </main>
  );
}
