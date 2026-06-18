import { useEffect, useMemo, useState, useRef } from 'react';
import { Link, useParams, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle, Calendar, CheckCircle2, ChevronRight, ChevronDown, Cpu,
  Download, FileSearch, Landmark, Loader2, Lock, ShieldCheck, Mic, File,
  XCircle, Scale, ArrowRight, Info, Clock
} from 'lucide-react';
import RiskBadge from '../components/RiskBadge';
import { apiGet, apiUpload, type ApiDocumentReport } from '../lib/api';

type RiskLevel = 'green' | 'amber' | 'red';

const pipeline = [
  { label: 'Loading from Vault',        sublabel: 'Decrypted locally – never uploaded', model: null, icon: Lock },
  { label: 'OCR Extraction',            sublabel: 'Text + structure extracted on-device', model: 'OCR_LATIN_RECOGNIZER_1', icon: FileSearch },
  { label: 'Document Classification',   sublabel: 'docType · userProfile · jurisdiction', model: 'LLAMA_3_2_1B_INST_Q4_0', icon: FileSearch },
  { label: 'Decision Engine',           sublabel: 'Risk · Deadline · Fraud · Schemes · Trust', model: 'LLAMA_3_2_1B_INST_Q4_0', icon: Cpu },
  { label: 'Vault Embedding',           sublabel: 'Stored in vakeel.db – cosine indexed', model: 'NOMIC_EMBED_TEXT_V1_5_Q8_0', icon: ShieldCheck },
];

function toRiskLevel(risk?: any): RiskLevel {
  if (typeof risk !== 'string') return 'green';
  const r = risk.toLowerCase();
  if (r.includes('high') || r.includes('red')) return 'red';
  if (r.includes('medium') || r.includes('amber')) return 'amber';
  return 'green';
}

function severityColor(sev: string): string {
  const s = sev?.toLowerCase();
  if (s === 'high') return 'text-risk-red bg-risk-red/10 border-risk-red/30';
  if (s === 'medium') return 'text-risk-amber bg-risk-amber/10 border-risk-amber/30';
  return 'text-risk-green bg-risk-green/10 border-risk-green/30';
}

function severityDot(sev: string): string {
  const s = sev?.toLowerCase();
  if (s === 'high') return 'bg-risk-red';
  if (s === 'medium') return 'bg-risk-amber';
  return 'bg-risk-green';
}

