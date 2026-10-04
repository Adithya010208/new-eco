/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useLocation } from 'wouter';
import {
  Wrench,
  ArrowLeft,
  RotateCcw,
  Sliders,
  Cpu,
  ShieldCheck,
  CheckCircle2,
  Info,
  Maximize2,
  Minimize2,
  Camera,
  ExternalLink,
  Layers,
  Sparkles,
} from 'lucide-react';
import { StudioCanvas } from '../studio/components/StudioCanvas';
import { StepPlayerControls } from '../studio/components/StepPlayerControls';
import { ComponentInspectorPanel } from '../studio/components/ComponentInspectorPanel';
import { BehaviorSimulatorPanel } from '../studio/components/BehaviorSimulatorPanel';
import { PinEndpointTooltip } from '../studio/components/PinEndpointTooltip';
import {
  SMART_DUSTBIN_STEPS,
  SMART_DUSTBIN_COMPONENTS,
  SMART_DUSTBIN_WIRES,
  SMART_DUSTBIN_PINS,
} from '../studio/data/smartDustbinRecipe';
import {
  CameraPreset,
  PinEndpoint,
  WireConnection,
  BehaviorSimulationState,
  BuildGuideProgress,
} from '../studio/types';
import { PROJECT_LIBRARY } from '../data/projectLibrary';
import { StorageService } from '../services/storageService';
import { FirestoreAdapter } from '../services/firestoreAdapter';
import { ComponentItem, MakerProfile } from '../types';
import { ComponentPassportModal } from '../components/inventory/ComponentPassportModal';

interface BuildStudioPageProps {
  activeUser: MakerProfile;
  inventory: ComponentItem[];
  onOpenAddComponent?: () => void;
  onAskMentor?: (
    projectId: string,
    workspaceId?: string,
    prefillQuestion?: string,
    prefillStage?: string
  ) => void;
}

