import { useState } from "react";
import type { JointAxis } from "@mimi/protocol";
import ActualReadout from "./ActualReadout";
import RobotView from "./RobotView";
import StatusBadge from "./StatusBadge";
import TargetControl from "./TargetControl";
import TelemetryChart from "./TelemetryChart";
import { isSocketOpen } from "./connectionStatus";
import { useRobotConnection } from "./useRobotConnection";
import { useTargetJoints } from "./useTargetJoints";
import styles from "./App.module.css";

export default function App() {
  const { status, actual, samples, sinceLastDataMs, move, stop } = useRobotConnection();
  // 3D 드래그와 슬라이더가 같은 목표값을 편집하므로 공통 부모인 여기에 둔다.
  const target = useTargetJoints();
  const [selected, setSelected] = useState<JointAxis | null>(null);

  return (
    <main className={styles.app}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>project mimi</h1>
          <p className={styles.subtitle}>3축 로봇 실시간 관제</p>
        </div>
        <StatusBadge status={status} />
      </header>

      <section className={styles.kpi} aria-label="현재 관절 각도">
        <ActualReadout actual={actual} status={status} sinceLastDataMs={sinceLastDataMs} />
      </section>

      <div className={styles.layout}>
        <section className={styles.viewport} aria-label="3D Digital Twin">
          <RobotView
            actual={actual}
            target={target.display}
            selected={selected}
            onSelect={setSelected}
            onDragJoint={target.setAxisDeg}
          />
        </section>

        <div className={`${styles.panel} ${styles.card}`}>
          <TargetControl
            input={target.input}
            error={target.error}
            selected={selected}
            onAxisChange={target.setAxis}
            onSelect={setSelected}
            onMove={() => target.commit(move)}
            onStop={stop}
            disabled={!isSocketOpen(status)}
          />
        </div>

        <section className={`${styles.chartArea} ${styles.card}`} aria-label="Telemetry Chart">
          <TelemetryChart samples={samples} />
        </section>
      </div>
    </main>
  );
}
