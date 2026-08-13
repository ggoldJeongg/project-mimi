// Robot ↔ Gateway UDP 소켓. 이 파일만 dgram(Node 전용)을 만진다.
// 규칙: UDP 소켓 로직은 gateway 안에만. 브라우저는 raw UDP를 절대 만지지 않는다.

import dgram from "node:dgram";
import os from "node:os";
import { parseTelemetry, type Joints } from "./parser";
import { encodeCommand } from "./command";

const ROBOT_IP = "192.168.4.1"; // 로봇 AP의 고정 주소
const ROBOT_PORT = 8080; // 로봇 수신 포트 (Gateway → Robot)
const GATEWAY_PORT = 8080; // 게이트웨이 수신 포트 (Robot → Gateway) = bind 대상

/**
 * 게이트웨이 PC가 로봇 AP 서브넷(192.168.4.x)에서 갖는 IPv4를 찾는다.
 * 핸드셰이크로 로봇에게 "여기로 텔레메트리를 보내라"고 알려주기 위함.
 * 유효한 주소가 없으면 undefined(→ 핸드셰이크를 보내지 않는다).
 */
function findGatewayIp(): string | undefined {
  const all = Object.values(os.networkInterfaces()).flat();
  const onRobotSubnet = all.find(
    (i) => i && i.family === "IPv4" && !i.internal && i.address.startsWith("192.168.4."),
  );
  if (onRobotSubnet) return onRobotSubnet.address;
  // 서브넷을 못 찾으면 아무 외부 IPv4나(로봇 미연결/디버깅 상태).
  const anyExternal = all.find((i) => i && i.family === "IPv4" && !i.internal);
  return anyExternal?.address;
}

export function startUdp() {
  const socket = dgram.createSocket("udp4");

  // 핸드셰이크는 로봇이 응답(첫 텔레메트리)할 때까지 반복한다.
  // UDP 유실·wifi 재접속으로 한 발짜리 핸드셰이크는 놓치기 쉽기 때문.
  let handshakeTimer: NodeJS.Timeout | undefined;
  let connected = false;

  // 텔레메트리는 100Hz(10ms)로 쏟아지므로 패킷마다 로그하면 콘솔이 폭주한다.
  // 데이터는 다 받되, 로그는 1초마다 집계만 찍는다(= 실제 수신 Hz 측정도 겸함).
  let recvCount = 0;
  let dropCount = 0;
  let lastJoints: Joints | null = null;

  socket.on("error", (err: NodeJS.ErrnoException) => {
    // bind 실패(포트 사용 중 등)는 치명 → 게이트웨이가 수신 자체를 못 하므로 종료.
    if (err.code === "EADDRINUSE") {
      console.error(`[udp] bind 실패(${err.code}): 포트 ${GATEWAY_PORT} 사용 중`);
      socket.close();
      process.exit(1);
    }
    // 그 외(특히 Windows에서 미준비 로봇으로 send 후 올라오는 ECONNRESET)는
    // 일시적 전송 에러이지 소켓 고장이 아니다. 로그만 남기고 소켓은 유지한다.
    console.error("[udp] socket error(소켓 유지):", err.message);
  });

  // ── 수신: Robot → Gateway 텔레메트리 ──────────────────────────
  socket.on("message", (msg) => {
    // 로봇이 응답하기 시작하면 핸드셰이크 반복을 멈춘다.
    if (!connected) {
      connected = true;
      if (handshakeTimer) clearInterval(handshakeTimer);
      console.log("[udp] 로봇 응답 수신 → 핸드셰이크 반복 중단");
    }

    const raw = msg.toString(); // Buffer → ASCII 문자열
    const joints = parseTelemetry(raw);
    if (!joints) {
      dropCount++; // 폭주 방지: 개별 로그 대신 카운트만(1초 집계에서 보고)
      return;
    }
    recvCount++;
    lastJoints = joints;
    // Phase 5: 여기서 파싱된 joints를 WebSocket으로 web에 흘려보낸다.
  });

  // 1초마다 수신 집계 요약. 수신이 있을 때만 찍는다(idle 시 조용).
  setInterval(() => {
    if (recvCount === 0 && dropCount === 0) return;
    const j = lastJoints;
    const latest = j ? `latest J1=${j.j1} J2=${j.j2} J3=${j.j3}` : "";
    const drops = dropCount > 0 ? `  drop=${dropCount}` : "";
    console.log(`[udp] ${recvCount} Hz  ${latest}${drops}`);
    recvCount = 0;
    dropCount = 0;
  }, 1000);

  // ── 핸드셰이크: 내 IP를 로봇에 알림 → 로봇이 10ms 주기 송신 시작 ──
  // 로봇은 IP를 세미콜론으로 끝맺어 받길 기다린다(로봇 로그: waiting 'ip;').
  // 프로토콜 전체가 ';' 종결이므로 "<ip>;" 형식으로 보낸다.
  // IP는 매 시도마다 다시 읽는다(wifi 재접속 시 주소가 바뀔 수 있음).
  function sendHandshake() {
    const ip = findGatewayIp();
    if (!ip) {
      console.warn("[udp] 유효 IPv4 없음 — 핸드셰이크 대기(로봇 AP 접속 확인)");
      return;
    }
    const payload = `ip;${ip};`;
    socket.send(payload, ROBOT_PORT, ROBOT_IP, (err) => {
      if (err) console.error("[udp] handshake 실패:", err.message);
      else console.log(`[udp] handshake → ${ROBOT_IP}:${ROBOT_PORT}  payload=${JSON.stringify(payload)}`);
    });
  }

  // bind가 끝나야 수신 준비 완료 → 즉시 1회 + 응답 올 때까지 1초마다 반복.
  socket.bind(GATEWAY_PORT, () => {
    console.log(`[udp] bound :${GATEWAY_PORT} — 로봇 텔레메트리 대기`);
    sendHandshake();
    handshakeTimer = setInterval(sendHandshake, 1000);
  });

  // ── 송신: Gateway → Robot 목표 관절값 명령 ───────────────────
  // Phase 5에서 WebSocket이 web의 명령을 받아 이 함수를 호출한다.
  // ⚠ 안전: 실제 로봇에 붙일 땐 작은 각도부터. Joint limit 확정 전 큰 이동 금지.
  function sendCommand(joints: Joints) {
    const frame = encodeCommand(joints);
    socket.send(frame, ROBOT_PORT, ROBOT_IP, (err) => {
      if (err) console.error("[udp] command 송신 실패:", err.message);
      else console.log(`[udp] command → ${JSON.stringify(frame)}`);
    });
  }

  return { socket, sendCommand };
}
