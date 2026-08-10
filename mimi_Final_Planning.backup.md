# OpenAxis 최종 기획안

> **Real-time Robot Visualization & Control Platform**  
> 실제 3축 로봇과 UDP 기반으로 통신하고, 웹에서 로봇의 상태를 실시간으로 시각화·제어하는 로봇 관제 웹 프로젝트

---

## 1. 프로젝트 개요

### 프로젝트명
**project mimi**

### 한 줄 소개
실제 3축 로봇의 관절 상태를 실시간으로 수집하여 웹에서 3D로 시각화하고, D3.js 기반 Telemetry 차트와 제어 UI를 제공하는 로봇 관제 플랫폼

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

# 2. 프로젝트 핵심 컨셉

## Real Robot + Digital Twin + Telemetry

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

예시:

```text
Actual Robot

J1 = 34.2°
J2 = 18.7°
J3 = -21.4°

        ↓ UDP

Gateway

        ↓ WebSocket

Web Client

        ↓

Digital Twin

J1 = 34.2°
J2 = 18.7°
J3 = -21.4°
```

---

# 3. 기술 스택

## Frontend

- React
- Vite
- TypeScript

## Visualization

- D3.js
- Three.js
- React Three Fiber — 필요성이 생길 경우 검토

## Communication

- WebSocket
- UDP
- Wi-Fi AP

## Gateway

- Node.js
- TypeScript

## Hardware

- MCU 기반 3축 로봇
- Motor / Joint Control
- Joint Position Feedback

## 3D Asset

- Fusion 360
- OBJ
- 필요 시 GLB / glTF 변환

---

# 4. Next.js를 사용하지 않는 이유

OpenAxis는 SEO, SSR, Server Components보다 브라우저에서 지속적으로 실행되는 실시간 기능이 핵심인 관제 애플리케이션이다.

주요 기능:

```text
WebSocket
Three.js
D3.js
Joint Control
Realtime Telemetry
Robot 3D Synchronization
```

위 기능 대부분이 Client 환경에서 동작한다.

따라서 불필요한 서버/클라이언트 경계를 추가하는 대신 다음 구조를 사용한다.

```text
React + Vite + TypeScript
```

### 기술 선택 기준

> 요구사항에 필요한 기술을 선택하며, 포트폴리오를 위해 불필요한 기술을 추가하지 않는다.

---

# 5. 전체 시스템 아키텍처

```text
┌─────────────────────────────┐
│       3-AXIS ROBOT          │
│                             │
│ MCU                         │
│ Joint 1 / 2 / 3             │
│ Motor Control               │
│ Position Feedback           │
└──────────────┬──────────────┘
               │
             UDP
          Wi-Fi AP
               │
               ▼
┌─────────────────────────────┐
│       ROBOT GATEWAY         │
│                             │
│ Node.js + TypeScript        │
│                             │
│ UDP Socket                  │
│ Packet Parser               │
│ Command Adapter             │
│ WebSocket Server            │
│ Timeout / Reconnect         │
└──────────────┬──────────────┘
               │
           WebSocket
               │
               ▼
┌─────────────────────────────┐
│        WEB CLIENT           │
│                             │
│ React + Vite + TypeScript   │
│                             │
│ Robot Control               │
│ Robot State                 │
│ D3.js Telemetry             │
│ Three.js Digital Twin       │
└─────────────────────────────┘
```

---


---

# 7. Robot → Web 데이터 흐름

```text
Robot Joint Position
        ↓
UDP Telemetry Packet
        ↓
Gateway
        ↓
Packet Parsing
        ↓
WebSocket
        ↓
Frontend Telemetry Buffer
        ↓
        ├─ Current Robot State
        ├─ Three.js Digital Twin
        └─ D3.js Telemetry
```

### RobotState 예시

```ts
interface RobotState {
  sequence: number;
  timestamp: number;

  joints: {
    j1: number;
    j2: number;
    j3: number;
  };

  status: "IDLE" | "RUNNING" | "HOLD" | "ERROR";
}
```

---