/** Collapsible risk card — premium style */
function RiskCard({ item, index }: { item: any; index: number }) {
  const [open, setOpen] = useState(index < 2);
  const sev = String(item.severity || 'MEDIUM').toUpperCase();
  const borderAccent = sev === 'HIGH' ? 'border-l-risk-red' : sev === 'MEDIUM' ? 'border-l-risk-amber' : 'border-l-risk-green';
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      className={`rounded-xl border border-border border-l-4 ${borderAccent} bg-white shadow-sm overflow-hidden`}
    >
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-start gap-3 p-4 text-left hover:bg-muted/20 transition-colors"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={`text-[10px] font-mono font-bold uppercase tracking-widest px-2 py-0.5 rounded border ${severityColor(sev)}`}>
              {sev}
            </span>
            <span className="font-bold text-sm text-foreground">{item.issue || item.type || 'Risk'}</span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{item.impact || item.evidence || ''}</p>
        </div>
        <ChevronDown className={`h-4 w-4 text-muted-foreground shrink-0 mt-1.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div key="body" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22 }} className="overflow-hidden">
            <div className="px-4 pb-4 space-y-3 border-t border-border/60 pt-3">
              {item.impact && (
                <div>
                  <div className="text-[10px] font-mono font-bold uppercase text-muted-foreground mb-1">⚡ Impact</div>
                  <p className="text-sm text-foreground/90 leading-relaxed">{item.impact}</p>
                </div>
              )}
              {item.evidence && (
                <div className="rounded-lg bg-muted/40 border border-border/60 p-3">
                  <div className="text-[10px] font-mono font-bold uppercase text-muted-foreground mb-1.5 flex items-center gap-1">
                    <FileSearch className="h-3 w-3" /> Clause Evidence
                  </div>
                  <p className="text-xs text-foreground/75 italic leading-relaxed">"{item.evidence}"</p>
                </div>
              )}
              {item.suggested_clause && (
                <div className="rounded-lg bg-primary/5 border border-primary/20 p-3">
                  <div className="text-[10px] font-mono font-bold uppercase text-primary mb-1.5 flex items-center gap-1.5">
                    <Scale className="h-3 w-3" /> Negotiate This Wording
                  </div>
                  <p className="text-xs text-foreground leading-relaxed">{item.suggested_clause}</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}


export default function Analyze() {
  const { persona } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [report, setReport] = useState<ApiDocumentReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeStep, setActiveStep] = useState(0);

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [transcribing, setTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Duplicate detection
  const [isDuplicate, setIsDuplicate] = useState(false);

  // Translation state
  const [reportLang, setReportLang] = useState('English');
  const [translating, setTranslating] = useState(false);
  const [translatedReport, setTranslatedReport] = useState<any>(null);

  const displayReport = translatedReport || report;

  const handleTranslateReport = async (lang: string) => {
    setReportLang(lang);
    if (lang === 'English') {
      setTranslatedReport(null);
      return;
    }
    setTranslating(true);
    try {
      const { apiPost } = await import('../lib/api');
      // Include all translatable fields: riskReport, schemes, deadlines, trustReport, profile
      const payload = {
        riskReport: report?.riskReport,
        schemes: report?.schemes,
        deadlines: report?.deadlines,
        trustReport: report?.trustReport,
        profile: report?.profile,
      };
      const translated = await apiPost<any>('/api/translate-report', { report: payload, language: lang });
      setTranslatedReport({
        ...(report || {}),
        riskReport:  translated.riskReport  ?? report?.riskReport,
        deadlines:   translated.deadlines   ?? report?.deadlines,
        schemes:     translated.schemes     ?? report?.schemes,
        trustReport: translated.trustReport ?? report?.trustReport,
        // merge translated profile so docType shows in header
        profile: translated.profile
          ? { ...(report?.profile || {}), ...translated.profile }
          : report?.profile,
      } as any);
    } catch (err) {
      console.error('Translation error:', err);
    }
    setTranslating(false);
  };

  useEffect(() => {
    let isMounted = true;

    if (persona === 'processing') {
      const file = location.state?.file as File | undefined;
      if (!file) { navigate('/vault', { replace: true }); return; }

      const processFile = async () => {
        setLoading(true); setError(null); setActiveStep(0);
        const interval = setInterval(() => setActiveStep(prev => prev < 4 ? prev + 1 : prev), 4000);
        try {
          const result = await apiUpload(file);
          clearInterval(interval);
          if (isMounted) navigate(`/analyze/${result.id}`, { replace: true, state: { duplicate: result.duplicate } });
        } catch (err) {
          clearInterval(interval);
          if (isMounted) { setError(err instanceof Error ? err.message : 'Upload failed'); setLoading(false); }
        }
      };
      void processFile();
      return () => { isMounted = false; };
    }

    const loadReport = async () => {
      if (!persona) return;
      try {
        setLoading(true); setError(null); setActiveStep(0);
        const isDemo = ['tax-loan', 'land-title', 'cross-border-tax', 'contract-verify'].includes(persona);
        let interval: any;
        if (isDemo) interval = setInterval(() => setActiveStep(prev => prev < 4 ? prev + 1 : prev), 800);

        const data = await apiGet<ApiDocumentReport>(`/api/documents/${persona}`);

        if (isDemo) { await new Promise(r => setTimeout(r, 4000)); clearInterval(interval); }
        if (isMounted) {
          setReport(data);
          setActiveStep(5);
          // Restore duplicate flag when navigated here from upload
          if (location.state?.duplicate) setIsDuplicate(true);
        }
      } catch (loadError) {
        if (isMounted) setError(loadError instanceof Error ? loadError.message : 'Failed to load analysis');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    void loadReport();
    return () => { isMounted = false; };
  }, [persona, location.state, navigate]);

  /* ── Voice recording ───────────────────────────────────── */
  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
    }
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    setIsRecording(false);
    setRecordingSeconds(0);
  };

  const toggleRecording = async () => {
    if (isRecording) { stopRecording(); return; }

    setTranscript('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { sampleRate: 16000, channelCount: 1, echoCancellation: true, noiseSuppression: true } });

      const { getSupportedMimeType } = await import('../lib/audio');
      const mimeType = getSupportedMimeType();
      const options = mimeType ? { mimeType } : {};
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = e => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };

      mediaRecorder.onstop = async () => {
        setTranscribing(true);
        setTranscript('Transcribing with Whisper…');
        try {
          const rawBlob = new Blob(audioChunksRef.current, { type: mimeType || 'audio/webm' });
          const { convertToWav } = await import('../lib/audio');
          const wavBlob = await convertToWav(rawBlob);
          const { apiTranscribe } = await import('../lib/api');
          const res = await apiTranscribe(wavBlob, 'voice.wav', reportLang || 'English');

          if (res.loading) {
            setTranscript('⏳ Whisper is loading — please wait a moment and try again.');
          } else if (res.text.trim()) {
            setTranscript(res.text);
            if (report) setTimeout(() => navigate(`/chat?doc=${report.id}&q=${encodeURIComponent(res.text)}`), 1800);
          } else {
            setTranscript('No speech detected. Try speaking clearly and closer to the microphone.');
          }
        } catch (err) {
          setTranscript('Transcription failed. Please try again.');
        }
        setTranscribing(false);
      };

      mediaRecorder.start(250); // collect data every 250ms
      setIsRecording(true);

      // Recording timer
      let secs = 0;
      recordingTimerRef.current = setInterval(() => {
        secs += 1;
        setRecordingSeconds(secs);
        if (secs >= 30) stopRecording(); // auto-stop at 30s
      }, 1000);

    } catch {
      setTranscript('Microphone access denied. Please allow microphone access in browser settings.');
    }
  };

  /* ── Derived display data ─────────────────────────────── */
  const risk = toRiskLevel(displayReport?.riskReport?.overallRisk);

  const risks = useMemo(() => Array.isArray(displayReport?.riskReport?.risks) ? displayReport.riskReport.risks : [], [displayReport]);
  const fraudFlags = useMemo(() => Array.isArray(displayReport?.riskReport?.fraudFlags) ? displayReport.riskReport.fraudFlags : [], [displayReport]);
  const positives = useMemo(() => Array.isArray(displayReport?.riskReport?.positives) ? displayReport.riskReport.positives : [], [displayReport]);
  const negotiations = useMemo(() => Array.isArray(displayReport?.riskReport?.negotiations) ? displayReport.riskReport.negotiations : [], [displayReport]);
  const whatCanGoWrong = useMemo(() => Array.isArray(displayReport?.riskReport?.whatCanGoWrong) ? displayReport.riskReport.whatCanGoWrong : [], [displayReport]);
  const immediateActions = useMemo(() => Array.isArray(displayReport?.riskReport?.immediateActions) ? displayReport.riskReport.immediateActions : [], [displayReport]);

  // Detect if the document uses filler obfuscation (from fraudFlags or risk report)
  const hasFillerObfuscation = useMemo(() =>
    fraudFlags.some((f: any) => /obfuscat|repetiti|filler/i.test(f.type || '')) ||
    risks.some((r: any) => /obfuscat|repetiti|filler/i.test(r.issue || ''))
  , [fraudFlags, risks]);

  const trustScore = displayReport?.trustReport?.scoreNumeric ?? (risk === 'red' ? 28 : risk === 'amber' ? 62 : 85);

  const exportToCalendar = () => {
    if (!Array.isArray(displayReport?.deadlines) || displayReport.deadlines.length === 0) return;
    let ics = 'BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//VAKEEL//Legal Deadlines//EN\n';
    displayReport.deadlines.forEach((d: any) => {
      if (!d.alert_date) return;
      const dt = d.alert_date.replace(/-/g, '');
      const next = new Date(new Date(d.alert_date).getTime() + 86400000).toISOString().split('T')[0].replace(/-/g, '');
      ics += `BEGIN:VEVENT\nDTSTART;VALUE=DATE:${dt}\nDTEND;VALUE=DATE:${next}\nSUMMARY:Legal Deadline: ${d.description}\nDESCRIPTION:VAKEEL Alert\\nSeverity: ${d.severity}\nEND:VEVENT\n`;
    });
    ics += 'END:VCALENDAR';
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `vakeel-deadlines-${report?.id}.ics`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };

  // Display-only meta
  const displayDocType = (displayReport as any)?.profile?.docType
    || (displayReport as any)?.riskReport?.documentType
    || report?.profile?.docType
    || 'Document';

  const displayFileName = report?.filename
    ?? (persona === 'processing' && location.state?.file ? (location.state.file as File).name : 'Document.pdf');
  const displayPages = report?.pages ?? 0;

  if (error) return (
    <div className="container mx-auto max-w-3xl px-4 py-16">
      <div className="rounded-2xl border border-risk-red/30 bg-risk-red/5 p-6">
        <h1 className="font-display text-2xl font-bold mb-3">Analysis unavailable</h1>
        <p className="text-sm text-muted-foreground mb-5">{error}</p>
        <Link to="/vault" className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground">
          Back to Vault <ChevronRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );

  return (
    <div className="container mx-auto max-w-5xl px-4 py-10">
      {/* ── Duplicate notice ───────────────────────────────── */}
      {isDuplicate && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 flex items-start gap-3 rounded-xl border border-risk-amber/30 bg-risk-amber/8 px-4 py-3 text-sm text-risk-amber"
        >
          <Info className="h-4 w-4 shrink-0 mt-0.5" />
          <span>
            <strong>Already in vault.</strong> This document was previously analysed — showing the cached result.{' '}
            <Link to="/vault" className="underline underline-offset-2 hover:opacity-80">View all vault docs →</Link>
          </span>
        </motion.div>
      )}

      {/* OCR Error Banner */}
      {!loading && (report as any)?.riskReport?.ocrError && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 rounded-2xl border-2 border-risk-red/40 bg-risk-red/5 p-6"
        >
          <div className="flex items-start gap-4">
            <div className="shrink-0 w-12 h-12 rounded-full bg-risk-red/10 flex items-center justify-center">
              <AlertTriangle className="h-6 w-6 text-risk-red" />
            </div>
            <div>
              <h3 className="font-display font-bold text-lg text-risk-red mb-2">⚠️ Document Scan Quality Too Low</h3>
              <p className="text-sm text-foreground/80 leading-relaxed mb-4">
                The AI could not reliably extract text from this document. The scan appears to be too blurry, distorted, or uses a non-standard font that confused the OCR engine.
              </p>
              <div className="rounded-xl bg-white border border-risk-red/20 p-4 space-y-2">
                <div className="text-xs font-mono font-bold uppercase text-muted-foreground mb-2">What to do:</div>
                <div className="flex items-start gap-2 text-sm text-foreground/80">
                  <span className="text-risk-red font-bold mt-0.5">1.</span>
                  <span><strong>Upload a digital PDF</strong> — if you received this document digitally (e.g., exported from Word or a government portal), use that version directly. Avoid scanning a printout.</span>
                </div>
                <div className="flex items-start gap-2 text-sm text-foreground/80">
                  <span className="text-risk-red font-bold mt-0.5">2.</span>
                  <span><strong>Rescan at higher resolution</strong> — if you must scan, use at least 300 DPI, good lighting, and ensure the page is flat with no shadows or skewing.</span>
                </div>
                <div className="flex items-start gap-2 text-sm text-foreground/80">
                  <span className="text-risk-red font-bold mt-0.5">3.</span>
                  <span><strong>Try a different format</strong> — JPEG, PNG, and PDF are all supported. Avoid low-quality WhatsApp-compressed images.</span>
                </div>
              </div>
              <Link to="/vault" className="mt-4 inline-flex items-center gap-2 rounded-xl bg-risk-red text-white px-4 py-2 text-sm font-bold hover:bg-risk-red/90 transition-colors">
                ← Go back and upload again
              </Link>
            </div>
          </div>
        </motion.div>
      )}


      {/* ── Header ─────────────────────────────────────────── */}
      <div className="mb-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
            <Link to="/" className="hover:text-foreground">VAKEEL</Link>
            <span>/</span>
            <span className="text-foreground">Vault · Analysis</span>
          </div>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-3xl font-display font-bold text-foreground tracking-tight mb-2">Analysis Results</h1>
              <p className="text-muted-foreground flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted text-xs font-mono font-medium">
                  <File className="w-3.5 h-3.5" />{displayFileName}
                </span>
                · {displayDocType}
                {displayPages > 0 && <span className="text-xs">· {displayPages} pages</span>}
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              {translating && <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />}
              <select
                value={reportLang}
                onChange={e => handleTranslateReport(e.target.value)}
                disabled={translating || loading}
                className="px-4 py-2 border border-border bg-card rounded-xl text-sm font-medium hover:bg-muted transition-colors outline-none focus:border-primary appearance-none min-w-[140px]"
              >
                <option value="English">🇬🇧 English</option>
                <option value="Hindi">🇮🇳 Hindi</option>
                <option value="Marathi">🇮🇳 Marathi</option>
                <option value="Tamil">🇮🇳 Tamil</option>
                <option value="Telugu">🇮🇳 Telugu</option>
                <option value="Bengali">🇮🇳 Bengali</option>
              </select>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-1.5 text-xs font-mono text-muted-foreground">
              <Cpu className="h-3.5 w-3.5" />@qvac/sdk
            </span>
            <span className="rounded-lg bg-muted px-3 py-1.5 text-xs font-mono text-muted-foreground">LLAMA_3_2_1B_INST_Q4_0</span>
            <span className="rounded-lg bg-risk-amber/10 text-risk-amber px-3 py-1.5 text-xs font-mono">100% offline</span>
          </div>
        </div>
        {!loading && displayReport && <RiskBadge level={risk} />}
        {loading && (
          <div className="inline-flex items-center gap-2 rounded-full bg-muted/50 px-4 py-2 text-sm font-semibold text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Analyzing
          </div>
        )}
      </div>

      {/* ── Pipeline + Summary card ─────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        className="overflow-hidden rounded-2xl border border-border bg-[#FBFBFA] shadow-sm">
        <div className="flex flex-col gap-3 border-b border-border bg-white px-5 py-4 md:flex-row md:items-center md:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <Lock className="h-4 w-4 text-foreground/70" />
            <span className="truncate font-mono text-sm font-bold text-foreground">{displayFileName}</span>
            <span className="text-xs text-muted-foreground">
              {persona === 'processing' ? 'Extracting pages…' : displayPages > 0 ? `${displayPages} pages` : ''}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="h-2 w-2 rounded-full bg-risk-green" />
            Processing on-device
          </div>
        </div>

        <div className="grid gap-8 p-6 lg:grid-cols-[1fr_0.95fr] lg:p-8">
          {/* Pipeline steps */}
          <div>
            <h2 className="mb-5 text-xs font-mono font-bold uppercase tracking-[0.25em] text-muted-foreground">QVAC Processing Pipeline</h2>
            <div className="space-y-3">
              {pipeline.map((step, index) => {
                const Icon = step.icon;
                const isCompleted = activeStep > index;
                const isCurrent = activeStep === index && loading;
                return (
                  <motion.div key={step.label} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.06 }}
                    className={`rounded-xl border p-4 transition-all duration-500 ${
                      isCompleted ? 'border-border bg-black/5' :
                      isCurrent  ? 'border-primary bg-primary/5 shadow-sm' :
                      'border-border/40 bg-transparent opacity-50'}`}>
                    <div className="flex items-start gap-4">
                      <div className={`mt-0.5 flex h-9 w-9 items-center justify-center rounded-full border-2 ${
                        isCompleted ? 'border-primary text-primary' :
                        isCurrent  ? 'border-primary text-primary animate-pulse' :
                        'border-muted-foreground/30 text-muted-foreground/30'}`}>
                        {isCompleted ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-foreground">{step.label}</div>
                        <div className="text-xs text-muted-foreground">{step.sublabel}</div>
                        {step.model && (
                          <div className="mt-2 inline-flex items-center gap-1 rounded bg-black/5 px-2 py-1 text-[10px] font-mono text-muted-foreground">
                            {step.model}
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Right panel — loading spinner or summary */}
          {loading || !displayReport ? (
            <div className="flex flex-col items-center justify-center p-8 rounded-2xl bg-[#F5F5F3] border border-border border-dashed h-full min-h-[400px]">
              <div className="relative mb-6">
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                  className="w-16 h-16 rounded-full border-4 border-muted-foreground/20 border-t-primary" />
                <div className="absolute inset-0 flex items-center justify-center"><Lock className="h-6 w-6 text-foreground" /></div>
              </div>
              <h3 className="text-xl font-display font-bold text-foreground mb-2">Analyzing Securely</h3>
              <p className="text-sm text-muted-foreground text-center max-w-[280px] mb-8">Your document is being processed entirely on your device.</p>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <span className="rounded bg-black/5 px-2 py-1 text-[10px] font-mono text-muted-foreground">LLAMA_3_2_1B_INST_Q4_0</span>
                <span className="rounded bg-black/5 px-2 py-1 text-[10px] font-mono text-muted-foreground">NOMIC_EMBED_TEXT_V1_5_Q8_0</span>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Trust Score Panel - Premium */}
              <div className="rounded-2xl border border-border bg-[#FBFBFA] p-6 shadow-sm relative overflow-hidden">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className={`h-5 w-5 ${risk === 'red' ? 'text-risk-red' : risk === 'amber' ? 'text-risk-amber' : 'text-risk-green'}`} />
                    <span className="font-display font-bold text-foreground">VAKEEL Trust Score</span>
                  </div>
                  <RiskBadge level={risk} size="sm" />
                </div>

                <div className="flex items-end gap-4 mb-5">
                  <div className="text-5xl font-display font-black tracking-tight" style={{ color: risk === 'red' ? 'hsl(0 78% 52%)' : risk === 'amber' ? 'hsl(38 90% 48%)' : 'hsl(152 64% 28%)' }}>
                    {trustScore}
                  </div>
                  <div className="text-sm font-semibold text-muted-foreground pb-1.5">/ 100</div>
                </div>

                <div className="h-2.5 rounded-full bg-muted/60 overflow-hidden mb-2">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${trustScore}%` }}
                    transition={{ duration: 1.2, ease: 'easeOut' }}
                    className={`h-full rounded-full ${risk === 'red' ? 'bg-risk-red' : risk === 'amber' ? 'bg-risk-amber' : 'bg-risk-green'}`}
                  />
                </div>
                <div className="flex justify-between text-[10px] font-mono text-muted-foreground font-bold mb-6">
                  <span>0 — HIGH RISK</span>
                  <span>100 — SAFE</span>
                </div>

                {displayReport.trustReport?.summary && (
                  <div className="rounded-xl bg-white border border-border/50 p-4 mb-4">
                    <p className="text-sm text-foreground/90 leading-relaxed font-medium">
                      {displayReport.trustReport.summary}
                    </p>
                  </div>
                )}

                {/* What can go wrong — numbered top summary */}
                {whatCanGoWrong.length > 0 && (
                  <div className="mt-2">
                    <div className="text-[10px] font-mono font-bold uppercase text-muted-foreground mb-3 flex items-center gap-1.5">
                      <ChevronRight className="h-3 w-3" /> Bottom Line Verdict
                    </div>
                    <ul className="space-y-2.5">
                      {whatCanGoWrong.slice(0, 3).map((w: any, i: number) => (
                        <li key={i} className="text-sm font-medium text-foreground/90 leading-relaxed flex items-start gap-2.5">
                          <span className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-white ${risk === 'red' ? 'bg-risk-red' : risk === 'amber' ? 'bg-risk-amber' : 'bg-risk-green'}`}>
                            {i + 1}
                          </span>
                          {typeof w === 'string' ? w : w.issue || w.text || ''}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Cross-Border Jurisdiction Warning */}
              {displayReport.profile?.isCrossBorder && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                  <div className="rounded-xl border-2 border-[#1E3A8A]/30 bg-[#EFF6FF] p-4 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                      <svg width="64" height="64" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM11 19.93C7.06 19.43 4 16.05 4 12C4 11.68 4.03 11.36 4.08 11.05L7.75 14.72C8.04 15.01 8.52 14.81 8.52 14.4V13H10V15C10 15.55 10.45 16 11 16V19.93ZM19.93 11H18V9.5C18 9.22 17.78 9 17.5 9H15V6C15 5.45 14.55 5 14 5H12.72C12.38 5 12.06 5.16 11.85 5.43L10 7.8V9H8C7.45 9 7 9.45 7 10V11H6.5C6.22 11 6 11.22 6 11.5V12C6 12.55 6.45 13 7 13H10V11C10 10.45 10.45 10 11 10H14V12H16V14C16 14.55 16.45 15 17 15H18.66C18.15 17.38 16.59 19.29 14.5 20.37C15.82 20.15 17.06 19.45 18 18.42V17C18 16.45 18.45 16 19 16H20.08C20.67 14.47 21 12.78 21 11H19.93Z" />
                      </svg>
                    </div>
                    <div className="flex items-center gap-2 mb-2 text-[#1E3A8A]">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/><path d="M2 12h20"/></svg>
                      <span className="text-xs font-mono font-bold uppercase tracking-widest">Cross-Border Jurisdiction</span>
                    </div>
                    <p className="text-sm font-medium text-[#1E3A8A]/90 leading-relaxed pr-8">
                      This is an international contract. Foreign labor laws, FEMA tax regulations, and jurisdiction issues apply. See specific risks below.
                    </p>
                  </div>
                </motion.div>
              )}

              {/* Next action */}
              {(displayReport.riskReport?.negotiations?.[0]?.suggestion || displayReport.deadlines?.[0]?.description) && (
                <div className="rounded-xl border border-border bg-white p-4 shadow-sm">
                  <div className="mb-2 flex items-center gap-2 text-[10px] font-mono font-bold uppercase tracking-widest text-muted-foreground">
                    <ArrowRight className="h-3 w-3" /> Next Action
                  </div>
                  <p className="text-sm font-semibold leading-relaxed text-foreground">
                    {displayReport.riskReport?.negotiations?.[0]?.suggestion || displayReport.deadlines?.[0]?.description || 'Review the highlighted clauses before signing.'}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>

      {/* ── Detailed analysis section (shown after load) ────── */}
      {!loading && displayReport && (
        <>
          {/* Filler Obfuscation Warning */}
          {hasFillerObfuscation && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mt-6">
              <div className="rounded-xl border-2 border-risk-red/40 bg-risk-red/5 px-5 py-4 flex items-start gap-4">
                <div className="shrink-0 w-10 h-10 rounded-full bg-risk-red/10 flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5 text-risk-red" />
                </div>
                <div>
                  <div className="font-bold text-risk-red text-sm mb-1">⚠️ Hidden Clause Alert</div>
                  <p className="text-sm text-foreground/80 leading-relaxed">
                    This document uses <strong>repetitive boilerplate paragraphs</strong> — a known technique to hide dangerous clauses deep inside long documents.
                    VAKEEL has scanned the <strong>full document</strong> beyond the filler text. All flagged clauses are shown below.
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Immediate Actions — shown prominently at the top */}
          {immediateActions.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="mt-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-risk-red text-white">
                  <ArrowRight className="h-3.5 w-3.5" />
                </div>
                <h2 className="font-display font-bold text-xl text-foreground">Immediate Actions</h2>
                <span className="rounded-full bg-risk-red/10 text-risk-red px-2.5 py-0.5 text-xs font-bold">Do this now</span>
              </div>
              <div className="space-y-3">
                {immediateActions.map((action: any, idx: number) => {
                  const priorityColor =
                    action.priority === 'URGENT' ? 'border-risk-red/40 bg-risk-red/5' :
                    action.priority === 'HIGH'   ? 'border-risk-amber/40 bg-risk-amber/5' :
                                                   'border-border bg-muted/30';
                  const badgeColor =
                    action.priority === 'URGENT' ? 'bg-risk-red text-white' :
                    action.priority === 'HIGH'   ? 'bg-risk-amber text-white' :
                                                   'bg-muted text-muted-foreground';
                  return (
                    <div key={idx} className={`rounded-xl border-2 p-5 ${priorityColor}`}>
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="font-bold text-base text-foreground leading-tight">{action.action}</div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <span className={`text-[10px] font-mono font-bold px-2.5 py-1 rounded-full ${badgeColor}`}>
                            {action.priority}
                          </span>
                          {action.deadline && (
                            <span className="text-[10px] text-muted-foreground font-mono">{action.deadline}</span>
                          )}
                        </div>
                      </div>
                      {action.reason && (
                        <p className="text-sm text-foreground/70 leading-relaxed">{action.reason}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* Fraud Flags */}
          {fraudFlags.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mt-6">
              <div className="flex items-center gap-2 mb-4">
                <XCircle className="h-5 w-5 text-risk-red" />
                <h2 className="font-display font-bold text-xl text-foreground">Hidden &amp; Dangerous Clauses</h2>
                <span className="rounded-full bg-risk-red/10 text-risk-red px-2.5 py-0.5 text-xs font-bold">{fraudFlags.length} detected</span>
              </div>
              <div className="space-y-3">
                {fraudFlags.map((flag: any, idx: number) => (
                  <motion.div key={idx} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="rounded-xl border-2 border-risk-red/25 bg-risk-red/4 overflow-hidden">
                    <div className="flex items-start gap-3 p-4">
                      <div className="mt-0.5 shrink-0 w-9 h-9 rounded-full bg-risk-red/15 flex items-center justify-center">
                        <AlertTriangle className="h-4 w-4 text-risk-red" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-2 flex-wrap mb-2">
                          <span className="font-bold text-sm text-risk-red flex-1">{flag.type || 'Hidden Clause'}</span>
                          <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border shrink-0 ${severityColor(flag.severity || 'HIGH')}`}>
                            {flag.severity || 'HIGH'}
                          </span>
                        </div>
                        {flag.evidence && (
                          <div className="rounded-lg bg-white border border-risk-red/15 px-3 py-2">
                            <div className="text-[10px] font-mono text-muted-foreground uppercase mb-1 flex items-center gap-1">
                              <FileSearch className="h-3 w-3" /> Pattern Detected in Document
                            </div>
                            <p className="text-xs text-foreground/80 leading-relaxed italic">{flag.evidence}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Risk Items */}
          {risks.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="mt-6">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="h-5 w-5 text-risk-amber" />
                <h2 className="font-display font-bold text-xl text-foreground">Key Risks</h2>
                <span className="rounded-full bg-risk-amber/10 text-risk-amber px-2.5 py-0.5 text-xs font-bold">{risks.length}</span>
              </div>
              <div className="space-y-3">
                {risks.map((item: any, idx: number) => <RiskCard key={idx} item={item} index={idx} />)}
              </div>
            </motion.div>
          )}

          {/* Negotiations — Premium Playbook */}
          {negotiations.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mt-6">
              <div className="flex items-center gap-2 mb-4">
                <Scale className="h-5 w-5 text-primary" />
                <h2 className="font-display font-bold text-xl text-foreground">Negotiation Playbook</h2>
                <span className="rounded-full bg-primary/10 text-primary px-2.5 py-0.5 text-xs font-bold">{negotiations.length} clauses</span>
              </div>
              <div className="space-y-3">
                {negotiations.map((n: any, idx: number) => (
                  <div key={idx} className="rounded-xl border border-primary/20 bg-white shadow-sm overflow-hidden">
                    <div className="grid md:grid-cols-[1fr_auto_1fr]">
                      <div className="p-4">
                        <div className="text-[10px] font-mono font-bold uppercase text-muted-foreground mb-2 flex items-center gap-1.5">
                          <span className="w-4 h-4 rounded-full bg-risk-red/15 text-risk-red text-[9px] flex items-center justify-center font-bold shrink-0">{idx + 1}</span>
                          Problem Clause
                        </div>
                        <p className="text-sm font-semibold text-foreground/90 leading-relaxed">{n.clause}</p>
                      </div>
                      <div className="hidden md:flex items-center justify-center px-2">
                        <ArrowRight className="h-4 w-4 text-primary/40" />
                      </div>
                      <div className="p-4 bg-primary/3 border-t md:border-t-0 md:border-l border-primary/15">
                        <div className="text-[10px] font-mono font-bold uppercase text-primary mb-2 flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" /> Your Negotiation Ask
                        </div>
                        <p className="text-sm text-foreground/90 leading-relaxed">{n.suggestion}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Positives */}
          {positives.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="mt-6">
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle2 className="h-5 w-5 text-risk-green" />
                <h2 className="font-display font-bold text-xl text-foreground">Clauses in Your Favour</h2>
                <span className="rounded-full bg-risk-green/10 text-risk-green px-2.5 py-0.5 text-xs font-bold">{positives.length}</span>
              </div>
              <div className="rounded-xl border border-risk-green/20 bg-risk-green/4 p-5 space-y-3">
                {positives.map((pos: any, idx: number) => (
                  <div key={idx} className="flex items-start gap-3">
                    <div className="shrink-0 w-6 h-6 rounded-full bg-risk-green/15 flex items-center justify-center mt-0.5">
                      <CheckCircle2 className="h-3.5 w-3.5 text-risk-green" />
                    </div>
                    <p className="text-sm text-foreground/90 leading-relaxed">{typeof pos === 'string' ? pos : pos.issue || pos.text || ''}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          )}


          {/* Bottom 3-col grid: Deadlines + Rights + Export */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="mt-8 grid gap-4 md:grid-cols-3">
            {/* Deadlines */}
            <div className="rounded-2xl border border-border bg-[#FBFBFA] p-6 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-foreground/60" />
                <h3 className="font-display font-bold">Deadline Engine</h3>
              </div>
              <div className="space-y-3">
                              {Array.isArray(displayReport.deadlines) && displayReport.deadlines.length > 0 ? (
                  displayReport.deadlines.map((d: any, idx: number) => (
                    <div key={idx} className={`p-3 rounded-xl border bg-white ${
                      d.severity === 'HIGH' ? 'border-risk-red/30' : 'border-border'
                    }`}>
                      {/* Title = d.type (human-readable), fallback to d.description */}
                      <div className="font-semibold text-sm mb-1 text-foreground leading-snug">
                        {d.type && d.type !== d.description ? d.type : (d.description || d.type || 'Deadline')}
                      </div>
                      {/* Show description as subtitle only if it differs from type */}
                      {d.description && d.description !== d.type && (
                        <p className="text-xs text-muted-foreground mb-1.5 leading-relaxed">{d.description}</p>
                      )}
                      <div className="flex items-center gap-2 text-xs">
                        {d.alert_date && (
                          <span className="flex items-center gap-1 font-mono text-muted-foreground">
                            <Clock className="h-3 w-3" />{d.alert_date}
                          </span>
                        )}
                        {d.severity && (
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            severityColor(d.severity)
                          }`}>{d.severity}</span>
                        )}
                      </div>
                    </div>
                  ))
                ) : <p className="text-sm text-muted-foreground">No deadlines found in this document.</p>}
                {Array.isArray(displayReport.deadlines) && displayReport.deadlines.length > 0 && (
                  <button onClick={exportToCalendar}
                    className="w-full mt-2 flex items-center justify-center gap-2 rounded-xl border border-border bg-white px-4 py-2.5 text-sm font-bold text-foreground hover:bg-muted/50 transition-colors">
                    <Calendar className="w-4 h-4" /> Export to Calendar
                  </button>
                )}
              </div>
            </div>

            {/* Rights / Schemes */}
            <div className="rounded-2xl border border-border bg-[#FBFBFA] p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Landmark className="w-5 h-5 text-primary" />
                <h3 className="font-display font-bold text-foreground">Rights Engine</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-4">Rights & mitigations based on this document:</p>
              <div className="space-y-4">
                {Array.isArray(displayReport.schemes) && displayReport.schemes.length > 0 ? (
                  displayReport.schemes.map((s: any, idx: number) => {
                    const name = typeof s === 'string' ? s : s?.name || s?.title || 'Scheme';
                    const desc = typeof s === 'string' ? '' : s?.description || s?.reason || '';
                    return (
                      <div key={idx} className="flex gap-2.5">
                        <CheckCircle2 className="w-4 h-4 text-risk-green mt-0.5 shrink-0" />
                        <div>
                          <div className="text-sm font-semibold text-foreground">{name}</div>
                          {desc && <div className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{desc}</div>}
                        </div>
                      </div>
                    );
                  })
                ) : <p className="text-sm text-muted-foreground">No specific rights extracted.</p>}
              </div>
            </div>

            {/* Export */}
            <div className="rounded-2xl border border-border bg-[#FBFBFA] p-6 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <Download className="h-4 w-4 text-foreground/60" />
                <h3 className="font-display font-bold">Export Report</h3>
              </div>
              <p className="text-xs text-muted-foreground mb-4">Download your analysis in multiple formats.</p>
              <div className="space-y-2">
                {[
                  ['PDF Risk Report', 'Text report with full analysis', 'pdf'],
                  ['Markdown (WhatsApp)', 'Text-friendly for sharing', 'md'],
                  ['JSON Audit Trail', 'inference-log.json format', 'json'],
                ].map(([label, sub, format]) => (
                  <a key={format} href={`/api/export/${report?.id}/${format}`}
                    className="flex items-center justify-between rounded-xl border border-border/50 bg-white px-4 py-3 text-sm hover:bg-muted/30 transition-colors">
                    <div>
                      <div className="font-semibold text-foreground">{label}</div>
                      <div className="text-[10px] text-muted-foreground">{sub}</div>
                    </div>
                    <Download className="h-4 w-4 text-muted-foreground/50" />
                  </a>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Voice Analysis */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
            className="mt-8 overflow-hidden rounded-2xl bg-[#0B1015] text-white shadow-xl">
            <div className="px-6 py-4 flex items-center justify-between border-b border-white/10">
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-white/50">Voice Analysis</span>
                <span className="text-white/30 text-[10px] font-mono">•</span>
                <span className="text-[10px] font-mono uppercase tracking-[0.1em] text-white/40">WHISPER_BASE_Q8_0</span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-white/30">
                <Lock className="w-3 h-3" /> 100% On-device
              </div>
            </div>
            <div className="p-8">
              <h2 className="font-display text-2xl font-bold mb-6">Ask VAKEEL by voice</h2>
              <div className="flex flex-col items-center justify-center bg-white/5 rounded-2xl p-10 border border-white/10 relative overflow-hidden min-h-[220px]">
                {/* Mic button */}
                <button onClick={toggleRecording}
                  className={`relative z-10 w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 ${
                    isRecording ? 'bg-risk-red text-white shadow-[0_0_40px_rgba(239,68,68,0.4)]' :
                    transcribing ? 'bg-white/20 text-white/50 cursor-wait' :
                    'bg-[#E3C68E] text-[#4A3816] hover:scale-105'
                  }`}
                  disabled={transcribing}
                >
                  {transcribing ? <Loader2 className="w-8 h-8 animate-spin" /> : <Mic className="w-8 h-8" />}
                </button>

                <div className="mt-6 flex flex-col items-center">
                  {/* Waveform bars */}
                  <div className="flex items-end gap-1.5 h-8 mb-2">
                    {[1,2,3,4,5,6].map((i) => (
                      <motion.div key={i}
                        animate={isRecording ? { height: [12, Math.random() * 28 + 8, 12] } : { height: 4 }}
                        transition={{ duration: 0.45, repeat: Infinity, delay: i * 0.1 }}
                        className="w-2 rounded-full bg-white/80"
                      />
                    ))}
                  </div>
                  <span className="text-[10px] font-mono font-bold tracking-[0.2em] text-white/50 uppercase">
                    {transcribing ? 'Transcribing…' : isRecording ? `Listening… ${recordingSeconds}s` : 'Tap to speak'}
                  </span>
                  {isRecording && (
                    <div className="mt-2 flex items-center gap-1.5">
                      <div className="h-1.5 w-20 bg-white/10 rounded-full overflow-hidden">
                        <motion.div className="h-full bg-risk-red rounded-full"
                          animate={{ width: `${(recordingSeconds / 30) * 100}%` }}
                          transition={{ duration: 0.5 }} />
                      </div>
                      <span className="text-[10px] text-white/30 font-mono">30s max</span>
                    </div>
                  )}
                </div>

                {transcript && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    className="mt-6 w-full text-center text-sm font-medium text-white/80 px-4">
                    "{transcript}"
                  </motion.div>
                )}
              </div>
            </div>
          </motion.div>

          {/* Try another demo */}
          <div className="mt-12 mb-8 flex flex-col items-center">
            <div className="text-xs text-muted-foreground mb-4">Try another persona</div>
            <div className="flex flex-wrap justify-center gap-3">
              {[
                ['tax-loan', 'Home Loan'],
                ['land-title', 'Land Title'],
                ['cross-border-tax', 'Remote Work'],
                ['contract-verify', 'Freelance Contract'],
              ].filter(([id]) => id !== persona).map(([id, label]) => (
                <Link key={id} to={`/analyze/${id}`}
                  className="rounded-lg border border-border bg-white px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted/50 transition-colors">
                  {label}
                </Link>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
