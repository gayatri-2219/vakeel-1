import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, ShieldCheck, ShieldAlert, Shield, Building2, AlertTriangle,
  CheckCircle2, Clock, FileText, Globe, Loader2, X, ChevronRight, Lock
} from 'lucide-react';
import { Link } from 'react-router-dom';

type TrustLevel = 'verified' | 'caution' | 'fraud' | 'not_found';

interface CompanyRecord {
  name: string;
  type: string;
  status: string;
  trust: TrustLevel;
  score: number;
  gst?: string;
  pan?: string;
  cin?: string;
  registered: string;
  state: string;
  directors: string[];
  flags: { text: string; severity: 'red' | 'amber' | 'green' }[];
  verdict: string;
  recommendation: string;
}

const DB: Record<string, CompanyRecord> = {
  '27AAACH7409R1Z7': {
    name: 'HDFC Bank Limited',
    type: 'Public Limited Company',
    status: 'Active',
    trust: 'verified',
    score: 97,
    gst: '27AAACH7409R1Z7',
    pan: 'AAACH7409R',
    cin: 'L65920MH1994PLC080618',
    registered: 'August 30, 1994',
    state: 'Maharashtra',
    directors: ['Sashidhar Jagdishan (MD & CEO)', 'Atanu Chakraborty (Chairman)'],
    flags: [
      { text: 'GST registration active and current on MCA21', severity: 'green' },
      { text: 'RBI-regulated banking institution — enhanced trust', severity: 'green' },
      { text: 'CIN verified on MCA21 portal (active)', severity: 'green' },
      { text: 'No pending litigation or winding-up petitions', severity: 'green' },
    ],
    verdict: 'HDFC Bank Limited is a legitimate, RBI-regulated financial institution. All registration identifiers cross-reference correctly on MCA21 and GST portals. No fraud indicators detected.',
    recommendation: 'Safe to proceed. Verify specific loan/product terms independently.',
  },
  'L17110MH1973PLC019786': {
    name: 'Reliance Industries Limited',
    type: 'Public Limited Company',
    status: 'Active',
    trust: 'verified',
    score: 99,
    gst: '27AAACR5055K1ZK',
    pan: 'AAACR5055K',
    cin: 'L17110MH1973PLC019786',
    registered: 'May 8, 1973',
    state: 'Maharashtra',
    directors: ['Mukesh D. Ambani (Chairman & MD)', 'Nita M. Ambani (Non-Executive)'],
    flags: [
      { text: 'One of India\'s highest-rated companies by CRISIL (AAA)', severity: 'green' },
      { text: 'GST filings current — no defaults recorded', severity: 'green' },
      { text: 'CIN verified and active on MCA21', severity: 'green' },
      { text: 'Listed on BSE/NSE — subject to SEBI disclosure norms', severity: 'green' },
    ],
    verdict: 'Reliance Industries Limited is verified and active on all government portals. Highest trust rating.',
    recommendation: 'Safe to proceed. Ensure any contract references the registered entity name exactly.',
  },
  'U72900KA2021PTC145887': {
    name: 'Acme Tech Solutions Pvt Ltd',
    type: 'Private Limited Company',
    status: 'STRUCK OFF',
    trust: 'fraud',
    score: 4,
    gst: 'Not registered',
    pan: 'AAGCA1234B',
    cin: 'U72900KA2021PTC145887',
    registered: 'January 12, 2021',
    state: 'Karnataka',
    directors: ['Unknown — director details suppressed'],
    flags: [
      { text: 'Company struck off by RoC Karnataka (June 2023) — no longer a legal entity', severity: 'red' },
      { text: 'GST registration cancelled — no filings since Q2 2022', severity: 'red' },
      { text: 'Director DIN suspended by MCA21 — criminal complaint pending', severity: 'red' },
      { text: 'CIN mismatch detected: digit altered in contract preamble', severity: 'red' },
      { text: 'Similar name to 3 other struck-off companies — shell entity pattern', severity: 'red' },
    ],
    verdict: 'CRITICAL FRAUD ALERT: This company does not legally exist. It was struck off the MCA21 register in June 2023. Any contract signed with this entity is void. The director\'s DIN has been suspended following a criminal complaint for cheating. Do not engage.',
    recommendation: 'Do not sign. Do not pay any advance. File a complaint with the Economic Offences Wing if you have been approached by this entity.',
  },
  'AABCT3518Q': {
    name: 'Tata Consultancy Services Ltd',
    type: 'Public Limited Company',
    status: 'Active',
    trust: 'verified',
    score: 98,
    gst: '27AABCT3518Q1ZZ',
    pan: 'AABCT3518Q',
    cin: 'L22210MH1995PLC084781',
    registered: 'January 19, 1995',
    state: 'Maharashtra',
    directors: ['K. Krithivasan (CEO & MD)', 'N. Chandrasekaran (Non-Executive Chairman)'],
    flags: [
      { text: 'CRISIL AAA rating — highest creditworthiness', severity: 'green' },
      { text: 'GST filings current through most recent quarter', severity: 'green' },
      { text: 'ISO 27001 certified — data protection standards met', severity: 'green' },
      { text: 'BSE/NSE listed — quarterly SEBI disclosures verified', severity: 'green' },
    ],
    verdict: 'TCS is a verified, publicly listed company with the highest trust rating. All registration details match MCA21 and GST portal records.',
    recommendation: 'Safe to proceed. Standard IP-assignment clauses in TCS contracts should be reviewed.',
  },
  '29AADCB2230M1ZP': {
    name: 'BrightPath Edutech Pvt Ltd',
    type: 'Private Limited Company',
    status: 'Active (with caution flags)',
    trust: 'caution',
    score: 51,
    gst: '29AADCB2230M1ZP',
    pan: 'AADCB2230M',
    cin: 'U80904KA2019PTC118432',
    registered: 'March 7, 2019',
    state: 'Karnataka',
    directors: ['Rakesh V. Nair', 'Priyanka Suresh'],
    flags: [
      { text: 'CIN active on MCA21 — company legally exists', severity: 'green' },
      { text: 'GST filing gap: Q3 2023 return not yet filed (overdue)', severity: 'amber' },
      { text: 'One director (Rakesh V. Nair) has a pending NCLT dispute — unrelated', severity: 'amber' },
      { text: 'Company is less than 5 years old — limited credit history', severity: 'amber' },
      { text: 'Paid-up capital ₹1 lakh — thin capitalization for claimed contract values', severity: 'amber' },
    ],
    verdict: 'BrightPath Edutech exists and is legally registered, but has multiple caution signals: a late GST filing, a director with pending NCLT proceedings, and very thin capitalization relative to their stated business volume.',
    recommendation: 'Proceed with caution. Request audited financials for the last 2 years. Include a personal guarantee from directors in the contract. Limit advance payment to 10% of contract value.',
  },
};

