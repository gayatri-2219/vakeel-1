/**
 * VAKEEL Backend — powered by @qvac/sdk
 * Real QVAC AI pipeline: OCR · LLM · RAG · Whisper · Translation
 *
 * Models used (all on-device, no cloud):
 *   LLAMA_3_2_1B_INST_Q4_0    — classify, analyze, chat, translate
 *   NOMIC_EMBED_TEXT_V1_5_Q8_0 — embeddings + ragIngest/ragSearch
 *   OCR_LATIN_RECOGNIZER_1     — extract text from images / scanned PDFs
 *   WHISPER_TINY               — speech-to-text transcription
 *
 * API routes:
 *   GET  /api/health
 *   GET  /api/documents
 *   POST /api/upload        — PDF / image → full AI pipeline
 *   GET  /api/documents/:id
 *   POST /api/chat          — RAG-grounded Q&A
 *   POST /api/transcribe    — audio file → Whisper text
 *   POST /api/translate     — text → Hindi / Tamil / Marathi / English
 *   POST /api/ask           — general legal Q&A (no document)
 *   GET  /api/export/:id/:format
 */

import express from 'express';
import multer from 'multer';
import Database from 'better-sqlite3';
import cors from 'cors';
import crypto from 'crypto';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync, existsSync, writeFileSync, unlinkSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const userData = process.env.VAKEEL_USER_DATA || __dirname;
const PORT = process.env.PORT || 3001;
const UPLOADS_DIR = join(userData, 'uploads');
const DB_PATH = join(userData, 'vakeel.db');

/* ─────────────────────────────────────────────────────────────
   Node version check
───────────────────────────────────────────────────────────── */
const [major, minor] = process.versions.node.split('.').map(Number);
if (major < 22 || (major === 22 && minor < 17)) {
  console.error(`\n❌ VAKEEL requires Node.js >= v22.17. You have v${process.versions.node}.`);
  process.exit(1);
}

/* ─────────────────────────────────────────────────────────────
   Ensure dirs exist
───────────────────────────────────────────────────────────── */
if (!existsSync(UPLOADS_DIR)) mkdirSync(UPLOADS_DIR, { recursive: true });

/* ─────────────────────────────────────────────────────────────
   QVAC SDK — model singletons
   Models are loaded once at startup and reused for all requests.
───────────────────────────────────────────────────────────── */
let qvacAvailable = false;

// Function handles
let sdkLoadModel, sdkUnloadModel, sdkCompletion, sdkOcr, sdkTranscribe;
let sdkRagIngest, sdkRagSearch, sdkRagDeleteWorkspace;

// Model constants
let LLM_MODEL_SRC, EMBED_MODEL_SRC, OCR_MODEL_SRC, WHISPER_MODEL_SRC;

// Loaded model IDs (singletons)
let llmModelId = null;
let embedModelId = null;
let ocrModelId = null;
let whisperModelId = null;

// Loading state
let modelsReady = false;
let modelsLoading = false;
let modelsError = null;

try {
  const qvac = await import('@qvac/sdk');
  sdkLoadModel = qvac.loadModel;
  sdkUnloadModel = qvac.unloadModel;
  sdkCompletion = qvac.completion;
  sdkOcr = qvac.ocr;
  sdkTranscribe = qvac.transcribe;
  sdkRagIngest = qvac.ragIngest;
  sdkRagSearch = qvac.ragSearch;
  sdkRagDeleteWorkspace = qvac.ragDeleteWorkspace;

  // Model constants from the registry
  LLM_MODEL_SRC = qvac.LLAMA_3_2_1B_INST_Q4_0;
  EMBED_MODEL_SRC = qvac.NOMIC_EMBED_TEXT_V1_5_Q8_0;
  OCR_MODEL_SRC = qvac.OCR_LATIN_RECOGNIZER_1;
  WHISPER_MODEL_SRC = qvac.WHISPER_BASE_Q8_0;

  qvacAvailable = true;
  console.log('✅ @qvac/sdk loaded successfully');
} catch (err) {
  console.warn(`⚠️  @qvac/sdk not available: ${err.message}`);
  console.warn('   Running in intelligent fallback mode.\n');
}

/* ─────────────────────────────────────────────────────────────
   pdf-parse — text layer extraction
───────────────────────────────────────────────────────────── */
let parsePdf = null;
try {
  const mod = await import('pdf-parse');
  parsePdf = mod.default;
} catch {
  console.warn('⚠️  pdf-parse not available — PDF text-layer extraction disabled');
}

/* ─────────────────────────────────────────────────────────────
   SQLite — vakeel.db
───────────────────────────────────────────────────────────── */
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS documents (
    id              TEXT PRIMARY KEY,
    filename        TEXT NOT NULL,
    content_hash    TEXT,
    pages           INTEGER DEFAULT 0,
    text_content    TEXT,
    profile_json    TEXT DEFAULT '{}',
    risk_report_json TEXT DEFAULT 'null',
    trust_report_json TEXT DEFAULT 'null',
    schemes_json    TEXT DEFAULT '[]',
    deadlines_json  TEXT DEFAULT '[]',
    created_at      INTEGER NOT NULL
  );
`);

try {
  db.prepare('ALTER TABLE documents ADD COLUMN content_hash TEXT').run();
} catch (err) {
  if (!String(err.message || '').includes('duplicate column name')) throw err;
}

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_documents_content_hash ON documents(content_hash);
`);

/* ─────────────────────────────────────────────────────────────
   Model startup loader — load all 4 models sequentially
   Called once when server starts. Non-blocking via async IIFE.
───────────────────────────────────────────────────────────── */
async function loadAllModels() {
  if (!qvacAvailable) {
    console.log('⚠️  QVAC not available — using fallback responses');
    return;
  }

  modelsLoading = true;
  console.log('\n🚀 VAKEEL — Loading QVAC AI models (this may take a few minutes on first run)...\n');

  // 1. LLM — classification, risk analysis, chat
  try {
    console.log('🔄 [1/4] Loading LLM: LLAMA_3_2_1B_INST_Q4_0 (~800 MB)...');
    llmModelId = await sdkLoadModel({
      modelSrc: LLM_MODEL_SRC,
      modelConfig: { ctx_size: 4096 },
      onProgress: (p) => {
        if (p?.percentage != null) {
          process.stdout.write(`\r   ↳ ${Number(p.percentage).toFixed(1)}%   `);
        }
      },
    });
    process.stdout.write('\r');
    console.log(`✅ [1/4] LLM ready: ${llmModelId}`);
  } catch (err) {
    console.error(`❌ [1/4] LLM load failed: ${err.message}`);
  }

  // 2. Embedding model — RAG ingest + search
  try {
    console.log('🔄 [2/4] Loading embeddings: NOMIC_EMBED_TEXT_V1_5_Q8_0 (~300 MB)...');
    embedModelId = await sdkLoadModel({
      modelSrc: EMBED_MODEL_SRC,
      modelType: 'llamacpp-embedding',  // Required: explicit engine descriptor
      onProgress: (p) => {
        if (p?.percentage != null) {
          process.stdout.write(`\r   ↳ ${Number(p.percentage).toFixed(1)}%   `);
        }
      },
    });
    process.stdout.write('\r');
    console.log(`✅ [2/4] Embeddings ready: ${embedModelId}`);
  } catch (err) {
    console.error(`❌ [2/4] Embeddings load failed: ${err.message}`);
  }

  // 3. OCR model — extract text from images / scanned PDFs
  try {
    console.log('🔄 [3/4] Loading OCR: OCR_LATIN_RECOGNIZER_1 (~50 MB)...');
    ocrModelId = await sdkLoadModel({
      modelType: 'onnx-ocr',
      modelSrc: OCR_MODEL_SRC,
      modelConfig: {
        langList: ['en'],
        useGPU: true,
        timeout: 30000,
        magRatio: 1.5,
        defaultRotationAngles: [90, 180, 270],
        contrastRetry: false,
        lowConfidenceThreshold: 0.5,
        recognizerBatchSize: 1,
      },
      onProgress: (p) => {
        if (p?.percentage != null) {
          process.stdout.write(`\r   ↳ ${Number(p.percentage).toFixed(1)}%   `);
        }
      },
    });
    process.stdout.write('\r');
    console.log(`✅ [3/4] OCR ready: ${ocrModelId}`);
  } catch (err) {
    console.error(`❌ [3/4] OCR load failed: ${err.message}`);
  }

  // 4. Whisper — audio transcription
  try {
    console.log('🔄 [4/4] Loading Whisper: WHISPER_BASE_Q8_0 (~75 MB)...');
    whisperModelId = await sdkLoadModel({
      modelType: 'whispercpp-transcription',
      modelSrc: WHISPER_MODEL_SRC,
      modelConfig: {
        language: 'auto',        // auto-detect language for best accuracy
        n_threads: 8,            // more threads = faster on modern hardware
        temperature: 0.0,        // greedy decoding for deterministic output
        suppress_blank: true,
        no_context: true,        // fresh context for each recording
        single_segment: false,   // allow multi-segment transcription
      },
      onProgress: (p) => {
        if (p?.percentage != null) {
          process.stdout.write(`\r   ↳ ${Number(p.percentage).toFixed(1)}%   `);
        }
      },
    });
    process.stdout.write('\r');
    console.log(`✅ [4/4] Whisper ready: ${whisperModelId}`);
  } catch (err) {
    console.error(`❌ [4/4] Whisper load failed: ${err.message}`);
  }

  modelsLoading = false;
  modelsReady = true;
  console.log('\n🎯 VAKEEL AI models loaded. Ready to analyze real documents!\n');
}

// Start loading models asynchronously (don't block server startup)
loadAllModels().catch((err) => {
  modelsLoading = false;
  modelsError = err.message;
  console.error('❌ Critical model load error:', err.message);
});

/* ─────────────────────────────────────────────────────────────
   Core LLM helper
───────────────────────────────────────────────────────────── */
async function runLLM(systemPrompt, userContent, options = {}) {
  if (llmModelId) {
    const history = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent },
    ];
    try {
      const result = sdkCompletion({
        modelId: llmModelId,
        history,
        stream: true,
        ...options,
      });
      let fullText = '';
      for await (const token of result.tokenStream) {
        fullText += token;
      }
      return fullText.trim();
    } catch (err) {
      console.error('⚠️  LLM completion error:', err.message);
    }
  }
  // Fallback
  return fallbackResponse(systemPrompt, userContent);
}

