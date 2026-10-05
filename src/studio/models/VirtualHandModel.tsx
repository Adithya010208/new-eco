/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef } from 'react';
import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';

interface VirtualHandModelProps {
  distanceCm: number; // 5 to 50 cm
  isTriggered: boolean;
  onDistanceChange?: (newDist: number) => void;
}

export function VirtualHandModel({
  distanceCm,
  isTriggered,
  onDistanceChange,
}: VirtualHandModelProps) {
  const groupRef = useRef<THREE.Group>(null);

  // Map 5cm - 50cm to scene coordinates:
  // Sensor front is located at [-4.2, 3.2, 2.05].
  // 5cm -> Z = 2.65
  // 50cm -> Z = 7.15
  const normalizedDist = Math.max(5, Math.min(50, distanceCm));
  const zPos = 2.65 + ((normalizedDist - 5) / 45) * 4.5;

  return (
    <group
      ref={groupRef}
      position={[-4.2, 3.2, zPos]}
      rotation={[0, 0, 0]}
    >
      <group position={[0, -0.2, 0]}>
        <RoundedBox args={[0.9, 0.9, 0.25]} radius={0.14} smoothness={2} castShadow>
          <meshStandardMaterial color={isTriggered ? '#c0dccf' : '#e2b796'} roughness={0.78} />
        </RoundedBox>
        <RoundedBox position={[-0.55, -0.02, 0]} rotation={[0, 0, -0.5]} args={[0.22, 0.65, 0.24]} radius={0.1} smoothness={2} castShadow>
          <meshStandardMaterial color="#e2b796" roughness={0.78} />
        </RoundedBox>
        {[-0.32, -0.1, 0.12, 0.34].map((x, i) => <RoundedBox key={x} position={[x, 0.63, 0]} args={[0.19, [0.62, 0.8, 0.74, 0.52][i], 0.22]} radius={0.085} smoothness={2} castShadow>
          <meshStandardMaterial color="#e2b796" roughness={0.78} />
        </RoundedBox>)}
        <RoundedBox position={[0, -0.65, 0]} args={[0.6, 0.65, 0.22]} radius={0.08} smoothness={2} castShadow><meshStandardMaterial color="#426d74" roughness={0.9} /></RoundedBox>
      </group>

      {/* Acoustic reflection wave rings on hand surface when triggered */}
      {isTriggered && (
        <mesh position={[0, 0, -0.08]}>
          <ringGeometry args={[0.3, 0.8, 24]} />
          <meshBasicMaterial
            color="#34d399"
            transparent
            opacity={0.7}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}

      {/* Target Crosshair */}
      <mesh position={[0, 0, -0.07]}>
        <ringGeometry args={[0.08, 0.12, 16]} />
        <meshBasicMaterial color="#ffffff" side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}