const EXAMPLES = [
  { label: 'HDFC Bank (GST)', value: '27AAACH7409R1Z7' },
  { label: 'Reliance (CIN)', value: 'L17110MH1973PLC019786' },
  { label: 'TCS (PAN)', value: 'AABCT3518Q' },
  { label: 'Fraudulent Entity (CIN)', value: 'U72900KA2021PTC145887' },
  { label: 'Caution: Edutech (GST)', value: '29AADCB2230M1ZP' },
];

const TRUST_CONFIG: Record<TrustLevel, { label: string; icon: any; bg: string; border: string; text: string; bar: string }> = {
  verified: {
    label: 'Verified — Safe to Engage',
    icon: ShieldCheck,
    bg: 'bg-risk-green/8',
    border: 'border-risk-green/25',
    text: 'text-risk-green',
    bar: 'bg-risk-green',
  },
  caution: {
    label: 'Caution — Verify Further',
    icon: ShieldAlert,
    bg: 'bg-risk-amber/8',
    border: 'border-risk-amber/25',
    text: 'text-risk-amber',
    bar: 'bg-risk-amber',
  },
  fraud: {
    label: 'Fraud Alert — Do Not Engage',
    icon: Shield,
    bg: 'bg-risk-red/8',
    border: 'border-risk-red/25',
    text: 'text-risk-red',
    bar: 'bg-risk-red',
  },
  not_found: {
    label: 'Not Found',
    icon: Shield,
    bg: 'bg-muted/40',
    border: 'border-border',
    text: 'text-muted-foreground',
    bar: 'bg-muted',
  },
};

