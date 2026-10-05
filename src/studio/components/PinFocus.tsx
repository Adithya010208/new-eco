import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { PinEndpoint } from '../types';

export function PinFocus({ pins, ids, onHover, onSelect }: { pins: PinEndpoint[]; ids: string[]; onHover?: (pin: PinEndpoint | null) => void; onSelect?: (pin: PinEndpoint) => void }) {
  const reducedMotion = useMemo(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches, []);
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (ref.current && !reducedMotion) ref.current.children.forEach(child => child.scale.setScalar(1 + Math.sin(clock.elapsedTime * 3) * 0.1));
  });
  return <group ref={ref}>{pins.filter(pin => ids.includes(pin.id)).map(pin => <mesh key={pin.id} position={pin.position} onPointerOver={e => { e.stopPropagation(); onHover?.(pin); }} onPointerOut={() => onHover?.(null)} onClick={e => { e.stopPropagation(); onSelect?.(pin); }}>
    <sphereGeometry args={[0.13, 12, 8]} />
    <meshBasicMaterial color="#2de0bf" transparent opacity={0.3} depthWrite={false} />
  </mesh>)}</group>;
}
