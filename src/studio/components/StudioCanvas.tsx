/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Suspense, useState, useEffect, useRef, useMemo } from 'react';
import * as THREE from 'three';
import { Canvas } from '@react-three/fiber';
import { AlertTriangle, Wrench, RefreshCw, Cpu, Layers } from 'lucide-react';
import { AssemblyPlacement } from './AssemblyPlacement';
import { PinFocus } from './PinFocus';
import { BenchLightingAndEnvironment } from './BenchLightingAndEnvironment';
import { CameraController } from './CameraController';
import { ArduinoUnoModel } from '../models/ArduinoUnoModel';
import { BreadboardModel } from '../models/BreadboardModel';
import { SG90ServoModel } from '../models/SG90ServoModel';
import { HCSR04Model } from '../models/HCSR04Model';
import { DustbinModel } from '../models/DustbinModel';
import { VirtualHandModel } from '../models/VirtualHandModel';
import { ExternalPowerSupplyModel } from '../models/ExternalPowerSupplyModel';
import { ConnectionRenderer } from '../models/ConnectionRenderer';
import {
  StudioComponentSpec,
  WireConnection,
  AssemblyStep,
  PinEndpoint,
  BehaviorSimulationState,
} from '../types';
import {
  LDRModel,
  ResistorModel,
  LEDModel,
} from '../models/NightLightModels';

interface StudioCanvasProps {
  currentStep: AssemblyStep;
  components: StudioComponentSpec[];
  wires: WireConnection[];
  pins: PinEndpoint[];
  simulationState: BehaviorSimulationState;
  selectedComponentId: string | null;
  highlightWireId: string | null;
  cameraPosition: [number, number, number];
  cameraTarget: [number, number, number];
  projectId?: string;
  ambientLightLuxPercent?: number;
  onSelectComponent: (componentId: string | null) => void;
  onHoverPin: (pin: PinEndpoint | null) => void;
  onSelectPin: (pin: PinEndpoint) => void;
  onHoverWire: (wire: WireConnection | null) => void;
  onSelectWire: (wire: WireConnection) => void;
  onDistanceChange?: (dist: number) => void;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback: (error: Error, retry: () => void) => React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class CanvasErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.warn('[StudioCanvas] Caught WebGL canvas render error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError && this.state.error) {
      return this.props.fallback(this.state.error, () =>
        this.setState({ hasError: false, error: null })
      );
    }
    return this.props.children;
  }
}

