import React, { useLayoutEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export function AssemblyPlacement({ active, children }: { active: boolean; children: React.ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  const previous = useRef(active);
  const colors = useRef(new WeakMap<THREE.Material, THREE.Color>());
  useLayoutEffect(() => {
    if (ref.current && active && !previous.current && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) ref.current.position.y = 0.45;
    previous.current = active;
    ref.current?.traverse(object => {
      if (!(object instanceof THREE.Mesh)) return;
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      materials.forEach(material => {
        if (!(material instanceof THREE.MeshStandardMaterial)) return;
        if (!colors.current.has(material)) colors.current.set(material, material.color.clone());
        material.color.copy(colors.current.get(material)!).multiplyScalar(active ? 1 : 0.6);
      });
    });
  }, [active]);
  useFrame((_, delta) => {
    if (ref.current) ref.current.position.y = THREE.MathUtils.damp(ref.current.position.y, 0, 12, delta);
  });
  return <group ref={ref}>{children}</group>;
}
