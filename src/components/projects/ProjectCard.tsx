import { useTranslation } from 'react-i18next';
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ProjectMatchResult } from '../../types';
import { ProjectIllustration } from '../illustrations/ProjectIllustrations';
import { Bookmark, Clock, ArrowRight, CheckCircle2, AlertCircle, Wrench } from 'lucide-react';

interface ProjectCardProps {
  match: ProjectMatchResult;
  isSaved: boolean;
  onToggleSave: (projectId: string) => void;
  onSelect: (projectId: string) => void;
}

export function ProjectCard({
  match,
  isSaved,
  onToggleSave,
  onSelect,
}: ProjectCardProps) {
  const { t } = useTranslation();
  const { project, coveragePercentage, missingCount, isFullyCovered, readinessState, recommendationReasons } = match;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md transition-all duration-200 flex flex-col overflow-hidden group">
      {/* Visual illustration top frame */}
      <div
        className="w-full h-44 bg-[#F8FAFC] relative overflow-hidden cursor-pointer border-b border-slate-100"
        onClick={() => onSelect(project.id)}
      >
        {(project.id === 'proj-smart-dustbin' || project.id === 'proj-night-light') && <span className="absolute bottom-3 left-3 z-10 rounded-lg bg-[#132B3B] text-white px-2.5 py-1 text-xs font-semibold">{t('studioPolish.guide')}</span>}
        <ProjectIllustration illustrationKey={project.illustrationKey} />
        
        {/* Quick Save button top-right */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleSave(project.id);
          }}
          aria-label={isSaved ? 'Remove from saved' : 'Save project'}
          className={`absolute top-3 right-3 p-2 rounded-lg backdrop-blur-xs transition-colors cursor-pointer ${
            isSaved
              ? 'bg-[#087F83] text-white shadow-xs'
              : 'bg-white/80 text-slate-600 hover:text-[#087F83] hover:bg-white shadow-2xs'
          }`}
        >
          <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
        </button>
      </div>

      {/* Card Content */}
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          {/* Clean Unboxed Metadata Line (Anti-Pill discipline) */}
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 font-medium mb-1.5">
            <span>{project.category}</span>
            <span aria-hidden="true" className="text-slate-300">·</span>
            <span>{project.difficulty}</span>
            <span aria-hidden="true" className="text-slate-300">·</span>
            <span className="inline-flex items-center gap-1">
              <Clock className="w-3 h-3 text-slate-400" />
              {project.estimatedDuration}
            </span>
          </div>

          {/* Title */}
          <h3
            onClick={() => onSelect(project.id)}
            className="text-base font-bold text-[#132B3B] group-hover:text-[#087F83] transition-colors cursor-pointer leading-snug"
          >
            {project.name}
          </h3>

          {/* Purpose */}
          <p className="text-xs text-slate-600 mt-1 line-clamp-2 leading-relaxed">
            {project.purpose}
          </p>

          {/* Component Coverage Bar */}
          <div className="mt-4 pt-3 border-t border-slate-100">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="font-semibold text-slate-700">Hardware Coverage</span>
              <span className="text-2xl font-bold text-[#087F83] tabular-nums">
                {coveragePercentage}%
              </span>
            </div>
            
            {/* Progress track */}
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  coveragePercentage === 100
                    ? 'bg-emerald-500'
                    : coveragePercentage >= 60
                    ? 'bg-[#087F83]'
                    : coveragePercentage > 0
                    ? 'bg-amber-500'
                    : 'bg-slate-300'
                }`}
                style={{ width: `${Math.min(100, Math.max(0, coveragePercentage))}%` }}
              />
            </div>

            {/* Missing or ready status text */}
            <div className="flex items-center justify-between mt-2 text-[11px]">
              {isFullyCovered ? (
                <span className="text-emerald-700 font-medium inline-flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  All electronic requirements covered
                </span>
              ) : (
                <span className="text-slate-600 font-medium inline-flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                  {missingCount} missing electronic {missingCount === 1 ? 'part' : 'parts'}
                </span>
              )}

              {match.potentialReuseMassGrams > 0 && (
                <span className="text-slate-400 font-mono tabular-nums">
                  ~{match.potentialReuseMassGrams}g reuse
                </span>
              )}
            </div>
          </div>

          {/* Concrete recommendation reasons */}
          {recommendationReasons && recommendationReasons.length > 0 && (
            <div className="mt-3 p-2.5 bg-[#EAF4F3]/60 rounded-lg border border-[#087F83]/15">
              <div className="text-[11px] text-[#132B3B] font-medium leading-relaxed">
                {recommendationReasons[0]}
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
          <button
            onClick={() => onSelect(project.id)}
            className="w-full inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#087F83] hover:text-white bg-[#EAF4F3] hover:bg-[#087F83] rounded-lg transition-colors cursor-pointer"
          >
            <span>View Project & Plan</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
