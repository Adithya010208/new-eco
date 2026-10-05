/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { ReuseLedgerEntry, ComponentItem } from '../../types';
import {
  Activity,
  Download,
  Plus,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Scale,
  Layers,
  Wrench,
  Trash2,
  Calendar,
  FileSpreadsheet,
} from 'lucide-react';

interface HardwareReuseLedgerModalProps {
  isOpen: boolean;
  onClose: () => void;
  ledgerEntries: ReuseLedgerEntry[];
  inventory: ComponentItem[];
  onRecordPhysicalBuild: (entry: Omit<ReuseLedgerEntry, 'id' | 'timestamp'>) => void;
  onRecordDisassembly: (entry: Omit<ReuseLedgerEntry, 'id' | 'timestamp'>) => void;
}

export function HardwareReuseLedgerModal({
  isOpen,
  onClose,
  ledgerEntries,
  inventory,
  onRecordPhysicalBuild,
  onRecordDisassembly,
}: HardwareReuseLedgerModalProps) {
  const [activeTab, setActiveTab] = useState<'ledger' | 'build-dialog' | 'disassemble-dialog'>('ledger');

  // Build dialog form state
  const [buildProjectTitle, setBuildProjectTitle] = useState('');
  const [selectedBuildItem, setSelectedBuildItem] = useState('');
  const [buildQuantity, setBuildQuantity] = useState(1);

  // Disassembly form state
  const [selectedDisassembleItem, setSelectedDisassembleItem] = useState('');
  const [disassembleQuantity, setDisassembleQuantity] = useState(1);
  const [disassembleCondition, setDisassembleCondition] = useState<'working' | 'untested' | 'faulty'>('working');

  // Ledger summary calculations
  // 1. Total recorded distinct hardware mass: Only sum known mass for completed physical builds
  const buildEntries = ledgerEntries.filter(
    (e) => e.eventType === 'physical-build-completed' || e.eventType === 'physical_build_complete'
  );
  const totalRecordedMassGrams = buildEntries.reduce((sum, e) => sum + (e.totalMassGrams || 0), 0);

  // 2. Distinct physical units allocated to builds
  const distinctUnitIds = new Set<string>();
  buildEntries.forEach((e) => {
    (e.allocatedItems || []).forEach((item) => distinctUnitIds.add(item.inventoryItemId));
  });

  // 3. Total completed reuse cycles from disassembled and re-used parts
  const disassemblyEntries = ledgerEntries.filter(
    (e) => e.eventType === 'disassembly-returned' || e.eventType === 'disassembled_to_stock'
  );
  const totalReuseCycles = disassemblyEntries.reduce((sum, e) => {
    return sum + (e.allocatedItems || []).reduce((acc, i) => acc + i.quantity, 0);
  }, 0);

  // 4. Currently installed components in live physical builds
  const currentlyInstalledUnits = inventory.reduce((sum, item) => sum + item.installedQuantity, 0);

  // CSV Export function
  const handleExportCsv = () => {
    const headers = [
      'Event ID',
      'Event Type',
      'Timestamp',
      'Project Title',
      'Maker Display Name',
      'Total Mass (g)',
      'Allocated Items Count',
      'Items Detail',
      'Notes',
    ];

    const rows = ledgerEntries.map((e) => {
      const itemsDetail = (e.allocatedItems || [])
        .map((i) => `${i.quantity}x ${i.name} (${i.catalogId})`)
        .join('; ');
      return [
        `"${e.id}"`,
        `"${e.eventType}"`,
        `"${e.timestamp}"`,
        `"${(e.projectTitle || '').replace(/"/g, '""')}"`,
        `"${(e.makerDisplayName || '').replace(/"/g, '""')}"`,
        e.totalMassGrams || 0,
        (e.allocatedItems || []).length,
        `"${itemsDetail.replace(/"/g, '""')}"`,
        `"${(e.notes || '').replace(/"/g, '""')}"`,
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `ecobuild-hardware-reuse-ledger-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // JSON Export function
  const handleExportJson = () => {
    const jsonContent = JSON.stringify(
      {
        exportDate: new Date().toISOString(),
        summary: {
          totalRecordedReuseMassGrams: Math.round(totalRecordedMassGrams * 10) / 10,
          distinctPhysicalUnitsCount: distinctUnitIds.size,
          cumulativeReuseCyclesCount: totalReuseCycles,
          activeInstalledUnitsCount: currentlyInstalledUnits,
          disclaimer:
            'EcoBuild hardware reuse metrics represent empirical physical mass of user-verified allocated hardware. No estimated carbon credits or landfill offsets are claimed.',
        },
        ledgerEntries,
      },
      null,
      2
    );

    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `ecobuild-hardware-reuse-ledger-${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const submitBuildCompletion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!buildProjectTitle.trim() || !selectedBuildItem) return;

    const item = inventory.find((i) => i.id === selectedBuildItem);
    if (!item) return;

    const availableFree = Math.max(0, item.totalQuantity - item.installedQuantity);
    const qtyToAllocate = Math.min(buildQuantity, availableFree);
    if (qtyToAllocate <= 0) {
      alert('Selected item does not have free stock available.');
      return;
    }

    const massForAllocated = item.unitMassGrams ? item.unitMassGrams * qtyToAllocate : 0;

    onRecordPhysicalBuild({
      eventType: 'physical-build-completed',
      makerId: item.ownerId || 'current-user',
      makerDisplayName: 'Active Maker',
      projectId: `build-${Date.now().toString(36)}`,
      projectTitle: buildProjectTitle.trim(),
      totalMassGrams: Math.round(massForAllocated * 10) / 10,
      allocatedItems: [
        {
          inventoryItemId: item.id,
          catalogId: item.catalogId,
          name: item.name,
          quantity: qtyToAllocate,
          unitMassGrams: item.unitMassGrams,
        },
      ],
      notes: `Physically assembled into ${buildProjectTitle.trim()}. Moved ${qtyToAllocate} units to installed status.`,
    });

    setBuildProjectTitle('');
    setSelectedBuildItem('');
    setBuildQuantity(1);
    setActiveTab('ledger');
  };

  const submitDisassembly = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDisassembleItem) return;

    const item = inventory.find((i) => i.id === selectedDisassembleItem);
    if (!item || item.installedQuantity <= 0) {
      alert('Selected item has no installed units to disassemble.');
      return;
    }

    const qtyToReturn = Math.min(disassembleQuantity, item.installedQuantity);

    onRecordDisassembly({
      eventType: 'disassembly-returned',
      makerId: item.ownerId || 'current-user',
      makerDisplayName: 'Active Maker',
      totalMassGrams: item.unitMassGrams ? item.unitMassGrams * qtyToReturn : 0,
      allocatedItems: [
        {
          inventoryItemId: item.id,
          catalogId: item.catalogId,
          name: item.name,
          quantity: qtyToReturn,
          unitMassGrams: item.unitMassGrams,
        },
      ],
      notes: `Disassembled ${qtyToReturn} units and returned to inventory with condition: ${disassembleCondition}. Reuse cycle incremented.`,
    });

    setSelectedDisassembleItem('');
    setDisassembleQuantity(1);
    setActiveTab('ledger');
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Hardware Reuse Ledger & Empirical Impact" maxWidth="max-w-4xl">
      <div className="space-y-6">
        {/* Top Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl text-center">
            <div className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider">
              Recorded Reuse Mass
            </div>
            <div className="text-2xl font-bold font-mono text-emerald-900 mt-1 tabular-nums">
              {Math.round(totalRecordedMassGrams * 10) / 10}g
            </div>
            <div className="text-[10px] text-emerald-700 mt-0.5">Known mass of owned parts</div>
          </div>

          <div className="p-3.5 bg-sky-50/70 border border-sky-200 rounded-xl text-center">
            <div className="text-[11px] font-semibold text-sky-800 uppercase tracking-wider">
              Distinct Hardware Units
            </div>
            <div className="text-2xl font-bold font-mono text-sky-900 mt-1 tabular-nums">
              {distinctUnitIds.size}
            </div>
            <div className="text-[10px] text-sky-700 mt-0.5">Physical parts diverted</div>
          </div>

          <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl text-center">
            <div className="text-[11px] font-semibold text-amber-800 uppercase tracking-wider">
              Completed Reuse Cycles
            </div>
            <div className="text-2xl font-bold font-mono text-amber-900 mt-1 tabular-nums">
              {totalReuseCycles}
            </div>
            <div className="text-[10px] text-amber-700 mt-0.5">Disassembled & re-used</div>
          </div>

          <div className="p-3.5 bg-slate-100 border border-slate-200 rounded-xl text-center">
            <div className="text-[11px] font-semibold text-slate-700 uppercase tracking-wider">
              Currently Installed
            </div>
            <div className="text-2xl font-bold font-mono text-slate-900 mt-1 tabular-nums">
              {currentlyInstalledUnits}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">Active in physical builds</div>
          </div>
        </div>

        {/* Action Bar & Tab Switcher */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1 border-t border-slate-100">
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
            <button
              onClick={() => setActiveTab('ledger')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                activeTab === 'ledger'
                  ? 'bg-white text-[#087F83] shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Auditable Ledger ({ledgerEntries.length})
            </button>
            <button
              onClick={() => setActiveTab('build-dialog')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                activeTab === 'build-dialog'
                  ? 'bg-white text-[#087F83] shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              + Record Physical Build
            </button>
            <button
              onClick={() => setActiveTab('disassemble-dialog')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                activeTab === 'disassemble-dialog'
                  ? 'bg-white text-[#087F83] shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              ↩ Return to Stock (Disassemble)
            </button>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            <button
              onClick={handleExportCsv}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
              title="Download Ledger as CSV"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Export CSV</span>
            </button>
            <button
              onClick={handleExportJson}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
              title="Download Ledger as JSON"
            >
              <Download className="w-3.5 h-3.5 text-sky-600" />
              <span>Export JSON</span>
            </button>
          </div>
        </div>

        {/* Tab 1: Auditable Ledger Table */}
        {activeTab === 'ledger' && (
          <div className="space-y-4">
            {ledgerEntries.length > 0 ? (
              <div className="overflow-x-auto rounded-xl border border-slate-200 max-h-[380px] overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 sticky top-0 z-10">
                    <tr>
                      <th className="p-2.5">Date</th>
                      <th className="p-2.5">Event Type</th>
                      <th className="p-2.5">Project / Context</th>
                      <th className="p-2.5">Components Allocated</th>
                      <th className="p-2.5">Known Mass</th>
                      <th className="p-2.5">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {ledgerEntries.map((e) => (
                      <tr key={e.id} className="hover:bg-slate-50/70">
                        <td className="p-2.5 whitespace-nowrap text-slate-500 font-mono">
                          {new Date(e.timestamp).toLocaleDateString()}
                        </td>
                        <td className="p-2.5 whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                              e.eventType === 'physical-build-completed'
                                ? 'bg-emerald-100 text-emerald-800'
                                : e.eventType === 'disassembly-returned'
                                ? 'bg-sky-100 text-sky-800'
                                : 'bg-purple-100 text-purple-800'
                            }`}
                          >
                            {(e.eventType || e.action || 'event').replace(/-/g, ' ')}
                          </span>
                        </td>
                        <td className="p-2.5 font-semibold text-[#132B3B]">
                          {e.projectTitle || (e.name ? `Single Part: ${e.name}` : 'Component Test / Bench')}
                        </td>
                        <td className="p-2.5 text-slate-600">
                          {(e.allocatedItems || []).map((item, idx) => (
                            <div key={idx} className="font-mono text-[11px]">
                              {item.quantity}× {item.name}
                            </div>
                          ))}
                          {(!e.allocatedItems || e.allocatedItems.length === 0) && e.name && (
                            <div className="font-mono text-[11px]">
                              {e.quantity || 1}× {e.name}
                            </div>
                          )}
                        </td>
                        <td className="p-2.5 font-mono font-bold text-slate-800">
                          {(e.totalMassGrams ?? 0) > 0 ? `${e.totalMassGrams}g` : 'Unknown'}
                        </td>
                        <td className="p-2.5 text-slate-500 italic text-[11px] max-w-xs truncate">
                          {e.notes || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 bg-slate-50 rounded-xl border border-slate-200 text-center space-y-2">
                <Activity className="w-8 h-8 text-slate-400 mx-auto" />
                <h4 className="text-sm font-bold text-[#132B3B]">No Hardware Lifecycle Events Recorded</h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  When you physically assemble a recipe or disassemble a completed build, record the event here. This creates an auditable hardware reuse ledger measuring empirical mass diverted from e-waste.
                </p>
              </div>
            )}

            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-900 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                <strong>Methodological Accounting Policy:</strong> Mass is summed only for actual owned units allocated to confirmed physical builds. Missing components or estimated future parts are strictly excluded. No carbon offsets or waste diversion multipliers are fabricated.
              </span>
            </div>
          </div>
        )}

        {/* Tab 2: Record Physical Build Form */}
        {activeTab === 'build-dialog' && (
          <form onSubmit={submitBuildCompletion} className="space-y-4 bg-slate-50 p-5 rounded-xl border border-slate-200">
            <div>
              <h4 className="text-sm font-bold text-[#132B3B]">
                Record Physical Build Completion
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Explicitly confirms that physical hardware was assembled. Moves parts from free to installed status and logs the reuse mass.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Project or Device Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Smart Dustbin v1 Bench Assembly"
                  value={buildProjectTitle}
                  onChange={(e) => setBuildProjectTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Component to Allocate *
                </label>
                <select
                  required
                  value={selectedBuildItem}
                  onChange={(e) => setSelectedBuildItem(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-800"
                >
                  <option value="">Select component from inventory...</option>
                  {inventory
                    .filter((item) => item.totalQuantity - item.installedQuantity > 0)
                    .map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} ({item.catalogId}) — {item.totalQuantity - item.installedQuantity} free
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Quantity Installed *
                </label>
                <input
                  type="number"
                  min="1"
                  max="1000"
                  required
                  value={buildQuantity}
                  onChange={(e) => setBuildQuantity(parseInt(e.target.value, 10) || 1)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 font-mono"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setActiveTab('ledger')}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-white border border-slate-200 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 text-xs font-semibold text-white bg-[#087F83] hover:bg-[#066366] rounded-lg transition-colors cursor-pointer"
              >
                Confirm Physical Build & Log Mass
              </button>
            </div>
          </form>
        )}

        {/* Tab 3: Disassembly & Return-to-Stock Form */}
        {activeTab === 'disassemble-dialog' && (
          <form onSubmit={submitDisassembly} className="space-y-4 bg-slate-50 p-5 rounded-xl border border-slate-200">
            <div>
              <h4 className="text-sm font-bold text-[#132B3B]">
                Disassemble Build & Return Parts to Stock
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Releases installed components back to available inventory and records an incremented reuse lifecycle count.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Installed Component to Return *
                </label>
                <select
                  required
                  value={selectedDisassembleItem}
                  onChange={(e) => setSelectedDisassembleItem(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-800"
                >
                  <option value="">Select installed component...</option>
                  {inventory
                    .filter((item) => item.installedQuantity > 0)
                    .map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} ({item.catalogId}) — {item.installedQuantity} installed
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Quantity Disassembled *
                </label>
                <input
                  type="number"
                  min="1"
                  max="1000"
                  required
                  value={disassembleQuantity}
                  onChange={(e) => setDisassembleQuantity(parseInt(e.target.value, 10) || 1)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Condition after Disassembly *
                </label>
                <select
                  value={disassembleCondition}
                  onChange={(e) => setDisassembleCondition(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-800"
                >
                  <option value="working">Working (Ready for Next Build)</option>
                  <option value="untested">Untested (Requires Bench Re-Testing)</option>
                  <option value="faulty">Faulty (Damaged during Disassembly)</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setActiveTab('ledger')}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-white border border-slate-200 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 text-xs font-semibold text-white bg-[#087F83] hover:bg-[#066366] rounded-lg transition-colors cursor-pointer"
              >
                Return to Stock & Increment Reuse Cycle
              </button>
            </div>
          </form>
        )}

        {/* Footer */}
        <div className="flex justify-end pt-2 border-t border-slate-100">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            Close Ledger
          </button>
        </div>
      </div>
    </Modal>
  );
}