type SearchPhase = 'idle' | 'searching' | 'done' | 'not_found';

const SEARCH_STEPS = [
  'Querying MCA21 public registry…',
  'Cross-referencing GST portal…',
  'Checking CIBIL / director DINs…',
  'Running fraud pattern analysis…',
  'Generating trust verdict…',
];

export default function Verify() {
  const [query, setQuery] = useState('');
  const [phase, setPhase] = useState<SearchPhase>('idle');
  const [searchStep, setSearchStep] = useState(0);
  const [result, setResult] = useState<CompanyRecord | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = () => timers.current.forEach(clearTimeout);

  const runSearch = (q: string) => {
    if (!q.trim()) return;
    clearTimers();
    setPhase('searching');
    setSearchStep(0);
    setResult(null);

    SEARCH_STEPS.forEach((_, i) => {
      const t = setTimeout(() => setSearchStep(i + 1), (i + 1) * 700);
      timers.current.push(t);
    });

    const t = setTimeout(() => {
      const found = DB[q.trim().toUpperCase()] || DB[q.trim()];
      if (found) {
        setResult(found);
        setPhase('done');
      } else {
        setPhase('not_found');
      }
    }, SEARCH_STEPS.length * 700 + 300);
    timers.current.push(t);
  };

  const reset = () => {
    clearTimers();
    setPhase('idle');
    setResult(null);
    setSearchStep(0);
    setQuery('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    runSearch(query);
  };

  return (
    <div className="container mx-auto max-w-4xl px-4 py-10">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
        <Link to="/" className="hover:text-foreground transition-colors">VAKEEL</Link>
        <span>/</span>
        <span className="text-foreground font-medium">Counterparty Verification</span>
      </div>

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-secondary" />
          </div>
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">Counterparty Verification</h1>
            <p className="text-sm text-muted-foreground">MCA21 · GST Portal · Director DIN · CIBIL — all on-device</p>
          </div>
        </div>
        <p className="text-muted-foreground max-w-2xl">
          Enter a company's GST number, PAN, or CIN to instantly cross-reference it against government registry data. Know if the entity you're signing with is real, active, and trustworthy — before you commit.
        </p>
      </div>

      {/* Search box */}
      <div className="bg-card border border-border rounded-2xl p-6 mb-6 shadow-sm">
        <form onSubmit={handleSubmit}>
          <label className="text-xs font-mono font-bold text-muted-foreground uppercase tracking-widest mb-2 block">
            GST Number · PAN · CIN
          </label>
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="e.g. 27AAACH7409R1Z7 or AABCT3518Q or L17110MH1973PLC019786"
                className="w-full pl-10 pr-4 py-3.5 rounded-xl border border-border bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary/50 transition-all"
              />
              {query && (
                <button type="button" onClick={reset} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <button
              type="submit"
              disabled={phase === 'searching' || !query.trim()}
              className="px-6 py-3.5 bg-primary text-primary-foreground rounded-xl font-bold text-sm hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
            >
              {phase === 'searching' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              Verify
            </button>
          </div>
        </form>

        {/* Example chips */}
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="text-xs text-muted-foreground py-1">Try:</span>
          {EXAMPLES.map((ex) => (
            <button
              key={ex.value}
              onClick={() => { setQuery(ex.value); runSearch(ex.value); }}
              className="text-xs px-2.5 py-1 rounded-full border border-border bg-muted/50 text-foreground hover:bg-muted transition-colors font-mono"
            >
              {ex.label}
            </button>
          ))}
        </div>
      </div>

      {/* Searching animation */}
      <AnimatePresence mode="wait">
        {phase === 'searching' && (
          <motion.div
            key="searching"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="bg-card border border-border rounded-2xl p-8 shadow-sm"
          >
            <div className="flex items-center gap-3 mb-6">
              <Loader2 className="w-5 h-5 text-primary animate-spin" />
              <h3 className="font-display font-bold text-lg">Running verification…</h3>
              <span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded">On-device · Offline</span>
            </div>
            <div className="space-y-3">
              {SEARCH_STEPS.map((step, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-3 p-3 rounded-xl border transition-all duration-300 ${
                    i < searchStep ? 'bg-muted/30 border-border' :
                    i === searchStep - 1 ? 'bg-primary/5 border-primary/20' :
                    'border-transparent opacity-30'
                  }`}
                >
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 border-2 ${
                    i < searchStep ? 'border-risk-green bg-risk-green/10' :
                    i === searchStep - 1 ? 'border-primary bg-primary/10' :
                    'border-border bg-muted'
                  }`}>
                    {i < searchStep
                      ? <CheckCircle2 className="w-3.5 h-3.5 text-risk-green" />
                      : i === searchStep - 1
                        ? <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />
                        : null
                    }
                  </div>
                  <span className={`text-sm ${i <= searchStep - 1 ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>{step}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Not found */}
        {phase === 'not_found' && (
          <motion.div
            key="not_found"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="bg-card border border-dashed border-border rounded-2xl p-10 text-center shadow-sm"
          >
            <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-display font-bold text-xl mb-2">Entity Not Found</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto mb-5">
              No matching record found in our simulated registry for <span className="font-mono text-foreground">{query}</span>. This may indicate an invalid, unregistered, or mistyped identifier.
            </p>
            <button
              onClick={reset}
              className="px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:bg-primary/90 transition-colors"
            >
              Search Again
            </button>
          </motion.div>
        )}

        {/* Result */}
        {phase === 'done' && result && (() => {
          const cfg = TRUST_CONFIG[result.trust];
          const TrustIcon = cfg.icon;
          return (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="space-y-5"
            >
              {/* Trust verdict banner */}
              <div className={`rounded-2xl border p-6 ${cfg.bg} ${cfg.border}`}>
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${
                    result.trust === 'verified' ? 'bg-risk-green/15' :
                    result.trust === 'caution' ? 'bg-risk-amber/15' :
                    'bg-risk-red/15'
                  }`}>
                    <TrustIcon className={`w-7 h-7 ${cfg.text}`} />
                  </div>
                  <div className="flex-1">
                    <div className={`text-xs font-mono font-bold uppercase tracking-widest mb-1 ${cfg.text}`}>Trust Verdict</div>
                    <div className="font-display font-black text-xl text-foreground mb-1">{cfg.label}</div>
                    <div className="font-mono text-sm text-muted-foreground">{result.name}</div>
                  </div>
                  {/* Score ring */}
                  <div className="flex flex-col items-center gap-1 shrink-0">
                    <div className={`text-4xl font-display font-black ${cfg.text}`}>{result.score}</div>
                    <div className="text-xs text-muted-foreground font-medium">Trust Score / 100</div>
                    <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${result.score}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
                        className={`h-full rounded-full ${cfg.bar}`}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Company details */}
                <div className="bg-card border border-border rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Building2 className="w-4 h-4 text-primary" />
                    <h3 className="font-display font-bold text-sm">Registry Details</h3>
                  </div>
                  <div className="space-y-3 text-sm">
                    {[
                      { label: 'Legal Name', value: result.name },
                      { label: 'Entity Type', value: result.type },
                      { label: 'Status', value: result.status },
                      { label: 'Registered', value: result.registered },
                      { label: 'State', value: result.state },
                      result.cin ? { label: 'CIN', value: result.cin } : null,
                      result.gst ? { label: 'GST', value: result.gst } : null,
                      result.pan ? { label: 'PAN', value: result.pan } : null,
                    ].filter(Boolean).map((row: any) => (
                      <div key={row.label} className="flex justify-between gap-2">
                        <span className="text-muted-foreground shrink-0">{row.label}</span>
                        <span className="font-mono text-foreground text-right text-xs truncate">{row.value}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 pt-4 border-t border-border">
                    <div className="text-xs font-bold text-muted-foreground mb-2">Directors / Signatories</div>
                    {result.directors.map((d) => (
                      <div key={d} className="text-xs text-foreground/80 mb-1">{d}</div>
                    ))}
                  </div>
                </div>

                {/* Fraud flags */}
                <div className="bg-card border border-border rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <AlertTriangle className="w-4 h-4 text-primary" />
                    <h3 className="font-display font-bold text-sm">Verification Flags</h3>
                  </div>
                  <div className="space-y-2.5">
                    {result.flags.map((f, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.08 }}
                        className={`flex items-start gap-2 p-2.5 rounded-lg border text-xs ${
                          f.severity === 'red' ? 'bg-risk-red/5 border-risk-red/15 text-foreground' :
                          f.severity === 'amber' ? 'bg-risk-amber/5 border-risk-amber/15 text-foreground' :
                          'bg-risk-green/5 border-risk-green/15 text-foreground'
                        }`}
                      >
                        {f.severity === 'red' && <AlertTriangle className="w-3.5 h-3.5 text-risk-red shrink-0 mt-0.5" />}
                        {f.severity === 'amber' && <AlertTriangle className="w-3.5 h-3.5 text-risk-amber shrink-0 mt-0.5" />}
                        {f.severity === 'green' && <CheckCircle2 className="w-3.5 h-3.5 text-risk-green shrink-0 mt-0.5" />}
                        {f.text}
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Verdict & recommendation */}
              <div className="bg-card border border-border rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-3">
                  <Lock className="w-4 h-4 text-primary" />
                  <h3 className="font-display font-bold text-sm">VAKEEL Analysis</h3>
                  <span className="text-[10px] font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded ml-auto">
                    LLAMA_3_2_1B_INST_Q4_0 · Offline
                  </span>
                </div>
                <p className="text-sm text-foreground/90 leading-relaxed mb-4">{result.verdict}</p>
                <div className="bg-muted/40 border border-border rounded-xl p-4 flex items-start gap-2.5">
                  <ChevronRight className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <div>
                    <div className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-wider mb-1">Recommendation</div>
                    <div className="text-sm font-semibold text-foreground">{result.recommendation}</div>
                  </div>
                </div>
              </div>

              <button
                onClick={reset}
                className="w-full py-3 border border-border rounded-xl text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                Verify Another Entity
              </button>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* Idle state */}
      {phase === 'idle' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-2"
        >
          {[
            { icon: Globe, title: 'MCA21 Cross-check', desc: 'Verifies CIN against the Ministry of Corporate Affairs live registry' },
            { icon: FileText, title: 'GST Portal Lookup', desc: 'Confirms GST registration, filing status, and state of registration' },
            { icon: Clock, title: 'Director DIN Check', desc: 'Flags suspended or blacklisted directors from the DIN database' },
          ].map((c) => (
            <div key={c.title} className="bg-card border border-border rounded-xl p-4">
              <c.icon className="w-5 h-5 text-primary mb-2" />
              <div className="font-display font-bold text-sm mb-1">{c.title}</div>
              <div className="text-xs text-muted-foreground leading-relaxed">{c.desc}</div>
            </div>
          ))}
        </motion.div>
      )}
    </div>
  );
}
