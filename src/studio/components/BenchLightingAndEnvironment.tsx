import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export function BenchLightingAndEnvironment({ ambientPercent = 100 }: { ambientPercent?: number }) {
  const ambient = useRef<THREE.AmbientLight>(null);
  useFrame((_, delta) => {
    if (ambient.current) ambient.current.intensity = THREE.MathUtils.damp(ambient.current.intensity, 0.25 + ambientPercent * 0.004, 6, delta);
  });
  return <>
    <color attach="background" args={['#dce6e5']} />
    <fog attach="fog" args={['#dce6e5', 25, 55]} />
    <ambientLight ref={ambient} intensity={0.65} />
    <hemisphereLight args={['#f5fafb', '#6b8385', 0.65]} />
    <directionalLight position={[3, 12, 6]} intensity={2.1} color="#fff3e3" castShadow
      shadow-mapSize-width={2048} shadow-mapSize-height={2048}
      shadow-camera-near={0.5} shadow-camera-far={35}
      shadow-camera-left={-11} shadow-camera-right={11}
      shadow-camera-top={11} shadow-camera-bottom={-11}
      shadow-normalBias={0.03} shadow-bias={-0.0001} shadow-radius={4} />
    <directionalLight position={[-8, 7, 2]} intensity={0.7} color="#d6f2ff" />
    <directionalLight position={[0, 9, -9]} intensity={1.4} color="#efffff" />
    <mesh position={[0, -0.13, 0]} receiveShadow>
      <boxGeometry args={[28, 0.24, 28]} />
      <meshStandardMaterial color="#b8ccca" roughness={0.86} metalness={0.02} />
    </mesh>
    <gridHelper args={[24, 24, '#a6bfbc', '#adc5c2']} position={[0, -0.004, 0]} />
  </>;
}
