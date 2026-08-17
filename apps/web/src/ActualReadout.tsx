import { JOINT_AXES } from "@mimi/protocol";
import type { Joints } from "@mimi/protocol";
import { formatAge, isLive, type ConnectionStatus } from "./connectionStatus";
import { JOINT_COLOR, JOINT_GRADIENT } from "./jointTheme";
import styles from "./ActualReadout.module.css";

type Props = {
  actual: Joints | null;
  status: ConnectionStatus;
  /** 마지막 수신 후 경과(ms). 수신 이력이 없으면 Infinity. */
  sinceLastDataMs: number;
};

export default function ActualReadout({ actual, status, sinceLastDataMs }: Props) {
  const live = isLive(status);
  const caption = live
    ? "실시간"
    : Number.isFinite(sinceLastDataMs)
      ? `${formatAge(sinceLastDataMs)} 값`
      : "수신 없음";

  return (
    <div className={styles.tiles}>
      {JOINT_AXES.map((a) => (
        // 값이 낡았으면 타일 전체를 물려 정상값으로 오해하지 않게 한다(이슈 #13).
        <div
          key={a}
          className={`${styles.tile} ${live ? "" : styles.stalled}`}
          style={{ background: JOINT_GRADIENT[a] }}
        >
          <div className={styles.head}>
            <span className={styles.dot} style={{ background: JOINT_COLOR[a] }} aria-hidden="true" />
            <span className={styles.axis}>{a.toUpperCase()}</span>
          </div>

          <div className={styles.value}>
            {actual ? actual[a].toFixed(1) : "—"}
            <span className={styles.unit}>°</span>
          </div>

          <div className={styles.caption}>{caption}</div>
        </div>
      ))}
    </div>
  );
}
