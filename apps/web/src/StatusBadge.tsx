import { STATUS_PRESENTATION, type ConnectionStatus } from "./connectionStatus";
import styles from "./StatusBadge.module.css";

type Props = {
  status: ConnectionStatus;
  /** "마지막 수신 3.2초 전" 같은 부가 정보. */
  detail?: string;
};

export default function StatusBadge({ status, detail }: Props) {
  const { icon, label, tone, hint } = STATUS_PRESENTATION[status];

  return (
    // role=status: 상태가 바뀌면 스크린리더가 읽어준다.
    <div className={`${styles.badge} ${styles[tone]}`} role="status">
      <span className={styles.icon} aria-hidden="true">
        {icon}
      </span>
      <span className={styles.label}>{label}</span>
      <span className={styles.hint}>{detail ?? hint}</span>
    </div>
  );
}