/* ─────────────────────────────────────────────────────────────
   OCR helper — extract text from image file path
───────────────────────────────────────────────────────────── */
async function runOCR(imagePath) {
  if (ocrModelId) {
    try {
      const { blocks } = sdkOcr({
        modelId: ocrModelId,
        image: imagePath,
        options: { paragraph: false },
      });
      const result = await blocks;
      const text = result
        .filter((b) => b.text && b.text.trim().length > 0)
        .map((b) => b.text.trim())
        .join('\n');
      console.log(`   OCR extracted ${result.length} blocks, ${text.length} chars`);
      return text;
    } catch (err) {
      console.error('⚠️  OCR error:', err.message);
    }
  }
  return `[Image: ${imagePath} — OCR model not ready yet, try again in a moment]`;
}

/* ─────────────────────────────────────────────────────────────
   RAG helpers
───────────────────────────────────────────────────────────── */
async function ingestDocumentIntoRAG(docId, chunks) {
  if (!embedModelId || !sdkRagIngest) return false;
  try {
    await sdkRagIngest({
      modelId: embedModelId,
      documents: chunks.map((text) => String(text)),
      workspace: `vakeel-${docId}`,
    });
    console.log(`   RAG ingested ${chunks.length} chunks for workspace vakeel-${docId}`);
    return true;
  } catch (err) {
    console.error('⚠️  RAG ingest error:', err.message);
    return false;
  }
}

async function searchDocumentRAG(docId, query, topK = 6) {
  if (!embedModelId || !sdkRagSearch) return null;
  try {
    const results = await sdkRagSearch({
      modelId: embedModelId,
      query,
      workspace: `vakeel-${docId}`,
      topK,
    });
    if (results && results.length > 0) {
      return results.map((r) => r.content || r.text || String(r)).join('\n\n---\n\n');
    }
  } catch (err) {
    console.error('⚠️  RAG search error:', err.message);
  }
  return null;
}

/* ─────────────────────────────────────────────────────────────
   Text Extraction Engine
───────────────────────────────────────────────────────────── */

/** Spawn isolated process to render PDF to PNG using macOS native sips */
async function extractTextFromScannedPdf(buffer, savedFilePath) {
  try {
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);

    console.log('   Converting PDF to PNG using macOS sips...');
    
    // Create a temporary file for the buffer
    const tempPdfPath = `${savedFilePath}.raw.pdf`;
    writeFileSync(tempPdfPath, buffer);

    const outPngPath = `${savedFilePath}.sips.png`;
    
    // sips extracts the first page of the PDF to PNG at 150 DPI
    await execAsync(`sips -s format png -s dpiHeight 150 -s dpiWidth 150 "${tempPdfPath}" --out "${outPngPath}"`);
    
    let allText = '';
    if (existsSync(outPngPath)) {
      const pageText = await runOCR(outPngPath);
      if (pageText && pageText.length > 10) {
        allText = pageText;
      }
      try { unlinkSync(outPngPath); } catch { /* ignore */ }
    }
    
    try { unlinkSync(tempPdfPath); } catch { /* ignore */ }
    return allText;
  } catch (err) {
    console.error('   PDF→PNG sips error:', err.message);
    return '';
  }
}

async function extractText(buffer, mimetype, filename, savedFilePath) {
  // 1. Try fast pdf-parse first for text-layer PDFs
  if (mimetype === 'application/pdf' && parsePdf) {
    try {
      const data = await parsePdf(buffer);
      const textLen = (data.text || '').replace(/\s+/g, '').length;
      if (textLen > 80) {
        console.log(`   PDF text-layer extraction: ${data.text.length} chars, ${data.numpages} pages`);
        return { text: data.text || '', pages: data.numpages || 1, method: 'pdf-parse' };
      }
      // Text layer is empty — this is a scanned PDF, fall through to OCR
      console.log('   PDF has no text layer — falling back to OCR...');
    } catch (err) {
      console.warn('   PDF parse error:', err.message);
    }
  }

  // 2. For scanned PDFs: render pages to PNG then OCR
  if (mimetype === 'application/pdf' && ocrModelId) {
    console.log(`   Running PDF→PNG→OCR pipeline on: ${filename}`);
    const text = await extractTextFromScannedPdf(buffer, savedFilePath);
    if (text && text.replace(/\s+/g, '').length > 30) {
      return { text, pages: 1, method: 'pdf-to-png-ocr' };
    }
    // pdfjs rendering failed — try passing PDF directly as last resort
    console.log('   PDF render failed, trying direct OCR as fallback...');
    const fallbackText = await runOCR(savedFilePath);
    return { text: fallbackText, pages: 1, method: 'qvac-ocr-fallback' };
  }

  // 3. Direct image upload → QVAC OCR
  const isImage = mimetype?.startsWith('image/') || /\.(jpg|jpeg|png|bmp|webp|tiff?)$/i.test(filename);
  if (isImage && savedFilePath && ocrModelId) {
    console.log(`   Running QVAC OCR on image: ${filename}`);
    const text = await runOCR(savedFilePath);
    return { text, pages: 1, method: 'qvac-ocr' };
  }

  // 4. Plain text
  if (mimetype?.startsWith('text/')) {
    return { text: buffer.toString('utf-8'), pages: 1, method: 'plaintext' };
  }

  return {
    text: `Document: ${filename}\n[Format not supported for text extraction — ensure QVAC OCR model is loaded]`,
    pages: 1,
    method: 'unsupported',
  };
}

/* ─────────────────────────────────────────────────────────────
   Document analysis pipeline
───────────────────────────────────────────────────────────── */

/** Collect up to maxWindows non-overlapping sections from text.
 *  Always includes start and end so buried clauses at the bottom are found.
 */
function sampleWindows(text, windowSize = 3000, maxWindows = 6) {
  if (text.length <= windowSize) return [text];
  const windows = [];
  windows.push(text.slice(0, windowSize));
  if (maxWindows <= 1) return windows;
  const interior = maxWindows - 2;
  if (interior > 0) {
    const step = Math.floor((text.length - windowSize) / (interior + 1));
    for (let i = 1; i <= interior; i++) {
      const start = step * i;
      windows.push(text.slice(start, start + windowSize));
    }
  }
  windows.push(text.slice(Math.max(0, text.length - windowSize)));
  return windows;
}

/** Full-document regex scan for classic contract traps.
 *  Works regardless of LLM context size limits — reads the ENTIRE text.
 */
function scanForHiddenClauses(text) {
  const TRAPS = [
    // IP / Ownership
    { name: 'Broad IP Assignment', severity: 'HIGH',
      pattern: /(?:assign[s]?\s+all|sole\s+property\s+of|owned\s+exclusively|assigned\s+to)\s+(?:intellectual property|ip|inventions?|work product|creations?)/i,
      tip: 'All IP — including personal projects — may be assigned to the company.' },
    { name: 'Work Made for Hire (Unlimited)', severity: 'HIGH',
      pattern: /work\s+(?:made|created|produced)\s+for\s+hire/i,
      tip: 'The company owns everything you create, even outside work hours.' },
    { name: 'IP Survives Termination', severity: 'HIGH',
      pattern: /ip\s+(?:obligations?|assignment|ownership)\s+(?:shall\s+)?survive\s+(?:termination|expiry)/i,
      tip: 'IP obligations continue even after you leave.' },
    { name: 'Prior Inventions Not Excluded', severity: 'MEDIUM',
      pattern: /prior\s+inventions?|pre-?existing\s+(?:work|ip|inventions?)/i,
      tip: 'No carve-out for work created before joining — company may claim it.' },
    // Non-Compete
    { name: 'Non-Compete Clause', severity: 'HIGH',
      pattern: /non[-\s]?compet(?:e|ition|ing)\s+(?:clause|period|obligation|covenant|agreement)/i,
      tip: 'You may be barred from working in your field for months/years after leaving.' },
    { name: 'Global Non-Compete', severity: 'HIGH',
      pattern: /(?:worldwide|global|international|anywhere)\s+non[-\s]?compet/i,
      tip: 'Non-compete applies globally — bars career change anywhere.' },
    { name: 'Non-Solicitation of Clients', severity: 'MEDIUM',
      pattern: /not\s+(?:to\s+)?solicit\s+(?:any\s+)?(?:client|customer|account)/i,
      tip: 'Cannot approach former clients for 12–24 months after leaving.' },
    { name: 'Non-Solicitation of Employees', severity: 'MEDIUM',
      pattern: /not\s+(?:to\s+)?(?:solicit|recruit|hire|employ)\s+(?:any\s+)?(?:employee|staff|personnel)/i,
      tip: 'Cannot recruit or work with former colleagues.' },
    // Termination
    { name: 'Termination Without Cause', severity: 'HIGH',
      pattern: /terminat(?:e|ion|ed)\s+(?:without\s+(?:cause|reason|notice)|at\s+will|for\s+convenience|at\s+any\s+time)/i,
      tip: 'Company can terminate employment at any time without a reason.' },
    { name: 'No Severance Guarantee', severity: 'HIGH',
      pattern: /no\s+(?:severance|separation\s+pay|redundancy\s+pay)/i,
      tip: 'No guaranteed severance if terminated without cause.' },
    { name: 'Clawback / Repayment Clause', severity: 'HIGH',
      pattern: /(?:claw[-\s]?back|repay|reimburse)\s+(?:any\s+)?(?:bonus|signing|relocation)/i,
      tip: 'May have to repay signing bonus or benefits if you leave early.' },
    { name: 'Deemed Resignation', severity: 'HIGH',
      pattern: /(?:deemed|treated as|considered)\s+(?:a\s+)?resignation/i,
      tip: 'Certain actions may be classified as resignation — forfeiting severance.' },
    // Compensation
    { name: 'Discretionary Bonus', severity: 'MEDIUM',
      pattern: /bonus\s+(?:is\s+)?(?:at\s+the\s+sole\s+discretion|discretionary|not\s+guaranteed)/i,
      tip: 'Bonus is entirely at employer discretion — not legally owed.' },
    { name: 'Foreign Currency Salary (FX Risk)', severity: 'MEDIUM',
      pattern: /(?:paid\s+in|compensation\s+in|salary\s+in)\s+(?:cad|usd|gbp|eur|canadian\s+dollar)/i,
      tip: 'Foreign currency salary creates exchange rate risk for Indian employees.' },
    { name: 'Unpaid Overtime (Business Needs)', severity: 'HIGH',
      pattern: /(?:business\s+needs|operational\s+requirements?)\s+(?:may\s+)?require\s+(?:additional|extended)\s+hours/i,
      tip: 'Unlimited unpaid overtime can be demanded under "business needs".' },
    { name: 'Salary Deduction Clause', severity: 'MEDIUM',
      pattern: /(?:deduct|withhold)\s+(?:from\s+)?(?:salary|wages|compensation|pay)/i,
      tip: 'Company reserves the right to deduct amounts from your salary.' },
    // Jurisdiction
    { name: 'Foreign Jurisdiction Clause', severity: 'HIGH',
      pattern: /governed\s+by\s+(?:the\s+laws?\s+of\s+)?(?:ontario|british columbia|canada|delaware|california|england|new york)/i,
      tip: 'Disputes governed by foreign law — extremely costly for an Indian employee.' },
    { name: 'Mandatory Foreign Arbitration', severity: 'HIGH',
      pattern: /(?:binding|mandatory)\s+arbitration\s+(?:in|under)\s+(?:ontario|canada|usa|uk|england)/i,
      tip: 'Arbitration in a foreign country makes dispute resolution nearly impossible.' },
    { name: 'Class Action Waiver', severity: 'HIGH',
      pattern: /waiv(?:e|er|ing)\s+(?:any\s+)?right\s+to\s+(?:class\s+action|collective\s+action)/i,
      tip: 'You waive the right to join group lawsuits against the employer.' },
    // Monitoring
    { name: 'Unlimited Device Monitoring', severity: 'HIGH',
      pattern: /monitor\s+(?:all\s+)?(?:activities?|communications?|devices?|computers?)\s+(?:at\s+any\s+time|without\s+notice)/i,
      tip: 'Company can monitor all your devices including personal ones at any time.' },
    // Confidentiality
    { name: 'Perpetual Confidentiality', severity: 'MEDIUM',
      pattern: /confidentiality\s+(?:obligations?|duty)\s+(?:shall\s+)?(?:survive|continue|remain)\s+(?:indefinitely|permanently|forever)/i,
      tip: 'Confidentiality never expires — even for publicly available information.' },
    { name: 'Whistleblower Restriction', severity: 'HIGH',
      pattern: /(?:not\s+(?:to\s+)?disclose|prohibited\s+from\s+disclosing)\s+(?:to\s+)?(?:government|regulator|authority|media)/i,
      tip: 'May restrict you from reporting illegal activity to authorities.' },
    // Benefits
    { name: 'Benefits at Company Discretion', severity: 'MEDIUM',
      pattern: /benefits?\s+(?:may\s+be\s+)?(?:modified|changed|discontinued|withdrawn)\s+at\s+(?:company|employer)\s+(?:sole\s+)?discretion/i,
      tip: 'Health/retirement benefits can be reduced or removed at any time.' },
  ];

  const found = [];
  for (const trap of TRAPS) {
    const match = text.match(trap.pattern);
    if (match) {
      const idx = match.index || 0;
      const start = Math.max(0, idx - 80);
      const end = Math.min(text.length, idx + match[0].length + 80);
      found.push({
        name: trap.name,
        severity: trap.severity,
        tip: trap.tip,
        excerpt: text.slice(start, end).replace(/\s+/g, ' ').trim(),
      });
    }
  }

  // Detect filler/obfuscation pattern
  const sample = text.slice(0, 4000);
  const uniqueSentences = new Set(
    sample.split(/[.!?\n]+/).map(s => s.trim().toLowerCase().slice(0, 100)).filter(s => s.length > 20)
  );
  if (uniqueSentences.size < 15 && sample.length > 1000) {
    found.push({
      name: 'Filler Obfuscation Pattern',
      severity: 'MEDIUM',
      tip: 'Document uses repetitive boilerplate to bury dangerous clauses. VAKEEL scanned the full document.',
      excerpt: 'Repetitive paragraphs detected at start of document.',
    });
  }

  return found;
}

