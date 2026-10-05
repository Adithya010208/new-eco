import React, { useLayoutEffect, useRef } from 'react';
import * as THREE from 'three';

/** Repeated socket recesses share one geometry, material and draw call. */
export function BreadboardSockets() {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const dummy = new THREE.Object3D();
    let index = 0;
    for (let row = 0; row < 30; row++) {
      for (const x of [-0.43, -0.35, -0.27, -0.19, -0.11, 0.11, 0.19, 0.27, 0.35, 0.43]) {
        dummy.position.set(x, 0.224, -2.32 + row * 0.16);
        dummy.updateMatrix();
        ref.current?.setMatrixAt(index++, dummy.matrix);
      }
    }
    for (let row = 0; row < 25; row++) {
      for (const x of [-0.7, -0.57, 0.57, 0.7]) {
        dummy.position.set(x, 0.224, -2.3 + row * 0.19);
        dummy.updateMatrix(); ref.current?.setMatrixAt(index++, dummy.matrix);
      }
    }
    if (ref.current) ref.current.instanceMatrix.needsUpdate = true;
  }, []);
  return <instancedMesh ref={ref} args={[undefined, undefined, 400]}>
    <boxGeometry args={[0.045, 0.006, 0.065]} />
    <meshStandardMaterial color="#25313a" roughness={0.9} />
  </instancedMesh>;
}

export function PCBDetails() {
  return <group>
    {[-1, 1].flatMap(x => [-1.55, 1.55].map(z => <group key={`${x}-${z}`} position={[x, 0.105, z]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[0.055, 0.1, 12]} /><meshStandardMaterial color="#c7b67b" metalness={0.65} roughness={0.4} /></mesh>
      <mesh><cylinderGeometry args={[0.052, 0.052, 0.012, 12]} /><meshStandardMaterial color="#152d32" /></mesh>
    </group>))}
    {Array.from({length: 14}, (_, i) => [-1, 1].map(side => <mesh key={`${i}-${side}`} position={[0.15 + side * 0.28, 0.14, -0.3 + i * 0.095]}>
      <boxGeometry args={[0.13, 0.035, 0.035]} /><meshStandardMaterial color="#a9b7bd" metalness={0.8} roughness={0.3} />
    </mesh>))}
    {[-0.65, -0.5, -0.35].map((x, i) => <mesh key={x} position={[x, 0.104, 0.45]}>
      <boxGeometry args={[0.018, 0.006, 1.1 + i * 0.2]} /><meshStandardMaterial color="#398a91" roughness={0.65} />
    </mesh>)}
  </group>;
}