# 8. Web → Robot 데이터 흐름

```text
사용자 Joint Position 입력
        ↓
Frontend Validation
        ↓
WebSocket Command
        ↓
Gateway
        ↓
UDP Command
        ↓
Robot MCU
        ↓
Motor Control
```

### Command 예시

```ts
interface MoveCommand {
  type: "MOVE";
  sequence: number;

  target: {
    j1: number;
    j2: number;
    j3: number;
  };
}
```

---

# 9. Dashboard

## 목적

한 화면에서 현재 로봇 상태를 파악하고 제어할 수 있도록 한다.

### 주요 표시 항목

- Robot Connection Status
- Robot Status
- J1 / J2 / J3 Current Position
- Robot 3D View
- Joint Control
- 실시간 Joint Telemetry
- Target / Actual
- Position Error
- Network State

예상 구조:

```text
┌──────────────────────────────────────────┐
│ OPENAXIS                ● CONNECTED      │
├────────────────────────┬─────────────────┤
│                        │ Robot State     │
│                        │                 │
│      3D ROBOT          │ J1  34.2°      │
│                        │ J2  18.7°      │
│                        │ J3 -21.4°      │
│                        │                 │
│                        │ RTT 8.4 ms      │
├────────────────────────┴─────────────────┤
│ Joint Telemetry                          │
│                                          │
│ J1 ───────╮       ╭────                 │
│           ╰───────╯                      │
│ J2 ─────────────────────                 │
└──────────────────────────────────────────┘
```

---

# 10. Robot Control

사용자가 각 Joint의 Target Position을 설정할 수 있도록 한다.

```text
Joint 1
[-120° ──────●────── +120°]

Joint 2
[-70° ───●────────── +90°]

Joint 3
[-120° ─────────●─── +120°]
```

### 주요 명령

- MOVE
- HOME
- STOP
- EMERGENCY STOP

### 안전 처리

Joint Limit 범위를 벗어난 명령은 Frontend와 Gateway에서 검증한다.

---

# 11. Three.js Digital Twin

## 목표

Fusion에서 제공받은 실제 3축 로봇 OBJ 모델을 웹에서 렌더링하고 실제 Joint 상태와 동기화한다.

### 기본 계층

```text
Robot
│
├─ Base
│
└─ Joint1
    └─ Link1
        └─ Joint2
            └─ Link2
                └─ Joint3
                    └─ Link3
```

Joint 데이터를 다음과 같이 적용한다.

```ts
joint1.rotation[axis1] = angle1;
joint2.rotation[axis2] = angle2;
joint3.rotation[axis3] = angle3;
```

실제 구현에서는 다음 항목을 반드시 확인한다.

- Joint Pivot
- Joint Rotation Axis
- Zero Position
- Rotation Direction
- Degree / Radian
- Fusion Coordinate System
- Three.js Coordinate System
- OBJ Scale / Unit

---

# 12. Fusion 모델 요청사항

가능하면 다음 형식으로 모델을 제공받는다.

```text
Base
Link1
Link2
Link3
Tool / Gripper
```

### 추가 요청 정보

- 각 Joint 회전축
- Joint Pivot 위치
- Zero Pose
- Joint Limit
- 모델 단위
- Coordinate 기준
- 각 Link 길이

한 개의 OBJ 파일을 사용할 경우 최소한 object/group 단위 분리가 유지되는 것이 좋다.

---

# 13. D3.js Telemetry

## Joint Position Chart

시간에 따른 J1 / J2 / J3 Position 변화 표시

```text
90°
 │
 │       J1
 │     ╭────╮
45° ───╯    ╰────────
 │
 │     J2
 │ ─────────────────
0°
 └────────────────────
            time
```

### 주요 D3 기능

- `scaleLinear`
- `scaleTime`
- `axisBottom`
- `axisLeft`
- `line`
- `zoom`
- `brush`
- `bisector`
- `transition`

---

# 14. Target vs Actual

명령 위치와 실제 위치를 비교한다.

