# project mimi 최종 기획안

> **Real-time Robot Visualization & Control Platform**
> 실제 3축 로봇과 UDP 기반으로 통신하고, 웹에서 로봇의 상태를 실시간으로 시각화·제어하는 로봇 관제 웹 프로젝트

> **프로젝트명:** project mimi · 저장소·패키지 스코프 `@mimi/*`

---

## 1. 프로젝트 개요

### 한 줄 소개
실제 3축 로봇의 관절 상태를 실시간으로 수집하여 웹에서 3D로 시각화하고, D3.js 기반 Telemetry 차트와 제어 UI를 제공하는 로봇 관제 플랫폼.

### 포트폴리오 목표 (중요)
이 프로젝트는 **웹 프론트엔드 신입 포트폴리오**를 1차 목표로 한다. 따라서 하드웨어·프로토콜의 화려함에 프론트엔드 역량이 가려지지 않도록, 아래 프론트엔드 역량을 **명시적으로** 보여주는 것을 우선한다.

- 컴포넌트/모듈 아키텍처 설계 (§6)
- 상태 설계와 렌더링 분리 (§6, §17)
- 시스템 경계까지 확장한 TypeScript 타입 안정성 (§7 공유 프로토콜)
- 실시간 데이터 성능 최적화 (§17)
- UI/UX 완성도 (§11)
- 하드웨어 없이도 동작하는 데모 가능성 (§21 Simulation Mode)
- 순수 로직 단위 테스트 (§22)

### 핵심 목표
- 실제 3축 로봇과 웹 애플리케이션 연동
- UDP ↔ WebSocket 기반 실시간 통신 구조 구현
- 로봇 상태 및 관절값 실시간 시각화
- 실제 로봇 형상의 3D Digital Twin 구현
- D3.js 기반 Telemetry 데이터 시각화
- 고빈도 실시간 데이터 처리 및 렌더링 최적화 경험 확보
- AI 오케스트레이션 기반 개발 프로세스 경험

### 포트폴리오에서 보여줄 역량
- React / TypeScript 기반 프론트엔드 개발
- 실시간 WebSocket 통신
- Node.js Gateway 설계
- UDP 기반 하드웨어 연동
- D3.js 데이터 시각화
- Three.js 3D 렌더링
- 실시간 상태 관리 및 성능 최적화
- 장애 및 네트워크 예외 처리
- AI-assisted Engineering Workflow

---

## 2. 프로젝트 핵심 컨셉

### Real Robot + Digital Twin + Telemetry

```text
Physical 3-Axis Robot
        │
        │ Wi-Fi AP
        │ UDP
        ▼
Robot Gateway
Node.js + TypeScript
        │
        │ WebSocket
        ▼
React Web Application
        │
        ├─ Robot Control
        ├─ Robot State Monitoring
        ├─ D3.js Telemetry
        └─ Three.js Digital Twin
```

실제 로봇에서 측정된 `J1 / J2 / J3` 관절값을 웹으로 전달하여 실제 로봇과 3D 모델이 동일한 자세를 유지하도록 한다.

```text
Actual Robot           →  UDP  →  Gateway  →  WebSocket  →  Digital Twin
J1 = 34.2°                                                  J1 = 34.2°
J2 = 18.7°                                                  J2 = 18.7°
J3 = -21.4°                                                 J3 = -21.4°
```

---

## 3. 기술 스택

**Frontend (apps/web)**
- React
- Vite
- TypeScript

**Visualization**
- D3.js
- Three.js
- React Three Fiber — 필요성이 생길 경우 검토

**Communication**
- WebSocket (Browser ↔ Gateway)
- UDP (Gateway ↔ Robot)
- Wi-Fi AP

**Gateway (apps/gateway)**
- Node.js
- TypeScript

**Shared (packages/protocol)**
- 순수 TypeScript (런타임 의존성 없음)

**Tooling**
- **npm workspaces** (monorepo 관리 — 별도 설치 없이 Node 기본 제공)
- Vitest (단위 테스트)
- ESLint / Prettier

**Hardware**
- MCU 기반 3축 로봇
- Motor / Joint Control
- Joint Position Feedback

