// 관절별 색. 차트 선과 KPI 타일이 같은 출처를 봐야 "이 색이 J2"가 화면 전체에서 일관된다.

import type { JointAxis } from "@mimi/protocol";

/** 차트 선·범례·타일 점에 쓰는 진한 색. */
export const JOINT_COLOR: Record<JointAxis, string> = {
  j1: "#38bdf8",
  j2: "#fb923c",
  j3: "#a3e635",
};

/** KPI 타일 배경. 위 색을 옅게 풀어 큰 숫자가 읽히도록 대비를 남긴다. */
export const JOINT_GRADIENT: Record<JointAxis, string> = {
  j1: "linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)",
  j2: "linear-gradient(135deg, #ffedd5 0%, #fed7aa 100%)",
  j3: "linear-gradient(135deg, #ecfccb 0%, #d9f99d 100%)",
};
