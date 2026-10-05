import { useCallback, useEffect, useRef, useState } from 'react';
import { Volume2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/** Opt-in browser narration. It never changes assembly or completion state. */
export function VoiceGuidance({ text }: { text: string }) {
  const { t } = useTranslation();
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voiceURI, setVoiceURI] = useState('');
  const [rate, setRate] = useState(1);
  const [automatic, setAutomatic] = useState(false);
  const [status, setStatus] = useState<'idle' | 'speaking' | 'paused' | 'error'>('idle');
  const generation = useRef(0);
  const voiceList = useRef<SpeechSynthesisVoice[]>([]);
  const utterance = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    if (!supported) return;
    const refresh = () => {
      const available = window.speechSynthesis.getVoices().filter(voice => voice.lang.toLowerCase().startsWith('en'));
      voiceList.current = available;
      setVoices(available);
    };
    refresh();
    window.speechSynthesis.addEventListener('voiceschanged', refresh);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', refresh);
  }, [supported]);

  const stop = useCallback(() => {
    generation.current++;
    if (supported) window.speechSynthesis.cancel();
    utterance.current = null;
    setStatus('idle');
  }, [supported]);

  const read = useCallback(() => {
    if (!supported) return;
    stop();
    const token = generation.current;
    // Short utterances avoid browser engines stalling on an entire long guide.
    const sentences = text.match(/[^.!?]+[.!?]?/g) || [text];
    const chunks = sentences.flatMap(sentence => sentence.match(/.{1,220}(?:\s|$)|.{1,220}/g) || [sentence]);
    let index = 0;
    const next = () => {
      if (generation.current !== token) return;
      if (index >= chunks.length) { utterance.current = null; setStatus('idle'); return; }
      const speech = new SpeechSynthesisUtterance(chunks[index++].trim());
      speech.lang = 'en-IN';
      speech.voice = voiceList.current.find(voice => voice.voiceURI === voiceURI)
        || voiceList.current.find(voice => voice.lang === 'en-IN') || voiceList.current[0] || null;
      speech.rate = rate;
      speech.onstart = () => { if (generation.current === token) setStatus('speaking'); };
      speech.onend = next;
      speech.onerror = () => { if (generation.current === token) { utterance.current = null; setStatus('error'); } };
      utterance.current = speech;
      setStatus('speaking');
      try { window.speechSynthesis.speak(speech); }
      catch { utterance.current = null; setStatus('error'); }
    };
    next();
  }, [text, voiceURI, rate, stop, supported]);

  useEffect(() => {
    if (automatic) read();
    else stop();
    return () => { generation.current++; if (supported) window.speechSynthesis.cancel(); };
  }, [automatic, read, stop, supported]);

  return <section className="rounded-xl border border-[#087F83]/20 bg-[#EAF4F3]/60 p-3 space-y-2" aria-label={t('buildSupport.voice')}>
    <h3 className="flex items-center gap-2 text-xs font-bold"><Volume2 className="w-4 h-4 text-[#087F83]" />{t('buildSupport.voice')}</h3>
    {!supported ? <p className="text-xs text-slate-600" role="status">{t('buildSupport.unsupported')}</p> : <>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={read} className="rounded-lg bg-[#087F83] text-white px-3 py-2 text-xs font-semibold">{t(status === 'idle' || status === 'error' ? 'buildSupport.listen' : 'buildSupport.replay')}</button>
        <button type="button" disabled={status !== 'speaking' && status !== 'paused'} onClick={() => {
          if (status === 'paused') { window.speechSynthesis.resume(); setStatus('speaking'); }
          else { window.speechSynthesis.pause(); setStatus('paused'); }
        }} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs disabled:opacity-40">{t(status === 'paused' ? 'buildSupport.resume' : 'buildSupport.pause')}</button>
        <button type="button" onClick={() => { setAutomatic(false); stop(); }} disabled={status === 'idle' && !automatic} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs disabled:opacity-40">{t('buildSupport.stop')}</button>
        <label className="flex items-center gap-1 text-xs">{t('buildSupport.speed')}<select aria-label={t('buildSupport.speed')} value={rate} onChange={event => setRate(Number(event.target.value))} className="rounded border border-slate-300 bg-white p-1.5">{[0.75, 1, 1.25, 1.5].map(speed => <option key={speed} value={speed}>{speed}×</option>)}</select></label>
      </div>
      {voices.length > 0 && <label className="flex flex-wrap items-center gap-2 text-xs">{t('buildSupport.voiceChoice')}<select value={voiceURI} onChange={event => setVoiceURI(event.target.value)} className="min-w-0 w-full rounded-lg border border-slate-300 bg-white p-2" aria-label={t('buildSupport.voiceChoice')}><option value="">{t('buildSupport.defaultVoice')}</option>{voices.map(voice => <option key={voice.voiceURI} value={voice.voiceURI}>{voice.name} ({voice.lang})</option>)}</select></label>}
      <label className="flex items-start gap-2 text-xs"><input type="checkbox" checked={automatic} onChange={event => setAutomatic(event.target.checked)} className="mt-0.5 accent-[#087F83]" />{t('buildSupport.automatic')}</label>
      <p className="text-[11px] text-slate-600">{t('buildSupport.languageNote')}</p>
      <p role="status" aria-live="polite" className="text-[11px] text-[#087F83]">{t(`buildSupport.${status}`)}</p>
    </>}
  </section>;
}
