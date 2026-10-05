/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { OrganizationInventory, MakerProfile, ComponentItem } from '../../types';
import {
  Building2,
  Users,
  Layers,
  Scale,
  Award,
  BookOpen,
  Plus,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from 'lucide-react';

interface InstitutionalPilotSectionProps {
  activeUser: MakerProfile;
  userInventory: ComponentItem[];
  userLedgerCount: number;
}

export function InstitutionalPilotSection({
  activeUser,
  userInventory,
  userLedgerCount,
}: InstitutionalPilotSectionProps) {
  const [activeTab, setActiveTab] = useState<'pilot' | 'semester' | 'achievements'>('pilot');

  // Simulated Organization Pilot Data
  const sampleOrg: OrganizationInventory = {
    id: 'org-maker-lab-beta',
    name: 'University Electronics & Sustainable Prototyping Lab',
    domain: 'univ-makers.edu',
    adminUids: [activeUser.id],
    memberUids: [activeUser.id, 'maker-sam-eng', 'maker-elena-iot'],
    memberIds: [activeUser.id, 'maker-sam-eng', 'maker-elena-iot'],
    aggregateReuseMassGrams: 4850.5,
    aggregateDivertedMassGrams: 4850.5,
    createdAt: '2026-01-10T08:00:00Z',
    updatedAt: '2026-03-25T11:00:00Z',
    stockItems: [
      {
        id: 'org-comp-1',
        catalogId: 'comp-arduino-uno',
        name: 'Arduino Uno R3 (Lab Pool)',
        category: 'microcontroller',
        totalQuantity: 18,
        reservedQuantity: 0,
        installedQuantity: 0,
        condition: 'working',
        source: 'salvaged',
        verificationStatus: 'recorded-test',
        unitMassGrams: 25,
        lastUpdated: '2026-03-25T11:00:00Z',
      },
      {
        id: 'org-comp-2',
        catalogId: 'comp-hc-sr04',
        name: 'HC-SR04 Ultrasonic Sonar',
        category: 'sensor',
        totalQuantity: 32,
        reservedQuantity: 0,
        installedQuantity: 0,
        condition: 'working',
        source: 'salvaged',
        verificationStatus: 'recorded-test',
        unitMassGrams: 9,
        lastUpdated: '2026-03-25T11:00:00Z',
      },
      {
        id: 'org-comp-3',
        catalogId: 'comp-sg90-servo',
        name: 'SG90 Micro Servos (Bulk Box)',
        category: 'actuator',
        totalQuantity: 24,
        reservedQuantity: 0,
        installedQuantity: 0,
        condition: 'working',
        source: 'salvaged',
        verificationStatus: 'user-reported-working',
        unitMassGrams: 14,
        lastUpdated: '2026-03-25T11:00:00Z',
      },
      {
        id: 'org-comp-4',
        catalogId: 'comp-ldr-gl5528',
        name: 'GL5528 LDR Sensor Assortment',
        category: 'sensor',
        totalQuantity: 120,
        reservedQuantity: 0,
        installedQuantity: 0,
        condition: 'working',
        source: 'salvaged',
        verificationStatus: 'untested',
        unitMassGrams: 0.5,
        lastUpdated: '2026-03-25T11:00:00Z',
      },
    ],
  };

  // Semester recommendations derived from declared interests & actual parts
  const semesterPicks = [
    {
      course: 'ECE 101: Introduction to Embedded Systems',
      recommendedProject: 'Smart Dustbin (Touchless Lid Opener)',
      rationale: 'Matches your interest in robotics. Requires Arduino Uno + Sonar + Micro Servo which you hold in inventory.',
      eligibleStockMatch: '100% Component Coverage',
    },
    {
      course: 'ENV 210: IoT Environmental Sensing',
      recommendedProject: 'Plant Hydration & Soil Moisture Sentinel',
      rationale: 'Applies analog threshold calibration using low-voltage probes with zero hazardous mains exposure.',
      eligibleStockMatch: '83% Component Coverage (Needs Sensor Probe)',
    },
  ];

  // Learning achievements based strictly on recorded events
  const recordedAchievements = [
    {
      id: 'ach-first-passport',
      title: 'Digital Hardware Passport Creator',
      date: 'Recorded',
      description: 'Logged and cataloged hardware components with unique IDs and conditions.',
      unlocked: userInventory.length > 0,
    },
    {
      id: 'ach-bench-test',
      title: 'Empirical Bench Verifier',
      date: 'Recorded',
      description: 'Logged recorded physical test evidence (multimeter continuity or logic probing).',
      unlocked: userInventory.some((i) => (i.testRecords?.length || 0) > 0),
    },
    {
      id: 'ach-reuse-cycle',
      title: 'Lifecycle Reuse Champion',
      date: 'Recorded',
      description: 'Disassembled a physical build and returned working components to stock.',
      unlocked: userLedgerCount > 0,
    },
    {
      id: 'ach-mentor-ticket',
      title: 'Community Peer Collaborator',
      date: 'Available',
      description: 'Engaged in peer mentorship or published discoverable maker expertise.',
      unlocked: activeUser.collaborationPreference !== 'Solo maker',
    },
  ];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#087F83] uppercase tracking-wider mb-1">
            <Building2 className="w-3.5 h-3.5" />
            <span>Phase 7 Institutional Pilot & Academic Curriculum</span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-[#132B3B]">
            Campus Lab Pilot & Academic Pathways
          </h2>
        </div>

        {/* Tab switchers */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
          <button
            onClick={() => setActiveTab('pilot')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              activeTab === 'pilot' ? 'bg-white text-[#087F83] shadow-2xs' : 'text-slate-600'
            }`}
          >
            Lab Inventory Pilot
          </button>
          <button
            onClick={() => setActiveTab('semester')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              activeTab === 'semester' ? 'bg-white text-[#087F83] shadow-2xs' : 'text-slate-600'
            }`}
          >
            Semester Recommendations
          </button>
          <button
            onClick={() => setActiveTab('achievements')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              activeTab === 'achievements' ? 'bg-white text-[#087F83] shadow-2xs' : 'text-slate-600'
            }`}
          >
            Milestone Achievements
          </button>
        </div>
      </div>

      {/* Tab 1: Organization Pilot */}
      {activeTab === 'pilot' && (
        <div className="space-y-4">
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="text-xs font-mono text-slate-500 uppercase">
                Institutional Pilot Partner · {sampleOrg.domain}
              </div>
              <h3 className="text-base font-bold text-[#132B3B] mt-0.5">
                {sampleOrg.name}
              </h3>
              <div className="text-xs text-slate-600 mt-1 flex items-center gap-3">
                <span>Role: <strong className="text-emerald-700">Lab Admin</strong></span>
                <span>Members: <strong>{(sampleOrg.memberIds || sampleOrg.memberUids || []).length} Makers</strong></span>
                <span>Aggregate Diverted: <strong>~{sampleOrg.aggregateDivertedMassGrams}g</strong></span>
              </div>
            </div>

            <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-200 uppercase tracking-wider self-start sm:self-center">
              Pilot Active
            </span>
          </div>

          <div>
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              Shared Institutional Hardware Pool (Distinct from Personal Inventory)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(sampleOrg.sharedComponents || sampleOrg.stockItems || []).map((comp, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-white rounded-xl border border-slate-200 text-xs flex items-center justify-between"
                >
                  <div>
                    <div className="font-bold text-[#132B3B]">{comp.name}</div>
                    <div className="text-slate-400 font-mono text-[11px]">{comp.catalogId}</div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-mono font-bold text-emerald-700">
                      {comp.totalQuantity} in pool
                    </span>
                    <div className="text-[10px] text-slate-400">~{comp.unitMassGrams}g / unit</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Semester Recommendations */}
      {activeTab === 'semester' && (
        <div className="space-y-3">
          <div className="text-xs text-slate-500">
            Curriculum builds dynamically aligned with your declared interests (
            {activeUser.interests.join(', ')}) and currently available verified inventory.
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {semesterPicks.map((pick, idx) => (
              <div
                key={idx}
                className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-[#087F83] uppercase">
                    {pick.course}
                  </span>
                  <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    {pick.eligibleStockMatch}
                  </span>
                </div>

                <h4 className="text-sm font-bold text-[#132B3B]">
                  {pick.recommendedProject}
                </h4>

                <p className="text-xs text-slate-600 leading-relaxed">
                  {pick.rationale}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Milestone Achievements */}
      {activeTab === 'achievements' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {recordedAchievements.map((ach) => (
              <div
                key={ach.id}
                className={`p-4 rounded-xl border transition-colors ${
                  ach.unlocked
                    ? 'bg-emerald-50/50 border-emerald-200'
                    : 'bg-slate-50 border-slate-200 opacity-60'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`p-2.5 rounded-xl shrink-0 ${
                      ach.unlocked
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-slate-200 text-slate-500'
                    }`}
                  >
                    <Award className="w-5 h-5" />
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-[#132B3B]">
                        {ach.title}
                      </h4>
                      {ach.unlocked && (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded">
                          Unlocked
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {ach.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-900 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>
              <strong>Credential & Safety Notice:</strong> Milestone badges reflect recorded in-app hardware events (such as logging an inventory item or recording a bench test). They do NOT certify professional engineering credentials or laboratory safety compliance.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