export function BuildStudioPage({
  activeUser,
  inventory,
  onAskMentor,
}: BuildStudioPageProps) {
  const [, setLocation] = useLocation();

  // Parse query parameters (?project=proj-smart-dustbin&workspace=...)
  const searchParams = useMemo(() => {
    return new URLSearchParams(window.location.search);
  }, []);

  const projectId = searchParams.get('project') || 'proj-smart-dustbin';
  const workspaceId = searchParams.get('workspace') || undefined;
  const recipeVersion = 'v1';

  // Selected project template
  const project = useMemo(() => {
    return (
      PROJECT_LIBRARY.find((p) => p.id === projectId) ||
      PROJECT_LIBRARY[0]
    );
  }, [projectId]);

  const isSupportedProject = project.id === 'proj-smart-dustbin';
  const steps = SMART_DUSTBIN_STEPS;

  // Load persistent guide progress scoped by:
  // Maker ID + Project ID + Recipe Version + Workspace ID
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [completedStepIndices, setCompletedStepIndices] = useState<number[]>([]);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const debounceSaveTimerRef = useRef<any>(null);
  const activeUserRef = useRef<MakerProfile>(activeUser);

  // Keep activeUserRef always up to date
  useEffect(() => {
    activeUserRef.current = activeUser;
  }, [activeUser]);

  // Cancel any pending debounced writes when component unmounts or user changes
  useEffect(() => {
    return () => {
      if (debounceSaveTimerRef.current) {
        clearTimeout(debounceSaveTimerRef.current);
        debounceSaveTimerRef.current = null;
      }
    };
  }, [activeUser.id]);

  // Sync state whenever active maker, project, or workspace changes
  useEffect(() => {
    if (!isSupportedProject) return;

    if (!activeUser.isDemo) {
      // Account Mode: load from Cloud Firestore
      let isMounted = true;
      FirestoreAdapter.getGuideProgress(activeUser.id, project.id, recipeVersion)
        .then((progress) => {
          if (!isMounted) return;
          if (progress) {
            setCurrentStepIndex(progress.currentStepIndex || 0);
            setCompletedStepIndices(progress.completedStepIndices || []);
            setPlaybackSpeed(progress.playbackSpeed || 1);
          } else {
            setCurrentStepIndex(0);
            setCompletedStepIndices([]);
            setPlaybackSpeed(1);
          }
          setIsPlaying(false);
        })
        .catch((err) => {
          console.warn('[BuildStudio] Error loading guide progress from Firestore:', err);
        });
      return () => {
        isMounted = false;
      };
    } else {
      // Demo Mode: load from StorageService
      const progress = StorageService.getGuideProgress(
        activeUser.id,
        project.id,
        recipeVersion,
        workspaceId
      );
      setCurrentStepIndex(progress.currentStepIndex || 0);
      setCompletedStepIndices(progress.completedStepIndices || []);
      setPlaybackSpeed(progress.playbackSpeed || 1);
      setIsPlaying(false);
    }
  }, [activeUser.id, activeUser.isDemo, project.id, recipeVersion, workspaceId, isSupportedProject]);

  // Sync state whenever progress changes (debounced for cloud writes)
  useEffect(() => {
    if (!isSupportedProject) return;

    const progressPayload: BuildGuideProgress = {
      makerId: activeUser.id,
      projectId: project.id,
      recipeVersion,
      workspaceId,
      currentStepIndex,
      completedStepIndices,
      playbackSpeed,
      isLearningCompleted: completedStepIndices.length >= steps.length,
      lastUpdated: new Date().toISOString(),
    };

    if (!activeUser.isDemo) {
      // Account Mode: debounce writes to Firestore
      if (debounceSaveTimerRef.current) {
        clearTimeout(debounceSaveTimerRef.current);
      }
      const targetUid = activeUser.id;
      const targetProjectId = project.id;

      debounceSaveTimerRef.current = setTimeout(() => {
        // Strict guard: ensure active user and project haven't changed during debounce window
        if (
          activeUserRef.current?.id === targetUid &&
          !activeUserRef.current?.isDemo &&
          project.id === targetProjectId
        ) {
          FirestoreAdapter.saveGuideProgress(targetUid, progressPayload).catch((err) => {
            console.warn('[BuildStudio] Error saving guide progress to Firestore:', err);
          });
        }
      }, 600);
      return () => {
        if (debounceSaveTimerRef.current) {
          clearTimeout(debounceSaveTimerRef.current);
        }
      };
    } else {
      // Demo Mode: save to localStorage repository
      StorageService.saveGuideProgress(progressPayload);
    }
  }, [
    activeUser.id,
    activeUser.isDemo,
    project.id,
    recipeVersion,
    workspaceId,
    currentStepIndex,
    completedStepIndices,
    playbackSpeed,
    steps.length,
    isSupportedProject,
  ]);

  const currentStep = steps[currentStepIndex] || steps[0];

  // Camera State
  const [activeCameraPreset, setActiveCameraPreset] = useState<CameraPreset>(
    currentStep.cameraPreset
  );
  const [cameraPosition, setCameraPosition] = useState<[number, number, number]>(
    currentStep.cameraPosition
  );
  const [cameraTarget, setCameraTarget] = useState<[number, number, number]>(
    currentStep.cameraTarget
  );

  // Sync camera when step changes
  useEffect(() => {
    setActiveCameraPreset(currentStep.cameraPreset);
    setCameraPosition(currentStep.cameraPosition);
    setCameraTarget(currentStep.cameraTarget);
  }, [currentStep]);

  // Inspection states
  const [selectedComponentId, setSelectedComponentId] = useState<string | null>(null);
  const [inspectedPassportItem, setInspectedPassportItem] = useState<ComponentItem | null>(null);
  const [hoveredPin, setHoveredPin] = useState<PinEndpoint | null>(null);
  const [selectedPin, setSelectedPin] = useState<PinEndpoint | null>(null);
  const [hoveredWire, setHoveredWire] = useState<WireConnection | null>(null);
  const [selectedWire, setSelectedWire] = useState<WireConnection | null>(null);
  const [showSimulatorPanel, setShowSimulatorPanel] = useState<boolean>(
    currentStep.stepNumber === 6
  );

  // Auto-open simulator panel when navigating to Step 6
  useEffect(() => {
    if (currentStep.stepNumber === 6) {
      setShowSimulatorPanel(true);
    }
  }, [currentStep.stepNumber]);

  // Behavior Simulation State
  const [simulationState, setSimulationState] = useState<BehaviorSimulationState>({
    obstacleDistanceCm: 25.0,
    isHandApproaching: false,
    lidState: 'closed',
    lidOpenProgress: 0,
    servoAngleDegrees: 0,
    servoPwmMicroseconds: 1000,
    isTriggered: false,
    triggerTimerSeconds: 0,
    sensorPingWave: 0,
    isSimulating: currentStep.stepNumber === 6,
  });

  // Keep isSimulating in sync with Step 6 or toggle
  useEffect(() => {
    setSimulationState((prev) => ({
      ...prev,
      isSimulating: currentStep.stepNumber === 6 || showSimulatorPanel,
    }));
  }, [currentStep.stepNumber, showSimulatorPanel]);

  // Physics & firmware animation tick for the touchless lid simulation
  const lastTimeRef = useRef<number>(performance.now());
  useEffect(() => {
    let animId: number;

    const tick = (now: number) => {
      const dt = Math.min(0.1, (now - lastTimeRef.current) / 1000);
      lastTimeRef.current = now;

      setSimulationState((prev) => {
        const isTriggered = prev.obstacleDistanceCm <= 15.0;
        let newTimer = prev.triggerTimerSeconds;

        if (isTriggered) {
          // Reset 2.5 second hold dwell timer whenever hand is within 15cm
          newTimer = 2.5;
        } else if (newTimer > 0) {
          newTimer = Math.max(0, newTimer - dt);
        }

        const shouldBeOpen = isTriggered || newTimer > 0;
        const targetProgress = shouldBeOpen ? 1.0 : 0.0;

        // Smooth physical lid motion (speed: 3.5x/s open, 2.0x/s close)
        const speed = shouldBeOpen ? 3.5 : 2.0;
        let newProgress = prev.lidOpenProgress;

        if (newProgress < targetProgress) {
          newProgress = Math.min(targetProgress, newProgress + dt * speed);
        } else if (newProgress > targetProgress) {
          newProgress = Math.max(targetProgress, newProgress - dt * speed);
        }

        const servoAngle = newProgress * 90;
        const servoPwm = Math.round(1000 + newProgress * 1000);

        let lidState: BehaviorSimulationState['lidState'] = 'closed';
        if (newProgress >= 0.98) {
          lidState = 'open';
        } else if (newProgress <= 0.02) {
          lidState = 'closed';
        } else if (shouldBeOpen) {
          lidState = 'opening';
        } else {
          lidState = 'closing';
        }

        return {
          ...prev,
          isTriggered,
          triggerTimerSeconds: newTimer,
          lidOpenProgress: newProgress,
          servoAngleDegrees: servoAngle,
          servoPwmMicroseconds: servoPwm,
          lidState,
        };
      });

      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, []);

  // Step Auto-Play timer
  useEffect(() => {
    if (!isPlaying) return;

    const intervalMs = Math.round(8000 / playbackSpeed);
    const timer = setInterval(() => {
      setCurrentStepIndex((prev) => {
        if (prev < steps.length - 1) {
          // Auto-mark completed when advancing
          setCompletedStepIndices((done) =>
            done.includes(prev) ? done : [...done, prev]
          );
          return prev + 1;
        } else {
          setIsPlaying(false);
          return prev;
        }
      });
    }, intervalMs);

    return () => clearInterval(timer);
  }, [isPlaying, playbackSpeed, steps.length]);

  // Handlers for steps navigation
  const handleSelectStep = useCallback((idx: number) => {
    setIsPlaying(false);
    setCurrentStepIndex(idx);
  }, []);

  const handlePrevStep = useCallback(() => {
    setIsPlaying(false);
    setCurrentStepIndex((prev) => Math.max(0, prev - 1));
  }, []);

  const handleNextStep = useCallback(() => {
    setIsPlaying(false);
    setCurrentStepIndex((prev) => {
      const next = Math.min(steps.length - 1, prev + 1);
      setCompletedStepIndices((done) =>
        done.includes(prev) ? done : [...done, prev]
      );
      return next;
    });
  }, [steps.length]);

  const handleTogglePlay = useCallback(() => {
    setIsPlaying((prev) => !prev);
  }, []);

  const handleToggleSpeed = useCallback(() => {
    setPlaybackSpeed((prev) => {
      if (prev === 1) return 1.5;
      if (prev === 1.5) return 2;
      return 1;
    });
  }, []);

  const handleReplayStep = useCallback(() => {
    setIsPlaying(false);
    setActiveCameraPreset(currentStep.cameraPreset);
    setCameraPosition(currentStep.cameraPosition);
    setCameraTarget(currentStep.cameraTarget);
  }, [currentStep]);

  const handleToggleStepCompleted = useCallback((idx: number) => {
    setCompletedStepIndices((prev) =>
      prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx]
    );
  }, []);

  // Camera preset selection
  const handleSelectCameraPreset = useCallback(
    (preset: CameraPreset) => {
      setActiveCameraPreset(preset);
      switch (preset) {
        case 'overview':
          setCameraPosition([7, 7, 7]);
          setCameraTarget([-0.5, 1.5, 0]);
          break;
        case 'power-rails':
          setCameraPosition([3.5, 4.5, -2]);
          setCameraTarget([1.2, 0.4, -1]);
          break;
        case 'servo-mount':
          setCameraPosition([-1, 6.5, -5]);
          setCameraTarget([-3.5, 4.5, -1.5]);
          break;
        case 'sensor-front':
          setCameraPosition([-1, 4.5, 6.5]);
          setCameraTarget([-3.8, 3.2, 3]);
          break;
        case 'linkage':
          setCameraPosition([-5, 6.8, -2]);
          setCameraTarget([-3.8, 4.8, 0]);
          break;
        case 'simulation':
          setCameraPosition([4, 6.5, 6.5]);
          setCameraTarget([-2.5, 2.5, 1]);
          break;
      }
    },
    []
  );

  // Viewport Expansion & Fullscreen Toggle
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  // Keyboard Shortcuts for 3D Studio
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNextStep();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrevStep();
      } else if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        handleTogglePlay();
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        handleReplayStep();
      } else if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        setIsExpanded((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNextStep, handlePrevStep, handleTogglePlay, handleReplayStep]);

  // Simulation controls
  const handleDistanceChange = useCallback((distanceCm: number) => {
    setSimulationState((prev) => ({
      ...prev,
      obstacleDistanceCm: distanceCm,
    }));
  }, []);

  const handleApproachHand = useCallback(() => {
    setSimulationState((prev) => ({
      ...prev,
      obstacleDistanceCm: 10.0,
    }));
  }, []);

  const handleRetractHand = useCallback(() => {
    setSimulationState((prev) => ({
      ...prev,
      obstacleDistanceCm: 40.0,
    }));
  }, []);

  const handlePassByWave = useCallback(() => {
    setSimulationState((prev) => ({
      ...prev,
      obstacleDistanceCm: 8.0,
    }));
    setTimeout(() => {
      setSimulationState((prev) => ({
        ...prev,
        obstacleDistanceCm: 35.0,
      }));
    }, 1200);
  }, []);

  const handleResetSimulation = useCallback(() => {
    setSimulationState({
      obstacleDistanceCm: 25.0,
      isHandApproaching: false,
      lidState: 'closed',
      lidOpenProgress: 0,
      servoAngleDegrees: 0,
      servoPwmMicroseconds: 1000,
      isTriggered: false,
      triggerTimerSeconds: 0,
      sensorPingWave: 0,
      isSimulating: true,
    });
  }, []);

  // Selected component for inspector panel
  const selectedComponentSpec = useMemo(() => {
    if (!selectedComponentId) return null;
    return SMART_DUSTBIN_COMPONENTS.find((c) => c.id === selectedComponentId) || null;
  }, [selectedComponentId]);

  // Connected wires for hovered pin
  const connectedWiresForPin = useMemo(() => {
    if (!hoveredPin && !selectedPin) return [];
    const pin = hoveredPin || selectedPin;
    return SMART_DUSTBIN_WIRES.filter(
      (w) => w.fromPinId === pin?.id || w.toPinId === pin?.id
    );
  }, [hoveredPin, selectedPin]);

  // Check if user has previously completed steps
  const hasSavedProgress = completedStepIndices.length > 0;

  // Unsupported project screen (ensures unsupported projects do not show misleading Smart Dustbin guide)
  if (!isSupportedProject) {
    return (
      <div className="space-y-6 pb-12">
        <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-2xs space-y-6 text-center max-w-2xl mx-auto my-8">
          <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto border border-amber-200">
            <Wrench className="w-7 h-7" />
          </div>

          <div className="space-y-2">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
              3D Interactive Guide In Development
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-[#132B3B]">
              3D Studio: {project.name}
            </h1>
            <p className="text-sm text-slate-600 leading-relaxed">
              Interactive 3D assembly models and expected behavior preview are currently available for the <strong>Smart Dustbin (Touchless Lid Opener)</strong> recipe. Interactive 3D guides for <em>{project.name}</em> are coming in a future update.
            </p>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-left space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Project Summary & Hardware:
            </h4>
            <p className="text-xs text-slate-700">{project.description}</p>
            <div className="text-xs text-slate-600 font-mono">
              Requirements: {project.requirements.length} components · {project.difficulty} difficulty
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              onClick={() => {
                if (workspaceId) {
                  setLocation(`/workspaces/${workspaceId}`);
                } else {
                  setLocation(`/projects/${project.id}`);
                }
              }}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{workspaceId ? 'Back to Workspace' : 'Back to Project Details'}</span>
            </button>

            <button
              onClick={() => setLocation('/studio?project=proj-smart-dustbin')}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#087F83] hover:bg-[#066366] text-xs font-semibold text-white shadow-xs transition-colors cursor-pointer"
            >
              <Wrench className="w-4 h-4" />
              <span>Open Smart Dustbin 3D Guide</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Studio Header Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (workspaceId) {
                    setLocation(`/workspaces/${workspaceId}`);
                  } else {
                    setLocation(`/projects/${project.id}`);
                  }
                }}
                className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-900 transition-colors cursor-pointer mr-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>{workspaceId ? 'Back to Workspace' : 'Back to Project'}</span>
              </button>

              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#EAF4F3] text-[#087F83] border border-[#087F83]/20">
                <Wrench className="w-3 h-3 text-[#087F83]" />
                <span>Phase 3 Interactive 3D Studio</span>
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#132B3B]">
              3D Build Studio: {project.name}
            </h1>
            <p className="text-xs text-slate-600">
              Interactive 3D assembly and expected behavior preview powered by Three.js & WebGL. Rotate with left click, pan with right click, zoom with scroll.
            </p>
          </div>

          {/* Quick Action Badges */}
          <div className="flex items-center gap-2 self-start sm:self-center">
            <button
              onClick={() => setShowSimulatorPanel((prev) => !prev)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                showSimulatorPanel
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>{showSimulatorPanel ? 'Hide Behavior Preview' : 'Expected Behavior Preview'}</span>
            </button>

            <button
              onClick={() => {
                if (!activeUser.isDemo) {
                  FirestoreAdapter.resetGuideProgress(activeUser.id, project.id, recipeVersion).catch((err) => {
                    console.warn('[BuildStudio] Error resetting Firestore guide progress:', err);
                  });
                } else {
                  StorageService.resetGuideProgress(
                    activeUser.id,
                    project.id,
                    recipeVersion,
                    workspaceId
                  );
                }
                setCurrentStepIndex(0);
                setCompletedStepIndices([]);
                setIsPlaying(false);
              }}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors cursor-pointer"
              title="Reset Guide Progress"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Resume Progress Alert Banner */}
        {hasSavedProgress && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-900">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                <strong>Progress Resumed:</strong> You have completed{' '}
                {completedStepIndices.length} of {steps.length} build steps. Current: Step {currentStepIndex + 1} ({currentStep.shortName}).
              </span>
            </div>
            {!activeUser.isDemo ? (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-300">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                <span>Cloud Sync: eco-build-aa966</span>
              </span>
            ) : (
              <span className="text-[11px] text-slate-500 font-mono hidden sm:inline">
                Saved locally (Demo Mode)
              </span>
            )}
          </div>
        )}
      </div>

      {/* Main 3D Viewport & Interactive Stage */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* 3D Scene Viewport Canvas */}
        <div
          className={`${
            isExpanded ? 'lg:col-span-12 h-[680px] sm:h-[780px]' : 'lg:col-span-8 h-[520px] sm:h-[620px]'
          } bg-slate-900 rounded-2xl border border-slate-700/80 overflow-hidden shadow-lg relative transition-all duration-300`}
        >
          <StudioCanvas
            currentStep={currentStep}
            components={SMART_DUSTBIN_COMPONENTS}
            wires={SMART_DUSTBIN_WIRES}
            pins={SMART_DUSTBIN_PINS}
            simulationState={simulationState}
            selectedComponentId={selectedComponentId}
            highlightWireId={selectedWire?.id || hoveredWire?.id || null}
            cameraPosition={cameraPosition}
            cameraTarget={cameraTarget}
            onSelectComponent={(id) => setSelectedComponentId(id)}
            onHoverPin={(pin) => setHoveredPin(pin)}
            onSelectPin={(pin) => setSelectedPin(pin)}
            onHoverWire={(wire) => setHoveredWire(wire)}
            onSelectWire={(wire) => setSelectedWire(wire)}
            onDistanceChange={handleDistanceChange}
          />

          {/* Floating Pin Endpoint HUD Tooltip */}
          {(hoveredPin || selectedPin) && (
            <div className="absolute top-16 left-4 z-20 pointer-events-auto">
              <PinEndpointTooltip
                pin={hoveredPin || selectedPin!}
                connectedWires={connectedWiresForPin}
                onClose={() => {
                  setHoveredPin(null);
                  setSelectedPin(null);
                }}
              />
            </div>
          )}

          {/* Top Floating Viewport Control Toolbar */}
          <div className="absolute top-3 left-3 right-3 z-10 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
            {/* Quick Camera Preset Selector Pills */}
            <div className="flex items-center gap-1 bg-black/60 backdrop-blur-md p-1 rounded-xl border border-white/10 pointer-events-auto shadow-sm overflow-x-auto max-w-[calc(100%-120px)] sm:max-w-none">
              <Camera className="w-3.5 h-3.5 text-slate-400 mx-1 hidden sm:inline shrink-0" />
              {(
                [
                  { id: 'overview', label: 'Overview' },
                  { id: 'power-rails', label: 'Power Rails' },
                  { id: 'servo-mount', label: 'Servo' },
                  { id: 'sensor-front', label: 'Sonar' },
                  { id: 'linkage', label: 'Linkage' },
                  { id: 'simulation', label: 'Preview' },
                ] as const
              ).map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => handleSelectCameraPreset(preset.id)}
                  className={`px-2 py-1 text-[11px] font-semibold rounded-lg transition-colors cursor-pointer shrink-0 ${
                    activeCameraPreset === preset.id
                      ? 'bg-[#087F83] text-white shadow-xs'
                      : 'text-slate-300 hover:text-white hover:bg-white/10'
                  }`}
                  title={`Switch to ${preset.label} Camera`}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {/* Viewport Control Badges (Right side) */}
            <div className="flex items-center gap-1.5 pointer-events-auto">
              {simulationState.isTriggered && (
                <span className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-emerald-500 text-white shadow-md animate-pulse uppercase tracking-wider hidden sm:inline">
                  Triggered
                </span>
              )}

              <button
                onClick={handleReplayStep}
                className="p-1.5 rounded-lg bg-black/60 backdrop-blur-md text-slate-300 hover:text-white hover:bg-black/80 border border-white/10 transition-colors cursor-pointer"
                title="Reset Camera Preset (R)"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => setIsExpanded((prev) => !prev)}
                className="p-1.5 rounded-lg bg-black/60 backdrop-blur-md text-slate-300 hover:text-white hover:bg-black/80 border border-white/10 transition-colors cursor-pointer"
                title={isExpanded ? 'Collapse Viewport (F)' : 'Expand Viewport (F)'}
              >
                {isExpanded ? (
                  <Minimize2 className="w-3.5 h-3.5" />
                ) : (
                  <Maximize2 className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>

          {/* Canvas Bottom Instruction Hint */}
          <div className="absolute bottom-3 left-4 right-4 z-10 flex items-center justify-between text-[11px] text-slate-400 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10 pointer-events-none">
            <span>Click any component or pin to inspect details. Left drag to rotate, right drag to pan, wheel to zoom.</span>
            <span className="hidden sm:inline font-mono text-[10px] text-slate-400">
              Shortcuts: [←/→] Steps · [Space] Tour · [R] Reset · [F] Expand
            </span>
          </div>
        </div>

        {/* Right-Hand Control & Inspector Column */}
        <div className={`${isExpanded ? 'lg:col-span-12' : 'lg:col-span-4'} space-y-4`}>
          {/* Component Inspector Panel (If selected) */}
          {selectedComponentSpec ? (
            <ComponentInspectorPanel
              component={selectedComponentSpec}
              selectedPin={selectedPin}
              userInventory={inventory}
              onClose={() => setSelectedComponentId(null)}
              onOpenPassport={(item) => setInspectedPassportItem(item)}
            />
          ) : showSimulatorPanel ? (
            /* Behavior Simulator Panel */
            <BehaviorSimulatorPanel
              simulationState={simulationState}
              onDistanceChange={handleDistanceChange}
              onApproachHand={handleApproachHand}
              onRetractHand={handleRetractHand}
              onPassByWave={handlePassByWave}
              onResetSimulation={handleResetSimulation}
            />
          ) : (
            /* Bench Parts Manifest Card */
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-[#EAF4F3] text-[#087F83]">
                    <Layers className="w-4 h-4" />
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-[#132B3B]">
                      Bench Parts Manifest
                    </h3>
                    <span className="text-[11px] text-slate-500">
                      Recipe parts matched against your inventory
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                {SMART_DUSTBIN_COMPONENTS.filter((c) => c.id !== 'comp-dustbin').map((comp) => {
                  const owned = inventory.find((i) => i.catalogId === comp.catalogId);

                  return (
                    <div
                      key={comp.id}
                      onClick={() => setSelectedComponentId(comp.id)}
                      className="p-2.5 bg-slate-50 hover:bg-[#EAF4F3]/60 rounded-xl border border-slate-200/80 transition-colors cursor-pointer flex items-center justify-between gap-3"
                    >
                      <div className="space-y-0.5">
                        <div className="text-xs font-bold text-[#132B3B]">
                          {comp.name}
                        </div>
                        <span className="text-[10px] text-slate-400 capitalize">
                          {comp.category}
                        </span>
                      </div>

                      {owned ? (
                        <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 shrink-0">
                          {owned.totalQuantity} in stock
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 shrink-0">
                          Missing
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-xs text-slate-600 flex items-start gap-2">
                <Info className="w-4 h-4 text-[#087F83] shrink-0 mt-0.5" />
                <span>
                  Select any component in the 3D scene or from this list to inspect detailed pinouts, operating voltage, and your verified passport status.
                </span>
              </div>
            </div>
          )}

          {/* Quick toggle between Manifest and Simulator */}
          {!selectedComponentSpec && (
            <div className="flex items-center justify-between text-xs px-1">
              <button
                onClick={() => setShowSimulatorPanel(false)}
                className={`font-semibold hover:underline cursor-pointer ${
                  !showSimulatorPanel ? 'text-[#087F83]' : 'text-slate-500'
                }`}
              >
                ← View Components Manifest
              </button>
              <button
                onClick={() => setShowSimulatorPanel(true)}
                className={`font-semibold hover:underline cursor-pointer ${
                  showSimulatorPanel ? 'text-[#087F83]' : 'text-slate-500'
                }`}
              >
                Open Behavior Preview →
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Assembly Step Player & Controls */}
      <StepPlayerControls
        steps={steps}
        currentStepIndex={currentStepIndex}
        completedStepIndices={completedStepIndices}
        isPlaying={isPlaying}
        playbackSpeed={playbackSpeed}
        activeCameraPreset={activeCameraPreset}
        onSelectStep={handleSelectStep}
        onPrevStep={handlePrevStep}
        onNextStep={handleNextStep}
        onTogglePlay={handleTogglePlay}
        onToggleSpeed={handleToggleSpeed}
        onReplayStep={handleReplayStep}
        onToggleStepCompleted={handleToggleStepCompleted}
        onSelectCameraPreset={handleSelectCameraPreset}
        onAskMentorAboutStep={(step) => {
          if (onAskMentor) {
            onAskMentor(
              project.id,
              workspaceId,
              `I need guidance on Step ${step.stepNumber} (${step.title}): `,
              `Build Studio - Step ${step.stepNumber}: ${step.shortName}`
            );
          }
        }}
      />

      {/* Component Passport Modal */}
      {inspectedPassportItem && (
        <ComponentPassportModal
          isOpen={Boolean(inspectedPassportItem)}
          onClose={() => setInspectedPassportItem(null)}
          item={inspectedPassportItem}
        />
      )}
    </div>
  );
}
