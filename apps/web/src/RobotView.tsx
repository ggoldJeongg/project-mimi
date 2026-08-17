import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import type { Joints } from "@mimi/protocol";
import { JOINT_CONFIG, PARTS, PIVOT, type GroupId, type Vec3 } from "./robotModel";

const MODEL_DIR = "/models/";
const ZERO: Joints = { j1: 0, j2: 0, j3: 0 };

type Props = {
  /** 로봇 관절 각도(degree). 수신 전이면 null. */
  joints: Joints | null;
};

const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];

export default function RobotView({ joints }: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  // Three.js는 React 재렌더와 무관하게 rAF로 스스로 그린다 → 값은 state가 아니라 ref로 넘긴다.
  const jointsDegRef = useRef<Joints>(ZERO);

  useEffect(() => {
    jointsDegRef.current = joints ?? ZERO;
  }, [joints]);

  // Scene 재생성 = WebGL 컨텍스트 재생성이라 비싸다. mount 시 1회만.
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1d23);

    // 단위가 mm라 로봇 전체가 약 150mm. near/far도 그 스케일에 맞춘다.
    const camera = new THREE.PerspectiveCamera(50, 1, 1, 5000);
    camera.position.set(220, 170, 250);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // 고DPI에서 4배 픽셀은 낭비
    mount.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; // 켜면 매 프레임 update() 필수
    controls.target.set(0, 70, 0);

    // MeshStandardMaterial은 빛을 받아야 보인다. 조명이 없으면 화면이 새까맣다.
    scene.add(new THREE.AmbientLight(0xffffff, 0.65));
    const key = new THREE.DirectionalLight(0xffffff, 0.9);
    key.position.set(1, 2, 1.5);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xffffff, 0.4);
    fill.position.set(-1, -0.5, -1);
    scene.add(fill);

    const grid = new THREE.GridHelper(300, 30, 0x444a55, 0x2c313a);
    const axesHelper = new THREE.AxesHelper(60);
    scene.add(grid, axesHelper);

    // 관절 계층: g1을 돌리면 g2·g3이 통째로 끌려간다(어깨를 돌리면 팔 전체가 움직이듯).
    // 각 그룹의 원점을 회전 중심(pivot)에 두고, 자식은 부모 pivot과의 차이만큼만 떨어뜨린다.
    const g1 = new THREE.Group();
    g1.position.set(...PIVOT.g1);
    const g2 = new THREE.Group();
    g2.position.set(...sub(PIVOT.g2, PIVOT.g1));
    const g3 = new THREE.Group();
    g3.position.set(...sub(PIVOT.g3, PIVOT.g2));
    scene.add(g1);
    g1.add(g2);
    g2.add(g3);

    const groups: Record<GroupId, THREE.Object3D> = { base: scene, g1, g2, g3 };
    const pivotOf: Record<GroupId, Vec3> = { base: [0, 0, 0], ...PIVOT };

    // 로드 도중 unmount될 수 있다. 그때 만들어진 리소스를 해제하려고 추적한다.
    let disposed = false;
    const geometries: THREE.BufferGeometry[] = [];
    const materials: THREE.Material[] = [];

    const loader = new STLLoader();
    const files = [...new Set(PARTS.map((p) => p.file))]; // 모터 STL은 3번 재사용
    Promise.all(files.map((file) => loader.loadAsync(MODEL_DIR + file).then((geo) => [file, geo] as const)))
      .then((loaded) => {
        if (disposed) {
          loaded.forEach(([, geo]) => geo.dispose());
          return;
        }
        const cache = new Map(loaded);
        geometries.push(...loaded.map(([, geo]) => geo));

        for (const part of PARTS) {
          const geometry = cache.get(part.file);
          if (!geometry) continue;
          const material = new THREE.MeshStandardMaterial({
            color: part.color,
            metalness: 0.1,
            roughness: 0.6,
          });
          materials.push(material);

          const mesh = new THREE.Mesh(geometry, material);
          // 모델은 제자리에 두고 회전 중심만 pivot으로 옮기는 보정.
          mesh.position.set(...sub(part.pos, pivotOf[part.group]));
          mesh.rotation.set(
            THREE.MathUtils.degToRad(part.rot[0]),
            THREE.MathUtils.degToRad(part.rot[1]),
            THREE.MathUtils.degToRad(part.rot[2]),
          );
          groups[part.group].add(mesh);
        }
      })
      .catch((err) => console.error("[3d] STL 로드 실패:", err));

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
      const deg = jointsDegRef.current;
      for (const joint of JOINT_CONFIG) {
        // rotation 단위는 radian. degree를 그대로 넣으면 약 57배로 돈다.
        const angle = THREE.MathUtils.degToRad(joint.invert ? -deg[joint.axis] : deg[joint.axis]);
        groups[joint.group].rotation[joint.rotationAxis] = angle;
      }
      controls.update();
      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    };
    tick();

    // StrictMode(dev)는 effect를 두 번 돌린다. 안 치우면 canvas와 WebGL 컨텍스트가 쌓인다.
    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      observer.disconnect();
      controls.dispose();
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      grid.dispose();
      axesHelper.dispose();
      renderer.dispose();
      mount.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={mountRef} style={{ width: "100%", height: "100%" }} />;
}
