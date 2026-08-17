import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { JOINT_AXES } from "@mimi/protocol";
import type { JointAxis, Joints } from "@mimi/protocol";
import { PARTS, jointConfigOf } from "./robotModel";
import { applyPose, buildHierarchy, pickJoint, placeParts } from "./robotScene";
import { applyDragDelta, isRayTooParallel, signedAngleAround, worldAxisOf } from "./jointPicking";

const MODEL_DIR = "/models/";
const ZERO: Joints = { j1: 0, j2: 0, j3: 0 };

// 목표와 현재가 이보다 가까우면 고스트를 숨긴다. 겹쳐 그리면 z-fighting이 생긴다.
const GHOST_HIDE_DEG = 0.5;
// 선택 강조. 밝은 씬에서는 어두운 emissive가 탁하게만 보여, 색은 Target 액센트로 두고
// 세기로만 켜고 끈다.
const HIGHLIGHT = 0xd97706;
const HIGHLIGHT_INTENSITY = 0.35;

type Props = {
  /** 로봇 현재값(실선). 수신 전이면 null. */
  actual: Joints | null;
  /** 목표값(반투명 고스트). */
  target: Joints;
  selected: JointAxis | null;
  onSelect: (axis: JointAxis | null) => void;
  onDragJoint: (axis: JointAxis, deg: number) => void;
};

