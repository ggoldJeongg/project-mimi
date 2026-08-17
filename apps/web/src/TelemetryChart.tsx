import { useEffect, useId, useRef } from "react";
import { axisBottom, axisLeft, line, scaleLinear, select } from "d3";
import { JOINT_AXES } from "@mimi/protocol";
import { JOINT_COLOR } from "./jointTheme";
import { TELEMETRY_WINDOW_MS, type Sample } from "./useRobotConnection";
import styles from "./TelemetryChart.module.css";

// margin convention: 눈금 글씨는 plot 바깥에 살아야 하므로 안쪽으로 원점을 옮겨 그린다.
const WIDTH = 640;
// 폭에 맞춰 늘어나므로 비율이 곧 높이다. 전체 폭을 쓰므로 납작해야 한다.
const HEIGHT = 160;
const MARGIN = { top: 8, right: 12, bottom: 26, left: 44 };
const PLOT_W = WIDTH - MARGIN.left - MARGIN.right;
const PLOT_H = HEIGHT - MARGIN.top - MARGIN.bottom;

// 세 축을 같은 격자에서 비교하려고 가장 넓은 한계로 고정한다.
// 자동 스케일(extent)은 정지 중 도메인이 붕괴해 센서 노이즈가 진동처럼 보인다.
const Y_DEG = 180;
// d3가 고른 -100/0/100은 끝값에 기준선이 없어 위쪽 값을 가늠할 수 없다.
// ±90은 J2의 실제 한계이기도 해서 눈금이 곧 한계선 역할을 한다.
const Y_TICKS = [-180, -90, 0, 90, 180];

const WINDOW_SEC = TELEMETRY_WINDOW_MS / 1000;

// 이보다 벌어진 두 샘플은 잇지 않는다. 재연결·UDP 유실로 비어 있던 구간을
// 직선으로 이으면 로봇이 그 사이 부드럽게 움직인 것처럼 보인다(없던 동작 오표시).
// 정상 간격은 10ms(100Hz)라 200ms는 지터와 확실히 구분된다.
const MAX_GAP_MS = 200;

// 색은 KPI 타일과 공유한다(jointTheme).
const LINE_COLOR = JOINT_COLOR;

// ── 측정용(CLAUDE.md 측정 우선). 병목 위치가 정해지면 이 블록은 통째로 지운다. ──
// scale+line만 재면 안 된다: 이 차트의 진짜 위험은 메인 스레드를 RobotView의 rAF와
// 나눠 쓰는 것이라, 3D가 프레임을 떨어뜨리는지(fps·worst)를 같이 봐야 판단이 선다.
// StrictMode(dev)는 렌더를 두 번 돌리므로 renders와 ms는 둘 다 실제의 2배다(fps는 아님).
function useRenderCost() {
  const stat = useRef({ renders: 0, ms: 0 });
  useEffect(() => {
    let frames = 0;
    let worst = 0;
    let last = performance.now();
    let raf = requestAnimationFrame(function tick(t) {
      frames++;
      worst = Math.max(worst, t - last);
      last = t;
      raf = requestAnimationFrame(tick);
    });

    const id = setInterval(() => {
      const { renders, ms } = stat.current;
      // 탭이 백그라운드면 rAF가 멈춰 frames=0이 된다. 0fps로 찍으면 "3D가 죽었다"로 오독된다.
      const frame = frames === 0 ? "화면 비활성" : `${frames}fps, worst frame ${worst.toFixed(0)}ms`;
      if (renders > 0) console.log(`[chart] ${renders} renders, scale+line ${ms.toFixed(1)}ms, ${frame}`);
      stat.current = { renders: 0, ms: 0 };
      frames = 0;
      worst = 0;
    }, 1000);

    return () => {
      cancelAnimationFrame(raf);
      clearInterval(id);
    };
  }, []);
  return stat.current;
}

type Props = {
  samples: Sample[];
};

export default function TelemetryChart({ samples }: Props) {
  const xAxisRef = useRef<SVGGElement>(null);
  const yAxisRef = useRef<SVGGElement>(null);
  const cost = useRenderCost();
  // SVG id는 document 전역이라 상수로 두면 차트가 둘 이상일 때 서로의 clip을 참조한다.
  const clipId = `plot-${useId().replace(/:/g, "")}`;

  // x는 절대 시각이 아니라 "지금으로부터 몇 초 전"이라 도메인이 상수다.
  // y의 range가 뒤집힌 건 SVG y가 아래로 증가하기 때문 — 그 뒤집기를 scale이 대신한다.
  const x = scaleLinear().domain([-WINDOW_SEC, 0]).range([0, PLOT_W]);
  const y = scaleLinear().domain([-Y_DEG, Y_DEG]).range([PLOT_H, 0]);

  // 도메인이 상수라 눈금은 mount 시 1회면 끝난다.
  // 매 렌더 .call()은 tick DOM을 새로 만들어 차트에서 가장 비싼 동작이 된다.
  useEffect(() => {
    const xg = xAxisRef.current;
    const yg = yAxisRef.current;
    if (!xg || !yg) return;
    select(xg).call(axisBottom(x).ticks(5).tickFormat((d) => `${d}s`));
    select(yg).call(axisLeft(y).tickValues(Y_TICKS).tickFormat((d) => `${d}°`));
  }, []);

  const now = Date.now();
  const started = performance.now();
  // generator는 DOM을 만들지 않는다. path의 d 문자열만 돌려주고 렌더는 React가 한다.
  // defined()가 false면 선을 끊고 다음 점부터 새로 시작한다 → 빈 구간이 직선으로 메워지지 않는다.
  const paths = JOINT_AXES.map((axis) => ({
    axis,
    d: line<Sample>()
      .defined((s, i, all) => i === 0 || s.t - all[i - 1].t <= MAX_GAP_MS)
      .x((s) => x((s.t - now) / 1000))
      .y((s) => y(s[axis]))(samples),
  }));
  cost.ms += performance.now() - started;
  cost.renders += 1;

  return (
    <section className={styles.chart}>
      <div className={styles.header}>
        <h2 className={styles.title}>Telemetry (최근 {WINDOW_SEC}초)</h2>
        <div className={styles.legend}>
          {JOINT_AXES.map((a) => (
            <span key={a} className={styles.legendItem}>
              <span className={styles.swatch} style={{ background: LINE_COLOR[a] }} />
              {a.toUpperCase()}
            </span>
          ))}
        </div>
      </div>

      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className={styles.svg}
        role="img"
        aria-label={`관절 각도 최근 ${WINDOW_SEC}초 추이`}
      >
        <defs>
          {/* 폐기는 수신 시점에만 일어나 창을 살짝 벗어난 점이 남는다 → plot 밖으로 새지 않게 자른다. */}
          <clipPath id={clipId}>
            <rect width={PLOT_W} height={PLOT_H} />
          </clipPath>
        </defs>

        <g transform={`translate(${MARGIN.left},${MARGIN.top})`}>
          <g ref={xAxisRef} transform={`translate(0,${PLOT_H})`} />
          <g ref={yAxisRef} />
          <line className={styles.zero} x1={0} x2={PLOT_W} y1={y(0)} y2={y(0)} />

          <g clipPath={`url(#${clipId})`}>
            {paths.map(({ axis, d }) =>
              d === null ? null : (
                <path key={axis} d={d} fill="none" stroke={LINE_COLOR[axis]} strokeWidth={1.5} />
              ),
            )}
          </g>
        </g>
      </svg>
    </section>
  );
}