```text
Target ─────────────────── 45.0°

Actual ────────────────╮    44.2°
                       ╰──

Error = 0.8°
```

### 계산

```text
Position Error = Target Position - Actual Position
```

오차가 일정 기준을 초과하면 UI로 표시한다.

---

# 15. 실시간 데이터 성능 전략

Telemetry가 60Hz라고 가정하면:

```text
1초   = 60 samples
10초  = 600 samples
1분   = 3,600 samples
```

모든 데이터를 React State에 직접 누적하지 않는다.

## Buffer

```text
Incoming Telemetry
        ↓
Ring / Telemetry Buffer
        ↓
Controlled Render Interval
```

## Sliding Window

D3 그래프에는 최근 일정 구간만 표시한다.

예:

```text
최근 10초 ~ 30초
```

## Rendering Separation

```text
React
→ 일반 UI 및 저빈도 상태

Three.js
→ Robot Pose

D3.js
→ Telemetry Visualization
```

고빈도 데이터가 React 전체 Re-render를 지속적으로 발생시키지 않도록 한다.

---

# 16. Network Diagnostics

MVP 이후 다음 데이터를 시각화한다.

- RTT
- Packet Rate
- Packet Loss
- Jitter
- TX Packet Count
- RX Packet Count

예:

```text
RTT           8.4 ms
Packet Rate  59.8 Hz
Packet Loss   0.13 %
Jitter        1.4 ms
```

---

# 17. UDP Packet Loss Detection

UDP는 패킷 전달을 보장하지 않는다.

따라서 Sequence Number를 이용한다.

```text
100
101
102
104
105
```

위 데이터에서는:

```text
103 Missing
```

으로 Packet Loss를 감지한다.

---

# 18. Connection State

WebSocket 상태를 명확하게 관리한다.

```text
CONNECTING
     ↓
CONNECTED
     ↓
DISCONNECTED
     ↓
RECONNECTING
     ↓
CONNECTED
```

Robot Telemetry가 일정 시간 이상 수신되지 않을 경우 Robot 상태 역시 별도로 Timeout 처리한다.

---

# 19. MVP 범위

## 반드시 구현

- [ ] React + Vite + TypeScript 프로젝트 구성
- [ ] Node.js + TypeScript Gateway 구성
- [ ] WebSocket 연결
- [ ] Mock J1 / J2 / J3 데이터 전송
- [ ] 실제 Robot UDP 송수신
- [ ] Joint 상태 실시간 표시
- [ ] 웹에서 Joint Position 제어
- [ ] D3 실시간 Joint Chart
- [ ] 실제 Fusion OBJ 모델 렌더링
- [ ] J1 / J2 / J3 Digital Twin 동기화
- [ ] 기본 Disconnect / Reconnect 처리

---

# 20. MVP 이후 기능

우선순위 낮음.

- [ ] Target vs Actual
- [ ] Position Error Threshold
- [ ] Packet Loss
- [ ] RTT / Jitter
- [ ] Network Diagnostics Dashboard
- [ ] Preset Position
- [ ] Teach Mode
- [ ] Replay
- [ ] Session Recording
- [ ] CSV Export
- [ ] Simulation Mode

---

# 21. MVP 개발 순서

## Phase 1 — 프로젝트 초기화

```text
web
React + Vite + TypeScript

gateway
Node.js + TypeScript
```

목표:

```text
Gateway 실행
↓
WebSocket 연결
↓
React에서 CONNECTED 표시
```

---

## Phase 2 — Mock Telemetry

Gateway에서 다음 데이터를 주기적으로 전송한다.

```json
{
  "j1": 10,
  "j2": 20,
  "j3": 30
}
```

React에서 실시간으로 표시한다.

---

## Phase 3 — 실제 UDP 연결

```text
Robot
↕ UDP
Gateway
```

목표:

```text
TX MOVE J1 30
RX STATE J1 29.8
```

---

## Phase 4 — Robot Control UI

웹에서:

```text
J1 30°
J2 45°
J3 -20°

[MOVE]
```

입력 후 실제 로봇이 움직이는 것을 확인한다.

