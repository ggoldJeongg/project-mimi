import { startUdp } from "./udp";
import { startWs } from "./ws";
import type { Joints } from "@mimi/protocol";

let sendCommand: ((joints: Joints) => void) | undefined;
let sendStop: (() => void) | undefined;

const { broadcast } = startWs({
  onCommand: (joints) => sendCommand?.(joints),
  onStop: () => sendStop?.(),
});

({ sendCommand, sendStop } = startUdp(broadcast));

console.log("[gateway] alive. UDP + WebSocket 시작됨. (Ctrl+C 종료)");
