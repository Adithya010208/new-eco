/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { ModerationReport, MakerProfile } from '../../types';
import {
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  Lock,
  Info,
} from 'lucide-react';

interface ModerationReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetType: 'maker' | 'proposal' | 'listing' | 'workspace_message';
  targetId: string;
  targetDisplayName?: string;
  activeUser: MakerProfile;
  onSubmitReport: (report: Omit<ModerationReport, 'id' | 'createdAt' | 'status'>) => Promise<void>;
}

export function ModerationReportModal({
  isOpen,
  onClose,
  targetType,
  targetId,
  targetDisplayName,
  activeUser,
  onSubmitReport,
}: ModerationReportModalProps) {
  const [reason, setReason] = useState<ModerationReport['reason']>('unsafe-hardware');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;

    setIsSubmitting(true);
    try {
      await onSubmitReport({
        reporterId: activeUser.id,
        targetType,
        targetId,
        reason,
        description: description.trim(),
      });
      setSubmitted(true);
    } catch (err: any) {
      alert(`Error submitting report: ${err?.message || err}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        setSubmitted(false);
        onClose();
      }}
      title="Report Content or Safety Violation"
      maxWidth="max-w-lg"
    >
      {submitted ? (
        <div className="p-6 text-center space-y-4">
          <div className="w-12 h-12 bg-emerald-100 text-emerald-800 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-base font-bold text-[#132B3B]">
              Report Logged to Lab Review Queue
            </h4>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              Thank you for keeping the EcoBuild community safe. Your report has been submitted to the moderation ledger for administrator inspection.
            </p>
          </div>
          <button
            onClick={() => {
              setSubmitted(false);
              onClose();
            }}
            className="px-4 py-2 text-xs font-semibold text-white bg-[#087F83] hover:bg-[#066366] rounded-lg transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <strong>Reporting {targetType.replace('_', ' ')}:</strong>{' '}
              {targetDisplayName ? targetDisplayName : targetId}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Violation Category *
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value as any)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
            >
              <option value="unsafe-hardware">Unsafe Hardware Claims (Mains wiring, lithium fire hazards)</option>
              <option value="inappropriate-content">Inappropriate or Harassing Content</option>
              <option value="spam">Spam / Duplicate Listings</option>
              <option value="commercial-sales">Commercial Sales / Non-Sustainable Trading</option>
              <option value="other">Other Violation</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Detailed Description of Issue *
            </label>
            <textarea
              rows={3}
              required
              placeholder="Explain the specific safety hazard, misleading verification claim, or misconduct..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
            />
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-600 flex items-start gap-2">
            <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
            <span>
              EcoBuild maintains an honest review queue. Reports are evaluated based on documented electrical safety and community guidelines.
            </span>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Report'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
