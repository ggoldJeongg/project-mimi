import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

type Props = {
  /** 로봇 J1 각도(degree). 수신 전이면 null. */
  j1: number | null;
};

export default function RobotView({ j1 }: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  // Three.js는 React 재렌더와 무관하게 rAF로 스스로 그린다 → 값은 state가 아니라 ref로 넘긴다.
  const j1DegRef = useRef(0);

  useEffect(() => {
    j1DegRef.current = j1 ?? 0;
  }, [j1]);

  // Scene 재생성 = WebGL 컨텍스트 재생성이라 비싸다. mount 시 1회만.
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x111418);

    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100); // aspect는 resize()가 다시 잡는다
    camera.position.set(3, 2.5, 3);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // 고DPI에서 4배 픽셀은 낭비
    mount.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; // 켜면 매 프레임 update() 필수

    // MeshStandardMaterial은 빛을 받아야 보인다. 조명이 없으면 화면이 새까맣다.
    scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 2));
    const sun = new THREE.DirectionalLight(0xffffff, 2);
    sun.position.set(3, 5, 2);
    scene.add(sun);

    const grid = new THREE.GridHelper(6, 6, 0x666666, 0x2a2f36);
    scene.add(grid);

    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshStandardMaterial({ color: 0x44aa88 });
    const cube = new THREE.Mesh(geometry, material);
    cube.position.y = 0.5;

    const axes = new THREE.AxesHelper(1.5);
    cube.add(axes);
    scene.add(cube);

    const resize = () => {
      const { clientWidth: w, clientHeight: h } = mount;
      if (w === 0 || h === 0) return;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(mount);

    let raf = 0;
    const tick = () => {
      // rotation 단위는 radian. degree를 그대로 넣으면 약 57배로 돈다.
      // 부호 반전: 로봇 J1의 + 방향이 Three.js Y축 회전의 + 방향과 반대(실물 확인).
      cube.rotation.y = THREE.MathUtils.degToRad(-j1DegRef.current);
      controls.update();
      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    };
    tick();

    // StrictMode(dev)는 effect를 두 번 돌린다. 안 치우면 canvas와 WebGL 컨텍스트가 쌓인다.
    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      controls.dispose();
      geometry.dispose();
      material.dispose();
      grid.dispose();
      axes.dispose();
      renderer.dispose();
      mount.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={mountRef} style={{ width: "100%", height: "100%" }} />;
}
