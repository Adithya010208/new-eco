/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { PinEndpoint } from '../types';

interface Component3DProps {
  position?: [number, number, number];
  rotation?: [number, number, number];
  isSelected?: boolean;
  isStepActive?: boolean;
  highlightPinIds?: string[];
  activePins?: PinEndpoint[];
  onSelectComponent?: () => void;
  onHoverPin?: (pin: PinEndpoint | null) => void;
  onSelectPin?: (pin: PinEndpoint) => void;
}

// ==========================================
// 1. GL5528 Photoresistor (LDR)
// ==========================================
export function LDRModel({
  position = [-0.6, 0.25, -0.6],
  rotation = [0, 0, 0],
  isSelected = false,
  isStepActive = true,
  highlightPinIds = [],
  activePins = [],
  onSelectComponent,
  onHoverPin,
  onSelectPin,
}: Component3DProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <group
      position={position}
      rotation={rotation}
      onClick={(e) => {
        e.stopPropagation();
        onSelectComponent?.();
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
      }}
      onPointerOut={() => setHovered(false)}
    >
      {/* Selection / Hover Glow */}
      {(isSelected || hovered) && (
        <mesh position={[0, 0.2, 0]}>
          <cylinderGeometry args={[0.35, 0.35, 0.45, 16]} />
          <meshBasicMaterial
            color={isSelected ? '#087F83' : '#38BDF8'}
            wireframe
            transparent
            opacity={0.4}
          />
        </mesh>
      )}

      {/* LDR Disc Body */}
      <mesh position={[0, 0.3, 0]}>
        <cylinderGeometry args={[0.22, 0.22, 0.08, 20]} />
        <meshStandardMaterial
          color={isStepActive ? '#E2E8F0' : '#64748B'}
          roughness={0.4}
        />
      </mesh>

      {/* Photo-Sensitive Face (Cadmium Sulfide orange-red with serpentine line) */}
      <mesh position={[0, 0.345, 0]}>
        <cylinderGeometry args={[0.19, 0.19, 0.01, 20]} />
        <meshStandardMaterial
          color="#EA580C"
          roughness={0.2}
          emissive="#C2410C"
          emissiveIntensity={0.2}
        />
      </mesh>

      {/* Center Serpentine Track Simulation */}
      <mesh position={[0, 0.355, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.06, 0.14, 16]} />
        <meshBasicMaterial color="#78350F" />
      </mesh>

      {/* Dual Metal Leads */}
      <mesh position={[-0.08, 0.15, 0]}>
        <cylinderGeometry args={[0.015, 0.015, 0.3, 8]} />
        <meshStandardMaterial color="#94A3B8" metalness={0.8} roughness={0.3} />
      </mesh>
      <mesh position={[0.08, 0.15, 0]}>
        <cylinderGeometry args={[0.015, 0.015, 0.3, 8]} />
        <meshStandardMaterial color="#94A3B8" metalness={0.8} roughness={0.3} />
      </mesh>
    </group>
  );
}

// ==========================================
// 2. Axial Resistor Model (Color Bands)
// ==========================================
interface ResistorModelProps extends Component3DProps {
  colorBands: [string, string, string, string]; // e.g. ['#78350F', '#000000', '#EA580C', '#D97706']
  bodyColor?: string;
}

export function ResistorModel({
  position = [0, 0.2, 0],
  rotation = [0, 0, 0],
  colorBands = ['#78350F', '#000000', '#EA580C', '#D97706'],
  bodyColor = '#FDE68A',
  isSelected = false,
  isStepActive = true,
  onSelectComponent,
}: ResistorModelProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <group
      position={position}
      rotation={rotation}
      onClick={(e) => {
        e.stopPropagation();
        onSelectComponent?.();
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
      }}
      onPointerOut={() => setHovered(false)}
    >
      {(isSelected || hovered) && (
        <mesh position={[0, 0.15, 0]}>
          <boxGeometry args={[0.7, 0.3, 0.3]} />
          <meshBasicMaterial
            color={isSelected ? '#087F83' : '#38BDF8'}
            wireframe
            transparent
            opacity={0.4}
          />
        </mesh>
      )}

      {/* Resistor Body */}
      <mesh position={[0, 0.15, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.07, 0.07, 0.35, 12]} />
        <meshStandardMaterial color={bodyColor} roughness={0.5} />
      </mesh>

      {/* Color Bands */}
      <mesh position={[-0.1, 0.15, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.072, 0.072, 0.03, 12]} />
        <meshBasicMaterial color={colorBands[0]} />
      </mesh>
      <mesh position={[-0.04, 0.15, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.072, 0.072, 0.03, 12]} />
        <meshBasicMaterial color={colorBands[1]} />
      </mesh>
      <mesh position={[0.03, 0.15, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.072, 0.072, 0.03, 12]} />
        <meshBasicMaterial color={colorBands[2]} />
      </mesh>
      <mesh position={[0.1, 0.15, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.072, 0.072, 0.03, 12]} />
        <meshBasicMaterial color={colorBands[3]} />
      </mesh>

      {/* Bent Axial Leads */}
      <mesh position={[-0.22, 0.15, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.015, 0.015, 0.12, 8]} />
        <meshStandardMaterial color="#94A3B8" metalness={0.8} />
      </mesh>
      <mesh position={[-0.28, 0.08, 0]}>
        <cylinderGeometry args={[0.015, 0.015, 0.16, 8]} />
        <meshStandardMaterial color="#94A3B8" metalness={0.8} />
      </mesh>
      <mesh position={[0.22, 0.15, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.015, 0.015, 0.12, 8]} />
        <meshStandardMaterial color="#94A3B8" metalness={0.8} />
      </mesh>
      <mesh position={[0.28, 0.08, 0]}>
        <cylinderGeometry args={[0.015, 0.015, 0.16, 8]} />
        <meshStandardMaterial color="#94A3B8" metalness={0.8} />
      </mesh>
    </group>
  );
}

