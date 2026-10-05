import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation } from 'wouter';
import { useTranslation } from 'react-i18next';
import { MessageCircle, Send, X, RotateCcw, ExternalLink } from 'lucide-react';
import { findTroubleshootingTopic, TROUBLESHOOTING_TOPICS, TroubleshootingTopic } from '../../data/troubleshooting';
import { getProjectResources } from '../../data/projectResources';

interface ChatMessage {
  id: number;
  role: 'user' | 'assistant';
  text: string;
  topic?: TroubleshootingTopic;
  followUp?: boolean;
}

export function TroubleshootingChat() {
  const { t } = useTranslation();
  const [location] = useLocation();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [lastTopic, setLastTopic] = useState<TroubleshootingTopic>();
  const launcher = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const field = useRef<HTMLInputElement>(null);
  const conversation = useRef<HTMLDivElement>(null);
  const nextId = useRef(0);
  const latestReply = useRef<HTMLDivElement>(null);
  const projectId = new URLSearchParams(window.location.search).get('project') || (location.startsWith('/projects/') ? location.split('/')[2] : undefined);
  const topicTitle = (topic: TroubleshootingTopic) => t(`chat.topics.${topic.id}`, topic.title);
  const close = () => { setOpen(false); launcher.current?.focus(); };

  useEffect(() => {
    if (open) field.current?.focus();
  }, [open]);

  useEffect(() => {
    if (conversation.current) {
      const box = conversation.current;
      box.scrollTop = latestReply.current ? box.scrollTop + latestReply.current.getBoundingClientRect().top - box.getBoundingClientRect().top - 16 : 0;
    }
  }, [messages, open]);

  const answer = (question: string, selected?: TroubleshootingTopic, followUp = false) => {
    const text = question.trim().slice(0, 600);
    if (!text) return;
    const unresolved = followUp || /still|didn.t work|not fixed|same issue/i.test(text);
    const topic = selected || findTroubleshootingTopic(text) || (unresolved ? lastTopic : undefined);
    const reply: ChatMessage = topic
      ? { id: nextId.current++, role: 'assistant', text: topic.title, topic, followUp: unresolved }
      : { id: nextId.current++, role: 'assistant', text: t('chat.unmatched') };
    setMessages(previous => [...previous.slice(-38), { id: nextId.current++, role: 'user', text }, reply]);
    setLastTopic(topic);
    setInput('');
  };

  const suggestedTopics = [...TROUBLESHOOTING_TOPICS].sort((a, b) => Number(b.projectId === projectId && !!projectId) - Number(a.projectId === projectId && !!projectId));

  const suggestions = <div className="flex flex-wrap gap-2" aria-label={t('chat.suggestions')}>{suggestedTopics.map(topic => <button key={topic.id} onClick={() => answer(topicTitle(topic), topic)} className="rounded-lg border border-teal-200 bg-teal-50/50 px-2.5 py-2 text-left text-xs text-[#087F83] hover:bg-teal-100">{topicTitle(topic)}</button>)}</div>;

  return (
    <>
      <button ref={launcher} onClick={() => setOpen(true)} aria-label={t('chat.open')} aria-haspopup="dialog" aria-expanded={open}
        title={t('chat.open')} className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-teal-200 bg-teal-50 text-[#087F83] hover:bg-teal-100">
        <MessageCircle className="h-5 w-5" />
      </button>
      {open && createPortal(
        <div className="fixed inset-0 z-[60] flex items-end justify-end bg-slate-950/20 p-3 sm:p-5" onClick={event => { if (event.target === event.currentTarget) close(); }}>
          <div ref={panel} role="dialog" aria-modal="true" aria-labelledby="troubleshooting-title"
            className="flex h-[min(680px,calc(100dvh-2rem))] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
            onKeyDown={event => {
              if (event.key === 'Escape') { event.stopPropagation(); close(); }
              if (event.key !== 'Tab') return;
              const focusable = [...(panel.current?.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],input') || [])];
              const first = focusable[0], last = focusable[focusable.length - 1];
              if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
              else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
            }}>
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-[#EAF4F3] p-4">
              <div className="min-w-0"><h2 id="troubleshooting-title" className="text-base font-bold">{t('chat.title')}</h2><p className="mt-1 text-xs text-slate-600">{t('chat.mode')}</p></div>
              <div className="flex shrink-0 gap-1">
                <button onClick={() => { setMessages([]); setLastTopic(undefined); setInput(''); field.current?.focus(); }} aria-label={t('chat.clear')} title={t('chat.clear')} className="rounded-lg p-2 text-slate-600 hover:bg-white"><RotateCcw className="h-4 w-4" /></button>
                <button onClick={close} aria-label={t('chat.close')} className="rounded-lg p-2 text-slate-600 hover:bg-white"><X className="h-5 w-5" /></button>
              </div>
            </div>
            <div ref={conversation} role="log" aria-label={t('chat.conversation')} aria-live="polite" aria-relevant="additions" className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-4">
              <div className="rounded-xl bg-slate-50 p-3 text-sm leading-relaxed text-slate-600"><p>{t('chat.welcome')}</p><p className="mt-2 text-xs">{t('chat.languageNote')}</p></div>
              {messages.map((message, index) => (
                <div key={message.id} ref={message.role === 'assistant' && index === messages.length - 1 ? latestReply : undefined} className={`rounded-xl p-3 text-sm leading-relaxed break-words ${message.role === 'user' ? 'ml-8 bg-[#087F83] text-white' : 'mr-2 border border-slate-200 bg-white text-slate-700'}`}>
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider opacity-70">{message.role === 'user' ? t('chat.you') : t('chat.assistant')}</p>
                  <p className={message.topic ? 'font-semibold text-[#132B3B]' : ''}>{message.topic ? topicTitle(message.topic) : message.text}</p>
                  {message.topic && <>
                    {message.followUp ? <p className="mt-2">{message.topic.followUp}</p> : <ol className="mt-2 list-decimal space-y-2 pl-5">{message.topic.checks.map(check => <li key={check}>{check}</li>)}</ol>}
                    <Link href={message.topic.href} onClick={close} className="mt-3 inline-flex rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-xs font-semibold text-[#087F83]">{t('chat.openGuide')}</Link>
                    {message.topic.projectId && <div className="mt-3 border-t border-slate-100 pt-2"><p className="mb-1 text-xs font-semibold">{t('chat.references')}</p>{getProjectResources(message.topic.projectId).filter(resource => resource.kind !== 'research').slice(0, 2).map(resource => <a key={resource.url} href={resource.url} target="_blank" rel="noopener noreferrer" className="flex items-start gap-1 py-1 text-xs text-[#087F83] underline underline-offset-2">{resource.title}<ExternalLink className="mt-0.5 h-3 w-3 shrink-0" /><span className="sr-only">{t('chat.newTab')}</span></a>)}</div>}
                  </>}
                </div>
              ))}
              {lastTopic && <button onClick={() => answer(t('chat.unresolved'), lastTopic, true)} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50">{t('chat.unresolved')}</button>}
              {messages.length ? <details className="rounded-lg border border-slate-200 p-3"><summary className="cursor-pointer text-xs font-semibold text-slate-600">{t('chat.moreTopics')}</summary><div className="mt-3">{suggestions}</div></details> : suggestions}
            </div>
            <form className="shrink-0 border-t border-slate-200 p-3" onSubmit={event => { event.preventDefault(); answer(input); }}>
              <label htmlFor="troubleshooting-question" className="sr-only">{t('chat.placeholder')}</label>
              <div className="flex gap-2"><input id="troubleshooting-question" ref={field} value={input} onChange={event => setInput(event.target.value)} maxLength={600} placeholder={t('chat.placeholder')} className="min-w-0 flex-1 rounded-xl border border-slate-300 px-3 py-2.5 text-sm" /><button type="submit" disabled={!input.trim()} aria-label={t('chat.send')} className="rounded-xl bg-[#087F83] p-3 text-white hover:bg-[#066366] disabled:opacity-40"><Send className="h-4 w-4" /></button></div>
              <p className="mt-2 text-[10px] leading-relaxed text-slate-500">{t('chat.privacy')}</p>
            </form>
          </div>
        </div>, document.body
      )}
    </>
  );
}
