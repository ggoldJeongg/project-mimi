# project mimi — Claude 작업 지침

3축 로봇 관제 웹. 브라우저에서 실제 로봇을 실시간 시각화·제어한다.
상세 기획은 [mimi_Final_Planning.md](mimi_Final_Planning.md) 참조.

## 아키텍처
```
Robot <-> UDP <-> Node.js Gateway <-> WebSocket <-> React Client
```
Monorepo (npm workspaces): `apps/web` · `apps/gateway` · `packages/protocol`

## 규칙
- **SOLID, YAGNI, KISS, DRY 같은 좋은 코딩 원칙을 사용**
- **Next.js 도입 금지.** DB 도입 금지(명시 요청 없으면). 전역 상태관리 라이브러리는 정말 필요할 때까지 금지.
- **의존성/도구 추가 시 이유를 먼저 설명**하고 승인받는다. 패키지 매니저는 **npm workspaces**.
- **과설계·조기 구조화 금지.** 폴더는 미리 파지 않는다 — 파일이 늘 때 갈라낸다. `apps/web · apps/gateway · packages/protocol` 3분할만 고정.
- **UDP 소켓 로직은 gateway 안에만.** 브라우저는 raw UDP를 절대 만지지 않는다.
- **`packages/protocol`은 순수 TS만.** Node 전용(`dgram`,`fs`)/브라우저 전용 API 금지. web↔gateway 공유 메시지 타입은 여기에만 정의.
- **측정 우선.** 고빈도 텔레메트리도 처음엔 가장 단순하게 구현한다. 실제 성능 문제(수신 Hz·렌더 비용)를 측정한 뒤에야 buffer/throttle/rAF를 도입한다 — Ring Buffer·rAF를 미리 강제하지 않는다.

## Learning-first (개발자 학습 우선)
개발자가 Three.js·D3.js·UDP·WebSocket·실시간 데이터 처리를 이번 프로젝트로 **처음 익힌다**. 목표는 완성 코드가 아니라 이해다.
- 개발자가 처음 쓰는 기술은 완성 코드를 한 번에 쏟지 않는다. **핵심 개념 → 최소 예제 → 개발자가 직접 적용** 순으로 간다.
- 복잡한 구조·패턴·최적화를 넣을 땐 **"왜 지금 필요한지"를 먼저 설명**한다. 지금 없는 문제를 미리 최적화하지 않는다.
- 작은 기능은 full AI 팀 절차를 강제하지 않는다. 일반 구현은 `설명+최소코드 제안(또는 implementer)→Test→Reviewer`, **아키텍처 변경만 `Architect→사람 승인`**.

## 구현 전
1. 접근 방식을 설명한다.
2. 변경할 파일을 나열한다.
3. 위험을 짚는다.
4. 아키텍처 변경은 승인 없이 하지 않는다.

## 구현 후
1. typecheck 실행.
2. 테스트가 있으면 실행.
3. 변경 파일 요약.
4. 남은 위험 보고.

## AI 팀 (`.claude/agents/`)
역할을 나눠 개발한다. Reviewer·Debugger는 셀프리뷰 맹점을 피하려 독립 컨텍스트로 돌린다.
- **architect** — 구조/데이터흐름/기술선택 설계 (코드 안 짬)
- **implementer** — 승인된 설계만 구현 (범위 밖 추가 금지)
- **reviewer** — 과설계·버그·성능·타입만 지적 (칭찬·수정 금지)
- **debugger** — 에러 로그로 근본원인만 추적
