/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import {
  ComponentItem,
  ComponentCategory,
  ComponentCondition,
  ComponentSource,
  VerificationStatus,
  ComponentTestRecord,
} from '../../types';
import { AIProviderService, IntakeProposal } from '../../services/aiService';
import {
  Camera,
  AlertCircle,
  Info,
  Sparkles,
  QrCode,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Wrench,
  Plus,
  Trash2,
} from 'lucide-react';

interface ComponentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: ComponentItem) => void;
  initialItem?: ComponentItem | null;
}

const COMMON_CATALOG_OPTIONS = [
  { id: 'arduino-uno', name: 'Arduino Uno Rev3', category: 'microcontroller', defaultMass: 25 },
  { id: 'esp32-devkit', name: 'ESP32 NodeMCU DevKit V1', category: 'microcontroller', defaultMass: 12 },
  { id: 'hc-sr04', name: 'HC-SR04 Ultrasonic Distance Sensor', category: 'sensor', defaultMass: 9 },
  { id: 'sg90-servo', name: 'TowerPro SG90 9g Micro Servo', category: 'actuator', defaultMass: 11 },
  { id: 'led-5mm', name: '5mm Diffused LEDs', category: 'passive', defaultMass: 0.3 },
  { id: 'jumper-wires', name: 'Jumper Wire Ribbon (40-pack)', category: 'prototyping', defaultMass: 30 },
  { id: 'breadboard-half', name: 'Half-Size Breadboard (400-Point)', category: 'prototyping', defaultMass: 38 },
  { id: 'resistor-220', name: '220 Ohm 1/4W Resistors', category: 'passive', defaultMass: 0.2 },
  { id: 'resistor-10k', name: '10k Ohm 1/4W Resistors', category: 'passive', defaultMass: 0.2 },
  { id: 'ldr-gl5528', name: 'GL5528 Light Dependent Resistor', category: 'sensor', defaultMass: 0.8 },
  { id: 'buzzer-piezo', name: '5V Active Piezo Buzzer', category: 'actuator', defaultMass: 4.5 },
  { id: 'dc-motor-toy', name: '3V-6V Dual Shaft DC Gear Motor', category: 'actuator', defaultMass: 28 },
  { id: 'l298n-driver', name: 'L298N Dual H-Bridge Motor Driver', category: 'actuator', defaultMass: 26 },
  { id: 'dht11-sensor', name: 'DHT11 Temperature & Humidity Sensor', category: 'sensor', defaultMass: 5 },
  { id: 'oled-096-i2c', name: '0.96 inch I2C OLED Display', category: 'display', defaultMass: 8 },
  { id: 'soil-sensor', name: 'Capacitive Soil Moisture Probe', category: 'sensor', defaultMass: 14 },
  { id: 'push-button', name: 'Tactile Momentary Push Button', category: 'passive', defaultMass: 0.75 },
  { id: 'custom-hardware', name: 'Custom / Other Component', category: 'other', defaultMass: 0 },
];

