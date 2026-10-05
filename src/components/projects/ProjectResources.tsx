import { BookOpen, ExternalLink } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getProjectResources } from '../../data/projectResources';

export function ProjectResources({ projectId, stepId }: { projectId: string; stepId?: string }) {
  const { t } = useTranslation();
  const resources = getProjectResources(projectId);
  const relevant = stepId ? resources.filter(resource => resource.steps?.includes(stepId)) : resources;
  const remaining = stepId ? resources.filter(resource => !resource.steps?.includes(stepId)) : [];
  const cards = (items: typeof resources) => items.map(resource => <a key={resource.url} href={resource.url} target="_blank" rel="noopener noreferrer" className="block rounded-xl border border-slate-200 p-3 hover:border-[#087F83]/50 hover:bg-[#EAF4F3]/40 transition-colors space-y-1">
    <div className="flex items-start justify-between gap-2"><span className="text-[10px] font-semibold text-[#087F83]">{t(`buildSupport.${resource.kind}`)} · {resource.source}{resource.year ? ` · ${resource.year}` : ''}</span><ExternalLink className="w-3.5 h-3.5 shrink-0 text-slate-400" aria-label={t('buildSupport.newTab')} /></div>
    <h4 className="text-xs font-semibold leading-relaxed">{resource.title}</h4>
    <p className="text-xs text-slate-600 leading-relaxed">{resource.note}</p>
  </a>);
  return <section className="bg-white rounded-xl border border-slate-200 p-4 space-y-3" aria-label={t('buildSupport.resources')}>
    <h2 className="flex items-center gap-2 text-sm font-bold"><BookOpen className="w-4 h-4 text-[#087F83]" />{t('buildSupport.resources')}</h2>
    <p className="text-xs text-slate-500">{t('buildSupport.resourceNote')}</p>
    {stepId && relevant.length > 0 && <h3 className="text-xs font-bold text-[#087F83]">{t('buildSupport.forStep')}</h3>}
    <div className="space-y-2">{cards(relevant.length ? relevant : resources)}</div>
    {relevant.length > 0 && remaining.length > 0 && <details><summary className="cursor-pointer text-xs font-semibold text-[#087F83] py-2">{t('buildSupport.more')}</summary><div className="space-y-2 mt-2">{cards(remaining)}</div></details>}
  </section>;
}
