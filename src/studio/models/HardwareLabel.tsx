import React, { useEffect, useMemo } from 'react';
import * as THREE from 'three';

/** Small local silkscreen texture; no downloaded fonts or image assets. */
export function HardwareLabel({ text, position, rotation = [-Math.PI / 2, 0, 0], width = 0.8 }: {
  text: string; position: [number, number, number]; rotation?: [number, number, number]; width?: number;
}) {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 256; canvas.height = 64;
    const context = canvas.getContext('2d')!;
    context.font = '600 28px sans-serif'; context.textAlign = 'center'; context.textBaseline = 'middle';
    context.fillStyle = '#e6f5ed'; context.fillText(text, 128, 32, 248);
    const result = new THREE.CanvasTexture(canvas);
    result.colorSpace = THREE.SRGBColorSpace;
    return result;
  }, [text]);
  useEffect(() => () => texture.dispose(), [texture]);
  return <mesh position={position} rotation={rotation}>
    <planeGeometry args={[width, width / 4]} />
    <meshBasicMaterial map={texture} transparent depthWrite={false} toneMapped={false} />
  </mesh>;
}