**3D Asset**
- Fusion 360 → OBJ (필요 시 GLB / glTF 변환)

---

## 4. Next.js를 사용하지 않는 이유

project mimi는 SEO, SSR, Server Components보다 브라우저에서 지속적으로 실행되는 실시간 기능이 핵심인 관제 애플리케이션이다.

주요 기능(WebSocket, Three.js, D3.js, Joint Control, Realtime Telemetry, Robot 3D Synchronization)의 대부분이 **Client 환경**에서 동작한다.

따라서 불필요한 서버/클라이언트 경계를 추가하는 대신 `React + Vite + TypeScript`를 사용한다.

> **기술 선택 기준:** 요구사항에 필요한 기술을 선택하며, 포트폴리오를 위해 불필요한 기술을 추가하지 않는다.

---

## 5. 전체 시스템 아키텍처

```text
┌─────────────────────────────┐
│       3-AXIS ROBOT          │
│ MCU / Joint 1·2·3           │
│ Motor Control               │
│ Position Feedback           │
└──────────────┬──────────────┘
               │  UDP · Wi-Fi AP
               ▼
┌─────────────────────────────┐
│       ROBOT GATEWAY         │
│ Node.js + TypeScript        │
│ UDP Socket / Packet Parser  │
│ Command Adapter             │
│ WebSocket Server            │
│ Timeout / Reconnect         │
└──────────────┬──────────────┘
               │  WebSocket
               ▼
┌─────────────────────────────┐
│        WEB CLIENT           │
│ React + Vite + TypeScript   │
│ Robot Control / Robot State │
│ D3.js Telemetry             │
│ Three.js Digital Twin       │
└─────────────────────────────┘
```

---

## 6. Monorepo 구조 & 프론트엔드 설계

### 6.1 왜 Monorepo인가

project mimi는 실제로 **독립 실행되는 두 개의 프로그램**(web, gateway)과 **둘이 공유하는 계약**(protocol)으로 이루어진다. 이 셋을 하나의 git 저장소에서 관리하는 monorepo 구조를 택한다.

핵심 이유는 **공유 타입(프로토콜 계약)** 이다. web과 gateway가 주고받는 메시지 규격(`RobotState`, `MoveCommand` 등)을 `packages/protocol` 한 곳에 정의하고 양쪽이 import하면, 규격이 어긋나는 사고를 **컴파일 타임에** 차단할 수 있다. multi-repo였다면 타입을 복사하거나 별도 배포해야 하며 drift 위험이 크다.

> 관리 도구는 **npm workspaces**를 사용한다. Node에 기본 내장되어 별도 설치가 없고, 패키지 3개 규모에 pnpm/Turborepo/Nx는 과설계다. phantom dependency는 ESLint `import/no-extraneous-dependencies` 규칙으로 방지한다.

### 6.2 디렉터리 구조

구조는 **최소로 시작하고, 파일이 실제로 늘어나면 그때 갈라낸다**(조기 구조화 금지). `apps/web · apps/gateway · packages/protocol` **3분할만 day 1부터 확정**한다 — 이건 폴더 취향이 아니라 타입 공유를 위한 실제 아키텍처 결정이다. 그 내부 세분화는 코드가 요구할 때 추가한다.

**시작 구조 (Phase 0~1)**
```text
mimi/
├─ package.json              # npm workspaces
├─ apps/
│  ├─ web/                   # Vite 기본 스캐폴드 (src/App.tsx 그대로 시작)
│  └─ gateway/               # src/index.ts 하나로 시작
└─ packages/
   └─ protocol/
      └─ messages.ts         # 공유 타입부터. 로직 파일은 필요할 때 추가
```

**목표 구조 (기능이 늘면 자연스럽게 수렴 — 미리 만들지 않음)**
```text
apps/web/src/
  app/            # 진입점, 레이아웃
  features/       # connection · telemetry · robot-3d · charts · control
                  #   (한 기능 파일이 3개 이상 되면 폴더로 승격)
  shared/         # ws 클라이언트, 공용 UI
  store/          # 저빈도 전역 상태(최소)
  sim/            # Simulation Mode — §21 (필요 시점에 추가)
apps/gateway/src/
  udp/ · ws/ · adapter/ · mock/    # 실제 UDP 붙일 때(Phase 3) 분리
packages/protocol/
  messages.ts · ringBuffer.ts · packetLoss.ts · jointLimit.ts
                  #   각 로직을 쓸 때 파일로 분리 + 테스트(§22)
```