export function StudioCanvas(props: StudioCanvasProps) {
  const {
    currentStep,
    components,
    wires,
    pins,
    simulationState,
    selectedComponentId,
    highlightWireId,
    cameraPosition,
    cameraTarget,
    projectId,
    ambientLightLuxPercent,
    onSelectComponent,
    onHoverPin,
    onSelectPin,
    onHoverWire,
    onSelectWire,
    onDistanceChange,
  } = props;

  const componentPins = useMemo(() => Object.fromEntries(components.map(component => [component.id, pins.filter(pin => pin.componentId === component.id)])), [components, pins]);
  const selectHandlers = useMemo(() => Object.fromEntries(components.map(component => [component.id, () => onSelectComponent(component.id)])), [components, onSelectComponent]);
  const initialCameraPosition = useRef(cameraPosition);
  const [webGLAvailable, setWebGLAvailable] = useState<boolean>(true);

  // Check if WebGL context is available in this browser environment
  useEffect(() => {
    try {
      const canvas = document.createElement('canvas');
      const gl =
        canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) {
        setWebGLAvailable(false);
      }
    } catch {
      setWebGLAvailable(false);
    }
  }, []);

  const activeWires = wires.filter((w) =>
    currentStep.activeWireIds.includes(w.id)
  );

  const activeStepComponents = components.filter((c) =>
    currentStep.activeComponentIds.includes(c.id)
  );

  // Accessible Step-List Fallback when WebGL is unavailable or errors
  const renderFallback = (errorMsg?: string, onRetry?: () => void) => (
    <div className="w-full h-full bg-slate-900 text-slate-100 p-6 overflow-y-auto space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2 text-amber-400">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <div>
            <h3 className="text-sm font-bold tracking-tight text-white">
              Accessible Step-List Mode (3D WebGL Canvas Fallback)
            </h3>
            <span className="text-[11px] text-slate-400">
              {errorMsg
                ? `WebGL Context Notice: ${errorMsg}`
                : 'Interactive 3D acceleration is unavailable; step guide and wiring are presented below.'}
            </span>
          </div>
        </div>

        {onRetry && (
          <button
            onClick={onRetry}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors cursor-pointer self-start sm:self-center"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry 3D Scene</span>
          </button>
        )}
      </div>

      {/* Current Step Overview */}
      <div className="bg-slate-800/80 rounded-xl p-4 border border-slate-700 space-y-2">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-[#087F83] text-white">
            Step {projectId === 'proj-night-light' ? currentStep.stepNumber + 1 : currentStep.stepNumber}
          </span>
          <h4 className="text-base font-bold text-white">
            {currentStep.title}
          </h4>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed">
          {currentStep.summary}
        </p>
      </div>

      {/* Step Instructions List */}
      <div className="space-y-2">
        <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Step Action Sequence:
        </h5>
        <ol className="space-y-1.5 text-xs text-slate-200">
          {currentStep.detailedInstructions.map((instruction, idx) => (
            <li key={idx} className="flex items-start gap-2 p-2 bg-slate-800/50 rounded-lg border border-slate-700/60">
              <span className="w-4 h-4 rounded-full bg-[#087F83] text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                {idx + 1}
              </span>
              <span>{instruction}</span>
            </li>
          ))}
        </ol>
      </div>

      {/* Active Wires in this Step */}
      {activeWires.length > 0 && (
        <div className="space-y-2">
          <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Jumper Connections for this Step ({activeWires.length} Leads):
          </h5>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {activeWires.map((wire) => {
              const fromPin = pins.find((p) => p.id === wire.fromPinId);
              const toPin = pins.find((p) => p.id === wire.toPinId);
              return (
                <div
                  key={wire.id}
                  className="p-2.5 bg-slate-800/60 rounded-lg border border-slate-700 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between font-semibold">
                    <span className="flex items-center gap-1.5 text-white">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: wire.hexColor }}
                      />
                      <span>{wire.signalName}</span>
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {wire.color} Wire
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-300">
                    <strong>From:</strong> {fromPin?.name || wire.fromPinId}
                  </div>
                  <div className="text-[11px] text-slate-300">
                    <strong>To:</strong> {toPin?.name || wire.toPinId}
                  </div>
                  <p className="text-[10px] text-slate-400 italic">
                    {wire.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Active Components Manifest */}
      <div className="space-y-2">
        <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Bench Components in this Step ({activeStepComponents.length}):
        </h5>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {activeStepComponents.map((comp) => (
            <div
              key={comp.id}
              onClick={() => onSelectComponent(comp.id)}
              className="p-2.5 bg-slate-800/60 hover:bg-slate-750 rounded-lg border border-slate-700 text-xs cursor-pointer transition-colors"
            >
              <div className="font-bold text-white">{comp.name}</div>
              <div className="text-[10px] text-slate-400 capitalize">
                {comp.category}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Safety & Power Architecture Callouts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        {currentStep.safetyWarning && (
          <div className="p-3 bg-amber-950/40 border border-amber-800/80 rounded-xl text-amber-200 space-y-1">
            <span className="font-bold block uppercase text-[10px] tracking-wider text-amber-400">
              Safety Checkpoint
            </span>
            <p>{currentStep.safetyWarning}</p>
          </div>
        )}
        {currentStep.powerDesignNote && (
          <div className="p-3 bg-blue-950/40 border border-blue-800/80 rounded-xl text-blue-200 space-y-1">
            <span className="font-bold block uppercase text-[10px] tracking-wider text-blue-400">
              Power Architecture
            </span>
            <p>{currentStep.powerDesignNote}</p>
          </div>
        )}
      </div>
    </div>
  );

  if (!webGLAvailable) {
    return (
      <div className="w-full h-full relative select-none" role="region" aria-label="Interactive assembly model" tabIndex={0}>
        {renderFallback('WebGL is disabled or unsupported on this device.')}
      </div>
    );
  }

  const isSimulationStep =
    currentStep.stepNumber === 6 || simulationState.isSimulating;

  return (
    <div className="w-full h-full relative select-none" role="region" aria-label="Interactive assembly model" tabIndex={0}>
      <CanvasErrorBoundary
        fallback={(error, retry) => renderFallback(error.message, retry)}
      >
        <Canvas
          shadows
          dpr={[1, 1.5]}
          camera={{ position: initialCameraPosition.current, fov: 45 }}
          gl={{ antialias: true, alpha: false, toneMapping: THREE.ACESFilmicToneMapping }}
          onPointerMissed={() => onSelectComponent(null)}
        >
          <Suspense fallback={null}>
            <BenchLightingAndEnvironment ambientPercent={projectId === 'proj-night-light' ? ambientLightLuxPercent : 100} />
            <CameraController
              targetPosition={cameraPosition}
              targetLookAt={cameraTarget}
            />

            {projectId === 'proj-night-light' ? (
              <>
                {/* Arduino Uno Board */}
                <AssemblyPlacement active={currentStep.activeComponentIds.includes('comp-arduino')}><ArduinoUnoModel

                  isSelected={selectedComponentId === 'comp-arduino'}
                  isStepActive={currentStep.activeComponentIds.includes('comp-arduino')}
                  highlightPinIds={currentStep.highlightPinIds}
                  activePins={componentPins['comp-arduino']}
                  onSelectComponent={selectHandlers['comp-arduino']}
                  onHoverPin={onHoverPin}
                  onSelectPin={onSelectPin}
                /></AssemblyPlacement>

                {/* Half-Size Breadboard */}
                <AssemblyPlacement active={currentStep.activeComponentIds.includes('comp-breadboard')}><BreadboardModel

                  isSelected={selectedComponentId === 'comp-breadboard'}
                  isStepActive={currentStep.activeComponentIds.includes('comp-breadboard')}
                  highlightPinIds={currentStep.highlightPinIds}
                  activePins={componentPins['comp-breadboard']}
                  onSelectComponent={selectHandlers['comp-breadboard']}
                  onHoverPin={onHoverPin}
                  onSelectPin={onSelectPin}
                /></AssemblyPlacement>

                {/* GL5528 Photoresistor (LDR) */}
                <AssemblyPlacement active={currentStep.activeComponentIds.includes('comp-ldr')}><LDRModel

                  isSelected={selectedComponentId === 'comp-ldr'}
                  isStepActive={currentStep.activeComponentIds.includes('comp-ldr')}
                  highlightPinIds={currentStep.highlightPinIds}
                  activePins={componentPins['comp-ldr']}
                  onSelectComponent={selectHandlers['comp-ldr']}
                  onHoverPin={onHoverPin}
                  onSelectPin={onSelectPin}
                /></AssemblyPlacement>

                {/* 10k Divider Resistor */}
                <AssemblyPlacement active={currentStep.activeComponentIds.includes('comp-res-10k')}><ResistorModel
                  position={[-0.4, 0.2, -0.9]}
                  colorBands={['#78350F', '#000000', '#EA580C', '#D97706']}
                  isSelected={selectedComponentId === 'comp-res-10k'}
                  isStepActive={currentStep.activeComponentIds.includes('comp-res-10k')}
                  onSelectComponent={selectHandlers['comp-res-10k']}
                /></AssemblyPlacement>

                {/* 220 LED Current Limiting Resistor */}
                <AssemblyPlacement active={currentStep.activeComponentIds.includes('comp-res-220')}><ResistorModel
                  position={[0.8, 0.2, 0.2]}
                  colorBands={['#DC2626', '#DC2626', '#78350F', '#D97706']}
                  isSelected={selectedComponentId === 'comp-res-220'}
                  isStepActive={currentStep.activeComponentIds.includes('comp-res-220')}
                  onSelectComponent={selectHandlers['comp-res-220']}
                /></AssemblyPlacement>

                {/* 5mm Diffused Red LED Indicator */}
                <AssemblyPlacement active={currentStep.activeComponentIds.includes('comp-led')}><LEDModel
                  position={[1.0, 0.3, 0.6]}
                  isIlluminated={(ambientLightLuxPercent ?? 100) < 40 || simulationState.isTriggered}
                  isSelected={selectedComponentId === 'comp-led'}
                  isStepActive={currentStep.activeComponentIds.includes('comp-led')}
                  onSelectComponent={selectHandlers['comp-led']}
                /></AssemblyPlacement>
              </>
            ) : (
              <>
                {/* Dustbin Model (with hinged lid synchronized to simulation state) */}
                <AssemblyPlacement active={currentStep.activeComponentIds.includes('comp-dustbin')}><DustbinModel
                  position={[-4.2, 0, 0]}
                  lidOpenProgress={simulationState.lidOpenProgress}
                  isSelected={selectedComponentId === 'comp-dustbin'}
                  onSelectComponent={selectHandlers['comp-dustbin']}
                /></AssemblyPlacement>

                {/* Arduino Uno Board */}
                <AssemblyPlacement active={currentStep.activeComponentIds.includes('comp-arduino')}><ArduinoUnoModel

                  isSelected={selectedComponentId === 'comp-arduino'}
                  isStepActive={currentStep.activeComponentIds.includes('comp-arduino')}
                  highlightPinIds={currentStep.highlightPinIds}
                  activePins={componentPins['comp-arduino']}
                  onSelectComponent={selectHandlers['comp-arduino']}
                  onHoverPin={onHoverPin}
                  onSelectPin={onSelectPin}
                /></AssemblyPlacement>

                {/* Half-Size Breadboard */}
                <AssemblyPlacement active={currentStep.activeComponentIds.includes('comp-breadboard')}><BreadboardModel

                  isSelected={selectedComponentId === 'comp-breadboard'}
                  isStepActive={currentStep.activeComponentIds.includes('comp-breadboard')}
                  highlightPinIds={currentStep.highlightPinIds}
                  activePins={componentPins['comp-breadboard']}
                  onSelectComponent={selectHandlers['comp-breadboard']}
                  onHoverPin={onHoverPin}
                  onSelectPin={onSelectPin}
                /></AssemblyPlacement>

                {/* Dedicated External Regulated 5V Servo Power Supply */}
                <AssemblyPlacement active={currentStep.activeComponentIds.includes('comp-ext-power')}><ExternalPowerSupplyModel

                  isSelected={selectedComponentId === 'comp-ext-power'}
                  isStepActive={currentStep.activeComponentIds.includes('comp-ext-power')}
                  highlightPinIds={currentStep.highlightPinIds}
                  activePins={componentPins['comp-ext-power']}
                  onSelectComponent={selectHandlers['comp-ext-power']}
                  onHoverPin={onHoverPin}
                  onSelectPin={onSelectPin}
                /></AssemblyPlacement>

                {/* SG90 Micro Servo (Mounted directly inside Dustbin rear cradle) */}
                <AssemblyPlacement active={currentStep.activeComponentIds.includes('comp-servo')}><SG90ServoModel
                  position={[-4.2, 4.8, -1.95]}
                  rotation={[0, 0, 0]}
                  servoAngleDegrees={simulationState.servoAngleDegrees}
                  isSelected={selectedComponentId === 'comp-servo'}
                  isStepActive={currentStep.activeComponentIds.includes('comp-servo')}
                  highlightPinIds={currentStep.highlightPinIds}
                  activePins={componentPins['comp-servo']}
                  onSelectComponent={selectHandlers['comp-servo']}
                  onHoverPin={onHoverPin}
                  onSelectPin={onSelectPin}
                /></AssemblyPlacement>

                {/* HC-SR04 Ultrasonic Distance Sensor (Mounted directly inside Dustbin front aperture) */}
                <AssemblyPlacement active={currentStep.activeComponentIds.includes('comp-sonar')}><HCSR04Model
                  position={[-4.2, 3.2, 1.70]}
                  rotation={[0, 0, 0]}
                  isSelected={selectedComponentId === 'comp-sonar'}
                  isStepActive={currentStep.activeComponentIds.includes('comp-sonar')}
                  isSimulating={isSimulationStep}
                  isTriggered={simulationState.isTriggered}
                  obstacleDistanceCm={simulationState.obstacleDistanceCm}
                  highlightPinIds={currentStep.highlightPinIds}
                  activePins={componentPins['comp-sonar']}
                  onSelectComponent={selectHandlers['comp-sonar']}
                  onHoverPin={onHoverPin}
                  onSelectPin={onSelectPin}
                /></AssemblyPlacement>

                {/* Virtual Hand / Obstacle (Visible during live simulation step) */}
                {isSimulationStep && (
                  <VirtualHandModel
                    distanceCm={simulationState.obstacleDistanceCm}
                    isTriggered={simulationState.isTriggered}
                    onDistanceChange={onDistanceChange}
                  />
                )}
              </>
            )}

            <PinFocus pins={pins} ids={currentStep.highlightPinIds} onHover={onHoverPin} onSelect={onSelectPin} />
            {/* 3D Catmull-Rom Curved Jumper Wires */}
            <ConnectionRenderer
              wires={wires}
              pins={pins}
              activeWireIds={currentStep.activeWireIds}
              highlightPinIds={currentStep.highlightPinIds}
              isSimulating={isSimulationStep}
              highlightWireId={highlightWireId}
              onHoverWire={onHoverWire}
              onSelectWire={onSelectWire}
            />
          </Suspense>
        </Canvas>
      </CanvasErrorBoundary>
    </div>
  );
}
