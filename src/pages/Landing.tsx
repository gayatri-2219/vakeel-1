import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Shield, Clock, Banknote, ScanLine, Vault, Landmark, Store,
  ChevronRight, Lock, Cpu, Wifi, CheckCircle2, CheckCircle, AlertTriangle, Zap, FileText,
  ArrowRight, Globe, Server
} from 'lucide-react';
import RiskBadge from '../components/RiskBadge';
import QvacBadge from '../components/QvacBadge';
import { VakeelLogo } from '../components/Logo';

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.55, delay, ease: [0.19, 1, 0.22, 1] },
});

const FEATURES = [
  {
    icon: Shield,
    number: '01',
    title: 'Trust Score for People & Businesses',
    description: 'Verifies who you are signing with — not just what you are signing. Cross-references GST, PAN, MCA21, and consumer complaint databases for a green/amber/red trust verdict.',
    tag: 'Trust Engine',
  },
  {
    icon: Clock,
    number: '02',
    title: 'Hidden Deadline Detection',
    description: 'Auto-extracted dates, notice periods, auto-renewal triggers, and compliance deadlines turned into calendar alerts. Never miss the "30 days before auto-lock-in" window again.',
    tag: 'Deadline Engine',
  },
  {
    icon: Banknote,
    number: '03',
    title: 'Consequences in Money',
    description: 'Not legal jargon — financial impact you actually care about. "You lose ₹1,00,000 deposit if you leave before 11 months," not "clause 8 governs liquidated damages."',
    tag: 'Risk Engine',
  },
  {
    icon: ScanLine,
    number: '04',
    title: 'Fraud Pattern Detection',
    description: 'Missing annexures, blank pages, contradictory clauses, unbounded variable amounts, forged signature patterns — caught automatically before you sign.',
    tag: 'Fraud Engine',
  },
  {
    icon: Vault,
    number: '05',
    title: 'Personal Document Vault',
    description: 'Google Photos for legal documents. Search across everything you have ever signed. Embeddings stored in a local SQLite file — vakeel.db — that never leaves your device.',
    tag: 'Vector Vault',
  },
  {
    icon: Landmark,
    number: '06',
    title: 'Rights Engine + Government Schemes',
    description: 'Based on who you are, not just what the document says. PM-Kisan, PMFBY, MUDRA, ESIC, eShram — surfaced automatically against your profile.',
    tag: 'Rights Engine',
  },
  {
    icon: Store,
    number: '07',
    title: 'Counterparty Verification',
    description: 'Scan a GST number, PAN, company name, or QR code. Instantly check against public registries. Get a trust verdict before handing over a single rupee.',
    tag: 'Verify Engine',
  },
];

const PERSONAS = [
  {
    title: 'The Salaried Middle Class',
    context: 'Home Loan Agreement + Salary Slips',
    checks: ['Prepayment penalty trap', 'Missed 80C/80D deductions', 'Tax regime mismatch', 'EMI-to-income ratio'],
    verdict: 'Your HDFC home loan has a 2% prepayment penalty hidden in Clause 14.2. Switching to SBI now costs ₹40,000 in penalties. Wait 8 months.',
    risk: 'amber' as const,
    link: '/analyze/tax-loan',
    model: 'LLAMA_3_2_1B_INST_Q4_0',
  },
  {
    title: 'The Land Buyer / Farmer',
    context: 'Title Deed + Mutation Records (Patta)',
    checks: ['Ownership chain breaks', 'Fake POA patterns', 'Encumbrance detection', 'Land classification check'],
    verdict: "Title has an unresolved mutation from 2014. Seller's sister hasn't signed a relinquishment deed. Extreme litigation risk — do not pay advance.",
    risk: 'red' as const,
    link: '/analyze/land-title',
    model: 'LLAMA_3_2_11B_VISION_INSTRUCT',
  },
  {
    title: 'The Remote Worker',
    context: 'Employment Contract + FEMA Records',
    checks: ['Double-taxation treaty', 'FEMA compliance', 'Contractor misclassification', 'Permanent establishment risk'],
    verdict: 'Contract says "Independent Contractor" but mandates fixed 9-5 IST hours under one employer. This breaches Indian labor law. Ask for a Consultant Addendum.',
    risk: 'amber' as const,
    link: '/analyze/cross-border-tax',
    model: 'LLAMA_3_2_1B_INST_Q4_0',
  },
  {
    title: 'The Freelancer',
    context: 'Client Contract + Payment Proofs',
    checks: ['Forged signature patterns', 'Missing payment milestones', 'IP transfer overreach', 'Jurisdiction trap'],
    verdict: "CIN U72900KA2021PTC145xxx listed in the preamble is invalid on MCA21. Dispute resolution set to Delaware, USA. High forgery risk — do not start work.",
    risk: 'red' as const,
    link: '/analyze/contract-verify',
    model: 'LLAMA_3_2_1B_INST_Q4_0',
  },
];

