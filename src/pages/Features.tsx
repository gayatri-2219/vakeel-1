import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Shield, Clock, Banknote, ScanLine, Vault, Landmark, Store,
  ArrowRight, Check, Cpu, Database, Globe
} from 'lucide-react';

const features = [
  {
    icon: Shield,
    number: '01',
    title: 'Trust Score for People & Businesses',
    subtitle: 'Verifies who you are signing with, not just what you are signing.',
    description: [
      'Cross-references counterparty identifiers (name, GST, PAN, CIN) against MCA21, GST portal, and consumer complaint databases',
      'Green / Amber / Red trust verdict with cited reasons',
      'Degrades gracefully to document-text-only pattern analysis when offline',
      'The one component permitted to use external APIs — fully disclosed in api-disclosure.json',
    ],
    qvac: 'Trust Engine · Rule-based + QVAC LLM reasoning',
    example: 'VERDICT: Company CIN U72900KA2021PTC145xxx is deregistered on MCA21. Trust Score: RED — Do not pay advance.',
    risk: 'red',
    link: '/analyze/contract-verify',
  },
  {
    icon: Clock,
    number: '02',
    title: 'Hidden Deadline Detection + Reminders',
    subtitle: 'Auto-extracted dates → calendar alerts → no missed deadlines ever.',
    description: [
      'Extracts every date-bearing obligation: auto-renewal triggers, notice periods, payment due dates, compliance deadlines',
      'Structured deadlines table with alert_date, days_from_now, and severity',
      '"30 days until you\'re locked in for another 11 months" — the highest-value feature for preventing auto-renewal fraud',
      'Calendar export (iCal) and WhatsApp reminder integration',
    ],
    qvac: 'Deadline Engine · LLAMA_3_2_1B_INST_Q4_0 with date extraction prompts',
    example: 'ALERT: Rental agreement auto-renews in 31 days. Notice period is 30 days — you have 1 day to act.',
    risk: 'amber',
    link: '/analyze/tax-loan',
  },
  {
    icon: Banknote,
    number: '03',
    title: 'Consequences in Money',
    subtitle: 'Not legal explanation — financial consequences the person actually cares about.',
    description: [
      'Five numbered consequences in money/time — never legal jargon',
      '"You lose ₹1,00,000 deposit if you leave before 11 months" not "clause 8 governs liquidated damages"',
      'Risk engine runs two sequential prompts: consequences first, then fraud patterns',
      'Few-shot prompting with concrete filled examples for consistent output',
    ],
    qvac: 'Risk Engine · Chain-of-thought with think-then-answer architecture',
    example: '₹40,000 in prepayment penalties if you refinance now. Potential savings of ₹1,80,000 over 5 years by waiting 8 months.',
    risk: 'amber',
    link: '/analyze/tax-loan',
  },
  {
    icon: ScanLine,
    number: '04',
    title: 'Fraud Pattern Detection',
    subtitle: 'Missing annexures, blank pages, contradictory terms, forged document signals.',
    description: [
      'Detects missing annexure references (Exhibit A, Schedule 2) that are cited but absent',
      'Flags contradictory clauses — e.g., payment terms stated differently in two sections',
      'Identifies blank signature fields and unbounded variable amounts (₹___)',
      'Excessive cross-references to absent documents — a classic fraud signal',
    ],
    qvac: 'Fraud Engine · LLAMA_3_2_11B_VISION_INSTRUCT for scanned doc analysis',
    example: 'FRAUD SIGNAL: Document references "Annexure B — Security Deposit Terms" but no Annexure B is attached. 73% match with known fraud patterns.',
    risk: 'red',
    link: '/analyze/land-title',
  },
  {
    icon: Vault,
    number: '05',
    title: 'Personal Document Vault',
    subtitle: 'Google Photos for legal documents — search across everything you have ever signed.',
    description: [
      'Every document chunked (500 chars, 100-char overlap) and embedded via NOMIC_EMBED_TEXT_V1_5_Q8_0',
      'Stored in SQLite as vakeel.db — a single local file you own and control',
      'DigiLocker replacement: rental agreements, loan docs, insurance, land deeds',
      'Natural-language vault queries: "show all agreements expiring in 6 months"',
    ],
    qvac: 'Vector Vault · NOMIC_EMBED_TEXT_V1_5_Q8_0 + SQLite cosine similarity',
    example: 'Query: "which of my documents has a non-compete clause?" → Found in 3 of 12 documents (Employment, MSA, NDA)',
    risk: 'green',
    link: '/vault',
  },
  {
    icon: Landmark,
    number: '06',
    title: 'Rights Engine + Government Schemes',
    subtitle: 'Based on who you are — not just what the document says.',
    description: [
      'Static JSON knowledge base: PM-Kisan, PMFBY, KCC, MUDRA, MSME SAMADHAAN, ESIC, eShram (India); NSSF, Kilimo Biashara (Kenya)',
      'Cross-referenced against detected userProfile and docType',
      'Surfaces 2–4 relevant government benefits the person likely qualifies for but doesn\'t know',
      'Expandable per jurisdiction — open JSON schema',
    ],
    qvac: 'Rights Engine · Classification with LLAMA_3_2_1B_INST_Q4_0',
    example: 'Your profile (Farmer + Land purchase) qualifies for: PMFBY crop insurance, PM-Kisan direct benefit, KCC interest subvention.',
    risk: 'green',
    link: '/analyze/land-title',
  },
  {
    icon: Store,
    number: '07',
    title: 'Merchant & Counterparty Verification',
    subtitle: 'Scan GST · PAN · company name · QR code → trust verdict instantly.',
    description: [
      'Instant cross-reference against GST portal, MCA21 company registry, consumer complaint databases',
      'QR code scanning from physical documents',
      'Works offline with document-text-only pattern analysis',
      'Trust verdict: Green (verified) / Amber (unverified, proceed with caution) / Red (flagged)',
    ],
    qvac: 'Verify Engine · Public registry cross-reference + LLM pattern analysis',
    example: 'GST 29AADCB2230M1Z1 → Active, Registered: Bengaluru · PAN AADCB2230M → Matched · Trust Score: GREEN',
    risk: 'green',
    link: '/vault',
  },
];