/** Pre-classifier using pure regex — runs before LLM to catch common Indian doc types.
 *  This prevents misclassification when OCR text is sparse or in regional languages.
 */
function preClassifyByKeyword(text, filename) {
  const t = (text + ' ' + filename).toLowerCase();

  // Indian property documents (Marathi / Hindi / English variants)
  if (/kharedi|kharid|kharidi|विक्री\s*पत्र|खरेदी\s*खत|विक्रीपत्र|sale\s*deed|property\s*sale|विक्री\s*करार/.test(t))
    return { docType: 'Sale Deed', userProfile: 'Buyer', isProperty: true };
  if (/7\/12|सातबारा|satbara|फेरफार|pherfar|property\s*card|मालमत्ता\s*पत्रक/.test(t))
    return { docType: 'Sale Deed', userProfile: 'Farmer', isProperty: true };
  if (/leave\s+and\s+licen[cs]e|licen[cs]or|licen[cs]ee|monthly\s+licen[cs]e\s+fee|महाराष्ट्र\s*भाडे/.test(t))
    return { docType: 'Rental Agreement', userProfile: 'Tenant', isProperty: false };
  if (/employment\s+agreement|offer\s+letter|terms\s+of\s+employment|employee\s+shall/.test(t))
    return { docType: 'Employment Contract', userProfile: 'Employee', isProperty: false };
  if (/loan\s+agreement|emi|equated\s+monthly|moratorium|rate\s+of\s+interest|लोन\s*करार/.test(t))
    return { docType: 'Loan Agreement', userProfile: 'Borrower', isProperty: false };
  if (/मुद्रांक|stamp\s+duty|नोंदणी|registration\s+fee|sub-registrar/.test(t))
    return { docType: 'Sale Deed', userProfile: 'Buyer', isProperty: true };

  return null;
}

async function classifyDoc(text, filename) {
  // Step 1: fast regex pre-classification (no LLM needed for clear cases)
  const preClass = preClassifyByKeyword(text, filename);

  const raw = await runLLM(
    'You are a legal document classifier. Respond with ONLY valid JSON. No prose, no markdown fences, no example text.',
    `Analyze this document and pick ONE best-fit value for each field.
Filename: ${filename}
Content (first 2500 chars):
---
${text.slice(0, 2500)}
---

Instructions:
- docType: pick one of ["Loan Agreement","Sale Deed","Employment Contract","Rental Agreement","Legal Notice","Service Agreement","Cross-Border Employment Contract","General Contract"]
  IMPORTANT: If the document involves buying/selling land, property, or agricultural land — always pick "Sale Deed".
  If it contains words like kharedi, kharid, विक्री पत्र, stamp duty, sub-registrar — pick "Sale Deed".
- userProfile: pick one of ["Borrower","Tenant","Employee","Remote Worker","Farmer","Freelancer","Business Owner","Buyer","General"]
- jurisdiction: state the country/state (e.g. "Maharashtra, India")
- language: language of the document text (e.g. "Marathi", "Hindi", "English")
- urgency: "HIGH" if legal deadlines within 30 days, "MEDIUM" if 30-90 days, "LOW" otherwise
- isCrossBorder: true if one party is in India and the other in another country, else false
- isEmploymentContract: true ONLY if this is an employment or service agreement with an individual worker

Return ONLY this JSON (no prose):
{"docType":"...","userProfile":"...","jurisdiction":"...","language":"...","urgency":"...","isCrossBorder":false,"isEmploymentContract":false}`
  );
  const llmResult = safeJson(raw, {
    docType: 'Legal Agreement',
    userProfile: 'General',
    jurisdiction: 'India',
    language: 'English',
    urgency: 'MEDIUM',
    isCrossBorder: false,
    isEmploymentContract: false,
  });

  // Step 2: Override LLM result with regex pre-classification if available
  if (preClass) {
    llmResult.docType = preClass.docType;
    llmResult.userProfile = preClass.userProfile;
    if (preClass.isProperty) llmResult.isEmploymentContract = false;
  }

  return llmResult;
}


async function analyzeRisks(text, profile) {
  // Step 1: Full-document hidden clause scan (regex, no LLM context limit)
  const hiddenClauses = scanForHiddenClauses(text);

  // Step 2: Build focused analysis context
  //   - First 4,000 chars (header, parties, key terms)
  //   - Last 2,000 chars (signature block + final clauses often most dangerous)
  //   - All flagged suspicious excerpts from pattern scan
  const docStart = text.slice(0, 4000);
  const docEnd = text.length > 6000 ? text.slice(-2000) : '';
  const hiddenExcerpts = hiddenClauses.length > 0
    ? '\n\nFLAGGED PASSAGES (found by full-document pattern scan):\n' +
      hiddenClauses.map((c, i) =>
        `[FLAG ${i + 1}] ${c.name} (${c.severity}): "...${c.excerpt}..."\n  RISK: ${c.tip}`
      ).join('\n\n')
    : '';

  const isEmployment = profile.isEmploymentContract || /employment|service\s+agreement/i.test(profile.docType || '');
  const isCrossBorder = profile.isCrossBorder;

  const employmentChecklist = isEmployment ? `

EMPLOYMENT CONTRACT CHECKLIST — you MUST check for each of these:
✓ Termination: can they fire without cause? Notice period?
✓ Severance: is any guaranteed?
✓ IP Assignment: does it cover personal projects or pre-existing work?
✓ Non-compete: duration, geography, enforceability
✓ Non-solicitation: scope
✓ Bonus: discretionary or guaranteed?
✓ Overtime: is additional pay guaranteed for extra hours?
✓ Governing law: is it the employee's country or a foreign jurisdiction?
✓ Foreign currency: FX risk for Indian employee being paid in CAD/USD?
✓ Device monitoring: scope and notice requirements?
✓ Confidentiality: does it restrict whistleblowing to authorities?
✓ Clawback: repayment of signing bonus or relocation?` : '';

  const crossBorderNote = isCrossBorder ? `

CROSS-BORDER WARNING: Foreign employer, Indian employee.
Flag: FEMA compliance for salary, double taxation risk, no ESI/PF, Indian courts may lack jurisdiction.` : '';

  const raw = await runLLM(
    `You are VAKEEL, an expert legal AI protecting employees and individuals from unfair contract terms.
Read ALL text provided including flagged passages. Be specific — quote actual clause text.
Output ONLY a JSON object. No prose, no markdown.${employmentChecklist}${crossBorderNote}`,
    `Document type: ${profile.docType || 'Legal Document'}
User role: ${profile.userProfile || 'Employee'}
Jurisdiction: ${profile.jurisdiction || 'India'}

=== DOCUMENT START (first 4000 chars) ===
${docStart}
${docEnd ? `\n=== DOCUMENT END (last 2000 chars) ===\n${docEnd}` : ''}
${hiddenExcerpts}

Produce a specific legal risk analysis. For each risk quote ACTUAL text from the document.
"immediateActions" = concrete DO-THIS-NOW steps before signing.
"whatCanGoWrong" = real financial/career consequences with specific amounts or timeframes.

Return ONLY this JSON (no prose, no markdown):
{
  "overallRisk": "HIGH or MEDIUM or LOW",
  "whatCanGoWrong": ["specific consequence 1 with amounts/timeframes", "specific consequence 2"],
  "immediateActions": [
    {"priority": "URGENT or HIGH or MEDIUM", "action": "exact step to take", "reason": "why this protects you", "deadline": "before signing or within X days"}
  ],
  "risks": [
    {"severity": "HIGH or MEDIUM or LOW", "issue": "short clause name", "impact": "consequence with amounts", "suggested_clause": "alternative wording to request", "evidence": "quote from document or flagged passage"}
  ],
  "fraudFlags": [
    {"type": "flag name", "severity": "HIGH or MEDIUM", "evidence": "exact quote or observation"}
  ],
  "positives": ["favorable clause from the document"],
  "negotiations": [
    {"clause": "clause section name", "suggestion": "specific negotiation ask with leverage"}
  ]
}`
  );

  const parsed = safeJson(raw, null);

  // Step 3: Merge regex-detected clauses that LLM may have missed
  const baseReport = parsed || {
    overallRisk: hiddenClauses.some(c => c.severity === 'HIGH') ? 'HIGH' : 'MEDIUM',
    whatCanGoWrong: ['Document requires expert review before signing.'],
    immediateActions: [],
    risks: [],
    fraudFlags: [],
    positives: [],
    negotiations: [],
  };

  if (!Array.isArray(baseReport.immediateActions)) baseReport.immediateActions = [];
  if (!Array.isArray(baseReport.risks)) baseReport.risks = [];
  if (!Array.isArray(baseReport.fraudFlags)) baseReport.fraudFlags = [];
  if (!Array.isArray(baseReport.whatCanGoWrong)) baseReport.whatCanGoWrong = [];
  if (!Array.isArray(baseReport.positives)) baseReport.positives = [];
  if (!Array.isArray(baseReport.negotiations)) baseReport.negotiations = [];

  // Failsafe for LLMs that drop arrays on high-risk employment contracts
  if (isEmployment && baseReport.overallRisk !== 'LOW') {
    if (baseReport.immediateActions.length === 0) {
      baseReport.immediateActions.push({
        priority: 'HIGH',
        action: 'Review termination and IP clauses',
        reason: 'Ensure you understand how you can be fired and who owns your side-projects.',
        deadline: 'Before signing',
      });
    }
    if (baseReport.risks.length === 0 && hiddenClauses.length === 0) {
      baseReport.risks.push({
        severity: 'MEDIUM',
        issue: 'Standard Employer Protections',
        impact: 'The contract favors the employer in disputes.',
        suggested_clause: 'Request mutual protections where applicable.',
        evidence: null,
      });
    }
  }

  // Inject any regex-flagged traps the LLM didn't mention
  const existingText = JSON.stringify(baseReport).toLowerCase();
  for (const trap of hiddenClauses) {
    const key = trap.name.toLowerCase().slice(0, 20);
    if (!existingText.includes(key)) {
      if (trap.severity === 'HIGH') {
        baseReport.fraudFlags.push({
          type: trap.name,
          severity: 'HIGH',
          evidence: `Pattern detected: "${trap.excerpt}" — ${trap.tip}`,
        });
      } else {
        baseReport.risks.push({
          severity: trap.severity,
          issue: trap.name,
          impact: trap.tip,
          suggested_clause: null,
          evidence: trap.excerpt ? `"${trap.excerpt}"` : null,
        });
      }
    }
  }

  // Ensure at least one immediate action for risky docs
  if (baseReport.immediateActions.length === 0 && hiddenClauses.length > 0) {
    baseReport.immediateActions.push({
      priority: 'URGENT',
      action: 'Do NOT sign this agreement yet — get independent legal review first',
      reason: `${hiddenClauses.length} potentially dangerous clause${hiddenClauses.length > 1 ? 's were' : ' was'} detected: ${hiddenClauses.slice(0, 2).map(c => c.name).join(', ')}`,
      deadline: 'Before signing',
    });
  }

  return baseReport;
}