const QVAC_MODELS = [
  { name: 'LLAMA_3_2_1B_INST_Q4_0', role: 'Classification + Decision Engine', speed: '< 2s TTFT', note: 'TurboQuant KV-cache' },
  { name: 'LLAMA_3_2_11B_VISION_INSTRUCT', role: 'OCR for scanned docs & photos', speed: '8–15s/page', note: 'Vulkan GPU accelerated' },
  { name: 'NOMIC_EMBED_TEXT_V1_5_Q8_0', role: 'Vault semantic search', speed: '< 50ms/chunk', note: 'SQLite vector store' },
  { name: 'WHISPER_TINY + VAD_SILERO', role: 'Voice input pipeline', speed: 'Real-time', note: 'Full offline round-trip' },
];

const COMPARISON = [
  { feature: 'Works offline, no internet', vakeel: true, edge: false, notebook: false },
  { feature: 'Documents stay on your device', vakeel: true, edge: false, notebook: false },
  { feature: 'No account required', vakeel: true, edge: false, notebook: false },
  { feature: 'Indian language support (10)', vakeel: true, edge: false, notebook: false },
  { feature: 'Fraud pattern detection', vakeel: true, edge: false, notebook: false },
  { feature: 'Deadline alerts & reminders', vakeel: true, edge: false, notebook: false },
  { feature: 'Government scheme surfacing', vakeel: true, edge: false, notebook: false },
  { feature: 'Consequences in ₹ terms', vakeel: true, edge: false, notebook: false },
];