### 6.3 독립 실행

각 앱은 상대 앱이나 실제 로봇 없이도 **단독으로 실행**된다. 이는 편의가 아니라 **포트폴리오 리스크 방어책**이다(하드웨어 지연·부재에도 각 파트가 살아있음).

```bash
npm run dev -w web          # 프론트만 (Simulation Mode로 단독 데모 가능)
npm run dev -w gateway      # 게이트웨이만 (mock UDP)
npm run dev                 # 루트에서 web + gateway 동시 (concurrently)
```

### 6.4 상태 설계 원칙 (프론트엔드 핵심)

실시간 프로젝트의 프론트엔드 난이도는 대부분 **"고빈도 데이터를 React 리렌더에 태우지 않는 것"** 에 있다.

- **고빈도 텔레메트리(수십 Hz)** 는 React state에 넣지 않는다. `packages/protocol`의 Ring Buffer(React 바깥의 mutable 저장소)에 쌓는다.
- **Three.js / D3.js** 는 이 버퍼를 `requestAnimationFrame` 루프에서 **직접 구독**하여 그린다. React 리렌더를 우회한다.
- **저빈도 상태**(연결 상태, 로봇 status, 선택된 명령 등)만 React state/store에 둔다.

```text
WebSocket → Ring Buffer(React 밖)
                 │
                 ├─ rAF loop → Three.js  (Robot Pose)
                 ├─ rAF loop → D3.js     (Telemetry, sliding window)
                 └─ throttled → React    (저빈도 UI: 현재값 텍스트 등)
```

### 6.5 공유 패키지 제약

`packages/protocol`은 web(브라우저)과 gateway(Node) **양쪽이 소비**한다. 따라서 **런타임 의존성 없는 순수 TS**만 둔다. Node 전용 API(`dgram`, `fs`)나 브라우저 전용 API를 넣으면 한쪽이 깨진다. **UDP 소켓 로직은 반드시 gateway 내부에만** 둔다.

---

## 7. 통신 프로토콜 정의

web·gateway·robot 사이의 계약을 명시한다. **web↔gateway 타입은 `packages/protocol`에 정의하여 공유**한다. gateway↔robot의 UDP 바이너리 포맷은 MCU 펌웨어와 합의하여 확정한다(아래는 제안 기준).

### 7.1 WebSocket 메시지 (web ↔ gateway, JSON)

모든 메시지는 공통 envelope를 갖는다.

```
미정

```

### 7.2 UDP 패킷 (gateway ↔ robot)

UDP는 전달을 보장하지 않으므로 **모든 패킷에 sequence number**를 포함한다(§19 손실 감지에 사용). 구체 바이트 레이아웃(엔디안, 필드 크기)은 펌웨어와 합의 후 이 절에 확정한다.

```text
확정 필요 항목:
- Endian (little / big)
- 각 필드 자료형/크기 (int16 각도 × scale? float32?)
- 각도 단위 (deg / centi-deg / rad)
- 헤더/체크섬 유무
```

> **의존성 주의:** 이 프로토콜은 MCU 펌웨어와의 **인터페이스 계약**이다. 확정 주체와 일정을 프로젝트 초기에 못박아야 Phase 3가 막히지 않는다.

---

## 8. Robot → Web 데이터 흐름

```text
Robot Joint Position → UDP Telemetry Packet → Gateway → Packet Parsing
→ WebSocket → Frontend Ring Buffer
      ├─ Current Robot State (throttled → React)
      ├─ Three.js Digital Twin (rAF)
      └─ D3.js Telemetry (rAF)
```

`RobotState` 타입은 §7.1 참조.

---

## 9. Web → Robot 데이터 흐름

```text
사용자 Joint 입력 → Frontend Validation(jointLimit) → WebSocket Command
→ Gateway → UDP Command → Robot MCU → Motor Control
```

