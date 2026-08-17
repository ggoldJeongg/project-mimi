import { useState } from "react";
import { JOINT_AXES, JOINT_LIMIT_DEG, findJointsOutOfRange } from "@mimi/protocol";
import type { JointAxis, Joints } from "@mimi/protocol";
import styles from "./TargetControl.module.css";

// 입력값은 문자열로 들고 있는다: type=number + 즉시 Number 변환은 "-"·"24." 같은
// 중간 입력을 0으로 덮어 음수·소수를 못 치게 만든다. 변환은 MOVE 시점에만.
type TargetInput = Record<JointAxis, string>;
const ZERO_INPUT: TargetInput = { j1: "0", j2: "0", j3: "0" };

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
  onMove: (joints: Joints) => void;
  onStop: () => void;
  /** 연결이 끊겼을 때 조작을 막는다. */
  disabled: boolean;
};

export default function TargetControl({ onMove, onStop, disabled }: Props) {
  const [target, setTarget] = useState<TargetInput>(ZERO_INPUT);
  const [inputError, setInputError] = useState<string | null>(null);

  const setAxis = (axis: JointAxis, value: string) => setTarget((t) => ({ ...t, [axis]: value }));

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
    onMove(joints);
  };

  return (
    <section className={styles.section}>
      <h2 className={styles.title}>Target (목표값 입력)</h2>
      {JOINT_AXES.map((a) => (
        <div key={a} className={styles.axisRow}>
          <span className={styles.axisName}>{a}</span>
          <input
            type="range"
            min={JOINT_LIMIT_DEG[a].min}
            max={JOINT_LIMIT_DEG[a].max}
            step={SLIDER_STEP}
            value={sliderValue(target[a])}
            onChange={(e) => setAxis(a, e.target.value)}
            className={styles.slider}
            aria-label={`${a.toUpperCase()} 목표 각도`}
          />
          <span className={styles.numberCell}>
            <input
              type="text"
              inputMode="decimal"
              value={target[a]}
              onChange={(e) => setAxis(a, e.target.value)}
              className={styles.input}
              aria-label={`${a.toUpperCase()} 목표 각도 직접 입력`}
            />
            °
          </span>
          <span className={styles.limitHint}>{limitLabel(a)}</span>
        </div>
      ))}
      <div className={styles.actions}>
        <button onClick={handleMove} disabled={disabled}>
          MOVE
        </button>
        <button onClick={onStop} disabled={disabled} className={styles.stop}>
          STOP
        </button>
      </div>
      {inputError && <p className={styles.error}>⚠ {inputError}</p>}
    </section>
  );
}
