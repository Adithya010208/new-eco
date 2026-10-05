/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';

interface LanguageSelectorProps {
  onLanguageChange?: (lang: 'en' | 'ta' | 'hi') => void;
  className?: string;
}

export function LanguageSelector({ onLanguageChange, className = '' }: LanguageSelectorProps) {
  const { i18n } = useTranslation();
  const currentLang = (i18n.language || 'en').substring(0, 2);

  const handleSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLang = e.target.value as 'en' | 'ta' | 'hi';
    i18n.changeLanguage(newLang);
    localStorage.setItem('ecobuild_language_preference', newLang);
    if (onLanguageChange) {
      onLanguageChange(newLang);
    }
  };

  return (
    <div className={`relative inline-flex items-center ${className}`}>
      <Globe className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 pointer-events-none" />
      <select
        value={currentLang}
        onChange={handleSelect}
        title="Select Platform Language"
        aria-label="Language selection"
        className="pl-7 pr-2.5 py-1 text-xs font-semibold bg-white border border-slate-200 rounded-lg text-slate-700 hover:border-slate-300 focus:outline-hidden focus:ring-1 focus:ring-[#087F83] focus:border-[#087F83] cursor-pointer transition-colors shadow-2xs appearance-none"
      >
        <option value="en">English</option>
        <option value="ta">தமிழ் (Tamil)</option>
        <option value="hi">हिन्दी (Hindi)</option>
      </select>
    </div>
  );
}