`MoveCommand` 타입은 §7.1 참조. Joint limit 검증은 `packages/protocol/jointLimit.ts`를 **web·gateway 양쪽에서 공용**으로 사용한다(§10 안전 처리).

---

## 10. Dashboard

### 목적
한 화면에서 현재 로봇 상태를 파악하고 제어할 수 있도록 한다.

### 주요 표시 항목
- Robot Connection Status / Robot Status
- J1 / J2 / J3 Current Position
- Robot 3D View / Joint Control
- 실시간 Joint Telemetry
- Target / Actual / Position Error (MVP 이후)
- Network State (MVP 이후)

```text
┌──────────────────────────────────────────┐
│ OPENAXIS                ● CONNECTED       │
├────────────────────────┬─────────────────┤
│                        │ Robot State     │
│      3D ROBOT          │ J1  34.2°       │
│                        │ J2  18.7°       │
│                        │ J3 -21.4°       │
│                        │ RTT 8.4 ms      │
├────────────────────────┴─────────────────┤
│ Joint Telemetry                          │
│ J1 ───────╮       ╭────                  │
│           ╰───────╯                       │
│ J2 ─────────────────────                 │
└──────────────────────────────────────────┘
```

---

## 11. UI/UX 디자인 방향

프론트엔드 포트폴리오는 **보이는 완성도**가 평가의 절반이다. 아래를 설계 기준으로 삼는다.

- **컨셉:** 관제실(control room) 감성의 다크 테마. 데이터가 주인공, 크롬(chrome)은 절제.
- **타이포:** 수치는 **monospace**로 고정폭 정렬(값이 흔들려도 자리가 안 튀게). 라벨은 sans-serif.
- **상태 색상:** CONNECTED=green / WARNING·HOLD=amber / ERROR·DISCONNECTED=red. **색만으로 구분하지 않고** 반드시 텍스트/아이콘 병기(접근성).
- **레이아웃:** desktop-first(관제 특성). 단, 최소 태블릿까지는 깨지지 않게 grid로 degrade.
- **모션:** 실시간 값은 부드럽게 보간(interpolation)하되, 60Hz 원본을 그대로 튀게 하지 않는다.
- **빈/오류 상태:** 연결 끊김·데이터 없음·명령 거부 등 **모든 상태에 대응하는 UI**를 명시적으로 설계한다(실시간 앱의 완성도는 여기서 갈림).

---

## 12. Robot Control

사용자가 각 Joint의 Target Position을 설정한다.

```text
Joint 1  [-120° ──────●────── +120°]
Joint 2  [ -70° ───●────────── +90°]
Joint 3  [-120° ─────────●─── +120°]
```

### 주요 명령
- MOVE / HOME / STOP / EMERGENCY STOP

### 안전 처리
Joint Limit 범위를 벗어난 명령은 **Frontend와 Gateway 양쪽**에서 검증한다(`packages/protocol/jointLimit.ts` 공용).

---

## 13. Three.js Digital Twin

### 목표
Fusion에서 제공받은 실제 3축 로봇 OBJ 모델을 웹에서 렌더링하고 실제 Joint 상태와 동기화한다.

### 계층 구조
```text
Robot
└─ Base
   └─ Joint1 → Link1
      └─ Joint2 → Link2
         └─ Joint3 → Link3
```

```ts
joint1.rotation[axis1] = angle1;
joint2.rotation[axis2] = angle2;
joint3.rotation[axis3] = angle3;
```

### ⚠ 리스크: 좌표계/피벗 매핑
이 항목은 본 프로젝트에서 **가장 시간이 많이 드는 함정**이다. 아래를 반드시 확인·문서화한다(§14 Fusion 요청과 연결).

- Joint Pivot / Rotation Axis / Zero Position / Rotation Direction
- Degree / Radian 변환
- Fusion Coordinate System ↔ Three.js Coordinate System
- OBJ Scale / Unit

> 각도↔라디안·축 매핑 변환 함수는 `packages/protocol` 또는 web `shared`에 **순수 함수로 분리하여 단위 테스트**한다(§22).

---

## 14. Fusion 모델 요청사항