async function extractDeadlines(text, profile) {
  const today = new Date().toISOString().split('T')[0];
  const nextMonth = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const rawClauseFragment = /^(by|per|within|after|before)\b/i;

  // If text is too short (poor OCR), skip LLM to avoid hallucination
  const meaningfulWords = text.trim().split(/\s+/).filter(w => w.length > 2).length;
  if (meaningfulWords < 40) {
    console.log('   ⚠️  extractDeadlines: skipped (insufficient text — OCR may have failed)');
    return [];
  }

  // For property documents, use property-specific deadline types
  const isProperty = /sale deed|kharedi|property/i.test(profile?.docType || '');
  const domainHint = isProperty
    ? 'This is a property/land sale document. Look for: registration deadline, stamp duty payment date, possession date, mutation (फेरफार) deadline, payment schedule.'
    : 'Look for: notice periods, probation end dates, non-compete duration, salary review dates, payment deadlines.';

  const raw = await runLLM(
    'You are a legal deadline extraction AI. Respond with ONLY a valid JSON array. No prose or explanation.',
    `Today's date: ${today}
Document type: ${profile?.docType || 'Legal Document'}

Document content:
---
${text.slice(0, 6000)}
---

Task: Extract ONLY deadlines that are EXPLICITLY mentioned in the document above. 
${domainHint}

STRICT RULES:
- ONLY extract deadlines with ACTUAL dates, timeframes, or periods found in the document text.
- If you cannot find a REAL date or period in the document, return [].
- NEVER invent, guess, or use [date] placeholders — this is strictly forbidden.
- NEVER extract employment deadlines (probation, termination) from a property/sale document.
- "type": SHORT title (5-60 chars) matching the document's actual content.
- "description": Quote or closely paraphrase the ACTUAL clause from the document.
- "alert_date": YYYY-MM-DD computed from today (${today}). Use null if the document gives no specific date or duration.
- "severity": "HIGH" if money or legal obligation; "MEDIUM" if procedural; "LOW" informational.

If no REAL deadlines found, return [].

Return ONLY a JSON array:`
  );
  const result = safeJson(raw, []);
  if (!Array.isArray(result)) return [];

  // Deduplicate by type (normalised to lowercase)
  const seenTypes = new Set();
  return result
    .map(d => ({
      ...d,
      type: typeof d?.type === 'string' ? d.type.trim() : '',
      description: typeof d?.description === 'string' ? d.description.trim() : '',
    }))
    .filter(d => d.type.length > 4 && d.type.length < 80)
    .filter(d => !rawClauseFragment.test(d.type))
    // Remove hallucinated [date] placeholders
    .filter(d => !/\[date\]|\[dd\]|\[mm\]|\[year\]/i.test(d.description))
    // Deduplicate by type
    .filter(d => {
      const key = d.type.toLowerCase().slice(0, 40);
      if (seenTypes.has(key)) return false;
      seenTypes.add(key);
      return true;
    })
    .slice(0, 8);
}

async function matchSchemes(text, profile) {
  const isCrossBorder = profile.isCrossBorder;
  const isEmployment = profile.isEmploymentContract || /employment|service/i.test(profile.docType || '');

  const docTypeMap = {
    'Loan Agreement':        'PM SVANidhi, MUDRA Loan Scheme, RBI Fair Practice Code for Lenders, Consumer Protection Act 2019',
    'Rental Agreement':      'Maharashtra Rent Control Act 1999, Model Tenancy Act 2021, Consumer Protection Act 2019',
    'Sale Deed':             'Transfer of Property Act 1882 (Section 54-55 buyer rights), Registration Act 1908 (compulsory registration), Indian Stamp Act 1899 (stamp duty), Maharashtra Land Revenue Code, RERA Act 2016 (for built property), Benami Transactions Prohibition Act 2016. Key rights: demand clear title, search for encumbrances at Sub-Registrar, get 7/12 (Satbara) extract, check if agricultural land conversion (NA) is done.',
    'Employment Contract':   'Industrial Disputes Act 1947, Payment of Wages Act 1936, Shops & Establishments Act, Maternity Benefit Act 1961',
    'Cross-Border Employment Contract': 'FEMA 1999 (salary remittance), Income Tax Act Section 9 + DTAA, DPDP Act 2023, Industrial Disputes Act 1947',
    'Service Agreement':     'Indian Contract Act 1872, Consumer Protection Act 2019, MSME Samadhaan',
    'Legal Notice':          'Consumer Protection Act 2019, Legal Services Authorities Act 1987 (free legal aid)',
    'General Contract':      'Indian Contract Act 1872, Consumer Protection Act 2019',
    'Legal Agreement':       'Indian Contract Act 1872, Consumer Protection Act 2019',
  };

  const crossBorderAddons = isCrossBorder
    ? `\nCRITICAL for cross-border employment with foreign company paying Indian resident:
- FEMA 1999: salary must arrive via banking channels; LRS rules apply
- DTAA: India has tax treaties with many countries; claim foreign tax credit via Form 67
- Income Tax Act Section 9: foreign salary taxable in India if services rendered here
- Indian labor laws (ESI, PF) likely do NOT apply from foreign employer
- DPDP Act 2023: data collection clauses must comply with India data protection law`
    : '';

  const relevantLaws = docTypeMap[profile.docType] || 'Indian Contract Act 1872, Consumer Protection Act 2019';

  const raw = await runLLM(
    'You are an Indian legal rights advisor specialising in employee protection and cross-border employment. Respond with ONLY a valid JSON array. No prose.',
    `Document type: ${profile.docType || 'Legal Document'}
User profile: ${profile.userProfile || 'General'}
Is cross-border employment: ${isCrossBorder ? 'YES' : 'NO'}
Relevant laws: ${relevantLaws}
${crossBorderAddons}

Document snippet:
---
${text.slice(0, 2500)}
---

Identify 2 to 4 ACTUAL LAWS or GOVERNMENT SCHEMES that protect this user.

Rules:
- ONLY real named laws, treaties, or schemes
- "name" must be official with section if relevant
- "description" must say HOW the user can use this right (1-2 sentences, action-oriented)
- For cross-border: mention FEMA compliance, DTAA benefits, absence of ESI/PF
- Return [] if nothing genuinely applies

Return ONLY a JSON array:
[{"name": "Law Name — Section X", "description": "How this specifically protects you and what to do."}]`
  );
  const result = safeJson(raw, []);
  if (!Array.isArray(result)) return [];
  const copiedClausePattern = /\b(agreement|licence|license|notice|clause|party|parties|tenant|landlord|employee)\b$/i;
  return result
    .map(r => typeof r === 'string' ? { name: r.trim(), description: '' } : ({
      ...r,
      name: typeof r?.name === 'string' ? r.name.trim() : '',
      description: typeof r?.description === 'string' ? r.description.trim() : '',
    }))
    .filter(r => r.name.length > 5 && r.description.length > 10)
    .filter(r => !copiedClausePattern.test(r.name))
    .slice(0, 5);
}

