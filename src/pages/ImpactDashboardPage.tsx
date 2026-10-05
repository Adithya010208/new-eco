/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Activity,
  Scale,
  RotateCcw,
  Wrench,
  Cpu,
  Share2,
  Users,
  ShieldCheck,
  Leaf,
  Info,
  ExternalLink,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { ReuseLedgerEntry, EcoPointTransaction, ComponentExchangeListing, ComponentItem } from '../types';
import { StorageService } from '../services/storageService';
import { AppMode } from '../contexts/AuthContext';

interface ImpactDashboardPageProps {
  ledgerEntries?: ReuseLedgerEntry[];
  mode?: AppMode;
  inventory?: ComponentItem[];
  userLedgerCount?: number;
}

export function ImpactDashboardPage({
  ledgerEntries: propLedgerEntries,
  mode = 'demo',
  inventory = [],
}: ImpactDashboardPageProps) {
  const { t } = useTranslation();

  const [ledger, setLedger] = useState<ReuseLedgerEntry[]>([]);
  const [ecoTransactions, setEcoTransactions] = useState<EcoPointTransaction[]>([]);
  const [exchangeListings, setExchangeListings] = useState<ComponentExchangeListing[]>([]);

  useEffect(() => {
    if (mode === 'account' && propLedgerEntries && propLedgerEntries.length > 0) {
      setLedger(propLedgerEntries);
    } else {
      setLedger(StorageService.getReuseLedger());
    }
    setEcoTransactions(StorageService.getEcoPointTransactions());
    setExchangeListings(StorageService.getExchangeListings());

    const handleUpdate = () => {
      setLedger(StorageService.getReuseLedger());
      setEcoTransactions(StorageService.getEcoPointTransactions());
      setExchangeListings(StorageService.getExchangeListings());
    };

    window.addEventListener('storage', handleUpdate);
    return () => window.removeEventListener('storage', handleUpdate);
  }, [mode, propLedgerEntries]);

  // Calculated Real Physical Metrics
  const metrics = useMemo(() => {
    // 1. Total Reused Hardware Mass (grams)
    const totalMassGrams = ledger.reduce((sum, e) => sum + (e.unitMassGrams || 0), 0);

    // 2. Physical Builds
    const physicalBuilds = ledger.filter((e) => e.action === 'physical-build').length;

    // 3. Documented Reuse Cycles
    const reuseCycles = ledger.filter((e) => e.action === 'disassembly-reclaim').length;

    // 4. Components Reused (allocated across builds)
    const componentsReused = ledger.reduce(
      (sum, e) => sum + (e.allocatedItems || []).reduce((acc, i) => acc + (i.quantity || 1), 0),
      0
    );

    // 5. Total Eco Points across community
    const totalEcoPoints = ecoTransactions.reduce((sum, t) => sum + (t.points || 0), 0);

    // 6. Shared / Exchanged Listings
    const sharedComponentsCount = exchangeListings.length;
    const completedExchangesCount = exchangeListings.filter((l) => l.status === 'completed').length;

    return {
      totalMassGrams,
      physicalBuilds,
      reuseCycles,
      componentsReused,
      totalEcoPoints,
      sharedComponentsCount,
      completedExchangesCount,
    };
  }, [ledger, ecoTransactions, exchangeListings]);

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-16">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#132B3B] via-[#0D4B59] to-[#087F83] text-white p-6 sm:p-8 rounded-2xl shadow-sm">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/10 text-emerald-200 text-xs font-semibold backdrop-blur-xs">
            <Activity className="w-3.5 h-3.5" />
            <span>Empirical Hardware Accounting</span>
          </div>
          <h1 className="text-white text-2xl sm:text-3xl font-bold tracking-tight">
            {t('impact.title', 'Hardware Impact & Circular Ledger')}
          </h1>
          <p className="text-xs sm:text-sm text-slate-200 max-w-2xl leading-relaxed">
            {t(
              'impact.subtitle',
              'Transparent, empirically verified hardware diversion accounting. Real grams salvaged, never simulated carbon offsets.'
            )}
          </p>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Hardware Mass */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">
              {t('impact.divertedMass', 'Salvaged Mass')}
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <Scale className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-bold tabular-nums text-[#132B3B]">
              {metrics.totalMassGrams >= 1000
                ? (metrics.totalMassGrams / 1000).toFixed(2)
                : metrics.totalMassGrams}
            </span>
            <span className="text-xs font-semibold text-slate-500">
              {metrics.totalMassGrams >= 1000 ? 'kg' : 'grams'}
            </span>
          </div>
          <p className="text-[11px] text-slate-500">
            Recorded hardware mass allocated to reuse events.
          </p>
        </div>

        {/* Metric 2: Reuse Cycles */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">
              {t('impact.totalCycles', 'Reuse Loops')}
            </span>
            <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center">
              <RotateCcw className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-bold tabular-nums text-[#132B3B]">
              {metrics.reuseCycles}
            </span>
            <span className="text-xs font-semibold text-slate-500">cycles</span>
          </div>
          <p className="text-[11px] text-slate-500">
            Prototypes safely disassembled and parts returned to working inventory stock.
          </p>
        </div>

        {/* Metric 3: Physical Builds */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">
              {t('impact.physicalBuilds', 'Physical Builds')}
            </span>
            <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-700 flex items-center justify-center">
              <Wrench className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-bold tabular-nums text-[#132B3B]">
              {metrics.physicalBuilds}
            </span>
            <span className="text-xs font-semibold text-slate-500">verified</span>
          </div>
          <p className="text-[11px] text-slate-500">
            Circuits physically wired on breadboards with allocated hardware components.
          </p>
        </div>

        {/* Metric 4: Verified Eco Points */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">
              {t('common.ecoPoints', 'Eco Points')}
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
              <Leaf className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-bold tabular-nums text-[#087F83]">
              {metrics.totalEcoPoints}
            </span>
            <span className="text-xs font-semibold text-slate-500">awarded</span>
          </div>
          <p className="text-[11px] text-slate-500">
            Verified platform points awarded strictly for verified circular hardware actions.
          </p>
        </div>
      </div>

      {/* Secondary Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-white border border-slate-200 text-[#087F83]">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <div className="text-base font-bold font-mono text-[#132B3B]">
              {metrics.componentsReused}
            </div>
            <div className="text-xs text-slate-500">Parts Maintained in Circulation</div>
          </div>
        </div>

        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-white border border-slate-200 text-teal-700">
            <Share2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-base font-bold font-mono text-[#132B3B]">
              {metrics.sharedComponentsCount}
            </div>
            <div className="text-xs text-slate-500">Surplus Exchange Listings</div>
          </div>
        </div>

        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-white border border-slate-200 text-sky-700">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="text-base font-bold font-mono text-[#132B3B]">
              {metrics.completedExchangesCount}
            </div>
            <div className="text-xs text-slate-500">Verified Peer Handoffs</div>
          </div>
        </div>
      </div>

      {/* Environmental Honesty & Measurement Integrity Card */}
      <div className="p-5 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-3">
        <div className="flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
          <div className="space-y-1 text-xs text-slate-700">
            <h4 className="font-bold text-[#132B3B] text-sm">
              {t('impact.auditDisclaimerTitle', 'Physical Measurement Integrity')}
            </h4>
            <p className="leading-relaxed">
              {t(
                'impact.auditDisclaimer',
                'EcoBuild tracks verified component mass (grams) and lifecycle transitions. We deliberately do not present speculative carbon offset credits without a certified third-party Lifecycle Assessment (LCA).'
              )}
            </p>
          </div>
        </div>

        {/* Future Capability: Certified LCA Integration */}
        <div className="pt-3 border-t border-emerald-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-emerald-900 font-medium">
            <Sparkles className="w-4 h-4 text-emerald-600" />
            <span>Future Capability: ISO 14044 Certified Electronics Carbon LCA Integration</span>
          </div>
          <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300 w-fit">
            Academic Research Track
          </span>
        </div>
      </div>

      {/* Live Reuse Ledger Activity Stream */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-[#132B3B]">
              {t('impact.recentActivity', 'Live Reuse Ledger Activity')}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Append-only audit log of recorded physical builds and disassembly cycles.
            </p>
          </div>
          <span className="text-xs font-mono text-slate-400">
            {ledger.length} events logged
          </span>
        </div>

        {ledger.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            No reuse ledger events recorded yet. Complete builds in 3D studio or record disassembly to log activity.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {ledger.map((entry) => (
              <div key={entry.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        entry.action === 'disassembly-reclaim'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {entry.action === 'disassembly-reclaim' ? 'Disassembly & Reclaim' : 'Physical Assembly'}
                    </span>
                    <span className="font-bold text-[#132B3B]">{entry.projectName || 'Workbench Project'}</span>
                  </div>
                  <p className="text-slate-500 text-[11px]">{entry.notes || 'Hardware verified on workbench.'}</p>
                  {(entry.allocatedItems || []).length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {entry.allocatedItems!.map((item, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 text-[10px] bg-slate-100 text-slate-600 rounded font-mono"
                        >
                          {item.quantity}x {item.catalogId}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="text-left sm:text-right shrink-0">
                  <div className="font-mono font-bold text-[#087F83]">
                    +{entry.unitMassGrams || 0}g diverted
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    {new Date(entry.timestamp).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