가능하면 다음 형식으로 모델을 제공받는다: `Base / Link1 / Link2 / Link3 / Tool(Gripper)`.

### 추가 요청 정보
- 각 Joint 회전축 / Joint Pivot 위치 / Zero Pose / Joint Limit
- 모델 단위 / Coordinate 기준 / 각 Link 길이

한 개의 OBJ 파일을 사용할 경우 최소한 object/group 단위 분리가 유지되어야 한다.

---

## 15. D3.js Telemetry

### Joint Position Chart
시간에 따른 J1 / J2 / J3 Position 변화 표시.

```text
90° │       J1
    │     ╭────╮
45° ├───╯     ╰────────
    │     J2
 0° ├ ─────────────────
    └────────────────────► time
```

### 주요 D3 기능
`scaleLinear` · `scaleTime` · `axisBottom` · `axisLeft` · `line` · `zoom` · `brush` · `bisector` · `transition`

---

## 16. Target vs Actual (MVP 이후)

명령 위치와 실제 위치를 비교한다.

```text
Target ─────────────────── 45.0°
Actual ────────────────╮    44.2°
                       ╰──
Error = 0.8°
```

`Position Error = Target − Actual`. 오차가 기준을 초과하면 UI로 표시한다.

---

## 17. 실시간 데이터 성능 전략

Telemetry가 60Hz라고 가정하면: 1초=60, 10초=600, 1분=3,600 samples. **모든 데이터를 React State에 누적하지 않는다.**

### Ring Buffer
```text
Incoming Telemetry → Ring Buffer(React 밖) → Controlled Render Interval
```

### Sliding Window
D3 그래프에는 최근 일정 구간(예: 10~30초)만 표시한다.

### Rendering Separation (§6.4와 동일 원칙)
```text
React  → 저빈도 UI / 상태
Three.js → Robot Pose (rAF)
D3.js  → Telemetry (rAF, sliding window)
```

고빈도 데이터가 React 전체 Re-render를 지속적으로 유발하지 않도록 한다.

> **가정 검증 필요:** 실제 텔레메트리 rate(Hz)는 펌웨어/네트워크에 따라 다르다. 성능 전략은 이 값에 의존하므로 초기에 실측한다.

---

## 18. Network Diagnostics (MVP 이후)

MVP 이후 시각화: RTT / Packet Rate / Packet Loss / Jitter / TX·RX Packet Count.

```text
RTT 8.4 ms · Packet Rate 59.8 Hz · Packet Loss 0.13% · Jitter 1.4 ms
```

---

## 19. UDP Packet Loss Detection

UDP는 전달을 보장하지 않으므로 Sequence Number로 손실을 감지한다.

```text
100, 101, 102, 104, 105  →  103 Missing
```

감지 로직은 `packages/protocol/packetLoss.ts`에 **순수 함수**로 구현하고 단위 테스트한다(§22).

---

## 20. Connection State

```text
CONNECTING → CONNECTED → DISCONNECTED → RECONNECTING → CONNECTED
```

Robot Telemetry가 일정 시간 이상 수신되지 않으면 Robot 상태도 별도로 Timeout 처리한다.

---

## 21. Simulation Mode ★ (MVP 필수)

> **개정 사유:** 기존 기획에서 "MVP 이후, 우선순위 낮음"이었으나, **포트폴리오 목적상 필수**로 승격한다.

### 왜 필수인가
채용담당자·면접관은 **실제 로봇이 없다.** 로봇이 있어야만 도는 포트폴리오는 아무도 실행할 수 없다. 또한 하드웨어·펌웨어·Fusion 모델의 **지연/부재 리스크**를 이 모드가 통째로 방어한다.

### 구성
- **web `sim/`**: 가짜 텔레메트리 제너레이터. WebSocket 없이도 Ring Buffer에 데이터를 공급하여 **web 단독으로 전 기능 데모**가 가능하게 한다.
- **gateway `mock/`**: mock UDP 소스. 실제 로봇 없이 gateway↔web 경로를 검증한다.
- 플래그/환경변수로 `real ↔ sim` 전환.

