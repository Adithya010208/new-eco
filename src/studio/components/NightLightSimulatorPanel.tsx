/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  Activity,
  Sliders,
  Sun,
  Moon,
  RotateCcw,
  CheckCircle2,
  Info,
  Zap,
} from 'lucide-react';

interface NightLightSimulatorPanelProps {
  ambientLightPercent: number;
  onAmbientLightChange: (percent: number) => void;
  onResetSimulation: () => void;
}

export function NightLightSimulatorPanel({
  ambientLightPercent,
  onAmbientLightChange,
  onResetSimulation,
}: NightLightSimulatorPanelProps) {
  // LDR resistance curves inversely: 0% light -> ~1000k (1M), 100% light -> ~10k
  const rLdrKOhms = Math.round(10 + (1000 - 10) * Math.pow((100 - ambientLightPercent) / 100, 2));
  // Voltage divider: 5V * (10k / (R_ldr + 10k))
  const voltageA0 = Math.round((5.0 * (10 / (rLdrKOhms + 10))) * 100) / 100;
  // ADC counts (0 - 1023)
  const adcReading = Math.round((voltageA0 / 5.0) * 1023);

  // Night light threshold: Turn ON if ADC < 450 (darkness), Turn OFF if ADC > 550 (daylight)
  const isDarkTriggered = ambientLightPercent < 40;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-md p-5 space-y-4 max-w-md w-full animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-emerald-100 text-emerald-900">
            <Activity className="w-4 h-4" />
          </span>
          <div>
            <h3 className="text-sm font-bold text-[#132B3B]">
              Expected Behavior Preview: Night Light
            </h3>
            <span className="text-[11px] text-slate-500">
              Simulate ambient room lux and observe automatic LED switching
            </span>
          </div>
        </div>

        <button
          onClick={onResetSimulation}
          className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg transition-colors cursor-pointer"
          title="Reset Simulation"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Primary Status Banner */}
      <div
        className={`p-3.5 rounded-xl border flex items-center justify-between transition-colors ${
          isDarkTriggered
            ? 'bg-amber-50 border-amber-200 text-amber-900'
            : 'bg-emerald-50 border-emerald-200 text-emerald-900'
        }`}
      >
        <div className="flex items-center gap-2.5">
          {isDarkTriggered ? (
            <Moon className="w-5 h-5 text-amber-600 animate-pulse" />
          ) : (
            <Sun className="w-5 h-5 text-emerald-600" />
          )}
          <div>
            <div className="text-xs font-bold">
              {isDarkTriggered ? 'DARKNESS DETECTED: LED ON' : 'DAYLIGHT DETECTED: LED OFF'}
            </div>
            <div className="text-[11px] opacity-80">
              {isDarkTriggered
                ? 'Microcontroller Pin D9 output drives HIGH (5V, ~14mA)'
                : 'Microcontroller Pin D9 output drives LOW (0V, 0mA)'}
            </div>
          </div>
        </div>

        <span
          className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase tracking-wider ${
            isDarkTriggered
              ? 'bg-amber-200 text-amber-900'
              : 'bg-emerald-200 text-emerald-900'
          }`}
        >
          {isDarkTriggered ? 'Illuminating' : 'Standby'}
        </span>
      </div>

      {/* Interactive Ambient Light Slider */}
      <div className="space-y-2 bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
        <div className="flex items-center justify-between text-xs">
          <label className="font-semibold text-slate-700 flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-[#087F83]" />
            <span>Ambient Room Illumination:</span>
          </label>
          <span className="font-mono font-bold text-[#132B3B]">
            {ambientLightPercent}% Lux
          </span>
        </div>

        <input
          type="range"
          min="0"
          max="100"
          step="1"
          value={ambientLightPercent}
          onChange={(e) => onAmbientLightChange(parseInt(e.target.value, 10))}
          className="w-full accent-[#087F83] cursor-pointer"
        />

        <div className="flex justify-between text-[10px] text-slate-400 font-mono">
          <span>0% (Pitch Dark)</span>
          <span className="text-amber-600 font-bold">Threshold ~40%</span>
          <span>100% (Direct Sunlight)</span>
        </div>
      </div>

      {/* Live Circuit Telemetry Readings */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
          <div className="text-[10px] text-slate-500 uppercase font-semibold">LDR Resistance</div>
          <div className="font-mono text-xs font-bold text-[#132B3B] mt-0.5">
            {rLdrKOhms} kΩ
          </div>
        </div>

        <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
          <div className="text-[10px] text-slate-500 uppercase font-semibold">A0 Divider Voltage</div>
          <div className="font-mono text-xs font-bold text-[#132B3B] mt-0.5">
            {voltageA0} V
          </div>
        </div>

        <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
          <div className="text-[10px] text-slate-500 uppercase font-semibold">ADC Counts</div>
          <div className="font-mono text-xs font-bold text-[#132B3B] mt-0.5">
            {adcReading} / 1023
          </div>
        </div>
      </div>

      {/* Quick Scenario Preset Buttons */}
      <div className="space-y-1.5">
        <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
          Quick Simulation Presets:
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => onAmbientLightChange(10)}
            className="px-2.5 py-1.5 text-xs font-medium bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5"
          >
            <Moon className="w-3.5 h-3.5 text-amber-600" />
            <span>Night Room (10%)</span>
          </button>

          <button
            onClick={() => onAmbientLightChange(85)}
            className="px-2.5 py-1.5 text-xs font-medium bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5"
          >
            <Sun className="w-3.5 h-3.5 text-emerald-600" />
            <span>Daylight (85%)</span>
          </button>
        </div>
      </div>

      {/* Electrical Note */}
      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-[11px] text-slate-600 space-y-1">
        <div className="flex items-center gap-1 font-bold text-slate-700">
          <Zap className="w-3.5 h-3.5 text-amber-500" />
          <span>Low-Voltage Logic Protection:</span>
        </div>
        <p className="leading-relaxed">
          The 220Ω resistor limits LED forward current to ~14mA, preventing thermal damage to the ATmega328P output driver pin while delivering bright illumination.
        </p>
      </div>
    </div>
  );
}
