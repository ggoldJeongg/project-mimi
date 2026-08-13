// Robot → Gateway UDP telemetry 파서.
// 로봇이 보내는 raw 문자열을 사람이 읽는 degree 값으로 바꾼다.

/** 파싱 결과 = RobotState.joints 와 같은 모양. */
export interface Joints {
  j1: number;
  j2: number;
  j3: number;
}

export function parseTelemetry(raw: string): Joints | null {
  // 1) 앞뒤 공백·개행 제거. UDP 페이로드 끝에 \n 등이 붙어 올 수 있다.
  const trimmed = raw.trim();

  // 2) ";" 로 자른다.
  //    "2450;1000;-725;".split(";") === ["2450", "1000", "-725", ""]
  //    → 마지막 값 뒤의 ";" 때문에 끝에 빈 문자열("")이 하나 생긴다.
  const parts = trimmed.split(";");

  // 3) 빈 문자열 제거
  //    (주의: Number("") === 0 이라, 안 거르면 0이 섞여 개수 검사를 통과할 수 있음)
  const tokens = parts.filter((t) => t !== "");

  // 4) 로봇 텔레메트리는 "mcs;j1;j2;j3;" 형태로 맨 앞에 "mcs" 태그가 붙는다
  //    (PROTOCOL.md §2.1). 태그를 떼어낸다. 태그 없이 "j1;j2;j3;"로 와도
  //    (구형/시뮬 프레임) 그대로 통과시킨다.
  const values = tokens[0] === "mcs" ? tokens.slice(1) : tokens;

  // 5) 값은 정확히 3개(J1/J2/J3). 아니면 손상 프레임 → 버림.
  if (values.length !== 3) return null;

  // 6) 각 토큰을 숫자로 변환.
  //    Number("2450") = 2450, Number("-725") = -725(음수 OK).
  //    Number("abc") = NaN → 숫자가 아니면 버림.
  const raws = values.map(Number);
  if (!raws.every(Number.isFinite)) return null;

  // 7) raw 는 degree×100(centi-degree)이므로 /100 하면 degree.
  //    2450/100 = 24.5, -725/100 = -7.25.
  const [j1, j2, j3] = raws.map((v) => v / 100);
  return { j1, j2, j3 };
}