/* ─────────────────────────────────────────────────────────────
   Intelligent fallback responses
───────────────────────────────────────────────────────────── */
function fallbackResponse(systemPrompt, userContent) {
  const sp = systemPrompt.toLowerCase();
  const uc = userContent.toLowerCase();

  if (sp.includes('classify') || sp.includes('doctype')) {
    const doc = uc.includes('loan') ? 'Loan Agreement'
      : uc.includes('deed') || uc.includes('property') ? 'Sale Deed'
      : uc.includes('employment') || uc.includes('offer') ? 'Employment Contract'
      : uc.includes('rent') || uc.includes('lease') ? 'Rental Agreement'
      : 'Legal Agreement';
    return JSON.stringify({ docType: doc, userProfile: 'General', jurisdiction: 'India', language: 'English', urgency: 'MEDIUM' });
  }

  if (sp.includes('risk') || sp.includes('analyze')) {
    return JSON.stringify({
      overallRisk: 'MEDIUM',
      documentType: 'Legal Agreement',
      whatCanGoWrong: ['This document contains standard clauses that require careful review.', 'Ensure all annexures are attached.', 'Verify counterparty identity before signing.'],
      risks: [{ severity: 'MEDIUM', issue: 'Review required', impact: 'QVAC LLM model is loading — retry in a moment for AI-powered analysis.', suggested_clause: null, evidence: null }],
      fraudFlags: [],
      positives: ['Document uploaded and indexed successfully.'],
      negotiations: [],
    });
  }

  if (sp.includes('deadline')) {
    return JSON.stringify([{ type: 'Notice Period', description: 'Standard notice period — LLM loading, retry for AI analysis.', alert_date: null, days_from_now: 30, severity: 'MEDIUM' }]);
  }

  if (sp.includes('scheme')) return JSON.stringify([]);

  return 'VAKEEL AI models are loading. Please retry in a moment for on-device AI responses.';
}

/* ─────────────────────────────────────────────────────────────
   Utilities
───────────────────────────────────────────────────────────── */
function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

function safeJson(raw, fallback = null) {
  if (!raw) return fallback;
  if (typeof raw === 'object') return raw;
  let text = raw.replace(/```(?:json)?\s*/gi, '').replace(/```/g, '').trim();
  try { return JSON.parse(text); } catch { /* continue */ }
  const m = text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  if (m) { try { return JSON.parse(m[1]); } catch { /* continue */ } }
  return fallback;
}

function normalizeText(value = '') {
  return String(value).toLowerCase().replace(/\s+/g, ' ').trim();
}

function isLeaveAndLicence(text, profile = {}) {
  const t = normalizeText(`${profile.docType || ''} ${text}`);
  return (
    /\b(leave\s+and\s+licen[cs]e|licen[cs]or|licen[cs]ee|monthly\s+licen[cs]e\s+fee)\b/.test(t) ||
    (/\brental agreement\b/.test(t) && /\bmaharashtra rent control act\b/.test(t))
  );
}

function hasAny(text, patterns) {
  return patterns.some((pattern) => pattern.test(text));
}

function calibrateRiskReport(text, profile, report = {}) {
  const t = normalizeText(text);
  const calibrated = {
    overallRisk: 'MEDIUM',
    documentType: profile?.docType || report.documentType || 'Legal Agreement',
    whatCanGoWrong: [],
    risks: [],
    fraudFlags: [],
    positives: [],
    negotiations: [],
    immediateActions: [],
    ...report,
  };

  if (!Array.isArray(calibrated.whatCanGoWrong)) calibrated.whatCanGoWrong = [];
  if (!Array.isArray(calibrated.risks)) calibrated.risks = [];
  if (!Array.isArray(calibrated.fraudFlags)) calibrated.fraudFlags = [];
  if (!Array.isArray(calibrated.positives)) calibrated.positives = [];
  if (!Array.isArray(calibrated.negotiations)) calibrated.negotiations = [];
  if (!Array.isArray(calibrated.immediateActions)) calibrated.immediateActions = [];

  // Normalise overallRisk to uppercase so downstream comparisons work
  calibrated.overallRisk = String(calibrated.overallRisk || 'MEDIUM').toUpperCase();

  // Only apply the Leave & Licence calibration for actual rental documents.
  // Employment contracts and other high-risk docs must NOT be neutralised here.
  if (!isLeaveAndLicence(text, profile)) return calibrated;

  // —— Leave & Licence specific calibration below ——
  calibrated.documentType = 'Leave and Licence Agreement';

  const positives = [];
  if (hasAny(t, [/refundable security deposit/, /refunded in full within 7 .*days/, /documented damages beyond normal wear and tear/])) {
    positives.push('Security deposit is refundable and deductions are limited to documented damages beyond normal wear and tear.');
  }
  if (hasAny(t, [/30 .*days written notice/, /30 \(thirty\) days written notice/])) {
    positives.push('Either party has a clear 30-day written notice period.');
  }
  if (hasAny(t, [/registered with the sub-registrar/, /registration charges shall be shared equally/, /within 30 days of execution/])) {
    positives.push('The agreement requires registration within 30 days and shares registration charges equally.');
  }
  if (hasAny(t, [/structural repairs.*licensor/, /major plumbing.*electrical repairs.*licensor/])) {
    positives.push('Structural and major repair responsibility stays with the licensor.');
  }
  if (hasAny(t, [/rent escalation.*maximum of 5%/, /increased by a maximum of 5%/])) {
    positives.push('Renewal rent escalation is capped at 5% per year.');
  }

  const risks = [];
  const hasInventoryAnnexure = hasAny(t, [/annexure a/, /condition report/]);
  if (!hasInventoryAnnexure && hasAny(t, [/inventory/, /refrigerator|washing machine|geyser|wardrobes|modular kitchen/])) {
    risks.push({
      severity: 'LOW',
      issue: 'Inventory condition proof',
      impact: 'Without signed photos or a condition report, later damage disputes may become harder to prove.',
      suggested_clause: 'Attach signed photos and an item-wise condition report as an annexure.',
      evidence: 'Inventory items are listed in the agreement.',
    });
  }

  if (!hasAny(t, [/police verification/, /tenant verification/])) {
    risks.push({
      severity: 'LOW',
      issue: 'Tenant police verification not mentioned',
      impact: 'Some Maharashtra housing societies or local processes may expect tenant verification separately.',
      suggested_clause: 'Add that both parties will complete society and police verification formalities, if required.',
      evidence: null,
    });
  }

  const problematicTerms = [
    /non[-\s]?refundable deposit/,
    /owner may terminate.*without notice/,
    /licensor may terminate.*without notice/,
    /unlimited.*increase/,
    /licensee.*responsible.*structural repairs/,
    /blank signature/,
    /not registered/,
  ];
  const hasProblematicTerm = hasAny(t, problematicTerms);

  calibrated.positives = Array.from(new Set([...positives, ...calibrated.positives])).slice(0, 6);
  calibrated.risks = hasProblematicTerm ? calibrated.risks : risks;
  calibrated.fraudFlags = calibrated.fraudFlags.filter((flag) => {
    const sev = String(flag?.severity || '').toUpperCase();
    const evidence = normalizeText(flag?.evidence || flag?.type || '');
    return sev === 'HIGH' && hasAny(evidence, problematicTerms);
  });

  if (!hasProblematicTerm) {
    calibrated.overallRisk = 'LOW';
    calibrated.whatCanGoWrong = risks.length
      ? risks.map((risk) => risk.impact)
      : ['This looks like a standard tenant-friendly leave-and-licence agreement. Keep signed annexures and payment proofs.'];
    calibrated.negotiations = risks.map((risk) => ({
      clause: risk.issue,
      suggestion: risk.suggested_clause,
    }));
  }

  return calibrated;
}

function buildTrustReport(riskReport, profile = {}) {
  const risk = String(riskReport?.overallRisk || 'MEDIUM').toUpperCase();
  const highRisks = Array.isArray(riskReport?.risks)
    ? riskReport.risks.filter((r) => String(r?.severity || '').toUpperCase() === 'HIGH').length
    : 0;
  const medRisks = Array.isArray(riskReport?.risks)
    ? riskReport.risks.filter((r) => String(r?.severity || '').toUpperCase() === 'MEDIUM').length
    : 0;
  const fraudCount = Array.isArray(riskReport?.fraudFlags) ? riskReport.fraudFlags.length : 0;
  const positiveCount = Array.isArray(riskReport?.positives) ? riskReport.positives.length : 0;
  const urgentActions = Array.isArray(riskReport?.immediateActions)
    ? riskReport.immediateActions.filter((a) => a?.priority === 'URGENT').length
    : 0;

  // Base score by overall risk level
  let scoreNumeric = risk === 'LOW' ? 86 : risk === 'HIGH' ? 35 : 62;

  // Penalise based on specific findings
  scoreNumeric -= highRisks * 8;      // -8 per HIGH risk
  scoreNumeric -= medRisks * 3;       // -3 per MEDIUM risk
  scoreNumeric -= fraudCount * 12;    // -12 per fraud flag / hidden clause
  scoreNumeric -= urgentActions * 6;  // -6 per URGENT immediate action

  // Reward for positive clauses
  scoreNumeric += Math.min(positiveCount * 2, 10);

  // Clamp to 5..96
  scoreNumeric = Math.max(5, Math.min(96, scoreNumeric));

  const docLabel = profile?.docType || riskReport?.documentType || 'Document';
  const summary = risk === 'HIGH'
    ? `${docLabel} contains HIGH-RISK clauses. ${fraudCount > 0 ? `${fraudCount} hidden clause${fraudCount > 1 ? 's' : ''} detected.` : ''} Do not sign without independent legal review.`
    : risk === 'LOW'
    ? `${docLabel} checked on-device. No major red flags found. Standard clauses appear tenant/employee-friendly.`
    : `${docLabel} has moderate risk. Review flagged clauses and negotiate before signing.`;

  return {
    score: scoreNumeric >= 80 ? 'HIGH' : scoreNumeric >= 50 ? 'MEDIUM' : 'LOW',
    scoreNumeric,
    summary,
  };
}

