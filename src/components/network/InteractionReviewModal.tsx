/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { VerifiedInteractionReview, MakerProfile } from '../../types';
import { Star, ShieldCheck, CheckCircle2, Info } from 'lucide-react';

interface InteractionReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  interactionType: 'workspace' | 'component_exchange';
  interactionId: string;
  targetMakerId: string;
  targetMakerDisplayName: string;
  activeUser: MakerProfile;
  onSubmitReview: (review: Omit<VerifiedInteractionReview, 'id' | 'createdAt'>) => Promise<void>;
}

export function InteractionReviewModal({
  isOpen,
  onClose,
  interactionType,
  interactionId,
  targetMakerId,
  targetMakerDisplayName,
  activeUser,
  onSubmitReview,
}: InteractionReviewModalProps) {
  const [rating, setRating] = useState<number>(5);
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedback.trim()) return;

    setIsSubmitting(true);
    try {
      await onSubmitReview({
        reviewerId: activeUser.id,
        reviewerDisplayName: activeUser.displayName,
        targetMakerId,
        interactionType,
        interactionId,
        rating,
        feedback: feedback.trim(),
      });
      setIsSubmitted(true);
    } catch (err: any) {
      alert(`Error submitting review: ${err?.message || err}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        setIsSubmitted(false);
        onClose();
      }}
      title="Verified Collaboration Review"
      maxWidth="max-w-lg"
    >
      {isSubmitted ? (
        <div className="p-6 text-center space-y-4">
          <div className="w-12 h-12 bg-emerald-100 text-emerald-800 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-base font-bold text-[#132B3B]">
              Review Submitted Successfully
            </h4>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              Your feedback on collaborating with {targetMakerDisplayName} has been posted to their public maker passport.
            </p>
          </div>
          <button
            onClick={() => {
              setIsSubmitted(false);
              onClose();
            }}
            className="px-4 py-2 text-xs font-semibold text-white bg-[#087F83] hover:bg-[#066366] rounded-lg transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700">
            <div>
              Reviewing verified interaction with <strong>{targetMakerDisplayName}</strong> from completed{' '}
              {interactionType === 'workspace' ? 'collaborative workspace' : 'hardware exchange'}.
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Collaboration & Communication Rating:
            </label>
            <div className="flex items-center gap-1.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  type="button"
                  key={star}
                  onClick={() => setRating(star)}
                  className="p-1 text-slate-300 hover:text-amber-400 focus:outline-none transition-colors cursor-pointer"
                >
                  <Star
                    className={`w-6 h-6 ${
                      star <= rating ? 'text-amber-400 fill-amber-400' : 'text-slate-300'
                    }`}
                  />
                </button>
              ))}
              <span className="text-xs font-bold text-slate-700 ml-2 font-mono">
                {rating} / 5 Stars
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Feedback Comments *
            </label>
            <textarea
              rows={3}
              required
              placeholder="e.g. Great teamwork on the breadboard wiring, quick response times during hardware debugging..."
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
            />
          </div>

          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-900 flex items-start gap-2">
            <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>
              <strong>Methodological Review Standard:</strong> Ratings evaluate interpersonal communication and team reliability. They do NOT certify electrical engineering competence, component health, or laboratory safety compliance.
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
              className="px-4 py-1.5 text-xs font-semibold text-white bg-[#087F83] hover:bg-[#066366] rounded-lg transition-colors cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? 'Submitting...' : 'Post Verified Review'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
