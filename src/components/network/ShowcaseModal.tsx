/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { ShowcaseProject, MakerProfile } from '../../types';
import {
  Sparkles,
  Heart,
  Plus,
  Trash2,
  Scale,
  Calendar,
  Layers,
  Wrench,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';

interface ShowcaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  showcaseProjects: ShowcaseProject[];
  activeUser: MakerProfile;
  onPublishShowcase: (project: Omit<ShowcaseProject, 'id' | 'createdAt' | 'likesCount'>) => Promise<void>;
  onUnpublishShowcase: (showcaseId: string) => Promise<void>;
}

export function ShowcaseModal({
  isOpen,
  onClose,
  showcaseProjects,
  activeUser,
  onPublishShowcase,
  onUnpublishShowcase,
}: ShowcaseModalProps) {
  const [activeTab, setActiveTab] = useState<'gallery' | 'publish'>('gallery');

  // Publish Form State
  const [title, setTitle] = useState('');
  const [recipeName, setRecipeName] = useState('Smart Dustbin (Touchless Lid Opener)');
  const [description, setDescription] = useState('');
  const [photoURL, setPhotoURL] = useState('');
  const [massDivertedGrams, setMassDivertedGrams] = useState(124);
  const [componentsList, setComponentsList] = useState('Arduino Uno, HC-SR04 Sonar, SG90 Servo, Half-Breadboard');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;

    setIsSubmitting(true);
    try {
      const parts = componentsList.split(',').map((s) => s.trim()).filter(Boolean);
      await onPublishShowcase({
        authorId: activeUser.id,
        authorDisplayName: activeUser.displayName,
        title: title.trim(),
        recipeName: recipeName.trim(),
        description: description.trim(),
        photoURL: photoURL.trim() || undefined,
        hardwareMassGrams: massDivertedGrams,
        componentsUsed: parts,
      });
      setTitle('');
      setDescription('');
      setActiveTab('gallery');
    } catch (err: any) {
      alert(`Error publishing showcase: ${err?.message || err}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Community Maker Showcase" maxWidth="max-w-4xl">
      <div className="space-y-6">
        {/* Navigation Bar */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('gallery')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                activeTab === 'gallery'
                  ? 'bg-[#087F83] text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 bg-slate-100'
              }`}
            >
              Community Gallery ({showcaseProjects.length})
            </button>
            <button
              onClick={() => setActiveTab('publish')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                activeTab === 'publish'
                  ? 'bg-[#087F83] text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 bg-slate-100'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Publish Completed Build</span>
            </button>
          </div>

          <div className="text-[11px] text-slate-500 hidden sm:block">
            Celebrating Sustainable Hardware Builds
          </div>
        </div>

        {/* Tab 1: Community Gallery */}
        {activeTab === 'gallery' && (
          <div className="space-y-4">
            {showcaseProjects.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[460px] overflow-y-auto">
                {showcaseProjects.map((p) => {
                  const isOwner = p.authorId === activeUser.id;

                  return (
                    <div
                      key={p.id}
                      className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden flex flex-col justify-between"
                    >
                      <div className="p-4 space-y-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="text-[10px] font-bold text-[#087F83] uppercase tracking-wider">
                              {p.recipeName}
                            </span>
                            <h4 className="text-base font-bold text-[#132B3B] mt-0.5">
                              {p.title}
                            </h4>
                            <div className="text-xs text-slate-500">
                              Built by <strong>{p.authorDisplayName}</strong>
                            </div>
                          </div>

                          {isOwner && (
                            <button
                              onClick={() => onUnpublishShowcase(p.id)}
                              className="text-xs text-rose-600 hover:text-rose-800 p-1 hover:bg-rose-50 rounded"
                              title="Unpublish from Showcase"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        <p className="text-xs text-slate-600 leading-relaxed">
                          {p.description}
                        </p>

                        {/* Parts Used Tag Pills */}
                        <div className="flex flex-wrap gap-1 pt-1">
                          {(p.componentsUsed || p.componentsList || p.usedComponentsSummary || []).map((comp, idx) => (
                            <span
                              key={idx}
                              className="text-[10px] font-mono px-2 py-0.5 bg-slate-100 text-slate-700 rounded border border-slate-200"
                            >
                              {comp}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Footer Badge */}
                      <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600 font-mono">
                        <div className="flex items-center gap-1.5 text-emerald-800 font-bold">
                          <Scale className="w-3.5 h-3.5 text-emerald-600" />
                          <span>~{p.hardwareMassGrams || p.massDivertedGrams || p.reuseMassGrams || 0}g Diverted</span>
                        </div>

                        <div className="flex items-center gap-1 text-slate-500 text-[11px]">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          <span>{new Date(p.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-8 bg-slate-50 rounded-xl border border-slate-200 text-center space-y-2">
                <Sparkles className="w-8 h-8 text-slate-400 mx-auto" />
                <h4 className="text-sm font-bold text-[#132B3B]">No Projects Showcased Yet</h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Be the first to publish your completed hardware build and inspire other makers across your community!
                </p>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Publish Form */}
        {activeTab === 'publish' && (
          <form onSubmit={handlePublish} className="space-y-4 bg-slate-50 p-5 rounded-xl border border-slate-200">
            <div>
              <h4 className="text-sm font-bold text-[#132B3B]">
                Publish Your Completed Hardware Build
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Share photos, diverted hardware mass, and lessons learned with the community. You can unpublish anytime.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Build Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. My Recycled Servo Dustbin with External Battery"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Base Recipe Name *
                </label>
                <input
                  type="text"
                  required
                  value={recipeName}
                  onChange={(e) => setRecipeName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Verified Diverted Hardware Mass (g) *
                </label>
                <input
                  type="number"
                  min="0"
                  max="50000"
                  required
                  value={massDivertedGrams}
                  onChange={(e) => setMassDivertedGrams(parseInt(e.target.value, 10) || 0)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Key Reused Components (Comma separated)
                </label>
                <input
                  type="text"
                  value={componentsList}
                  onChange={(e) => setComponentsList(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Build Story & Circuit Insights *
              </label>
              <textarea
                rows={3}
                required
                placeholder="Share how you wired your external power supply, salvaged motors, or tuned threshold calibration code..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-800"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setActiveTab('gallery')}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-[#087F83] hover:bg-[#066366] rounded-lg transition-colors cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? 'Publishing...' : 'Publish to Showcase'}
              </button>
            </div>
          </form>
        )}

        {/* Modal Footer */}
        <div className="flex justify-end pt-2 border-t border-slate-100">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            Close Showcase
          </button>
        </div>
      </div>
    </Modal>
  );
}