function fallbackTranslateText(text, language) {
  const dictionaries = {
    Hindi: {
      'Leave and Licence Agreement': 'लीव एंड लाइसेंस अनुबंध',
      'Rental Agreement': 'किराया अनुबंध',
      'Security deposit is refundable and deductions are limited to documented damages beyond normal wear and tear.': 'सुरक्षा जमा वापसी योग्य है और कटौती केवल सामान्य घिसावट से अधिक दस्तावेजीकृत नुकसान तक सीमित है।',
      'Either party has a clear 30-day written notice period.': 'दोनों पक्षों के लिए 30 दिन की लिखित नोटिस अवधि स्पष्ट है।',
      'The agreement requires registration within 30 days and shares registration charges equally.': 'अनुबंध में 30 दिनों के भीतर पंजीकरण और पंजीकरण शुल्क बराबर बांटने की शर्त है।',
      'Structural and major repair responsibility stays with the licensor.': 'संरचनात्मक और बड़े मरम्मत की जिम्मेदारी लाइसेंसर के पास रहती है।',
      'Renewal rent escalation is capped at 5% per year.': 'नवीनीकरण पर किराया वृद्धि प्रति वर्ष 5% तक सीमित है।',
      'This looks like a standard tenant-friendly leave-and-licence agreement. Keep signed annexures and payment proofs.': 'यह एक सामान्य किरायेदार-हितैषी लीव एंड लाइसेंस अनुबंध दिखता है। हस्ताक्षरित annexures और भुगतान प्रमाण सुरक्षित रखें।',
    },
    Marathi: {
      'Leave and Licence Agreement': 'लीव्ह अँड लायसन्स करार',
      'Rental Agreement': 'भाडे करार',
      'Security deposit is refundable and deductions are limited to documented damages beyond normal wear and tear.': 'सुरक्षा ठेव परत मिळण्यायोग्य आहे आणि कपात फक्त सामान्य झीजेपेक्षा जास्त दस्तऐवजीकृत नुकसानीपुरती मर्यादित आहे.',
      'Either party has a clear 30-day written notice period.': 'दोन्ही पक्षांसाठी 30 दिवसांची लेखी नोटीस कालावधी स्पष्ट आहे.',
      'The agreement requires registration within 30 days and shares registration charges equally.': 'करारात 30 दिवसांत नोंदणी आणि नोंदणी शुल्क समान वाटून घेण्याची अट आहे.',
      'Structural and major repair responsibility stays with the licensor.': 'स्ट्रक्चरल आणि मोठ्या दुरुस्तीची जबाबदारी लायसन्सरकडे राहते.',
      'Renewal rent escalation is capped at 5% per year.': 'नूतनीकरणावेळी भाडेवाढ दरवर्षी जास्तीत जास्त 5% आहे.',
      'This looks like a standard tenant-friendly leave-and-licence agreement. Keep signed annexures and payment proofs.': 'हा सामान्य आणि भाडेकरूच्या दृष्टीने अनुकूल लीव्ह अँड लायसन्स करार दिसतो. स्वाक्षरी केलेली annexures आणि पेमेंट पुरावे जपून ठेवा.',
    },
    Tamil: {
      'Leave and Licence Agreement': 'லீவ் அண்ட் லைசென்ஸ் ஒப்பந்தம்',
      'Rental Agreement': 'வாடகை ஒப்பந்தம்',
      'Security deposit is refundable and deductions are limited to documented damages beyond normal wear and tear.': 'பாதுகாப்பு வைப்பு திருப்பித் தரப்பட வேண்டியது; சாதாரண kulaiyai மீறும் ஆவணப்படுத்தப்பட்ட சேதங்களுக்கு மட்டும் கழிப்பு செய்யலாம்.',
      'Either party has a clear 30-day written notice period.': 'இரு தரப்பிற்கும் 30 நாள் எழுத்து மூல அறிவிப்பு காலம் தெளிவாக உள்ளது.',
      'The agreement requires registration within 30 days and shares registration charges equally.': 'ஒப்பந்தம் 30 நாட்களுக்குள் பதிவு செய்யப்பட வேண்டும்; பதிவு செலவு இரு தரப்பும் சமமாக பகிர வேண்டும்.',
      'Structural and major repair responsibility stays with the licensor.': 'கட்டமைப்பு மற்றும் முக்கிய பழுது பார்க்கும் பொறுப்பு லைசென்சரிடம் உள்ளது.',
      'Renewal rent escalation is capped at 5% per year.': 'புதுப்பிப்பின் போது வாடகை உயர்வு ஆண்டுக்கு அதிகபட்சம் 5% ஆக கட்டுப்படுத்தப்பட்டுள்ளது.',
      'This looks like a standard tenant-friendly leave-and-licence agreement. Keep signed annexures and payment proofs.': 'இது வழக்கமான, வாடகையாளர் நட்பு லீவ் அண்ட் லைசென்ஸ் ஒப்பந்தமாக தெரிகிறது. கையொப்பமிட்ட annexures மற்றும் கட்டண ஆதாரங்களை வைத்திருக்கவும்.',
    },
  };
  const dict = dictionaries[language] || {};
  return dict[text] || text;
}

function chunkText(text, size = 500, overlap = 100) {
  const chunks = [];
  let i = 0;
  const clean = text.replace(/\s+/g, ' ').trim();
  while (i < clean.length) {
    const chunk = clean.slice(i, i + size);
    if (chunk.trim().length > 20) chunks.push(chunk);
    i += size - overlap;
    if (i + overlap >= clean.length) break;
  }
  return chunks;
}

/** BM25-lite fallback for when RAG is not available */
function textRelevanceFallback(query, text) {
  const qWords = new Set(query.toLowerCase().split(/\W+/).filter((w) => w.length > 3));
  if (qWords.size === 0) return 0;
  const tWords = text.toLowerCase().split(/\W+/);
  let hits = 0;
  for (const w of tWords) if (qWords.has(w)) hits++;
  return hits / qWords.size;
}

/* ─────────────────────────────────────────────────────────────
   SQLite statements
───────────────────────────────────────────────────────────── */
const stmts = {
  insertDoc: db.prepare(`INSERT INTO documents (id, filename, content_hash, pages, text_content, profile_json, risk_report_json, trust_report_json, schemes_json, deadlines_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`),
  getDocByHash: db.prepare(`SELECT * FROM documents WHERE content_hash = ? LIMIT 1`),
  listDocs: db.prepare(`SELECT id, filename, pages, created_at FROM documents ORDER BY created_at DESC`),
  getDoc: db.prepare(`SELECT * FROM documents WHERE id = ?`),
};

/* ─────────────────────────────────────────────────────────────
   Express app
───────────────────────────────────────────────────────────── */
const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Serve frontend in production
if (process.env.NODE_ENV === 'production') {
  const APP_DIR = process.env.APP_DIR || join(__dirname, '..');
  const distPath = join(APP_DIR, 'dist');
  app.use(express.static(distPath));
  // SPA fallback routing
  app.get(/^(?!\/api).+/, (req, res) => {
    res.sendFile(join(distPath, 'index.html'));
  });
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/bmp', 'text/plain', 'audio/wav', 'audio/mpeg', 'audio/webm', 'audio/ogg', 'video/webm'];
    cb(null, allowed.includes(file.mimetype) || file.originalname.endsWith('.pdf'));
  },
});

/* ── Health check ──────────────────────────────────────────── */
app.get('/api/health', (_req, res) => {
  const count = db.prepare('SELECT COUNT(*) AS c FROM documents').get().c;
  res.json({
    status: 'ok',
    qvacAvailable,
    modelsReady,
    modelsLoading,
    models: {
      llm: !!llmModelId,
      embed: !!embedModelId,
      ocr: !!ocrModelId,
      whisper: !!whisperModelId,
    },
    documentsStored: count,
    nodeVersion: process.versions.node,
  });
});

/* ── List documents ────────────────────────────────────────── */
app.get('/api/documents', (_req, res) => {
  try {
    const docs = db.prepare(`
      SELECT * FROM documents 
      GROUP BY content_hash 
      ORDER BY created_at DESC
    `).all();
    res.json(docs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ── Upload & analyze ──────────────────────────────────────── */
app.post('/api/upload', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });

  const { buffer, originalname, mimetype } = req.file;
  const createdAt = Math.floor(Date.now() / 1000);

  // ── Deduplication by content hash ─────────────────────────
  const contentHash = crypto.createHash('sha256').update(buffer).digest('hex');
  const existing = stmts.getDocByHash.get(contentHash);
  if (existing) {
    console.log(`\n♻️  Duplicate detected for ${originalname} — returning existing document ${existing.id}`);
    return res.json({
      id: existing.id,
      filename: existing.filename,
      pages: existing.pages,
      profile: safeJson(existing.profile_json),
      riskReport: safeJson(existing.risk_report_json),
      trustReport: safeJson(existing.trust_report_json),
      schemes: safeJson(existing.schemes_json, []),
      deadlines: safeJson(existing.deadlines_json, []),
      duplicate: true,
    });
  }

  const id = crypto.randomUUID();

  // Save file to disk for OCR access
  const ext = originalname.split('.').pop() || 'bin';
  const savedPath = join(UPLOADS_DIR, `${id}.${ext}`);
  let fileSaved = false;

  try {
    console.log(`\n📄 Processing upload: ${originalname} (${mimetype})`);

    // Save to disk so OCR can access it by path
    writeFileSync(savedPath, buffer);
    fileSaved = true;

    // 1. Extract text (pdf-parse or QVAC OCR)
    const { text, pages, method } = await extractText(buffer, mimetype, originalname, savedPath);
    console.log(`   Extraction method: ${method} → ${text.length} chars, ${pages} pages`);

    // 2. Classify
    const profile = await classifyDoc(text, originalname);
    console.log(`   Profile: ${profile.docType} / ${profile.userProfile} / ${profile.urgency}`);

    // 3. Parallel AI analysis (risk + deadlines + schemes)
    const [rawRiskReport, deadlines, schemes] = await Promise.all([
      analyzeRisks(text, profile),
      extractDeadlines(text, profile),
      matchSchemes(text, profile),
    ]);

    // 3b. Post-process risk report through calibration engine
    //     This corrects over-eager LLM risk scores for standard safe docs
    //     (e.g. well-drafted Leave & Licence agreements)
    const riskReport = calibrateRiskReport(text, profile, rawRiskReport);
    console.log(`   Risk (raw): ${rawRiskReport.overallRisk} → (calibrated): ${riskReport.overallRisk}, Deadlines: ${deadlines.length}, Schemes: ${schemes.length}`);

    // 4. Real QVAC RAG — chunk and ingest into vector workspace
    const chunks = chunkText(text).slice(0, 200);
    const ragSuccess = await ingestDocumentIntoRAG(id, chunks);
    console.log(`   RAG ingest: ${ragSuccess ? `✅ ${chunks.length} chunks in workspace vakeel-${id}` : '⚠️  fallback (embed model not ready)'}`);

    // 5. Build trust report from calibrated risk (dynamic, not hardcoded)
    const trustReport = buildTrustReport(riskReport, profile);

    // 6. Store in SQLite (including content_hash for deduplication)
    stmts.insertDoc.run(
      id, originalname, contentHash, pages,
      text.slice(0, 200_000),
      JSON.stringify(profile),
      JSON.stringify(riskReport),
      JSON.stringify(trustReport),
      JSON.stringify(schemes),
      JSON.stringify(deadlines),
      createdAt
    );

    console.log(`   ✅ Stored document ID: ${id}\n`);

    res.json({
      id, filename: originalname, pages,
      profile, riskReport, trustReport, schemes, deadlines,
      extractionMethod: method,
      ragIndexed: ragSuccess,
      chunkCount: chunks.length,
    });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: err.message || 'Processing failed' });
  } finally {
    // Clean up saved file (OCR is done, we don't need it on disk)
    if (fileSaved) {
      try { unlinkSync(savedPath); } catch { /* ignore */ }
    }
  }
});