### 효과
- **배포 가능한 라이브 데모** + **데모 영상** 확보
- 하드웨어 없이도 D3·Three.js·성능 전략·상태 UI를 전부 시연
- 실제 로봇 연동은 "추가 성취"로 얹는 구조가 되어 일정 리스크 완화

---

## 22. 테스트 전략

하드웨어 없이도 검증 가능한 **순수 로직**을 우선 테스트하여, 신뢰도와 포트폴리오 완성도를 동시에 확보한다. 도구는 **Vitest**.

**우선 테스트 대상 (`packages/protocol`)**
- `ringBuffer.ts` — 용량 초과 시 오래된 데이터 폐기, 순서 보존
- `packetLoss.ts` — sequence gap / wrap-around 감지
- `jointLimit.ts` — 경계값·범위 밖 입력 거부
- 각도↔라디안·축 매핑 변환 함수 (§13)
- `messages` 검증(타입가드/파싱)

**범위 밖(초기)**: 3D 렌더 결과·차트 픽셀 등 시각 검증은 자동화하지 않고 수동/영상으로 확인.

---

## 23. MVP 범위

### 반드시 구현
- [ ] npm workspace monorepo 구성 (apps/web, apps/gateway, packages/protocol)
- [ ] `packages/protocol` 공유 타입·순수 로직 + 단위 테스트
- [ ] React + Vite + TS (web) / Node + TS (gateway)
- [ ] WebSocket 연결 + Connection State 표시
- [ ] **Simulation Mode (web 단독 데모 가능)**
- [ ] Mock J1/J2/J3 텔레메트리 → Ring Buffer → 실시간 표시
- [ ] 웹에서 Joint Position 제어 (jointLimit 검증)
- [ ] D3 실시간 Joint Chart (sliding window)
- [ ] Three.js Digital Twin — Joint 동기화 (최소 축 우선)
- [ ] 실제 Robot UDP 송수신
- [ ] 실제 Fusion OBJ 모델 렌더링 + J1/J2/J3 동기화
- [ ] 기본 Disconnect / Reconnect / Timeout 처리

---

## 24. MVP 이후 기능

우선순위 낮음: Target vs Actual · Position Error Threshold · Packet Loss 시각화 · RTT/Jitter · Network Diagnostics Dashboard · Preset Position · Teach Mode · Replay · Session Recording · CSV Export.

---

## 25. MVP 개발 순서 (세로 관통 slice 우선)

> **개정 사유:** 기존 Phase는 기능별 "가로" 순서였다. 6주 안에 반드시 무언가 **끝까지 도는** 것을 확보하기 위해, 얇게 관통하는 **세로 slice**를 먼저 완성하고 살을 붙인다.

### Phase 0 — Monorepo 기반
```text
npm workspace + apps/web + apps/gateway + packages/protocol
→ web 단독 실행, gateway 단독 실행 확인
```

### Phase 1 — 세로 관통 slice (Simulation)
```text
sim 텔레메트리 → Ring Buffer → 현재값 텍스트 표시
+ Joint 1개 제어 → (sim echo) 반영
+ D3 차트 1개(J1) + Three.js 1축 회전 동기화
```
→ **이 시점에 로봇 없이도 "돌아가는 데모"가 존재**(가장 중요한 이정표).

### Phase 2 — 채우기 (여전히 Simulation)
```text
3축 전체 제어/표시 · D3 sliding window · Connection State UI · 오류/빈 상태 UI
```

### Phase 3 — 실제 UDP 연결
```text
gateway UDP ↔ Robot / 프로토콜 확정(§7.2) / TX·RX 검증
```

### Phase 4 — 실제 로봇 제어·피드백 연동

### Phase 5 — Three.js Digital Twin 정밀화
```text
Fusion OBJ → Joint Hierarchy → Pivot/Axis/좌표계 매핑 → Realtime Sync
```

### Phase 6 — 안정화
```text
Reconnect · Timeout · Joint Limit · Error UI · 테스트 보강 · README · Demo Video
```

---

## 26. 직장 병행 일정 (주 10~12시간 기준, 약 6주)