export default function RobotView({ actual, target, selected, onSelect, onDragJoint }: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  // Three.js는 React 재렌더와 무관하게 rAF로 스스로 그린다 → 값은 state가 아니라 ref로 넘긴다.
  const actualRef = useRef<Joints>(ZERO);
  const targetRef = useRef<Joints>(ZERO);
  const selectedRef = useRef<JointAxis | null>(null);
  const callbacksRef = useRef({ onSelect, onDragJoint });

  useEffect(() => {
    actualRef.current = actual ?? ZERO;
    targetRef.current = target;
    selectedRef.current = selected;
    callbacksRef.current = { onSelect, onDragJoint };
  });

  // Scene 재생성 = WebGL 컨텍스트 재생성이라 비싸다. mount 시 1회만.
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    // 대시보드가 밝은 테마라 3D만 어두우면 검은 사각형처럼 뜬다. 카드보다 아주 살짝만 어둡게.
    scene.background = new THREE.Color(0xf6f8fb);

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
    // 밝은 배경에선 ambient를 낮춰야 면끼리 명암이 남아 형태가 읽힌다.
    scene.add(new THREE.AmbientLight(0xffffff, 0.5));
    const key = new THREE.DirectionalLight(0xffffff, 1.1);
    key.position.set(1, 2, 1.5);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xffffff, 0.35);
    fill.position.set(-1, -0.5, -1);
    scene.add(fill);

    // 밝은 배경에서는 격자도 옅어야 한다. 어두운 선을 그대로 두면 격자가 로봇보다 튄다.
    const grid = new THREE.GridHelper(300, 30, 0xcbd5e1, 0xe2e8f0);
    const axesHelper = new THREE.AxesHelper(60);
    scene.add(grid, axesHelper);

    // 실선 = 로봇 현재 자세(항상 진실), 반투명 = 아직 보내지 않은 목표 자세.
    const solid = buildHierarchy();
    const ghost = buildHierarchy();
    ghost.root.visible = false;
    scene.add(solid.root, ghost.root);

    // 로드 도중 unmount될 수 있다. 그때 만들어진 리소스를 해제하려고 추적한다.
    let disposed = false;
    const geometries: THREE.BufferGeometry[] = [];
    const materials: THREE.Material[] = [];
    // 선택 강조는 실선 쪽에만 준다. 고스트까지 빛나면 어느 쪽이 현재인지 흐려진다.
    let highlightMaterials = new Map<JointAxis, THREE.MeshStandardMaterial[]>();

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

        const placedSolid = placeParts(solid, cache, false);
        const placedGhost = placeParts(ghost, cache, true);
        materials.push(...placedSolid.materials, ...placedGhost.materials);
        highlightMaterials = placedSolid.pickMaterials;
      })
      .catch((err) => console.error("[3d] STL 로드 실패:", err));

    // ── 관절 집기 / 드래그 ────────────────────────────────────────
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const canvas = renderer.domElement;

    interface Drag {
      axis: JointAxis;
      invert: boolean;
      axisVec: THREE.Vector3;
      pivot: THREE.Vector3;
      plane: THREE.Plane;
      startPoint: THREE.Vector3;
      startDeg: number;
    }
    let drag: Drag | null = null;

    const aimRay = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
    };

    const onPointerDown = (e: PointerEvent) => {
      aimRay(e);
      const axis = pickJoint(raycaster, [solid.root, ghost.root]);
      callbacksRef.current.onSelect(axis);
      if (!axis) return;

      const cfg = jointConfigOf(axis);
      const group = ghost.groups[cfg.group];
      const axisVec = worldAxisOf(group, cfg.rotationAxis);
      // 시선이 회전 평면과 나란하면 교차점이 발산한다. 카메라를 돌린 뒤 다시 잡아야 한다.
      if (isRayTooParallel(raycaster.ray.direction, axisVec)) return;

      const pivot = group.getWorldPosition(new THREE.Vector3());
      const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(axisVec, pivot);
      const startPoint = new THREE.Vector3();
      if (!raycaster.ray.intersectPlane(plane, startPoint)) return;

      drag = { axis, invert: cfg.invert, axisVec, pivot, plane, startPoint, startDeg: targetRef.current[axis] };
      controls.enabled = false; // 안 끄면 관절과 카메라가 같이 돈다
      canvas.style.cursor = "grabbing";
      // 포인터가 캔버스를 벗어나도 드래그가 이어지게 한다. 합성 이벤트에선 실패할 수 있어 무시.
      try {
        canvas.setPointerCapture(e.pointerId);
      } catch {
        /* 캡처 실패해도 드래그 자체는 동작한다 */
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      aimRay(e);
      if (!drag) {
        canvas.style.cursor = pickJoint(raycaster, [solid.root, ghost.root]) ? "grab" : "default";
        return;
      }
      const point = new THREE.Vector3();
      if (!raycaster.ray.intersectPlane(drag.plane, point)) return;
      const deltaRad = signedAngleAround(drag.axisVec, drag.pivot, drag.startPoint, point);
      callbacksRef.current.onDragJoint(drag.axis, applyDragDelta(drag.axis, drag.startDeg, deltaRad, drag.invert));
    };

    const endDrag = (e: PointerEvent) => {
      if (!drag) return;
      drag = null;
      controls.enabled = true;
      canvas.style.cursor = "grab";
      if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
    };

    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", endDrag);
    canvas.addEventListener("pointercancel", endDrag);

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
    let appliedSelection: JointAxis | null = null;
    const tick = () => {
      // ResizeObserver가 늦거나(탭 비활성) 초기 레이아웃 전에 잰 경우를 매 프레임 바로잡는다.
      // 정수 비교 두 번이라 비용이 없고, canvas가 작게 굳는 사고를 원천 차단한다.
      if (canvas.clientWidth !== mount.clientWidth || canvas.clientHeight !== mount.clientHeight) {
        resize();
      }

      const actualDeg = actualRef.current;
      const targetDeg = targetRef.current;
      applyPose(solid, actualDeg);
      applyPose(ghost, targetDeg);
      ghost.root.visible = JOINT_AXES.some(
        (a) => Math.abs(actualDeg[a] - targetDeg[a]) > GHOST_HIDE_DEG,
      );

      if (appliedSelection !== selectedRef.current) {
        appliedSelection = selectedRef.current;
        for (const [axis, mats] of highlightMaterials) {
          const on = axis === appliedSelection;
          for (const m of mats) {
            m.emissive.setHex(HIGHLIGHT);
            m.emissiveIntensity = on ? HIGHLIGHT_INTENSITY : 0;
          }
        }
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
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", endDrag);
      canvas.removeEventListener("pointercancel", endDrag);
      controls.dispose();
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      grid.dispose();
      axesHelper.dispose();
      renderer.dispose();
      mount.removeChild(canvas);
    };
  }, []);

  return <div ref={mountRef} style={{ width: "100%", height: "100%" }} />;
}
