// 로봇 씬 구성. RobotView(브라우저)와 단위 테스트(node)가 같은 코드를 쓰도록 분리한다.
// 여기엔 DOM·렌더러·이벤트가 없다 — 순수 Three.js 객체 조립만 한다.

import * as THREE from "three";
import type { JointAxis, Joints } from "@mimi/protocol";
import { JOINT_CONFIG, PARTS, PIVOT, type GroupId, type Vec3 } from "./robotModel";

const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const PIVOT_OF: Record<GroupId, Vec3> = { base: [0, 0, 0], ...PIVOT };

export interface Hierarchy {
  root: THREE.Group;
  groups: Record<GroupId, THREE.Object3D>;
}

export interface Placed {
  materials: THREE.MeshStandardMaterial[];
  /** 선택 강조용. 집을 수 있는 부품만 관절별로 모아둔다. */
  pickMaterials: Map<JointAxis, THREE.MeshStandardMaterial[]>;
}

/**
 * 관절 계층. g1을 돌리면 g2·g3이 통째로 끌려간다(어깨를 돌리면 팔 전체가 움직이듯).
 * 각 그룹의 원점을 회전 중심(pivot)에 두고, 자식은 부모 pivot과의 차이만큼만 떨어뜨린다.
 */
export function buildHierarchy(): Hierarchy {
  const root = new THREE.Group();
  const g1 = new THREE.Group();
  g1.position.set(...PIVOT.g1);
  const g2 = new THREE.Group();
  g2.position.set(...sub(PIVOT.g2, PIVOT.g1));
  const g3 = new THREE.Group();
  g3.position.set(...sub(PIVOT.g3, PIVOT.g2));
  root.add(g1);
  g1.add(g2);
  g2.add(g3);
  return { root, groups: { base: root, g1, g2, g3 } };
}

/** PARTS를 계층에 배치한다. isGhost면 반투명 재질을 쓴다. */
export function placeParts(
  hierarchy: Hierarchy,
  cache: Map<string, THREE.BufferGeometry>,
  isGhost: boolean,
): Placed {
  const materials: THREE.MeshStandardMaterial[] = [];
  const pickMaterials = new Map<JointAxis, THREE.MeshStandardMaterial[]>();

  for (const part of PARTS) {
    const geometry = cache.get(part.file);
    if (!geometry) continue;

    const material = new THREE.MeshStandardMaterial({
      color: part.color,
      metalness: 0.1,
      roughness: 0.6,
      transparent: isGhost,
      // 밝은 배경에선 반투명이 흰색에 묻힌다. 어두운 배경보다 진해야 목표 자세가 보인다.
      opacity: isGhost ? 0.45 : 1,
      // 반투명끼리 서로를 가리지 않게 깊이 기록을 끈다.
      depthWrite: !isGhost,
    });
    materials.push(material);

    const mesh = new THREE.Mesh(geometry, material);
    // 모델은 제자리에 두고 회전 중심만 pivot으로 옮기는 보정.
    mesh.position.set(...sub(part.pos, PIVOT_OF[part.group]));
    mesh.rotation.set(
      THREE.MathUtils.degToRad(part.rot[0]),
      THREE.MathUtils.degToRad(part.rot[1]),
      THREE.MathUtils.degToRad(part.rot[2]),
    );
    if (part.pick) {
      mesh.userData.pick = part.pick;
      pickMaterials.set(part.pick, [...(pickMaterials.get(part.pick) ?? []), material]);
    }
    hierarchy.groups[part.group].add(mesh);
  }
  return { materials, pickMaterials };
}

/** 관절 각도(degree)를 계층 회전에 반영한다. */
export function applyPose(hierarchy: Hierarchy, deg: Joints): void {
  for (const joint of JOINT_CONFIG) {
    const value = deg[joint.axis];
    // rotation 단위는 radian. degree를 그대로 넣으면 약 57배로 돈다.
    hierarchy.groups[joint.group].rotation[joint.rotationAxis] = THREE.MathUtils.degToRad(
      joint.invert ? -value : value,
    );
  }
}

/** 레이가 맞은 것 중 집을 수 있는 첫 관절. */
export function pickJoint(raycaster: THREE.Raycaster, roots: THREE.Object3D[]): JointAxis | null {
  for (const hit of raycaster.intersectObjects(roots, true)) {
    const pick = hit.object.userData.pick as JointAxis | undefined;
    if (pick) return pick;
  }
  return null;
}
