import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // 기본값은 localhost 전용이라 같은 Wi-Fi의 폰·태블릿에서 닿지 않는다.
  // true면 LAN에도 바인딩하고, 시작 시 접속용 Network 주소를 출력한다.
  server: { host: true },
});