- **Week 1** — Phase 0~1: monorepo + 세로 관통 slice(Simulation)
- **Week 2** — Phase 2: 3축 채우기 + 상태/오류 UI + protocol 테스트
- **Week 3** — Phase 3: UDP 프로토콜 확정 + gateway ↔ robot
- **Week 4** — Phase 4~5(1): 실제 제어/피드백 + D3 정밀화
- **Week 5** — Phase 5(2): Three.js 좌표계/피벗 매핑(버퍼 주간)
- **Week 6** — Phase 6: 안정화 + README + Demo

> 좌표계 매핑(Week 5)과 하드웨어 의존 구간은 리스크가 크므로 일정 버퍼를 둔다. 지연 시 **Simulation 데모가 이미 완성되어 있어** 포트폴리오 자체는 방어된다.

---

## 27. AI 오케스트레이션 개발 방식

AI가 모든 것을 한 번에 생성하는 대신, 역할을 나눈 AI-assisted Engineering 방식으로 진행한다.

```text
                 Human (Product Owner / Tech Lead)
                          │
        ┌─────────────────┼─────────────────┐
    Architect         Implementer         Reviewer
        └─────────────────┼─────────────────┘
                       Debugger
```

**Human** — Feature 목표 정의 · 기술 선택 · Architecture 판단 · AI 제안 승인/거절 · 실제 로봇 테스트 · 최종 Merge

**Architect AI** — Architecture · 데이터 흐름 · Interface · 파일 구조 · 예상 문제 · 구현 전략 (코드는 작성하지 않음)

**Implementer AI** — 승인된 설계 구현 · 파일 수정 · TypeScript 작성 · 테스트 실행 (요청 범위 밖 기능 추가 금지)

**Reviewer AI** — Diff Review · 과설계 · 타입 안정성 · Cleanup · WebSocket Lifecycle · 성능/실시간 문제 (먼저 보고, 임의 수정 금지)

**Debugger AI** — Runtime/Network Error · UDP/WebSocket 로그 분석 · Three.js Pivot 문제 · D3 Rendering 문제

---

## 28. AI 개발 루프

```text
1. Human: Feature 목표 정의
2. Architect AI: 설계 / 위험 / 변경 파일 제안
3. Human: 범위 결정 및 승인
4. Implementer AI: 코드 구현
5. 실제 실행 / 테스트
6. Reviewer AI: Diff Review
7. Human: 수정 항목 결정
8. Implementer AI: 필요한 부분만 수정
9. Commit
```

---

## 29. AI 작업 규칙 — AGENTS.md

프로젝트 Root에 다음 원칙을 둔다.

```md
# project mimi Agent Instructions

## Goal
Real-time web interface for controlling and monitoring a physical 3-axis robot.

## Architecture
Robot <-> UDP <-> Node.js Gateway <-> WebSocket <-> React Client
Monorepo: apps/web · apps/gateway · packages/protocol (npm workspaces)

## Rules
- Do not introduce Next.js.
- Do not introduce a database unless explicitly requested.
- Do not introduce global state management until necessary.
- Do not install dependencies (or extra tooling) without explaining why.
- Prefer simple modules over unnecessary abstraction.
- Keep UDP protocol logic inside gateway. Browser must never touch raw UDP.
- packages/protocol must stay pure TS (no Node/browser-only APIs).
- Shared message types live only in packages/protocol.

## Before Implementation
1. Explain the approach.
2. List files to change.
3. Mention risks.
4. Do not make architectural changes without approval.

## After Implementation
1. Run typecheck.
2. Run tests when available.
3. Summarize changed files.
4. Report remaining risks.
```

---

## 30. Architecture Decision Record

`docs/DECISIONS.md`에 주요 기술 결정과 이유를 기록한다.

```md
## ADR-001 Frontend Framework
Decision: React + Vite + TypeScript
Rejected: Next.js
Reason: client-heavy realtime control app; SSR/SEO/Server Components 이득이 적음.

## ADR-002 Robot Communication
Browser: WebSocket / Gateway: UDP
Reason: 브라우저는 raw UDP 불가. Gateway를 Protocol Adapter로 사용.

## ADR-003 Repository Structure
Decision: npm workspaces monorepo (apps/web, apps/gateway, packages/protocol)
Rejected: multi-repo, pnpm, Turborepo, Nx
Reason: web·gateway 간 프로토콜 타입 공유가 핵심. 3패키지 규모엔 npm workspaces로 충분.
```