---

## Phase 5 — D3.js Telemetry

구현:

- Joint Position
- Sliding Window
- Target / Actual
- Position Error

---

## Phase 6 — Three.js Digital Twin

```text
Fusion OBJ
↓
Three.js
↓
Joint Hierarchy
↓
Pivot / Axis Setting
↓
Realtime Joint Sync
```

---

## Phase 7 — 안정화

- WebSocket Reconnect
- Robot Timeout
- Packet Loss
- Joint Limit
- Error UI
- README
- Demo Video

---

# 22. 직장 병행 일정

주당 약 10~12시간 기준.

## Week 1

- 프로젝트 초기화
- WebSocket
- Mock Telemetry

## Week 2

- UDP Protocol
- Gateway
- Robot Communication

## Week 3

- Robot Control UI
- 실제 Joint Feedback 연동

## Week 4

- D3.js
- 실시간 Chart

## Week 5

- Fusion OBJ
- Three.js
- Joint Hierarchy

## Week 6

- Digital Twin Sync
- Error Handling
- UI 정리
- README / Demo

목표 기간:

**약 6주 MVP**

---

# 23. AI 오케스트레이션 개발 방식

이 프로젝트는 AI가 모든 것을 한 번에 생성하는 방식보다 역할을 나눈 AI-assisted Engineering 방식으로 진행한다.

```text
                 Human
        Product Owner / Tech Lead
                  │
      ┌───────────┼───────────┐
      │           │           │
 Architect    Implementer   Reviewer
      │           │           │
      └───────────┼───────────┘
                  │
               Debugger
```

## Human 역할

- Feature 목표 정의
- 기술 선택
- Architecture 판단
- AI 제안 승인 / 거절
- 실제 로봇 테스트
- 최종 Merge 판단

## Architect AI

담당:

- Architecture
- 데이터 흐름
- Interface
- 파일 구조
- 예상 문제
- 구현 전략

코드는 바로 작성하지 않는다.

## Implementer AI

담당:

- 승인된 설계 구현
- 필요한 파일 수정
- TypeScript 코드 작성
- 테스트 실행

요청 범위를 넘어선 기능을 추가하지 않는다.

## Reviewer AI

담당:

- Diff Review
- 과설계
- 타입 안정성
- Cleanup
- WebSocket Lifecycle
- 성능 문제
- 실시간 처리 문제

Reviewer는 먼저 문제만 보고하고 임의로 수정하지 않는다.

## Debugger AI

담당:

- Runtime Error
- Network Error
- UDP / WebSocket 로그 분석
- Three.js Pivot 문제
- D3 Rendering 문제

---

# 24. AI 개발 루프

각 Feature를 다음 순서로 진행한다.

```text
1. Human
   Feature 목표 정의

        ↓

2. Architect AI
   설계 / 위험 / 변경 파일 제안

        ↓

3. Human
   범위 결정 및 승인

        ↓

4. Implementer AI
   코드 구현

        ↓

5. 실제 실행 / 테스트

        ↓

6. Reviewer AI
   Diff Review

        ↓

7. Human
   수정 항목 결정

        ↓

8. Implementer AI
   필요한 부분만 수정

        ↓

9. Commit
```

---

# 25. AI 작업 규칙 — AGENTS.md

프로젝트 Root에 다음 원칙을 둔다.

```md
# OpenAxis Agent Instructions

## Goal

Real-time web interface for controlling and monitoring
a physical 3-axis robot.

## Architecture

Robot
<-> UDP
<-> Node.js Gateway
<-> WebSocket
<-> React Client

## Frontend

- React
- Vite
- TypeScript

## Gateway

- Node.js
- TypeScript

## Rules

- Do not introduce Next.js.
- Do not introduce a database unless explicitly requested.
- Do not introduce global state management until necessary.
- Do not install dependencies without explaining why.
- Prefer simple modules over unnecessary abstraction.
- Keep UDP protocol logic inside Gateway.
- Browser must never communicate with raw UDP directly.

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

# 26. Architecture Decision Record

`docs/DECISIONS.md`에 주요 기술 결정과 이유를 기록한다.

예:

```md
## ADR-001 Frontend Framework