// ==========================================
// 3. 5mm Diffused LED Indicator (Illuminating)
// ==========================================
interface LEDModelProps extends Component3DProps {
  isIlluminated?: boolean;
}

export function LEDModel({
  position = [1.0, 0.3, 0.6],
  rotation = [0, 0, 0],
  isIlluminated = false,
  isSelected = false,
  isStepActive = true,
  onSelectComponent,
}: LEDModelProps) {
  const [hovered, setHovered] = useState(false);
  const glowLightRef = useRef<THREE.PointLight>(null);

  useFrame((_, delta) => {
    if (glowLightRef.current) {
      glowLightRef.current.intensity = isIlluminated ? 2.5 : 0;
    }
  });

  return (
    <group
      position={position}
      rotation={rotation}
      onClick={(e) => {
        e.stopPropagation();
        onSelectComponent?.();
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
      }}
      onPointerOut={() => setHovered(false)}
    >
      {(isSelected || hovered) && (
        <mesh position={[0, 0.4, 0]}>
          <cylinderGeometry args={[0.25, 0.25, 0.7, 16]} />
          <meshBasicMaterial
            color={isSelected ? '#087F83' : '#38BDF8'}
            wireframe
            transparent
            opacity={0.4}
          />
        </mesh>
      )}

      {/* LED Epoxy Dome Base Collar */}
      <mesh position={[0, 0.22, 0]}>
        <cylinderGeometry args={[0.16, 0.16, 0.06, 16]} />
        <meshStandardMaterial
          color={isIlluminated ? '#EF4444' : '#DC2626'}
          roughness={0.1}
          transparent
          opacity={0.85}
        />
      </mesh>

      {/* LED Epoxy Dome Cylinder */}
      <mesh position={[0, 0.38, 0]}>
        <cylinderGeometry args={[0.14, 0.14, 0.26, 16]} />
        <meshStandardMaterial
          color={isIlluminated ? '#FCA5A5' : '#B91C1C'}
          roughness={0.1}
          emissive={isIlluminated ? '#EF4444' : '#000000'}
          emissiveIntensity={isIlluminated ? 1.8 : 0}
          transparent
          opacity={0.85}
        />
      </mesh>

      {/* LED Epoxy Spherical Top Tip */}
      <mesh position={[0, 0.51, 0]}>
        <sphereGeometry args={[0.14, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial
          color={isIlluminated ? '#FEF2F2' : '#B91C1C'}
          roughness={0.1}
          emissive={isIlluminated ? '#EF4444' : '#000000'}
          emissiveIntensity={isIlluminated ? 2.2 : 0}
          transparent
          opacity={0.85}
        />
      </mesh>

      {/* Anode & Cathode Leads */}
      <mesh position={[-0.05, 0.1, 0]}>
        <cylinderGeometry args={[0.015, 0.015, 0.22, 8]} />
        <meshStandardMaterial color="#94A3B8" metalness={0.8} />
      </mesh>
      <mesh position={[0.05, 0.1, 0]}>
        <cylinderGeometry args={[0.015, 0.015, 0.22, 8]} />
        <meshStandardMaterial color="#94A3B8" metalness={0.8} />
      </mesh>

      {/* Dynamic Glow Light when ON */}
      <pointLight
        ref={glowLightRef}
        color="#EF4444"
        intensity={isIlluminated ? 2.5 : 0}
        distance={4}
        position={[0, 0.55, 0]}
      />
    </group>
  );
}
