/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from '../common/Modal';
import {
  CheckCircle2,
  AlertCircle,
  XCircle,
  Wrench,
  Leaf,
  Trophy,
  Camera,
  Share2,
  Sparkles,
  Info,
  Check,
} from 'lucide-react';
import {
  ProjectDifficulty,
  CompletedProjectRecord,
  ComponentItem,
  MakerProfile,
  RecipeComponentRequirement,
} from '../../types';

interface ProjectCompletionModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  projectTitle: string;
  difficulty: ProjectDifficulty;
  requiredComponents?: RecipeComponentRequirement[];
  userInventory?: ComponentItem[];
  activeUser?: MakerProfile;
  onCompleteBuild: (
    record: Omit<CompletedProjectRecord, 'id' | 'completedAt'>,
    allocatedItems: { inventoryItemId: string; catalogId: string; quantity: number }[],
    shouldPublishShowcase: boolean
  ) => Promise<void>;
}

export function ProjectCompletionModal({
  isOpen,
  onClose,
  projectId,
  projectTitle,
  difficulty,
  requiredComponents = [],
  userInventory = [],
  activeUser,
  onCompleteBuild,
}: ProjectCompletionModalProps) {
  const { t } = useTranslation();

  const [buildResult, setBuildResult] = useState<'working' | 'partially-working' | 'failed'>('working');
  const [notes, setNotes] = useState('');
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [publishShowcase, setPublishShowcase] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Calculate default allocated hardware items from inventory matching recipe requirements
  const defaultAllocations = requiredComponents.map((req) => {
    const matchingItem = userInventory.find((i) => i.catalogId === req.catalogId || i.name.toLowerCase().includes(req.name.toLowerCase()));
    return {
      inventoryItemId: matchingItem?.id || `inv-auto-${req.catalogId}`,
      catalogId: req.catalogId,
      name: req.name,
      quantity: req.quantity || 1,
      unitMassGrams: matchingItem?.unitMassGrams || 25,
      isAvailable: Boolean(matchingItem),
    };
  });

  const totalHardwareMass = defaultAllocations.reduce(
    (sum, a) => sum + (a.unitMassGrams * a.quantity),
    0
  );

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const allocatedItems = defaultAllocations.map((a) => ({
        inventoryItemId: a.inventoryItemId,
        catalogId: a.catalogId,
        quantity: a.quantity,
      }));

      const record: Omit<CompletedProjectRecord, 'id' | 'completedAt'> = {
        userId: activeUser?.id || 'maker-adithya',
        projectId,
        projectTitle,
        difficulty,
        notes: notes.trim() || `Assembled and verified on workbench with ${buildResult} status.`,
        photoURL: photoPreview || undefined,
        buildResult,
        reusedComponentsCount: allocatedItems.reduce((acc, a) => acc + a.quantity, 0),
        hardwareMassGrams: totalHardwareMass || 120,
        verificationLevel: buildResult === 'working' ? 'bench-verified' : 'self-reported-working',
      };

      await onCompleteBuild(record, allocatedItems, publishShowcase);
      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        onClose();
      }, 2500);
    } catch (err) {
      console.error('Failed completing build:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('completion.modalTitle', 'Record Physical Build Completion')} maxWidth="max-w-2xl">
      {isSuccess ? (
        <div className="py-12 px-6 text-center space-y-4">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto animate-bounce">
            <Check className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-[#132B3B]">
            Physical Build Recorded Successfully!
          </h3>
          <p className="text-xs text-slate-600 max-w-md mx-auto">
            Your physical build was entered into the immutable Hardware Reuse Ledger. Points and Builder Progress have been updated!
          </p>
          <div className="inline-flex items-center gap-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-800">
            <span className="flex items-center gap-1">
              <Leaf className="w-4 h-4 text-emerald-600" />
              +50 Eco Points
            </span>
            <span>·</span>
            <span className="flex items-center gap-1">
              <Wrench className="w-4 h-4 text-[#087F83]" />
              +1 Verified Build
            </span>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          <p className="text-xs text-slate-500">
            {t(
              'completion.modalSubtitle',
              'Verify that you assembled this circuit with physical hardware to earn Eco Points and Builder Progress.'
            )}
          </p>

          {/* Project Summary Banner */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-3 text-xs">
            <div>
              <div className="font-bold text-[#132B3B] text-sm">{projectTitle}</div>
              <div className="text-slate-500 mt-0.5">
                Difficulty: {difficulty} · Estimated Diverted Mass: ~{totalHardwareMass || 120}g
              </div>
            </div>
            <span className="px-2.5 py-1 text-[11px] font-bold uppercase rounded bg-teal-100 text-teal-800 border border-teal-200">
              50 Eco Points Eligible
            </span>
          </div>

          {/* Build Verification Result */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              {t('completion.resultLabel', 'Physical Build Status *')}
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => setBuildResult('working')}
                className={`p-3 rounded-xl border text-left transition-colors cursor-pointer flex items-center gap-2.5 ${
                  buildResult === 'working'
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-900 font-semibold ring-1 ring-emerald-500'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="text-xs">{t('completion.working', 'Fully Working')}</span>
              </button>

              <button
                type="button"
                onClick={() => setBuildResult('partially-working')}
                className={`p-3 rounded-xl border text-left transition-colors cursor-pointer flex items-center gap-2.5 ${
                  buildResult === 'partially-working'
                    ? 'bg-amber-50 border-amber-500 text-amber-900 font-semibold ring-1 ring-amber-500'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span className="text-xs">{t('completion.partial', 'Partially Working')}</span>
              </button>

              <button
                type="button"
                onClick={() => setBuildResult('failed')}
                className={`p-3 rounded-xl border text-left transition-colors cursor-pointer flex items-center gap-2.5 ${
                  buildResult === 'failed'
                    ? 'bg-rose-50 border-rose-500 text-rose-900 font-semibold ring-1 ring-rose-500'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span className="text-xs">{t('completion.failed', 'Needs Rework')}</span>
              </button>
            </div>
          </div>

          {/* Component Allocation Verification */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                {t('completion.confirmComponents', 'Hardware Reused from Workbench')}
              </label>
              <span className="text-[11px] text-slate-500">
                {defaultAllocations.length} components allocated
              </span>
            </div>
            <div className="max-h-36 overflow-y-auto space-y-1.5 p-2 bg-slate-50 rounded-xl border border-slate-200 text-xs">
              {defaultAllocations.map((a, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between px-2.5 py-1.5 bg-white rounded-lg border border-slate-100"
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="font-medium text-slate-800">{a.name}</span>
                    <span className="text-[10px] text-slate-400 font-mono">({a.catalogId})</span>
                  </div>
                  <span className="text-[11px] font-mono font-bold text-slate-600">
                    {a.quantity} unit ({a.unitMassGrams * a.quantity}g)
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Bench Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              {t('completion.notesLabel', 'Workbench Notes & Empirical Observations')}
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t(
                'completion.notesPlaceholder',
                'Describe bench tests, voltage probe results, or assembly challenges...'
              )}
              className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:border-[#087F83] focus:outline-hidden"
            />
          </div>

          {/* Optional Photo Attachment */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Physical Prototype Photo (Optional)
            </label>
            <div className="flex items-center gap-3">
              <label className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors shadow-2xs">
                <Camera className="w-3.5 h-3.5 text-[#087F83]" />
                <span>Choose Photo</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
              </label>
              {photoPreview && (
                <div className="flex items-center gap-2 text-xs text-emerald-700 font-medium">
                  <img
                    src={photoPreview}
                    alt="Preview"
                    className="w-8 h-8 rounded object-cover border border-emerald-300"
                  />
                  <span>Photo attached</span>
                </div>
              )}
            </div>
          </div>

          {/* Community Showcase Checkbox */}
          <div className="p-3 bg-[#EAF4F3] border border-[#087F83]/20 rounded-xl flex items-start gap-2.5">
            <input
              type="checkbox"
              id="showcase-opt"
              checked={publishShowcase}
              onChange={(e) => setPublishShowcase(e.target.checked)}
              className="mt-0.5 rounded border-slate-300 text-[#087F83] focus:ring-[#087F83] cursor-pointer"
            />
            <label htmlFor="showcase-opt" className="text-xs text-slate-700 cursor-pointer leading-relaxed">
              <strong className="text-[#132B3B]">Publish to Community Project Showcase:</strong> Display this verified physical build on the Maker Network with components reused and badges earned.
            </label>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-semibold text-white bg-[#087F83] hover:bg-[#066366] rounded-xl transition-colors cursor-pointer shadow-xs disabled:opacity-50 flex items-center gap-1.5"
            >
              {isSubmitting ? (
                <span>Recording...</span>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>{t('completion.submit', 'Confirm Build & Award Points')}</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
