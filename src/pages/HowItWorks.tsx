import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Cpu, FileImage, Database, Layers, Mic, Zap, Server,
  ArrowRight, ChevronRight, Globe, Lock, CheckCircle2
} from 'lucide-react';

const LAYERS = [
  {
    number: 'L1',
    icon: FileImage,
    title: 'Ingestion',
    color: 'text-blue-600',
    bg: 'bg-blue-50 border-blue-100',
    dot: 'bg-blue-500',
    description: 'Accepts PDFs, scanned documents, and phone photos of physical contracts.',
    details: [
      'Digital PDFs → pdf-parse (instant, no model needed)',
      'Scanned PDFs + photos → LLAMA_3_2_11B_VISION_INSTRUCT for OCR',
      'Hindi, Marathi, Swahili, Arabic, mixed-script supported',
      'Flags [UNCLEAR] sections for re-photographing',
      'On 8 GB devices: load/unload vision model sequentially to avoid OOM',
    ],
    model: 'LLAMA_3_2_11B_VISION_INSTRUCT',
    modelNote: 'Vision model · Vulkan GPU accelerated',
  },
  {
    number: 'L2',
    icon: Layers,
    title: 'Classification',
    color: 'text-purple-600',
    bg: 'bg-purple-50 border-purple-100',
    dot: 'bg-purple-500',
    description: 'Lightweight classifier reads the first 1,500 characters and returns five structured fields.',
    details: [
      'Returns: docType · userProfile · jurisdiction · language · urgency',
      'userProfile: Tenant / Farmer / Employee / Borrower / MSME',
      'Drives every downstream decision: legal rules, language, schemes',
      'Few-shot prompting with concrete filled examples',
      'TurboQuant KV-cache for sub-2s TTFT',
    ],
    model: 'LLAMA_3_2_1B_INST_Q4_0',
    modelNote: 'Fast classifier · TurboQuant KV-cache',
  },
  {
    number: 'L3',
    icon: Database,
    title: 'The Vault',
    color: 'text-green-700',
    bg: 'bg-green-50 border-green-100',
    dot: 'bg-green-500',
    description: 'Every document chunked, embedded, and stored in a local SQLite file — vakeel.db.',
    details: [
      '500-char chunks with 100-char overlap for context continuity',
      'Embeddings via NOMIC_EMBED_TEXT_V1_5_Q8_0',
      'SQLite cosine similarity search — no external vector DB',
      'Natural-language vault queries: "show agreements expiring in 6 months"',
      'DigiLocker replacement: stores what the government won\'t',
    ],
    model: 'NOMIC_EMBED_TEXT_V1_5_Q8_0',
    modelNote: 'Embedding model · SQLite vector store',
  },
  {
    number: 'L4',
    icon: Cpu,
    title: 'Decision Engine',
    color: 'text-orange-600',
    bg: 'bg-orange-50 border-orange-100',
    dot: 'bg-orange-500',
    description: 'Five sub-engines run per document — VAKEEL\'s core differentiator.',
    details: [
      'Risk Engine: consequences in ₹/time (not legal jargon) + fraud patterns',
      'Deadline Engine: every date-bearing obligation → alert_date + severity',
      'Negotiation Engine: exact words to say to the counterparty + fallback position',
      'Rights & Schemes Engine: PM-Kisan, PMFBY, MUDRA, ESIC, eShram surfaced automatically',
      'Trust Engine: counterparty cross-reference against MCA21, GST portal, complaint DBs',
    ],
    model: 'LLAMA_3_2_1B_INST_Q4_0',
    modelNote: 'Chain-of-thought · think-then-answer · few-shot',
  },
  {
    number: 'L5',
    icon: Mic,
    title: 'Output',
    color: 'text-rose-600',
    bg: 'bg-rose-50 border-rose-100',
    dot: 'bg-rose-500',
    description: 'Streaming text in 19 languages, voice round-trip, exportable reports.',
    details: [
      '19 languages: 10 Indian + Swahili, French, Arabic, Yoruba, Amharic, Hausa, Bahasa, Tagalog, English',
      'Per-language system prompts written natively — not translated',
      'Voice: WHISPER_TINY + VAD_SILERO_5_1_2 input → Supertonic TTS output',
      'Export: PDF risk report, Markdown (WhatsApp-ready), JSON audit trail',
      'inference-log.jsonl: model loads, token counts, TTFT, tokens/sec',
    ],
    model: 'WHISPER_TINY + VAD_SILERO_5_1_2',
    modelNote: 'Voice pipeline · full offline round-trip',
  },
];