> 목표: AI나 개발자가 바뀌어도 기존 설계 결정의 맥락을 유지한다.

---

## 31. Git / AI 작업 전략

초기에는 직렬 개발(Human ↕ AI ↕ Single Feature). 구조가 안정된 이후 독립 작업만 병렬화한다.

```text
예상 Feature Branch:
feature/monorepo-setup
feature/ws-telemetry
feature/simulation-mode
feature/robot-control
feature/d3-chart
feature/three-digital-twin
feature/udp-gateway
```

---

## 32. 이 프로젝트에서 AI에게 맡길 영역

**적극 위임:** 초기 환경 설정 · 반복 코드 · 타입 초안 · 테스트 코드 초안 · 코드 리뷰 · 로그 분석 · 문서 작성 · Refactoring 제안

**직접 판단:** 요구사항 · Architecture · Technology Choice · Protocol · Safety Rule · Performance Strategy · 실제 Robot 동작 검증

---

## 33. 포트폴리오 핵심 문제 해결

### Problem 01 — Browser와 UDP
**문제:** 브라우저는 raw UDP를 직접 사용할 수 없다.
**해결:** `Browser ↕ WebSocket ↕ Gateway ↕ UDP ↕ Robot` — Gateway를 Protocol Adapter로 사용.

### Problem 02 — 고빈도 데이터와 React 리렌더
**문제:** 60Hz 텔레메트리를 React state에 누적하면 렌더가 무너진다.
**해결:** Ring Buffer(React 밖) + rAF 기반 Three.js/D3 직접 구독 + throttled React 업데이트(§6.4, §17).

### Problem 03 — web/gateway 타입 drift
**문제:** 두 프로그램의 메시지 규격이 어긋나면 런타임에서만 터진다.
**해결:** `packages/protocol` 공유 타입으로 컴파일 타임 차단(§6.1, §7).

### Problem 04 — 하드웨어 없는 데모
**문제:** 로봇이 없으면 아무도 실행할 수 없다.
**해결:** Simulation Mode로 web 단독 데모·배포 확보(§21).

---

## 34. 핵심 기술 키워드

```text
React · Vite · TypeScript · WebSocket · UDP · Node.js · D3.js · Three.js
Monorepo(npm workspaces) · Real-time Data · Data Visualization · Digital Twin
Robot Control · Hardware Integration · Performance Optimization
AI-assisted Engineering · AI Orchestration
```

---

## 35. MVP 성공 기준

다음 전체 흐름이 실제로 동작하면 MVP 완료로 판단한다.

```text
Web에서 MOVE 입력 → WebSocket → Gateway → UDP → 실제 Robot 이동
→ Robot Joint Feedback → UDP Telemetry → Gateway → WebSocket → Web UI
   ├─ J1/J2/J3 Update
   ├─ Three.js Robot Update
   └─ D3 Chart Update
```

> **웹에서 로봇을 제어하고, 실제 로봇의 상태가 다시 웹으로 돌아와 3D 모델과 그래프가 실시간으로 동기화되는 것.**

추가 기준: **Simulation Mode만으로도 위 흐름(로봇 제외)이 web 단독으로 완결**되어야 한다(포트폴리오 데모 가능성 보장).

---

## 36. 프로젝트 최종 방향

이 프로젝트의 목적은 단순히 "웹에서 로봇을 움직였다"가 아니다.

> **실시간 로봇 데이터를 웹 환경에서 안정적으로 처리하고, 사용자가 로봇의 현재 상태를 이해하고 안전하게 제어할 수 있는 인터페이스를 설계하는 것.**

포트폴리오에서는 다음 흐름을 중심으로 설명한다.

```text
Physical Hardware → Realtime Communication → State Management
→ Data Visualization → 3D Rendering → Performance Optimization → Error Handling
```

그리고 개발 과정 자체도 AI 오케스트레이션 방식으로 진행한다.

```text
Human Decision → AI Architecture Proposal → Human Approval
→ AI Implementation → Actual Testing → AI Review → Human Final Decision
```