export function ComponentFormModal({
  isOpen,
  onClose,
  onSave,
  initialItem,
}: ComponentFormModalProps) {
  const isEditing = Boolean(initialItem);

  // Active intake tab: 'manual' | 'ai-nlp' | 'ai-photo' | 'qr'
  const [intakeTab, setIntakeTab] = useState<'manual' | 'ai-nlp' | 'ai-photo' | 'qr'>('manual');

  // Form State
  const [catalogId, setCatalogId] = useState('arduino-uno');
  const [name, setName] = useState('');
  const [category, setCategory] = useState<ComponentCategory>('microcontroller');
  const [totalQuantity, setTotalQuantity] = useState(1);
  const [reservedQuantity, setReservedQuantity] = useState(0);
  const [installedQuantity, setInstalledQuantity] = useState(0);
  const [condition, setCondition] = useState<ComponentCondition>('working');
  const [source, setSource] = useState<ComponentSource>('purchased');
  const [unitMassGrams, setUnitMassGrams] = useState<string>('25');
  const [notes, setNotes] = useState('');
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [verificationStatus, setVerificationStatus] =
    useState<VerificationStatus>('user-reported-working');
  const [isSharedForCollaboration, setIsSharedForCollaboration] = useState(true);

  // Phase 6: Physical Test Records & Provenance
  const [testRecords, setTestRecords] = useState<ComponentTestRecord[]>([]);
  const [showTestLogger, setShowTestLogger] = useState(false);
  const [newTestType, setNewTestType] = useState<ComponentTestRecord['testType']>('multimeter-continuity');
  const [newTestMethod, setNewTestMethod] = useState('Probed terminal pins with digital multimeter in continuity buzzer mode');
  const [newTestResult, setNewTestResult] = useState<'pass' | 'fail' | 'marginal'>('pass');
  const [newTestedQty, setNewTestedQty] = useState(1);
  const [newTestedNotes, setNewTestedNotes] = useState('Low resistance across closed path, zero shorts across supply rails.');

  // AI Intake State
  const [nlpInput, setNlpInput] = useState('');
  const [qrInput, setQrInput] = useState('');
  const [photoFileName, setPhotoFileName] = useState('');
  const [activeProposal, setActiveProposal] = useState<IntakeProposal | null>(null);

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (initialItem) {
      setCatalogId(initialItem.catalogId);
      setName(initialItem.name);
      setCategory(initialItem.category);
      setTotalQuantity(initialItem.totalQuantity);
      setReservedQuantity(initialItem.reservedQuantity);
      setInstalledQuantity(initialItem.installedQuantity);
      setCondition(initialItem.condition);
      setSource(initialItem.source);
      setUnitMassGrams(
        initialItem.unitMassGrams !== null && initialItem.unitMassGrams !== undefined
          ? String(initialItem.unitMassGrams)
          : ''
      );
      setNotes(initialItem.notes || '');
      setPhotoPreview(initialItem.photoPreview || null);
      setVerificationStatus(initialItem.verificationStatus);
      setIsSharedForCollaboration(
        initialItem.isSharedForCollaboration !== undefined
          ? initialItem.isSharedForCollaboration
          : true
      );
      setTestRecords(initialItem.testRecords || []);
    } else {
      // Default new component
      setCatalogId('arduino-uno');
      setName('Arduino Uno Rev3');
      setCategory('microcontroller');
      setTotalQuantity(1);
      setReservedQuantity(0);
      setInstalledQuantity(0);
      setCondition('working');
      setSource('purchased');
      setUnitMassGrams('25');
      setNotes('');
      setPhotoPreview(null);
      setVerificationStatus('user-reported-working');
      setIsSharedForCollaboration(true);
      setTestRecords([]);
    }
    setErrors({});
    setIntakeTab('manual');
    setActiveProposal(null);
  }, [initialItem, isOpen]);

  const handleCatalogChange = (selectedId: string) => {
    setCatalogId(selectedId);
    const found = COMMON_CATALOG_OPTIONS.find((opt) => opt.id === selectedId);
    if (found && selectedId !== 'custom-hardware') {
      if (!name || name === 'Arduino Uno Rev3' || COMMON_CATALOG_OPTIONS.some((o) => o.name === name)) {
        setName(found.name);
      }
      setCategory(found.category as ComponentCategory);
      if (found.defaultMass) {
        setUnitMassGrams(String(found.defaultMass));
      }
    }
  };

  const handleConditionChange = (newCondition: ComponentCondition) => {
    setCondition(newCondition);
    if (newCondition === 'working') {
      if (verificationStatus !== 'recorded-test') {
        setVerificationStatus('user-reported-working');
      }
    } else if (newCondition === 'untested') {
      setVerificationStatus('untested');
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setErrors((prev) => ({
          ...prev,
          photo: 'Photo preview must be less than 2MB in size.',
        }));
        return;
      }
      setPhotoFileName(file.name);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
        setErrors((prev) => {
          const updated = { ...prev };
          delete updated.photo;
          return updated;
        });

        // Trigger OCR analysis proposal
        const prop = AIProviderService.parsePhotoOCRIntake(file.name);
        setActiveProposal(prop);
      };
      reader.readAsDataURL(file);
    }
  };

  // AI Natural Language Handler
  const handleParseNLP = () => {
    if (!nlpInput.trim()) return;
    const prop = AIProviderService.parseNaturalLanguageIntake(nlpInput);
    setActiveProposal(prop);
  };

  // QR Scanner Handler
  const handleParseQR = () => {
    if (!qrInput.trim()) return;
    const prop = AIProviderService.parsePassportQR(qrInput);
    if (prop) {
      setActiveProposal(prop);
    } else {
      setErrors((prev) => ({
        ...prev,
        qr: 'Invalid or unsupported passport format. Expected ecobuild:passport:v1:... or valid JSON payload.',
      }));
    }
  };

  // Apply AI Proposal to Form for Compulsory User Review
  const handleApplyProposalToForm = (prop: IntakeProposal) => {
    setCatalogId(prop.catalogId);
    setName(prop.name);
    setCategory(prop.category);
    setTotalQuantity(prop.quantity);
    setCondition(prop.condition);
    setSource(prop.source);
    if (prop.unitMassGrams) setUnitMassGrams(String(prop.unitMassGrams));
    setNotes(prop.notes);
    setVerificationStatus('untested'); // AI NEVER certifies physical test!
    setIntakeTab('manual'); // Return to manual form so user can review and edit before saving
    setActiveProposal(null);
  };

  // Phase 6: Append Bench Test Record
  const handleAddBenchTest = () => {
    if (!newTestMethod.trim()) return;

    const newRecord: ComponentTestRecord = {
      id: `test-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
      date: new Date().toISOString(),
      testType: newTestType,
      method: newTestMethod.trim(),
      result: newTestResult,
      testedQuantity: Math.max(1, Math.min(totalQuantity, newTestedQty)),
      testedBy: 'Bench Maker',
      notes: newTestedNotes.trim() || undefined,
    };

    const updated = [...testRecords, newRecord];
    setTestRecords(updated);

    // If test passed, promote status to recorded-test
    if (newTestResult === 'pass') {
      setVerificationStatus('recorded-test');
      setCondition('working');
    } else if (newTestResult === 'fail') {
      setCondition('faulty');
    }

    setShowTestLogger(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = 'Component display name is required.';
    }

    if (!catalogId.trim()) {
      newErrors.catalogId = 'Catalog component model is required.';
    }

    if (!Number.isInteger(totalQuantity) || totalQuantity < 0) {
      newErrors.totalQuantity = 'Total quantity must be a non-negative integer.';
    }

    if (!Number.isInteger(reservedQuantity) || reservedQuantity < 0) {
      newErrors.reservedQuantity =
        'Reserved quantity must be a non-negative integer.';
    }

    if (!Number.isInteger(installedQuantity) || installedQuantity < 0) {
      newErrors.installedQuantity =
        'Installed quantity must be a non-negative integer.';
    }

    if (reservedQuantity + installedQuantity > totalQuantity) {
      newErrors.quantityMath =
        'Reserved quantity plus installed quantity cannot exceed total quantity.';
    }

    let parsedMass: number | null = null;
    if (unitMassGrams.trim() !== '') {
      parsedMass = parseFloat(unitMassGrams);
      if (isNaN(parsedMass) || parsedMass < 0) {
        newErrors.unitMassGrams = 'Unit mass must be a non-negative number.';
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const itemToSave: ComponentItem = {
      id: initialItem?.id || `inv-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
      catalogId: catalogId.trim(),
      name: name.trim(),
      category,
      totalQuantity,
      reservedQuantity,
      installedQuantity,
      condition,
      source,
      unitMassGrams: parsedMass,
      notes: notes.trim(),
      photoPreview,
      lastUpdated: new Date().toISOString(),
      verificationStatus,
      isSharedForCollaboration,
      testRecords,
    };

    onSave(itemToSave);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Component Passport' : 'Log Electronic Component Passport'}
      maxWidth="max-w-2xl"
    >
      <div className="space-y-5">
        {/* Intake Mode Tabs */}
        {!isEditing && (
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs font-semibold overflow-x-auto">
            <button
              type="button"
              onClick={() => setIntakeTab('manual')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                intakeTab === 'manual'
                  ? 'bg-white text-[#087F83] shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Manual Entry</span>
            </button>
            <button
              type="button"
              onClick={() => setIntakeTab('ai-nlp')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                intakeTab === 'ai-nlp'
                  ? 'bg-white text-[#087F83] shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Natural Language Intake</span>
            </button>
            <button
              type="button"
              onClick={() => setIntakeTab('ai-photo')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                intakeTab === 'ai-photo'
                  ? 'bg-white text-[#087F83] shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Camera className="w-3.5 h-3.5 text-blue-500" />
              <span>Photo / OCR Scan</span>
            </button>
            <button
              type="button"
              onClick={() => setIntakeTab('qr')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                intakeTab === 'qr'
                  ? 'bg-white text-[#087F83] shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <QrCode className="w-3.5 h-3.5 text-emerald-600" />
              <span>QR Passport</span>
            </button>
          </div>
        )}

        {/* ======================================================== */}
        {/* ASSISTED INTAKE TAB: NATURAL LANGUAGE                    */}
        {/* ======================================================== */}
        {intakeTab === 'ai-nlp' && (
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4 text-xs">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span className="font-bold text-[#132B3B]">
                Natural Language Component Intake
              </span>
            </div>
            <p className="text-slate-600 leading-relaxed">
              Paste or type unformatted notes about parts you salvaged, bought, or received. The parser proposes structured catalog identifiers and quantities for your review.
            </p>

            <textarea
              rows={3}
              placeholder="e.g. Salvaged 2 ultrasonic HC-SR04 sensors from a robot kit, pins seem intact..."
              value={nlpInput}
              onChange={(e) => setNlpInput(e.target.value)}
              className="w-full px-3.5 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 focus:border-[#087F83]"
            />

            <button
              type="button"
              onClick={handleParseNLP}
              className="px-4 py-2 text-xs font-semibold text-white bg-[#087F83] hover:bg-[#066366] rounded-lg shadow-xs"
            >
              Parse Notes into Proposal
            </button>
          </div>
        )}

        {/* ======================================================== */}
        {/* ASSISTED INTAKE TAB: PHOTO / OCR SCAN                    */}
        {/* ======================================================== */}
        {intakeTab === 'ai-photo' && (
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4 text-xs">
            <div className="flex items-center gap-2">
              <Camera className="w-4 h-4 text-blue-500" />
              <span className="font-bold text-[#132B3B]">
                Photo & Silk-Screen OCR Intake
              </span>
            </div>
            <p className="text-slate-600 leading-relaxed">
              Upload a component photo. The parser identifies silk-screen chip labels and proposes catalog references.
            </p>

            <input
              type="file"
              accept="image/*"
              onChange={handlePhotoUpload}
              className="text-xs text-slate-600 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#EAF4F3] file:text-[#087F83] hover:file:bg-[#087F83] hover:file:text-white"
            />
            {errors.photo && <p className="text-rose-600">{errors.photo}</p>}
          </div>
        )}

        {/* ======================================================== */}
        {/* ASSISTED INTAKE TAB: QR PASSPORT                         */}
        {/* ======================================================== */}
        {intakeTab === 'qr' && (
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4 text-xs">
            <div className="flex items-center gap-2">
              <QrCode className="w-4 h-4 text-emerald-600" />
              <span className="font-bold text-[#132B3B]">
                Scan or Paste EcoBuild Passport String
              </span>
            </div>
            <p className="text-slate-600 leading-relaxed">
              Scan an official EcoBuild QR sticker or paste a passport URI (e.g.{' '}
              <code>ecobuild:passport:v1:hc-sr04:2</code>).
            </p>

            <input
              type="text"
              placeholder="ecobuild:passport:v1:catalog-id:quantity"
              value={qrInput}
              onChange={(e) => setQrInput(e.target.value)}
              className="w-full px-3.5 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-800"
            />
            {errors.qr && <p className="text-rose-600">{errors.qr}</p>}

            <button
              type="button"
              onClick={handleParseQR}
              className="px-4 py-2 text-xs font-semibold text-white bg-[#087F83] hover:bg-[#066366] rounded-lg shadow-xs"
            >
              Resolve Passport
            </button>
          </div>
        )}

        {/* ======================================================== */}
        {/* PROPOSAL PREVIEW & COMPULSORY USER REVIEW BANNER         */}
        {/* ======================================================== */}
        {activeProposal && (
          <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-amber-900 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-600" />
                Proposed Intake Fields (Requires User Review)
              </span>
              <span className="text-[10px] text-amber-800 bg-white px-2 py-0.5 rounded border border-amber-300 font-mono">
                {Math.round(activeProposal.confidenceScore * 100)}% match
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 p-3 bg-white rounded-lg border border-amber-200/60 font-mono text-[11px] text-slate-700">
              <div>
                <span className="text-slate-400 block">Catalog ID:</span>
                <strong>{activeProposal.catalogId}</strong>
              </div>
              <div>
                <span className="text-slate-400 block">Identified Name:</span>
                <strong>{activeProposal.name}</strong>
              </div>
              <div>
                <span className="text-slate-400 block">Quantity:</span>
                <strong>{activeProposal.quantity} unit(s)</strong>
              </div>
              <div>
                <span className="text-slate-400 block">Verification:</span>
                <span className="text-amber-700 font-bold uppercase">
                  {activeProposal.verificationStatus}
                </span>
              </div>
            </div>

            {/* Mandatory Safety Notice */}
            <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-[11px] text-rose-800 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{activeProposal.safetyWarning}</span>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setActiveProposal(null)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800"
              >
                Discard
              </button>
              <button
                type="button"
                onClick={() => handleApplyProposalToForm(activeProposal)}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-[#087F83] hover:bg-[#066366] rounded-lg shadow-xs"
              >
                Apply to Form for Review →
              </button>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* MANUAL FORM (ALWAYS AVAILABLE & PRIMARY)                 */}
        {/* ======================================================== */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Catalog Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Catalog Component Type & Model <span className="text-rose-500">*</span>
            </label>
            <select
              value={catalogId}
              onChange={(e) => handleCatalogChange(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-lg text-slate-800 focus:border-[#087F83]"
            >
              {COMMON_CATALOG_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.name} ({opt.id})
                </option>
              ))}
            </select>
          </div>

          {/* Display Name & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Display Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Arduino Uno Rev3"
                className={`w-full px-3.5 py-2.5 text-sm bg-white border rounded-lg text-slate-800 ${
                  errors.name ? 'border-rose-400' : 'border-slate-200 focus:border-[#087F83]'
                }`}
              />
              {errors.name && <p className="text-xs text-rose-600 mt-1">{errors.name}</p>}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Hardware Category <span className="text-rose-500">*</span>
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ComponentCategory)}
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-lg text-slate-800 focus:border-[#087F83]"
              >
                <option value="microcontroller">Microcontroller</option>
                <option value="sensor">Sensor</option>
                <option value="actuator">Actuator / Motor</option>
                <option value="passive">Passive Component (LED, Resistor)</option>
                <option value="prototyping">Prototyping (Breadboard, Wires)</option>
                <option value="display">Display</option>
                <option value="power">Power</option>
                <option value="other">Other / Custom</option>
              </select>
            </div>
          </div>

          {/* Quantities (Total, Reserved, Installed) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Quantities & Allocation Invariant
              </label>
              <span className="text-xs font-mono text-emerald-700 font-semibold tabular-nums">
                Free Stock: {Math.max(0, totalQuantity - reservedQuantity - installedQuantity)} units
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <span className="text-xs text-slate-600 mb-1 block">Total Count</span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={totalQuantity}
                  onChange={(e) => setTotalQuantity(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-800"
                />
              </div>
              <div>
                <span className="text-xs text-slate-600 mb-1 block">Reserved</span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={reservedQuantity}
                  onChange={(e) => setReservedQuantity(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-800"
                />
              </div>
              <div>
                <span className="text-xs text-slate-600 mb-1 block">Installed</span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={installedQuantity}
                  onChange={(e) => setInstalledQuantity(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-800"
                />
              </div>
            </div>

            {errors.quantityMath && (
              <p className="text-xs text-rose-600 mt-1.5 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                {errors.quantityMath}
              </p>
            )}
          </div>

          {/* Condition & Source */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Reported Condition <span className="text-rose-500">*</span>
              </label>
              <select
                value={condition}
                onChange={(e) => handleConditionChange(e.target.value as ComponentCondition)}
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-lg text-slate-800"
              >
                <option value="working">Working (Eligible for build coverage)</option>
                <option value="untested">Untested (Requires bench check)</option>
                <option value="partially-working">Partially Working (Damaged channel)</option>
                <option value="faulty">Faulty (Not usable for builds)</option>
                <option value="unsafe">Unsafe (Hazardous / Quarantine)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Hardware Source <span className="text-rose-500">*</span>
              </label>
              <select
                value={source}
                onChange={(e) => setSource(e.target.value as ComponentSource)}
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-lg text-slate-800"
              >
                <option value="purchased">Purchased new / retail</option>
                <option value="previous-project">Previous completed build</option>
                <option value="salvaged">Salvaged from discarded electronics</option>
                <option value="donated">Donated / Makerspace loan</option>
              </select>
            </div>
          </div>

          {/* Verification Status & Unit Mass */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Verification Status
              </label>
              <select
                value={verificationStatus}
                onChange={(e) => setVerificationStatus(e.target.value as VerificationStatus)}
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-lg text-slate-800"
              >
                <option value="untested">Untested (No physical test recorded)</option>
                <option value="user-reported-working">User-Reported Working (Self claim)</option>
                <option value="recorded-test">Recorded Test (Bench verified empirical test)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Unit Mass (Grams)
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={unitMassGrams}
                onChange={(e) => setUnitMassGrams(e.target.value)}
                placeholder="e.g. 25"
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-lg text-slate-800"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Required for accurate hardware reuse mass metrics.
              </span>
            </div>
          </div>

          {/* Collaboration Sharing Toggle */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
            <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-800">
              <input
                type="checkbox"
                checked={isSharedForCollaboration}
                onChange={(e) => setIsSharedForCollaboration(e.target.checked)}
                className="rounded border-slate-300 text-[#087F83] focus:ring-[#087F83]"
              />
              <span>Opt in to Component Sharing for Team Builds</span>
            </label>
            <p className="text-[11px] text-slate-500 leading-normal pl-6">
              When enabled, free working stock of this component can be matched with prospective project partners. Faulty, unsafe, or untested units are automatically excluded from confirmed match offers.
            </p>
          </div>

          {/* ======================================================== */}
          {/* PHASE 6: PHYSICAL BENCH TEST RECORDS                     */}
          {/* ======================================================== */}
          <div className="pt-2 border-t border-slate-100 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-wider">
                <Wrench className="w-3.5 h-3.5 text-[#087F83]" />
                <span>Physical Test Records ({testRecords.length})</span>
              </div>
              <button
                type="button"
                onClick={() => setShowTestLogger(!showTestLogger)}
                className="text-xs font-semibold text-[#087F83] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>{showTestLogger ? 'Cancel Test' : 'Log Physical Test'}</span>
              </button>
            </div>

            {showTestLogger && (
              <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-3 text-xs">
                <div className="font-bold text-emerald-950 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Log Workbench Physical Verification Test</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Test Method / Protocol
                    </label>
                    <select
                      value={newTestType}
                      onChange={(e) => setNewTestType(e.target.value as any)}
                      className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800"
                    >
                      <option value="multimeter-continuity">Multimeter Continuity Probe</option>
                      <option value="power-rail-voltage">Power Rail Regulated 5V/3.3V Check</option>
                      <option value="logic-high-low">Logic High/Low Signal Test</option>
                      <option value="sensor-readout">Live Sensor Telemetry Readout</option>
                      <option value="actuator-sweep">Actuator Angle/Motor PWM Sweep</option>
                      <option value="thermal-inspection">Thermal Inspection under Load</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Empirical Result
                    </label>
                    <select
                      value={newTestResult}
                      onChange={(e) => setNewTestResult(e.target.value as any)}
                      className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800"
                    >
                      <option value="pass">PASS — Confirmed fully operational</option>
                      <option value="marginal">MARGINAL — Minor defect / noisy</option>
                      <option value="fail">FAIL — Defective / short-circuit</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Procedure & Multimeter Observation
                  </label>
                  <input
                    type="text"
                    value={newTestMethod}
                    onChange={(e) => setNewTestMethod(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800"
                  />
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-slate-500 italic">
                    Physical test records represent user-submitted evidence.
                  </span>
                  <button
                    type="button"
                    onClick={handleAddBenchTest}
                    className="px-4 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs"
                  >
                    Confirm & Append Test Record
                  </button>
                </div>
              </div>
            )}

            {testRecords.length > 0 && (
              <div className="space-y-1.5">
                {testRecords.map((t, idx) => (
                  <div
                    key={t.id || idx}
                    className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs flex items-center justify-between"
                  >
                    <div>
                      <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            t.result === 'pass'
                              ? 'bg-emerald-500'
                              : t.result === 'marginal'
                              ? 'bg-amber-500'
                              : 'bg-rose-500'
                          }`}
                        />
                        <span className="capitalize">{t.testType.replace('-', ' ')}</span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          ({new Date(t.date).toLocaleDateString()})
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500">{t.method}</p>
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase font-mono ${
                        t.result === 'pass'
                          ? 'bg-emerald-100 text-emerald-800'
                          : t.result === 'marginal'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {t.result}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Workbench Notes
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Pin headers pre-soldered, includes 10cm ribbon cable."
              className="w-full px-3.5 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-800"
            />
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold text-white bg-[#087F83] hover:bg-[#066366] rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              {isEditing ? 'Update Passport' : 'Save to Inventory'}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