const MODELS = [
  { name: 'LLAMA_3_2_1B_INST_Q4_0', size: '~800 MB', use: 'Classification + Decision Engine', accel: 'TurboQuant KV-cache' },
  { name: 'LLAMA_3_2_11B_VISION_INSTRUCT', size: '~6.5 GB', use: 'OCR for scanned docs', accel: 'Vulkan GPU' },
  { name: 'NOMIC_EMBED_TEXT_V1_5_Q8_0', size: '~270 MB', use: 'Vault semantic search', accel: 'CPU optimized' },
  { name: 'WHISPER_TINY', size: '~75 MB', use: 'Voice input ASR', accel: 'Real-time' },
  { name: 'VAD_SILERO_5_1_2', size: '~5 MB', use: 'Voice activity detection', accel: 'ONNX Runtime' },
];

const HARDWARE = [
  { spec: 'RAM', min: '8 GB', rec: '16 GB+', note: 'Sequential model loading on 8 GB' },
  { spec: 'GPU', min: 'CPU (fallback)', rec: 'Vulkan-capable GPU', note: 'NVIDIA / AMD / Intel / Apple Silicon' },
  { spec: 'Storage', min: '10 GB free', rec: '20 GB+', note: 'For model artifacts + vault' },
  { spec: 'OS', min: 'Ubuntu 22+, Win 10+, macOS 14+', rec: 'Any modern desktop', note: 'Android / iOS via Expo' },
  { spec: 'Node.js', min: 'v22.17+', rec: 'v22.17+', note: 'Required by @qvac/sdk' },
];