Decision:
React + Vite + TypeScript

Rejected:
Next.js

Reason:
OpenAxis is a client-heavy realtime control application.
SSR, SEO and Server Components provide little benefit.
```

```md
## ADR-002 Robot Communication

Browser:
WebSocket

Gateway:
UDP

Reason:
The browser cannot directly communicate using raw UDP.
```

목표:

> AI나 개발자가 바뀌어도 기존 설계 결정의 맥락을 유지한다.

---

# 27. Git / AI 작업 전략

초기에는 직렬 개발한다.

```text
Human
↕
AI
↕
Single Feature
```

구조가 안정된 이후 독립 작업만 병렬화한다.

```text
Agent A
D3 Telemetry

Agent B
Three.js Model

Agent C
Tests

        ↓

Human Review
        ↓
Merge
```

예상 Feature Branch:

```text
feature/ws-telemetry
feature/udp-gateway
feature/robot-control
feature/d3-chart
feature/three-digital-twin
```

---

# 28. 이 프로젝트에서 AI에게 맡길 영역

적극적으로 맡김:

- 초기 환경 설정
- 반복 코드
- 타입 초안
- 테스트 코드 초안
- 코드 리뷰
- 로그 분석
- 문서 작성
- Refactoring 제안

직접 판단:

- 요구사항
- Architecture
- Technology Choice
- Protocol
- Safety Rule
- Performance Strategy
- 실제 Robot 동작 검증

---

# 29. 포트폴리오 핵심 문제 해결

## Problem 01 — Browser와 UDP

### 문제
브라우저는 raw UDP 통신을 직접 사용할 수 없다.

### 해결

```text
Browser
↕ WebSocket
Gateway
↕ UDP
Robot
```

Gateway를 Protocol Adapter로 사용한다.


# 32. 핵심 기술 키워드

```text
React
Vite
TypeScript
WebSocket
UDP
Node.js
D3.js
Three.js

Real-time Data
Data Visualization
Digital Twin
Robot Control
Hardware Integration
Performance Optimization
AI-assisted Engineering
AI Orchestration
```

---

# 34. MVP 성공 기준

다음 전체 흐름이 실제로 동작하면 MVP 완료로 판단한다.

```text
Web에서 MOVE 입력
        ↓
WebSocket
        ↓
Gateway
        ↓
UDP
        ↓
실제 Robot 이동
        ↓
Robot Joint Feedback
        ↓
UDP Telemetry
        ↓
Gateway
        ↓
WebSocket
        ↓
Web UI
        ├─ J1/J2/J3 Update
        ├─ Three.js Robot Update
        └─ D3 Chart Update
```

즉,

> **웹에서 로봇을 제어하고, 실제 로봇의 상태가 다시 웹으로 돌아와 3D 모델과 그래프가 실시간으로 동기화되는 것**

을 OpenAxis MVP의 최종 성공 기준으로 한다.

---

# 35. 프로젝트 최종 방향

이 프로젝트의 목적은 단순히 **“웹에서 로봇을 움직였다”**가 아니다.

최종 목표는:

> **실시간 로봇 데이터를 웹 환경에서 안정적으로 처리하고, 사용자가 로봇의 현재 상태를 이해하고 안전하게 제어할 수 있는 인터페이스를 설계하는 것**

이다.

포트폴리오에서는 다음 흐름을 중심으로 설명한다.

```text
Physical Hardware
      ↓
Realtime Communication
      ↓
State Management
      ↓
Data Visualization
      ↓
3D Rendering
      ↓
Performance Optimization
      ↓
Error Handling
```

그리고 개발 과정 자체에서도:

```text
Human Decision
      ↓
AI Architecture Proposal
      ↓
Human Approval
      ↓
AI Implementation
      ↓
Actual Testing
      ↓
AI Review
      ↓
Human Final Decision
```

의 AI 오케스트레이션 방식을 적용한다.
