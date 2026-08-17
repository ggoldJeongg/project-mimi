import { useMemo, useState } from "react";
import { JOINT_LIMIT_DEG, findJointsOutOfRange } from "@mimi/protocol";
import type { JointAxis, Joints } from "@mimi/protocol";

// 입력값은 문자열로 들고 있는다: 즉시 Number 변환은 "-"·"24." 같은 중간 입력을
// 0으로 덮어 음수·소수를 못 치게 만든다. 변환은 MOVE 시점에만.
export type TargetInput = Record<JointAxis, string>;
const ZERO_INPUT: TargetInput = { j1: "0", j2: "0", j3: "0" };

// 드래그는 연속값이라 그대로 두면 소수점이 길어진다. 0.1° 단위로 끊는다.
const roundDeg = (deg: number) => Math.round(deg * 10) / 10;

/** 숫자가 아닌 중간 입력은 0으로 본다. 표시(슬라이더·고스트)에만 쓰고 전송에는 쓰지 않는다. */
const displayValue = (raw: string) => {
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
};

/**
 * 목표 각도 상태. 슬라이더·직접입력·3D 드래그가 모두 이 훅 하나를 거치므로
 * 어느 경로로 들어와도 같은 규칙(한계·검증)을 탄다.
 */
export function useTargetJoints() {
  const [input, setInput] = useState<TargetInput>(ZERO_INPUT);
  const [error, setError] = useState<string | null>(null);

  /** 슬라이더·텍스트 입력용. 원본 문자열을 그대로 보관한다. */
  const setAxis = (axis: JointAxis, raw: string) => setInput((t) => ({ ...t, [axis]: raw }));

  /** 3D 드래그용. 이미 한계 안으로 clamp된 숫자가 들어온다. */
  const setAxisDeg = (axis: JointAxis, deg: number) =>
    setInput((t) => ({ ...t, [axis]: String(roundDeg(deg)) }));

  /** 3D 고스트가 그릴 목표 자세. 항상 숫자다. */
  const display: Joints = useMemo(
    () => ({ j1: displayValue(input.j1), j2: displayValue(input.j2), j3: displayValue(input.j3) }),
    [input],
  );

  /** 검증을 통과하면 send를 부른다. 실패하면 에러만 세우고 아무것도 보내지 않는다. */
  const commit = (send: (joints: Joints) => void) => {
    const joints = { j1: Number(input.j1), j2: Number(input.j2), j3: Number(input.j3) };
    const outOfRange = findJointsOutOfRange(joints);
    if (outOfRange.length > 0) {
      const detail = outOfRange
        .map((a) => `${a.toUpperCase()} ${JOINT_LIMIT_DEG[a].min}~${JOINT_LIMIT_DEG[a].max}°`)
        .join(", ");
      setError(`${detail} 범위의 숫자만 보낼 수 있습니다`);
      return;
    }
    setError(null);
    send(joints);
  };

  return { input, display, error, setAxis, setAxisDeg, commit };
}