/* ── Get document report ───────────────────────────────────── */
// Demo reports for the Try Demo buttons on the landing page
const DEMO_REPORTS = {
  'tax-loan': {
    id: 'tax-loan',
    filename: 'HDFC_Home_Loan_Agreement_2024.pdf',
    pages: 42,
    created_at: Math.floor(Date.now() / 1000),
    profile: { docType: 'Loan Agreement', userProfile: 'Borrower', jurisdiction: 'India', language: 'English' },
    riskReport: {
      overallRisk: 'HIGH',
      documentType: 'Loan Agreement',
      whatCanGoWrong: ['Hidden processing fees not mentioned in the main schedule.', 'Floating interest rate cap is missing — bank can raise rate without limit.', 'Blank signature block found on page 41.'],
      risks: [
        { severity: 'HIGH', issue: 'Missing Annexure B', impact: 'You are agreeing to terms in Annexure B which is not attached to this PDF — potential ₹50,000–₹5,00,000 liability.', suggested_clause: 'Ensure all annexures are physically attached before signing.', evidence: null },
        { severity: 'HIGH', issue: 'Floating rate without cap', impact: 'Monthly EMI could increase by ₹5,000–₹15,000 if RBI raises repo rate.', suggested_clause: 'Add: "The floating interest rate shall not exceed [base rate + 3%] per annum."', evidence: null },
      ],
      fraudFlags: [{ type: 'Blank Signature Block', severity: 'HIGH', evidence: 'Page 41 contains a blank block labeled "Power of Attorney" — do not sign.' }],
      positives: ['Standard HDFC format recognized.', 'EMI schedule is clearly tabulated.'],
      negotiations: [{ clause: 'Prepayment penalty', suggestion: 'Request removal of 2% prepayment penalty per RBI Circular 2019 — this clause is not enforceable on floating rate loans.' }],
    },
    trustReport: { score: 'HIGH', scoreNumeric: 95, summary: 'HDFC Bank Ltd — verified RBI-licensed NBFC. MCA21 status: Active.' },
    schemes: ['PMAY — Pradhan Mantri Awas Yojana (CLSS) — ₹2.67 lakh interest subsidy available'],
    deadlines: [{ description: 'First EMI Payment', alert_date: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0], severity: 'HIGH' }],
  },
  'land-title': {
    id: 'land-title',
    filename: 'Agricultural_Land_Sale_Deed_MH.pdf',
    pages: 12,
    created_at: Math.floor(Date.now() / 1000),
    profile: { docType: 'Sale Deed', userProfile: 'Farmer', jurisdiction: 'Maharashtra, India' },
    riskReport: {
      overallRisk: 'MEDIUM',
      documentType: 'Sale Deed',
      whatCanGoWrong: ['7/12 extract seller name does not match.', 'Encumbrances on the land not disclosed.'],
      risks: [{ severity: 'MEDIUM', issue: 'Pending 7/12 mutation', impact: 'Land records still show old owner — dispute risk of ₹20L+.', suggested_clause: 'Require updated 7/12 and mutation certificate before final payment.', evidence: null }],
      fraudFlags: [],
      positives: ['Survey number matches village records.', 'Stamp duty paid as per ready reckoner.'],
      negotiations: [],
    },
    trustReport: { score: 'MEDIUM', scoreNumeric: 50, summary: 'Individual seller — manual MCA21 / CIBIL verification recommended.' },
    schemes: ['PM-Kisan Samman Nidhi — ₹6000/year if registered', 'PMFBY — Crop Insurance'],
    deadlines: [{ description: 'Registration at Sub-Registrar Office', alert_date: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0], severity: 'HIGH' }],
  },
  'cross-border-tax': {
    id: 'cross-border-tax',
    filename: 'Remote_Contractor_Agreement_US.pdf',
    pages: 18,
    created_at: Math.floor(Date.now() / 1000),
    profile: { docType: 'Consulting Agreement', userProfile: 'Remote Worker', jurisdiction: 'India/US' },
    riskReport: {
      overallRisk: 'MEDIUM',
      documentType: 'Consulting Agreement',
      whatCanGoWrong: ['Double taxation risk if W-8BEN not filed.', 'FEMA non-compliance for inward remittances.'],
      risks: [{ severity: 'MEDIUM', issue: 'Governing Law: Delaware', impact: 'Disputes in US court costs $50,000+ — prohibitive for Indian freelancers.', suggested_clause: 'Negotiate Singapore or India arbitration under ICC Rules.', evidence: null }],
      fraudFlags: [],
      positives: ['IP transfer is clearly bounded to project deliverables only.'],
      negotiations: [{ clause: 'Payment currency', suggestion: 'Specify USD to INR conversion using RBI reference rate to prevent exchange rate manipulation.' }],
    },
    trustReport: { score: 'HIGH', scoreNumeric: 88, summary: 'US Company — verified via Delaware SOS registry.' },
    schemes: ['Section 44ADA — Presumptive Taxation (50% deduction on gross income)'],
    deadlines: [{ description: 'W-8BEN Form Submission to client', alert_date: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0], severity: 'HIGH' }],
  },
  'contract-verify': {
    id: 'contract-verify',
    filename: 'Freelance_Software_Dev_Contract.pdf',
    pages: 8,
    created_at: Math.floor(Date.now() / 1000),
    profile: { docType: 'Service Agreement', userProfile: 'Freelancer', jurisdiction: 'India' },
    riskReport: {
      overallRisk: 'HIGH',
      documentType: 'Service Agreement',
      whatCanGoWrong: ['Client can reject work indefinitely with no payment obligation.'],
      risks: [{ severity: 'HIGH', issue: 'Unlimited Revisions Clause', impact: 'You could work for 6+ months without final sign-off or payment — potential ₹3L+ unpaid work.', suggested_clause: 'Add: "Revisions limited to 2 rounds. Additional revisions billed at ₹2,000/hour."', evidence: null }],
      fraudFlags: [{ type: 'Missing Client Address', severity: 'MEDIUM', evidence: 'Client has not provided a registered office address — cannot serve legal notice if dispute arises.' }],
      positives: [],
      negotiations: [{ clause: 'Payment milestones', suggestion: 'Demand 30% advance before starting work, 40% at midpoint, 30% on delivery.' }],
    },
    trustReport: { score: 'LOW', scoreNumeric: 25, summary: '⚠️ Entity not found in MCA21. Udyam registration absent. Proceed with extreme caution.' },
    schemes: ['MSME Samadhaan — if registered on Udyam portal, ₹1 crore claim limit'],
    deadlines: [],
  },
};