export default function Landing() {
  return (
    <div className="flex flex-col min-h-screen">

      {/* ── HERO ──────────────────────────────────────────────── */}
      <section className="hero-gradient noise-texture relative overflow-hidden">
        <style>{`
          @keyframes vakeel-scan {
            0% { transform: translateY(0); opacity: 0; }
            10% { opacity: 1; }
            90% { opacity: 1; }
            100% { transform: translateY(96px); opacity: 0; }
          }
          @keyframes vakeel-progress {
            0% { width: 0%; }
            100% { width: 100%; }
          }
          @keyframes vakeel-row1 {
            0% { opacity: 0; transform: translateY(8px); }
            100% { opacity: 1; transform: translateY(0); }
          }
          .vakeel-scan { animation: vakeel-scan 2.4s ease-in-out infinite; }
          .vakeel-progress { animation: vakeel-progress 1.4s ease-out 0.3s forwards; width: 0; }
          .vakeel-row1 { animation: vakeel-row1 0.4s ease-out 1.6s both; }
          .vakeel-row2 { animation: vakeel-row1 0.4s ease-out 2.2s both; }
          .vakeel-row3 { animation: vakeel-row1 0.4s ease-out 2.8s both; }
        `}</style>

        <div className="absolute inset-0 z-0">
          <div className="absolute top-1/4 right-1/4 w-96 h-96 rounded-full bg-white/3 blur-3xl" />
          <div className="absolute bottom-0 left-1/3 w-64 h-64 rounded-full bg-secondary/10 blur-3xl" />
        </div>

        <div className="container mx-auto max-w-7xl px-4 pt-20 pb-28 relative z-10">
          <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">

            {/* ── Left: existing copy ── */}
            <div className="flex-1 min-w-0">
              {/* QVAC / offline pill */}
              <motion.div {...fadeUp(0)} className="flex flex-wrap items-center gap-3 mb-8">
                <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/15 text-white/90 text-xs font-mono">
                  <Cpu className="w-3.5 h-3.5 text-secondary" />
                  Powered by @qvac/sdk · TurboQuant + Vulkan
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 border border-white/15 text-white/90 text-xs font-mono">
                  <Wifi className="w-3.5 h-3.5 line-through opacity-50" />
                  100% offline · No data leaves your device
                </span>
              </motion.div>

              <motion.h1
                {...fadeUp(0.08)}
                className="text-5xl sm:text-6xl md:text-7xl font-display font-black text-white leading-[1.05] tracking-tight mb-6"
              >
                Before you sign,<br />
                <span className="text-gradient-gold">know what it costs.</span>
              </motion.h1>

              <motion.p {...fadeUp(0.16)} className="text-lg md:text-xl text-white/70 max-w-2xl leading-relaxed mb-10">
                VAKEEL is a privacy-first, on-device legal intelligence engine. Upload your property deeds, loan agreements, or employment contracts. In 30 seconds, local AI flags hidden traps — consequences in rupees, not legalese.
              </motion.p>

              <motion.div {...fadeUp(0.24)} className="flex flex-col sm:flex-row items-start gap-4">
                <Link
                  to="/analyze/tax-loan"
                  className="btn-shine group inline-flex items-center gap-2 px-8 py-4 bg-white text-foreground rounded-xl font-bold text-base hover:bg-white/95 transition-all shadow-lg shadow-black/20 hover:-translate-y-0.5"
                >
                  Run Demo Scan
                  <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </Link>
                <Link
                  to="/vault"
                  className="inline-flex items-center gap-2 px-8 py-4 bg-white/10 border border-white/20 text-white rounded-xl font-semibold text-base hover:bg-white/15 transition-all"
                >
                  <Lock className="w-4 h-4" />
                  Open My Vault
                </Link>
              </motion.div>
            </div>

            {/* ── Right: animated analysis card ── */}
            <motion.div
              {...fadeUp(0.32)}
              className="w-full lg:w-[440px] shrink-0 relative"
            >
              {/* Glow behind card */}
              <div className="absolute inset-0 bg-secondary/20 blur-[80px] rounded-full pointer-events-none" />

              <div className="relative rounded-3xl border border-white/15 bg-white shadow-2xl overflow-hidden flex flex-col gap-6 p-6 sm:p-8">

                {/* Card header */}
                <div className="flex items-center justify-between border-b border-black/5 pb-5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shrink-0">
                      <Shield className="w-4 h-4 text-secondary" />
                    </div>
                    <span className="font-display font-bold text-foreground text-base">Document Analysis</span>
                  </div>
                  <span className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-md bg-primary/8 text-primary uppercase tracking-wider">
                    QVAC · Offline
                  </span>
                </div>

                {/* Blurred doc skeleton with scanline */}
                <div className="relative space-y-2.5 p-4 rounded-xl bg-muted/40 border border-border overflow-hidden">
                  <div className="h-2.5 w-3/4 rounded-full bg-muted" />
                  <div className="h-2.5 w-full rounded-full bg-muted" />
                  <div className="h-2.5 w-5/6 rounded-full bg-muted" />
                  <div className="h-2.5 w-2/3 rounded-full bg-muted" />
                  <div className="h-2.5 w-4/5 rounded-full bg-muted" />
                  {/* Scanline */}
                  <div
                    className="vakeel-scan absolute left-0 right-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-secondary to-transparent"
                  />
                </div>

                {/* Progress */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold text-muted-foreground">
                    <span className="font-mono">LLAMA_3_2_1B_INST_Q4_0</span>
                    <span>Analyzing…</span>
                  </div>
                  <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                    <div className="vakeel-progress h-full bg-primary rounded-full" />
                  </div>
                </div>

                {/* Result rows */}
                <div className="space-y-2.5">
                  <div className="vakeel-row1 flex items-center justify-between p-3 rounded-xl bg-risk-green/8 border border-risk-green/20">
                    <span className="text-sm font-semibold text-foreground">Trust Score</span>
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-risk-green/15 text-risk-green text-xs font-bold">
                      <CheckCircle className="w-3.5 h-3.5" />
                      84 / 100
                    </div>
                  </div>

                  <div className="vakeel-row2 flex items-center justify-between p-3 rounded-xl bg-risk-amber/8 border border-risk-amber/20">
                    <span className="text-sm font-semibold text-foreground">Deadline</span>
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-risk-amber/15 text-risk-amber text-xs font-bold">
                      <Clock className="w-3.5 h-3.5" />
                      7 days · Oct 24
                    </div>
                  </div>

                  <div className="vakeel-row3 flex items-center justify-between p-3 rounded-xl bg-risk-red/8 border border-risk-red/20">
                    <span className="text-sm font-semibold text-foreground">Risk Detected</span>
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-risk-red/15 text-risk-red text-xs font-bold">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Annexure Missing
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="text-center border-t border-border pt-3">
                  <span className="text-[10px] font-mono text-muted-foreground">
                    LLAMA_3_2_1B_INST_Q4_0 · Offline · 847ms
                  </span>
                </div>

              </div>
            </motion.div>

          </div>
        </div>

        {/* Stats bar */}
        <div className="relative z-10 border-t border-white/10 bg-black/20 backdrop-blur-sm">
          <div className="container mx-auto max-w-7xl px-4">
            <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-white/10">
              {[
                { val: '30s', label: 'Full document scan' },
                { val: '0 bytes', label: 'Sent to any server' },
                { val: '19', label: 'Languages supported' },
                { val: '7', label: 'AI sub-engines' },
              ].map((s) => (
                <div key={s.val} className="py-6 px-6 text-center">
                  <div className="text-2xl md:text-3xl font-display font-black text-white mb-1">{s.val}</div>
                  <div className="text-xs text-white/50 font-medium">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── 7 FEATURES ───────────────────────────────────────── */}
      <section className="py-24 px-4 bg-background">
        <div className="container mx-auto max-w-7xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="max-w-2xl mb-16"
          >
            <span className="text-xs font-mono font-bold text-primary/60 uppercase tracking-widest mb-3 block">Seven engines. One verdict.</span>
            <h2 className="text-4xl md:text-5xl font-display font-black text-foreground mb-4">
              Everything a lawyer checks.<br />In 30 seconds. Offline.
            </h2>
            <p className="text-lg text-muted-foreground">VAKEEL runs seven specialized AI sub-engines in sequence for every document — all powered by QVAC models running on your own hardware.</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f, i) => {
              const Icon = f.icon;
              return (
                <motion.div
                  key={f.number}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.45, delay: i * 0.06 }}
                  className="group bg-card border border-border rounded-2xl p-6 card-hover relative overflow-hidden"
                >
                  <div className="absolute top-4 right-4 text-[3rem] font-display font-black text-muted/30 leading-none select-none">
                    {f.number}
                  </div>
                  <div className="bg-primary/10 w-11 h-11 rounded-xl flex items-center justify-center mb-5">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <span className="text-[10px] font-mono font-bold text-secondary uppercase tracking-widest mb-2 block">{f.tag}</span>
                  <h3 className="text-lg font-display font-bold text-foreground mb-2.5">{f.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{f.description}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── PERSONA USE CASES ────────────────────────────────── */}
      <section className="py-24 px-4 bg-muted/30 border-y border-border">
        <div className="container mx-auto max-w-7xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center max-w-2xl mx-auto mb-16"
          >
            <span className="text-xs font-mono font-bold text-primary/60 uppercase tracking-widest mb-3 block">Interactive demos</span>
            <h2 className="text-4xl md:text-5xl font-display font-black text-foreground mb-4">What's hiding in your paperwork?</h2>
            <p className="text-lg text-muted-foreground">Select a persona to run a live demo with real QVAC inference — watch each analysis step animate in real-time.</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {PERSONAS.map((p, i) => (
              <motion.div
                key={p.link}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.45, delay: i * 0.08 }}
              >
                <Link to={p.link} className="block group">
                  <div className="bg-card border border-border rounded-2xl p-7 h-full card-hover relative overflow-hidden">
                    {/* Top accent line */}
                    <div className={`absolute top-0 left-0 right-0 h-0.5 ${
                      p.risk === 'red' ? 'bg-risk-red' : p.risk === 'amber' ? 'bg-risk-amber' : 'bg-risk-green'
                    }`} />

                    <div className="flex items-start justify-between mb-5">
                      <div>
                        <h3 className="text-xl font-display font-bold text-foreground mb-1">{p.title}</h3>
                        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5" /> {p.context}
                        </p>
                      </div>
                      <RiskBadge level={p.risk} size="md" />
                    </div>

                    <div className="mb-5">
                      <p className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-widest mb-2.5">VAKEEL checks</p>
                      <ul className="space-y-1.5">
                        {p.checks.map((check) => (
                          <li key={check} className="flex items-center gap-2 text-sm text-foreground/80">
                            <CheckCircle2 className="w-3.5 h-3.5 text-primary/50 shrink-0" />
                            {check}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className={`rounded-xl p-4 border mb-4 ${
                      p.risk === 'red' ? 'bg-risk-red/5 border-risk-red/15' :
                      p.risk === 'amber' ? 'bg-risk-amber/5 border-risk-amber/15' :
                      'bg-risk-green/5 border-risk-green/15'
                    }`}>
                      <p className="text-sm font-semibold text-foreground leading-snug">{p.verdict}</p>
                    </div>

                    <div className="flex items-center justify-between">
                      <QvacBadge model={p.model} compact />
                      <span className="flex items-center gap-1 text-sm font-bold text-primary group-hover:translate-x-1 transition-transform">
                        Run Demo <ArrowRight className="w-4 h-4" />
                      </span>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── QVAC CAPABILITIES ────────────────────────────────── */}
      <section className="py-24 px-4 bg-background">
        <div className="container mx-auto max-w-7xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -24 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.55 }}
            >
              <span className="text-xs font-mono font-bold text-primary/60 uppercase tracking-widest mb-3 block">Built on QVAC SDK</span>
              <h2 className="text-4xl font-display font-black text-foreground mb-4">
                Every inference call runs on your device.
              </h2>
              <p className="text-muted-foreground mb-6 leading-relaxed">
                VAKEEL uses <code className="font-mono text-sm bg-muted px-1.5 py-0.5 rounded">@qvac/sdk</code> — Tether's local-first AI platform. TurboQuant KV-cache quantization and Vulkan GPU acceleration ensure fast inference even on mid-range hardware. Zero cloud API calls. Zero data leaks.
              </p>
              <ul className="space-y-3 mb-8">
                {[
                  'TurboQuant KV-cache quantization for 2–4x faster inference',
                  'Vulkan GPU acceleration (NVIDIA / AMD / Intel / Apple Silicon)',
                  'Sequential model loading on 8 GB RAM devices',
                  'SQLite vector store — your embeddings, your disk',
                  'Fully reproducible — same results, offline, forever',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-foreground/80">
                    <Zap className="w-4 h-4 text-secondary shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link to="/how-it-works" className="inline-flex items-center gap-2 text-sm font-bold text-primary hover:underline">
                See the full architecture <ArrowRight className="w-4 h-4" />
              </Link>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 24 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.55 }}
              className="space-y-3"
            >
              {QVAC_MODELS.map((m) => (
                <div key={m.name} className="bg-card border border-border rounded-xl p-5 flex items-start gap-4">
                  <div className="bg-primary/10 p-2 rounded-lg shrink-0">
                    <Cpu className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-mono text-xs font-bold text-foreground mb-0.5 truncate">{m.name}</div>
                    <div className="text-sm text-muted-foreground mb-2">{m.role}</div>
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full font-mono">{m.speed}</span>
                      <span className="text-xs text-secondary font-semibold">{m.note}</span>
                    </div>
                  </div>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── COMPARISON TABLE ─────────────────────────────────── */}
      <section className="py-24 px-4 bg-muted/30 border-y border-border">
        <div className="container mx-auto max-w-5xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <h2 className="text-4xl font-display font-black mb-4">VAKEEL vs. the cloud alternatives</h2>
            <p className="text-muted-foreground">Edge Copilot, NotebookLM, and Mapify require internet and upload your most sensitive documents to the cloud. VAKEEL doesn't.</p>
          </motion.div>

          <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
            <div className="grid grid-cols-4 bg-muted/50 border-b border-border text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <div className="col-span-2 p-4">Feature</div>
              <div className="p-4 text-center text-primary">VAKEEL</div>
              <div className="p-4 text-center">Cloud Tools</div>
            </div>
            {COMPARISON.map((row, i) => (
              <div key={row.feature} className={`grid grid-cols-4 border-b border-border last:border-0 ${i % 2 === 0 ? '' : 'bg-muted/20'}`}>
                <div className="col-span-2 p-4 text-sm font-medium text-foreground">{row.feature}</div>
                <div className="p-4 flex justify-center">
                  <CheckCircle2 className="w-5 h-5 text-risk-green" />
                </div>
                <div className="p-4 flex justify-center">
                  <span className="text-risk-red font-bold text-lg leading-none">×</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────── */}
      <section className="py-24 px-4 bg-background">
        <div className="container mx-auto max-w-4xl text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="bg-primary rounded-3xl p-12 md:p-16 relative overflow-hidden noise-texture"
          >
            <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-white/5 -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full bg-white/5 translate-y-1/2 -translate-x-1/2" />

            <div className="relative z-10">
              <VakeelLogo className="w-14 h-16 mx-auto mb-6 [&_path:first-child]:fill-white/10 [&_path:first-child]:stroke-white/20 [&_path:not(:first-child)]:stroke-secondary" />
              <h2 className="text-4xl md:text-5xl font-display font-black text-white mb-4">
                Your documents.<br />Your device.<br />Your protection.
              </h2>
              <p className="text-white/70 max-w-xl mx-auto mb-10 text-lg">
                A family member was defrauded through a loan document that referenced annexures that didn't exist. VAKEEL was built so this never happens to you.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  to="/analyze/tax-loan"
                  className="px-8 py-4 bg-white text-foreground rounded-xl font-bold text-base hover:bg-white/95 transition-all shadow-lg shadow-black/20 hover:-translate-y-0.5 inline-flex items-center gap-2"
                >
                  Try the Demo <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  to="/vault"
                  className="px-8 py-4 bg-white/10 border border-white/20 text-white rounded-xl font-semibold text-base hover:bg-white/15 transition-all inline-flex items-center gap-2"
                >
                  <Lock className="w-4 h-4" /> Open My Vault
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

    </div>
  );
}
