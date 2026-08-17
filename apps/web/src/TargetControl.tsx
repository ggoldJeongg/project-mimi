import { JOINT_AXES, JOINT_LIMIT_DEG } from "@mimi/protocol";
import type { JointAxis } from "@mimi/protocol";
import type { TargetInput } from "./useTargetJoints";
import styles from "./TargetControl.module.css";

// 0.1° 단위가 실제로 필요한지 써보고 정한다. 스텝모터 분해능은 약 0.088°/스텝.
const SLIDER_STEP = 1;

// 슬라이더는 숫자만 받는다. "-"·"24." 같은 입력 중간 상태는 0으로 보여주되,
// 원본 문자열은 건드리지 않아 타이핑을 방해하지 않는다.
const sliderValue = (raw: string) => {
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
};

// 한계가 대칭이면 ±180처럼 짧게. 좁은 패널에서 슬라이더 폭을 아끼려는 것.
const limitLabel = (axis: JointAxis) => {
  const { min, max } = JOINT_LIMIT_DEG[axis];
  return min === -max ? `±${max}` : `${min}~${max}`;
};

type Props = {
  input: TargetInput;
  error: string | null;
  /** 3D에서 집은 축. 어느 슬라이더가 그 관절인지 보여준다. */
  selected: JointAxis | null;
  onAxisChange: (axis: JointAxis, raw: string) => void;
  onSelect: (axis: JointAxis | null) => void;
  onMove: () => void;
  onStop: () => void;
  /** 연결이 끊겼을 때 조작을 막는다. */
  disabled: boolean;
};

export default function TargetControl({
  input,
  error,
  selected,
  onAxisChange,
  onSelect,
  onMove,
  onStop,
  disabled,
}: Props) {
  return (
    <section>
      <h2 className={styles.title}>
        Target <span className={styles.subtitle}>목표값 · 3D 반투명</span>
      </h2>
      {JOINT_AXES.map((a) => (
        <div
          key={a}
          className={`${styles.axisRow} ${a === selected ? styles.selected : ""}`}
          onPointerDown={() => onSelect(a)}
        >
          <span className={styles.axisName}>{a}</span>
          <input
            type="range"
            min={JOINT_LIMIT_DEG[a].min}
            max={JOINT_LIMIT_DEG[a].max}
            step={SLIDER_STEP}
            value={sliderValue(input[a])}
            onChange={(e) => onAxisChange(a, e.target.value)}
            className={styles.slider}
            aria-label={`${a.toUpperCase()} 목표 각도`}
          />
          <span className={styles.numberCell}>
            <input
              type="text"
              inputMode="decimal"
              value={input[a]}
              onChange={(e) => onAxisChange(a, e.target.value)}
              className={styles.input}
              aria-label={`${a.toUpperCase()} 목표 각도 직접 입력`}
            />
            °
          </span>
          <span className={styles.limitHint}>{limitLabel(a)}</span>
        </div>
      ))}
      <div className={styles.actions}>
        <button onClick={onMove} disabled={disabled}>
          MOVE
        </button>
        <button onClick={onStop} disabled={disabled} className={styles.stop}>
          STOP
        </button>
      </div>
      {error && <p className={styles.error}>⚠ {error}</p>}
    </section>
  );
}
