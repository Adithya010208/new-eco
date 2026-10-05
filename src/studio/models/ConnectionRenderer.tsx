/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState, useEffect } from 'react';
import * as THREE from 'three';
import { WireConnection, PinEndpoint } from '../types';

interface ConnectionRendererProps {
  wires: WireConnection[];
  pins: PinEndpoint[];
  activeWireIds: string[];
  highlightPinIds?: string[];
  isSimulating?: boolean;
  highlightWireId?: string | null;
  onHoverWire?: (wire: WireConnection | null) => void;
  onSelectWire?: (wire: WireConnection) => void;
}

export function ConnectionRenderer({
  wires,
  pins,
  activeWireIds,
  highlightPinIds = [],
  isSimulating = false,
  highlightWireId = null,
  onHoverWire,
  onSelectWire,
}: ConnectionRendererProps) {
  const pinMap = useMemo(() => {
    const map = new Map<string, PinEndpoint>();
    pins.forEach((p) => map.set(p.id, p));
    return map;
  }, [pins]);

  return (
    <group>
      {wires.map((wire) => {
        const isActive = activeWireIds.includes(wire.id);
        if (!isActive) return null;

        const fromPin = pinMap.get(wire.fromPinId);
        const toPin = pinMap.get(wire.toPinId);
        if (!fromPin || !toPin) return null;

        return (
          <SingleWire
            key={wire.id}
            wire={wire}
            fromPin={fromPin}
            toPin={toPin}
            isHighlighted={highlightWireId === wire.id || (highlightPinIds.includes(wire.fromPinId) && highlightPinIds.includes(wire.toPinId))}
            isSimulating={isSimulating}
            onHoverWire={onHoverWire}
            onSelectWire={onSelectWire}
          />
        );
      })}
    </group>
  );
}

interface SingleWireProps {
  wire: WireConnection;
  fromPin: PinEndpoint;
  toPin: PinEndpoint;
  isHighlighted: boolean;
  isSimulating: boolean;
  onHoverWire?: (wire: WireConnection | null) => void;
  onSelectWire?: (wire: WireConnection) => void;
}

function SingleWire({
  wire,
  fromPin,
  toPin,
  isHighlighted,
  isSimulating,
  onHoverWire,
  onSelectWire,
}: SingleWireProps) {
  const [hovered, setHovered] = useState(false);

  // Generate smooth 3D Catmull-Rom curve between pins with graceful arching
  const { geometry, startPos, endPos, startRotation, endRotation } = useMemo(() => {
    const p1 = new THREE.Vector3(...fromPin.position);
    const p2 = new THREE.Vector3(...toPin.position);

    // Compute midpoint and add vertical natural wire arch
    const mid = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
    const dist = p1.distanceTo(p2);
    const archHeight = Math.max(0.6, dist * 0.25 * (wire.curvature || 0.4));
    mid.y += archHeight;

    // Slight lateral bow for cable bundle realism
    const lateralDir = new THREE.Vector3()
      .crossVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3().subVectors(p2, p1))
      .normalize()
      .multiplyScalar(0.15);
    mid.add(lateralDir);

    const curve = new THREE.CatmullRomCurve3([
      p1,
      p1.clone().addScaledVector(new THREE.Vector3(...(fromPin.direction ?? [0, 1, 0])), 0.25),
      ...(wire.midPoints?.map(p => new THREE.Vector3(...p)) ?? [mid]),
      p2.clone().addScaledVector(new THREE.Vector3(...(toPin.direction ?? [0, 1, 0])), 0.25),
      p2,
    ]);

    const tubeGeom = new THREE.TubeGeometry(
      curve,
      32,
      0.025,
      8,
      false
    );

    const startDirection = new THREE.Vector3(...(fromPin.direction ?? [0, 1, 0])).normalize();
    const endDirection = new THREE.Vector3(...(toPin.direction ?? [0, 1, 0])).normalize();
    return { geometry: tubeGeom,
      startPos: p1.clone().addScaledVector(startDirection, 0.12),
      endPos: p2.clone().addScaledVector(endDirection, 0.12),
      startRotation: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), startDirection),
      endRotation: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), endDirection) };
  }, [fromPin.position, toPin.position, fromPin.direction, toPin.direction, wire.curvature, wire.midPoints]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <group
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        onHoverWire?.(wire);
      }}
      onPointerOut={() => {
        setHovered(false);
        onHoverWire?.(null);
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelectWire?.(wire);
      }}
    >
      {/* 3D Wire Tube */}
      <mesh geometry={geometry} castShadow>
        <meshStandardMaterial
          color={wire.hexColor}
          emissive={isHighlighted || hovered ? wire.hexColor : '#000000'}
          emissiveIntensity={isHighlighted || hovered ? 0.6 : 0.0}
          roughness={0.4}
          metalness={0.1}
        />
      </mesh>

      {/* Terminal Dupont Sleeves (Black connector boots at pin ends) */}
      <mesh position={startPos} quaternion={startRotation}>
        <boxGeometry args={[0.085, 0.24, 0.085]} />
        <meshStandardMaterial color="#0f172a" roughness={0.8} />
      </mesh>
      <mesh position={endPos} quaternion={endRotation}>
        <boxGeometry args={[0.085, 0.24, 0.085]} />
        <meshStandardMaterial color="#0f172a" roughness={0.8} />
      </mesh>
    </group>
  );
}