const riskColors = {
  red: 'border-risk-red/20 bg-risk-red/5 text-risk-red',
  amber: 'border-risk-amber/20 bg-risk-amber/5 text-risk-amber',
  green: 'border-risk-green/20 bg-risk-green/5 text-risk-green',
};

export default function Features() {
  return (
    <div className="py-16 pb-24">
      {/* Header */}
      <div className="bg-primary hero-gradient noise-texture py-20 px-4 mb-20">
        <div className="container mx-auto max-w-4xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/15 text-white/80 text-xs font-mono mb-6">
              <Cpu className="w-3.5 h-3.5 text-secondary" />
              7 sub-engines · 1 verdict · 30 seconds
            </span>
            <h1 className="text-5xl md:text-6xl font-display font-black text-white mb-4">
              Seven engines.<br />Every document.
            </h1>
            <p className="text-white/70 text-xl max-w-2xl mx-auto">
              VAKEEL runs seven specialized AI sub-engines in sequence — all on your device, all powered by QVAC, all offline.
            </p>
          </motion.div>
        </div>
      </div>

      {/* Features */}
      <div className="container mx-auto max-w-5xl px-4 space-y-16">
        {features.map((f, i) => {
          const Icon = f.icon;
          return (
            <motion.div
              key={f.number}
              initial={{ opacity: 0, y: 32 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="grid grid-cols-1 lg:grid-cols-5 gap-8"
            >
              {/* Left label */}
              <div className="lg:col-span-2 flex flex-col justify-start pt-1">
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-primary/10 p-2.5 rounded-xl">
                    <Icon className="w-6 h-6 text-primary" />
                  </div>
                  <span className="text-4xl font-display font-black text-muted/40">{f.number}</span>
                </div>
                <h2 className="text-2xl font-display font-black text-foreground mb-2">{f.title}</h2>
                <p className="text-muted-foreground text-sm italic mb-4">{f.subtitle}</p>
                <Link to={f.link} className="inline-flex items-center gap-1.5 text-sm font-bold text-primary hover:underline mt-auto">
                  See live demo <ArrowRight className="w-4 h-4" />
                </Link>
              </div>

              {/* Right detail */}
              <div className="lg:col-span-3 space-y-4">
                <ul className="space-y-2.5">
                  {f.description.map((d) => (
                    <li key={d} className="flex items-start gap-2.5 text-sm text-foreground/80">
                      <Check className="w-4 h-4 text-primary/60 shrink-0 mt-0.5" />
                      {d}
                    </li>
                  ))}
                </ul>

                {/* QVAC tag */}
                <div className="flex items-center gap-2 p-3 bg-muted/60 rounded-lg border border-border">
                  <Cpu className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span className="text-xs font-mono text-muted-foreground">{f.qvac}</span>
                </div>

                {/* Example output */}
                <div className={`p-4 rounded-xl border ${riskColors[f.risk as keyof typeof riskColors]}`}>
                  <p className="text-[10px] font-mono font-bold uppercase tracking-widest mb-1.5 opacity-70">Sample output</p>
                  <p className="text-sm font-medium leading-relaxed">{f.example}</p>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Bottom CTA */}
      <div className="container mx-auto max-w-4xl px-4 mt-20">
        <div className="bg-primary/5 border border-primary/20 rounded-2xl p-10 text-center">
          <h3 className="text-3xl font-display font-black mb-3">See all seven engines in action</h3>
          <p className="text-muted-foreground mb-8">Pick a persona and watch VAKEEL analyze a real document in real-time.</p>
          <div className="flex flex-wrap justify-center gap-3">
            {[
              ['Home Loan', '/analyze/tax-loan'],
              ['Land Title', '/analyze/land-title'],
              ['Remote Work', '/analyze/cross-border-tax'],
              ['Freelance Contract', '/analyze/contract-verify'],
            ].map(([label, href]) => (
              <Link key={href} to={href} className="px-5 py-2.5 bg-primary text-primary-foreground rounded-lg font-bold text-sm hover:bg-primary/90 transition-colors">
                {label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