app.get('/api/documents/:id', (req, res) => {
  try {
    // Demo reports for landing page
    if (DEMO_REPORTS[req.params.id]) {
      return res.json(DEMO_REPORTS[req.params.id]);
    }

    const doc = stmts.getDoc.get(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Document not found.' });

    res.json({
      id: doc.id,
      filename: doc.filename,
      pages: doc.pages,
      created_at: doc.created_at,
      profile: safeJson(doc.profile_json),
      riskReport: safeJson(doc.risk_report_json),
      trustReport: safeJson(doc.trust_report_json),
      schemes: safeJson(doc.schemes_json, []),
      deadlines: safeJson(doc.deadlines_json, []),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ── Chat — RAG-grounded Q&A ───────────────────────────────── */
app.post('/api/chat', async (req, res) => {
  const { question, documentId, language = 'English' } = req.body;
  if (!question || !documentId) {
    return res.status(400).json({ error: '`question` and `documentId` are required.' });
  }

  try {
    const doc = stmts.getDoc.get(documentId);
    if (!doc) return res.status(404).json({ error: 'Document not found.' });

    // Attempt real QVAC ragSearch first
    let context = await searchDocumentRAG(documentId, question, 6);

    // Fallback to BM25-lite word overlap if RAG not ready
    if (!context) {
      const allText = doc.text_content || '';
      const chunks = chunkText(allText);
      const scored = chunks
        .map((text) => ({ text, score: textRelevanceFallback(question, text) }))
        .sort((a, b) => b.score - a.score);
      context = scored.slice(0, 6).map((c) => c.text).join('\n\n---\n\n');
    }

    const profile = safeJson(doc.profile_json, {});
    const riskReport = safeJson(doc.risk_report_json, {});
    const hiddenFlags = Array.isArray(riskReport?.fraudFlags) ? riskReport.fraudFlags : [];
    const topRisks = Array.isArray(riskReport?.risks) ? riskReport.risks.slice(0, 5) : [];
    const riskSummary = topRisks.length > 0
      ? 'KNOWN RISKS IN THIS DOCUMENT:\n' + topRisks.map(r => `- [${r.severity}] ${r.issue}: ${r.impact}`).join('\n')
      : '';
    const flagSummary = hiddenFlags.length > 0
      ? 'HIDDEN CLAUSE FLAGS:\n' + hiddenFlags.map(f => `- [${f.severity}] ${f.type}: ${f.evidence || ''}`).join('\n')
      : '';

    const answer = await runLLM(
      `You are VAKEEL, a sharp senior legal advisor protecting the user. You have already analyzed this document and found risks.

RULES:
1. Structure your answer clearly — use numbered points or short paragraphs separated by newlines.
2. If the user asks what is IN the document, summarize its main sections and key obligations.
3. If the user asks about risks, QUOTE the specific clauses and explain the EXACT financial/career consequence.
4. Always give a concrete "What you should do" step at the end.
5. Use ₹ for Indian rupee amounts. Use bullet points (•) for lists.
6. NEVER say "I don't know" — use the document context and risk analysis to reason.
7. Be direct and protective — the user is trusting you like a vakeel (lawyer).`,
      `Document: ${doc.filename}
Type: ${profile.docType || 'Legal Document'}
Risk Level: ${riskReport?.overallRisk || 'Unknown'}

${riskSummary}
${flagSummary}

RELEVANT DOCUMENT SECTIONS:
${context || '[No relevant sections found — answer based on risk analysis above]'}

USER QUESTION: ${question}

Answer ENTIRELY in ${language}. Use structured formatting with newlines between points. Be specific, quote clauses where possible, and end with a clear action step.
Answer:`
    );

    res.json({
      question,
      answer,
      language,
      model: 'LLAMA_3_2_1B_INST_Q4_0 · QVAC · On-device',
      ragUsed: !!embedModelId,
    });
  } catch (err) {
    console.error('Chat error:', err);
    res.status(500).json({ error: err.message });
  }
});

/* ── Transcription — QVAC Whisper ─────────────────────────── */
app.post('/api/transcribe', upload.single('audio'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No audio file uploaded.' });

  const { buffer, originalname, mimetype } = req.file;
  // Always save with .wav extension so Whisper knows the format
  const ext = (originalname || 'audio').split('.').pop()?.toLowerCase() || 'wav';
  const tmpPath = join(UPLOADS_DIR, `transcribe-${Date.now()}.${ext}`);

  try {
    writeFileSync(tmpPath, buffer);
    console.log(`\n🎤 Transcribing: ${originalname} (${mimetype}, ${buffer.length} bytes)`);

    if (whisperModelId) {
      const inputLanguage = req.body.language || 'English';
      const langCodeMap = { 'Hindi': 'hi', 'Marathi': 'mr', 'Tamil': 'ta', 'Telugu': 'te', 'Bengali': 'bn', 'English': 'en' };
      const whisperLang = langCodeMap[inputLanguage] || 'en';
      
      // sdkTranscribe accepts a file path
      const result = await sdkTranscribe({
        modelId: whisperModelId,
        audioChunk: tmpPath,
        language: whisperLang,
      });
      // result may be a string or an object with .text
      const text = typeof result === 'string' ? result
        : (result?.text || result?.transcript || JSON.stringify(result));
      console.log(`   ✅ Transcript (${text.length} chars): "${text.slice(0, 100)}"`);
      res.json({
        text: text.trim(),
        model: 'WHISPER_BASE_Q8_0 · QVAC · On-device',
        loading: false,
      });
    } else {
      // Model not yet loaded — return meaningful fallback
      res.json({
        text: '',
        model: 'fallback',
        loading: true,
        message: 'Whisper model is still loading. Please wait a moment and try again.',
      });
    }
  } catch (err) {
    console.error('Transcription error:', err);
    res.status(500).json({ error: `Transcription failed: ${err.message}` });
  } finally {
    try { unlinkSync(tmpPath); } catch { /* ignore cleanup errors */ }
  }
});

/* ── Translation — translate each field individually (reliable for 1B model) ── */
app.post('/api/translate-report', async (req, res) => {
  const { report, language } = req.body;
  if (!report || !language) return res.status(400).json({ error: 'Missing report or language' });

  // Translate a single short string — far more reliable than bulk JSON
  async function tx(text) {
    if (!text || typeof text !== 'string' || text.trim().length === 0) return text;
    // Don't translate: severity levels, model names, dates, numbers
    if (/^(HIGH|MEDIUM|LOW|null|true|false|\d{4}-\d{2}-\d{2}|[\d.,%₹$ -]+)$/i.test(text.trim())) return text;
    // Try LLM first
    if (llmModelId) {
      const result = await runLLM(
        `You are a professional legal translator. Translate the following text to ${language}. Return ONLY the translated text, nothing else. No quotes, no explanation.`,
        text.trim()
      );
      if (result && result.trim() && result.trim() !== text.trim()) return result.trim();
    }
    // Fallback: use the built-in dictionary for well-known phrases
    const dictFallback = fallbackTranslateText(text.trim(), language);
    return dictFallback || text;
  }

  try {
    const rr = report.riskReport || {};
    const schemes = Array.isArray(report.schemes) ? report.schemes : [];
    const deadlines = Array.isArray(report.deadlines) ? report.deadlines : [];
    const tr = report.trustReport || {};
    const profile = report.profile || {};

    // Translate riskReport arrays field by field
    const translatedRisk = { ...rr };
    if (Array.isArray(rr.whatCanGoWrong)) {
      translatedRisk.whatCanGoWrong = await Promise.all(rr.whatCanGoWrong.slice(0,4).map(w => tx(String(w))));
    }
    if (Array.isArray(rr.risks)) {
      translatedRisk.risks = await Promise.all(
        rr.risks.slice(0,5).map(async r => ({
          ...r,
          issue: await tx(r.issue),
          impact: await tx(r.impact),
          suggested_clause: r.suggested_clause ? await tx(r.suggested_clause) : null,
          // evidence stays in original — it's a quote from the document
        }))
      );
    }
    if (Array.isArray(rr.positives)) {
      translatedRisk.positives = await Promise.all(rr.positives.slice(0,4).map(p => tx(String(p))));
    }
    if (Array.isArray(rr.negotiations)) {
      translatedRisk.negotiations = await Promise.all(
        rr.negotiations.slice(0,3).map(async n => ({
          ...n,
          clause: await tx(n.clause),
          suggestion: await tx(n.suggestion),
        }))
      );
    }
    if (Array.isArray(rr.fraudFlags)) {
      translatedRisk.fraudFlags = await Promise.all(
        rr.fraudFlags.slice(0,3).map(async f => ({
          ...f,
          type: await tx(f.type),
          // evidence stays original
        }))
      );
    }

    // Translate schemes
    const translatedSchemes = await Promise.all(
      schemes.slice(0,4).map(async s => {
        if (typeof s === 'string') return tx(s);
        return { ...s, description: s.description ? await tx(s.description) : '' };
      })
    );

    // Translate deadlines — type and description only (dates stay)
    const translatedDeadlines = await Promise.all(
      deadlines.slice(0,8).map(async d => ({
        ...d,
        type: d.type ? await tx(d.type) : d.type,
        description: d.description ? await tx(d.description) : d.description,
      }))
    );

    // Translate trustReport summary
    const translatedTrust = {
      ...tr,
      summary: tr.summary ? await tx(tr.summary) : tr.summary,
    };

    // Translate profile.docType for the header
    const translatedProfile = {
      ...profile,
      docType: profile.docType ? await tx(profile.docType) : profile.docType,
    };

    console.log(`✅ Translation to ${language} complete`);
    res.json({
      riskReport: translatedRisk,
      schemes: translatedSchemes,
      deadlines: translatedDeadlines,
      trustReport: translatedTrust,
      profile: translatedProfile,
    });
  } catch (err) {
    console.error('Translate report error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/translate', async (req, res) => {
  const { text, targetLang = 'Hindi', sourceText } = req.body;
  const inputText = text || sourceText;
  if (!inputText) return res.status(400).json({ error: '`text` is required.' });

  const langMap = {
    hi: 'Hindi',
    ta: 'Tamil',
    mr: 'Marathi',
    te: 'Telugu',
    bn: 'Bengali',
    en: 'English',
    Hindi: 'Hindi',
    Tamil: 'Tamil',
    Marathi: 'Marathi',
    English: 'English',
  };
  const targetLanguage = langMap[targetLang] || targetLang;

  try {
    const translated = await runLLM(
      `You are a professional legal translator specializing in Indian languages. Translate legal text accurately and naturally into ${targetLanguage}. Preserve all legal terms, clause numbers, and monetary amounts exactly.`,
      `Translate the following legal text to ${targetLanguage}. Respond with ONLY the translated text, nothing else:\n\n${inputText.slice(0, 3000)}`
    );

    res.json({
      original: inputText,
      translated,
      targetLang: targetLanguage,
      model: 'LLAMA_3_2_1B_INST_Q4_0 · QVAC · On-device',
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ── General legal Q&A ─────────────────────────────────────── */
app.post('/api/ask', async (req, res) => {
  const { question, language = 'English', jurisdiction = 'India' } = req.body;
  if (!question) return res.status(400).json({ error: '`question` is required.' });

  try {
    const answer = await runLLM(
      `You are VAKEEL, a senior Indian legal advisor. You protect everyday people — employees, tenants, borrowers — from unfair contracts and legal traps.

RULES:
1. Structure your answer with numbered steps or bullet points (•) separated by newlines.
2. Cite specific Indian laws: Indian Contract Act 1872, Transfer of Property Act, Consumer Protection Act 2019, Industrial Disputes Act, FEMA 1999, etc.
3. Give specific consequences — amounts in ₹, timeframes in days/months.
4. Always end with one clear "What to do now" action step.
5. NEVER give a vague answer. Be a sharp advisor, not a disclaimer machine.
6. If the question is in Hindi, Marathi, or another Indian language — understand it and answer properly.`,
      `Jurisdiction: ${jurisdiction}
User question: ${question}

Answer ENTIRELY in ${language}. Use structured formatting with newlines. Be specific and protective:
Answer:`
    );
    res.json({ question, answer, language, model: 'LLAMA_3_2_1B_INST_Q4_0 · QVAC · On-device' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ── Export ────────────────────────────────────────────────── */
app.get('/api/export/:id/:format', (req, res) => {
  const { id, format } = req.params;

  try {
    const doc = stmts.getDoc.get(id);
    if (!doc) return res.status(404).json({ error: 'Document not found.' });

    const profile = safeJson(doc.profile_json, {});
    const riskReport = safeJson(doc.risk_report_json, {});
    const deadlines = safeJson(doc.deadlines_json, []);
    const schemes = safeJson(doc.schemes_json, []);
    const dateStr = new Date(doc.created_at * 1000).toLocaleDateString('en-IN');

    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="vakeel-${id}.json"`);
      return res.json({ id, filename: doc.filename, pages: doc.pages, profile, riskReport, deadlines, schemes, generatedAt: dateStr });
    }

    if (format === 'md') {
      res.setHeader('Content-Type', 'text/markdown');
      res.setHeader('Content-Disposition', `attachment; filename="vakeel-${id}.md"`);
      const md = `# VAKEEL Analysis Report\n\n**Document:** ${doc.filename}\n**Date:** ${dateStr}\n**Risk Level:** ${riskReport.overallRisk || 'N/A'}\n\n## What Can Go Wrong\n${(riskReport.whatCanGoWrong || []).map((r) => `- ${r}`).join('\n')}\n\n## Key Risks\n${(riskReport.risks || []).map((r) => `- **${r.issue}** (${r.severity}): ${r.impact}`).join('\n')}\n\n## Deadlines\n${deadlines.map((d) => `- ${d.description}: ${d.alert_date || 'TBD'}`).join('\n')}\n\n## Government Schemes You May Qualify For\n${schemes.map((s) => `- ${typeof s === 'string' ? s : s.name || JSON.stringify(s)}`).join('\n')}\n\n---\n*Generated by VAKEEL · Powered by QVAC SDK · On-device AI*`;
      return res.send(md);
    }

    if (format === 'pdf') {
      // Plain text response as PDF is complex without a renderer
      res.setHeader('Content-Type', 'text/plain');
      res.setHeader('Content-Disposition', `attachment; filename="vakeel-${id}.txt"`);
      return res.send(`VAKEEL Analysis Report\n${'='.repeat(40)}\nDocument: ${doc.filename}\nDate: ${dateStr}\nRisk Level: ${riskReport.overallRisk || 'N/A'}\n\nPowered by QVAC SDK · On-device AI`);
    }

    res.status(400).json({ error: 'Unsupported format. Use: json, md, pdf' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ─────────────────────────────────────────────────────────────
   Start server
───────────────────────────────────────────────────────────── */
app.listen(PORT, () => {
  console.log(`\n⚖️  VAKEEL backend listening on http://localhost:${PORT}`);
  console.log('   Models are loading in background — first analysis may take a moment.\n');
});