export default function HowItWorks() {
  return (
    <div className="pb-24">
      {/* Header */}
      <div className="hero-gradient noise-texture py-20 px-4 mb-20">
        <div className="container mx-auto max-w-4xl text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/15 text-white/80 text-xs font-mono mb-6">
              <Cpu className="w-3.5 h-3.5 text-secondary" />
              Five-layer QVAC architecture
            </span>
            <h1 className="text-5xl md:text-6xl font-display font-black text-white mb-4">
              Zero Trust.<br />100% Local.
            </h1>
            <p className="text-white/70 text-xl max-w-2xl mx-auto">
              VAKEEL is built entirely on <code className="font-mono bg-white/10 px-2 py-0.5 rounded">@qvac/sdk</code> — every model, every inference call, every embedding runs on your hardware. No OpenAI. No Gemini. No cloud LLM anywhere in the codebase.
            </p>
          </motion.div>
        </div>
      </div>

      {/* Five Layers */}
      <div className="container mx-auto max-w-5xl px-4 mb-24">
        <div className="text-center mb-14">
          <h2 className="text-4xl font-display font-black mb-3">The Five Layers</h2>
          <p className="text-muted-foreground max-w-xl mx-auto">Every document flows through five sequential layers, each powered by a different QVAC model.</p>
        </div>

        <div className="relative">
          {/* Vertical connector */}
          <div className="absolute left-6 top-8 bottom-8 w-0.5 bg-gradient-to-b from-blue-200 via-green-200 to-rose-200 hidden md:block" />

          <div className="space-y-6">
            {LAYERS.map((layer, i) => {
              const Icon = layer.icon;
              return (
                <motion.div
                  key={layer.number}
                  initial={{ opacity: 0, x: -24 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.45, delay: i * 0.07 }}
                  className="relative flex gap-6"
                >
                  {/* Node */}
                  <div className="relative z-10 shrink-0">
                    <div className={`w-12 h-12 rounded-full border-2 flex items-center justify-center bg-white ${layer.bg.replace('bg-', 'border-').split(' ')[0]}`}>
                      <Icon className={`w-5 h-5 ${layer.color}`} />
                    </div>
                  </div>

                  {/* Content */}
                  <div className={`flex-1 rounded-2xl border p-6 ${layer.bg}`}>
                    <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                      <div>
                        <span className={`text-xs font-mono font-bold uppercase tracking-widest ${layer.color} opacity-70`}>{layer.number}</span>
                        <h3 className="text-xl font-display font-bold text-foreground">{layer.title}</h3>
                        <p className="text-sm text-muted-foreground mt-0.5">{layer.description}</p>
                      </div>
                      <div className="shrink-0 flex flex-col items-end gap-1">
                        <span className="font-mono text-[10px] text-muted-foreground bg-white/70 px-2 py-1 rounded-md border border-border">
                          {layer.model}
                        </span>
                        <span className={`text-[10px] font-semibold ${layer.color}`}>{layer.modelNote}</span>
                      </div>
                    </div>
                    <ul className="space-y-1.5 mt-4">
                      {layer.details.map((d) => (
                        <li key={d} className="flex items-start gap-2 text-sm text-foreground/80">
                          <ChevronRight className={`w-4 h-4 shrink-0 mt-0.5 ${layer.color}`} />
                          {d}
                        </li>
                      ))}
                    </ul>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>

      {/* QVAC SDK code snippet */}
      <div className="bg-foreground py-20 px-4 mb-24">
        <div className="container mx-auto max-w-5xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
            <div>
              <span className="text-xs font-mono font-bold text-secondary uppercase tracking-widest mb-3 block">Built on @qvac/sdk</span>
              <h2 className="text-4xl font-display font-black text-white mb-4">Zero cloud LLM calls. Verified.</h2>
              <p className="text-white/60 mb-6 leading-relaxed">
                Every inference call — text generation, embeddings, OCR, translation, TTS — routes through QVAC. You can open your browser's Network tab and watch zero documents leave your device.
              </p>
              <ul className="space-y-3">
                {[
                  'Apache 2.0 open source license',
                  'api-disclosure.json lists every network call',
                  'inference-log.jsonl tracks model loads, TTFT, tokens/sec',
                  'Full reproducibility with hardware specs',
                  'Optional P2P mode via Hyperswarm for rural mesh networks',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-white/70">
                    <CheckCircle2 className="w-4 h-4 text-secondary shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 font-mono text-sm">
              <div className="flex items-center gap-2 mb-4 pb-4 border-b border-white/10">
                <div className="flex gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-red-500/60" />
                  <span className="w-3 h-3 rounded-full bg-yellow-500/60" />
                  <span className="w-3 h-3 rounded-full bg-green-500/60" />
                </div>
                <span className="text-white/40 text-xs">vakeel-core.js</span>
              </div>
              <pre className="text-xs leading-relaxed overflow-x-auto">
{`import { 
  loadModel, 
  LLAMA_3_2_1B_INST_Q4_0,
  NOMIC_EMBED_TEXT_V1_5_Q8_0,
  completion, embed, unloadModel 
} from "@qvac/sdk";

// L2: Classify the document
const classifierModel = await loadModel({
  modelSrc: LLAMA_3_2_1B_INST_Q4_0,
  turboQuant: true, // KV-cache quantization
  onProgress: (p) => updateUI(p),
});

const { profile } = await completion({
  modelId: classifierModel,
  history: buildClassifyPrompt(docText),
  stream: false,
});

// L3: Embed and store in vault
const embedModel = await loadModel({
  modelSrc: NOMIC_EMBED_TEXT_V1_5_Q8_0,
});

const chunks = chunkDocument(docText, 500, 100);
const vectors = await embed({ 
  modelId: embedModel, 
  texts: chunks 
});
await storeInVault(vectors, chunks);
// → vakeel.db · your device · forever`}
              </pre>
            </div>
          </div>
        </div>
      </div>

      {/* Models table */}
      <div className="container mx-auto max-w-5xl px-4 mb-24">
        <h2 className="text-3xl font-display font-black mb-8 text-center">Model Registry</h2>
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
          <div className="grid grid-cols-12 bg-muted/60 border-b border-border p-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            <div className="col-span-5">Model</div>
            <div className="col-span-2">Size</div>
            <div className="col-span-3">Used for</div>
            <div className="col-span-2">Acceleration</div>
          </div>
          {MODELS.map((m, i) => (
            <div key={m.name} className={`grid grid-cols-12 p-4 border-b border-border last:border-0 items-center ${i % 2 === 0 ? '' : 'bg-muted/20'}`}>
              <div className="col-span-5 font-mono text-xs text-foreground font-semibold">{m.name}</div>
              <div className="col-span-2 text-xs text-muted-foreground">{m.size}</div>
              <div className="col-span-3 text-xs text-muted-foreground">{m.use}</div>
              <div className="col-span-2">
                <span className="text-xs bg-secondary/10 text-secondary px-2 py-0.5 rounded-full font-semibold">{m.accel}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Hardware requirements */}
      <div className="container mx-auto max-w-5xl px-4 mb-20">
        <h2 className="text-3xl font-display font-black mb-8 text-center">Hardware Requirements</h2>
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
          <div className="grid grid-cols-12 bg-muted/60 border-b border-border p-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            <div className="col-span-2">Spec</div>
            <div className="col-span-3">Minimum</div>
            <div className="col-span-3">Recommended</div>
            <div className="col-span-4">Notes</div>
          </div>
          {HARDWARE.map((h, i) => (
            <div key={h.spec} className={`grid grid-cols-12 p-4 border-b border-border last:border-0 items-center text-sm ${i % 2 === 0 ? '' : 'bg-muted/20'}`}>
              <div className="col-span-2 font-bold text-foreground">{h.spec}</div>
              <div className="col-span-3 text-muted-foreground">{h.min}</div>
              <div className="col-span-3 text-foreground font-medium">{h.rec}</div>
              <div className="col-span-4 text-xs text-muted-foreground">{h.note}</div>
            </div>
          ))}
        </div>
        <p className="text-center text-xs text-muted-foreground mt-4 font-mono">
          Run <code className="bg-muted px-1.5 py-0.5 rounded">npx qvac doctor</code> to validate your environment before setup.
        </p>
      </div>

      {/* P2P note */}
      <div className="container mx-auto max-w-4xl px-4">
        <div className="bg-primary/5 border border-primary/20 rounded-2xl p-10 flex flex-col md:flex-row items-center gap-8">
          <div className="shrink-0">
            <div className="bg-primary/10 w-16 h-16 rounded-2xl flex items-center justify-center">
              <Globe className="w-8 h-8 text-primary" />
            </div>
          </div>
          <div className="flex-1">
            <h3 className="text-2xl font-display font-black mb-2">Optional P2P Mode via Hyperswarm</h3>
            <p className="text-muted-foreground mb-4">
              A phone with no local compute can delegate inference to a nearby laptop running VAKEEL over an encrypted Holepunch connection. Relevant for rural scenarios where one community member's better hardware serves several neighbors' document analyses — without any data leaving the local mesh.
            </p>
            <Link to="/features" className="inline-flex items-center gap-1.5 text-sm font-bold text-primary hover:underline">
              See all features <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
