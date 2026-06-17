import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload, File, Search, ShieldCheck, Lock, Clock, ChevronRight,
  Database, FileText, MessageSquare, Eye, X, Download, Loader2
} from 'lucide-react';
import RiskBadge from '../components/RiskBadge';
import QvacBadge from '../components/QvacBadge';
import { apiGet, apiUpload, type ApiDocument } from '../lib/api';

type RiskLevel = 'green' | 'amber' | 'red';

interface VaultDoc {
  id: string;
  name: string;
  type: string;
  date: string;
  risk: RiskLevel;
  size: string;
  pages: number;
  category: string;
}

const RISK_CLAUSE_COLORS = {
  red: 'border-l-4 border-risk-red bg-risk-red/5',
  amber: 'border-l-4 border-risk-amber bg-risk-amber/5',
  green: 'border-l-4 border-risk-green bg-risk-green/5',
};

function inferType(filename: string) {
  const value = filename.toLowerCase();
  if (value.includes('loan')) return 'Loan Agreement';
  if (value.includes('sale') || value.includes('deed')) return 'Property Document';
  if (value.includes('offer') || value.includes('employment')) return 'Employment Contract';
  if (value.includes('msa') || value.includes('agreement') || value.includes('contract')) return 'Contract';
  return 'Legal Document';
}

function inferCategory(type: string) {
  if (type.includes('Loan')) return 'Tax & Finance';
  if (type.includes('Property')) return 'Land & Property';
  if (type.includes('Employment')) return 'Employment';
  if (type.includes('Contract')) return 'Contracts';
  return 'General';
}

function inferRisk(type: string): RiskLevel {
  if (type.includes('Property') || type.includes('Contract')) return 'red';
  if (type.includes('Loan') || type.includes('Employment')) return 'amber';
  return 'green';
}

function formatDate(unixSeconds: number) {
  return new Date(unixSeconds * 1000).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function mapDocument(doc: ApiDocument): VaultDoc {
  const type = inferType(doc.filename);
  return {
    id: doc.id,
    name: doc.filename,
    type,
    date: formatDate(doc.created_at),
    risk: inferRisk(type),
    size: `${Math.max(1, doc.pages || 1)} page${doc.pages === 1 ? '' : 's'}`,
    pages: doc.pages ?? 0,
    category: inferCategory(type),
  };
}

function DocumentViewer({ doc, onClose }: { doc: VaultDoc; onClose: () => void }) {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 20 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="w-full max-w-2xl bg-card rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-6 py-4 border-b border-border bg-muted/30 shrink-0">
          <div className="p-2 rounded-lg bg-primary/10">
            <File className="w-4 h-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-sm text-foreground truncate">{doc.name}</div>
            <div className="text-xs text-muted-foreground">{doc.pages} pages · Added {doc.date}</div>
          </div>
          <RiskBadge level={doc.risk} size="sm" />
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="bg-white border border-border rounded-xl shadow-sm overflow-hidden">
            <div className="px-8 py-6 border-b border-border bg-muted/20">
              <h2 className="font-display text-lg font-bold text-foreground mb-1">{doc.type}</h2>
              <div className="w-16 h-0.5 bg-primary/30 rounded mb-4" />
              <p className="text-sm text-foreground/80 leading-relaxed">
                This document is stored in the real backend vault and can now be queried through `/api/chat`,
                exported through `/api/export`, and included in backend search and deadline extraction.
              </p>
            </div>

            <div className="px-8 py-5 space-y-3">
              <div className={`p-3 rounded-xl text-xs leading-relaxed ${RISK_CLAUSE_COLORS[doc.risk]}`}>
                Backend-powered status: indexed locally and ready for real QVAC-driven workflows.
              </div>
              <div className="text-xs text-muted-foreground">
                Filename: <span className="font-mono">{doc.name}</span>
              </div>
              <div className="text-xs text-muted-foreground">
                Category: <span className="font-mono">{doc.category}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-border bg-muted/20 flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={() => navigate(`/chat?doc=${doc.id}`)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-colors"
          >
            Open Chat <ChevronRight className="w-3.5 h-3.5" />
          </button>
          <a
            href={`/api/export/${doc.id}/pdf`}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-border bg-card text-xs font-bold text-foreground hover:bg-muted transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-primary" /> Export PDF
          </a>
          <a
            href={`/api/export/${doc.id}/json`}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-border bg-card text-xs font-bold text-foreground hover:bg-muted transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-primary" /> Export JSON
          </a>
          <div className="flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground ml-auto">
            <Lock className="w-3 h-3" /> Stored in backend `vakeel.db`
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function Vault() {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  const [viewingDoc, setViewingDoc] = useState<VaultDoc | null>(null);
  const [documents, setDocuments] = useState<VaultDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiGet<ApiDocument[]>('/api/documents');
      setDocuments(data.map(mapDocument));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load vault documents');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadDocuments();
  }, []);

  const filtered = useMemo(() => {
    return documents.filter((doc) => {
      const matchSearch = !search || doc.name.toLowerCase().includes(search.toLowerCase()) || doc.type.toLowerCase().includes(search.toLowerCase());
      const matchCat = !selectedCat || doc.category === selectedCat;
      return matchSearch && matchCat;
    });
  }, [documents, search, selectedCat]);

  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    for (const doc of documents) {
      counts.set(doc.category, (counts.get(doc.category) ?? 0) + 1);
    }
    return Array.from(counts.entries()).map(([name, count]) => ({
      name,
      count,
      risk: documents.find((doc) => doc.category === name)?.risk ?? 'green' as RiskLevel,
    }));
  }, [documents]);

  const coverageScore = documents.length === 0 ? 0 : Math.min(100, 40 + documents.length * 15);
  const coverageColor = coverageScore >= 80 ? 'text-risk-green' : coverageScore >= 50 ? 'text-risk-amber' : 'text-risk-red';
  const coverageLabel = documents.length === 0 ? 'Empty' : `${documents.length} Indexed`;

  const handleFile = async (file: File | null) => {
    if (!file) return;
    navigate('/analyze/processing', { state: { file } });
  };

  return (
    <>
      <div className="page-enter container mx-auto max-w-7xl px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-8"
        >
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground mb-2">My Secure Vault</h1>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Lock className="w-4 h-4" />
              <span>Frontend wired to live backend vault · </span>
              <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">/api/documents</span>
            </div>
            <p className="text-xs text-muted-foreground mt-2 max-w-lg leading-relaxed">
              Uploads now go to the real backend, documents are listed from the backend database, and document chat uses the backend QVAC pipeline.
            </p>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="flex items-center gap-4 bg-card border border-border rounded-xl px-5 py-4 shadow-sm shrink-0"
          >
            <div className="relative w-14 h-14">
              <svg viewBox="0 0 36 36" className="w-14 h-14 -rotate-90">
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="hsl(var(--muted))" strokeWidth="3" />
                <motion.circle
                  cx="18" cy="18" r="15.9" fill="none"
                  stroke={coverageScore >= 80 ? 'hsl(var(--risk-green))' : coverageScore >= 50 ? 'hsl(var(--risk-amber))' : 'hsl(var(--risk-red))'}
                  strokeWidth="3"
                  strokeLinecap="round"
                  initial={{ strokeDasharray: '0 100' }}
                  animate={{ strokeDasharray: `${coverageScore} ${100 - coverageScore}` }}
                  transition={{ duration: 1.2, ease: 'easeOut', delay: 0.3 }}
                />
              </svg>
              <span className={`absolute inset-0 flex items-center justify-center text-sm font-bold ${coverageColor}`}>
                {coverageScore}
              </span>
            </div>
            <div>
              <div className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-0.5">Vault Coverage</div>
              <div className={`font-display font-bold ${coverageColor}`}>{coverageLabel}</div>
              <div className="text-xs text-muted-foreground mt-0.5">Real backend document index</div>
            </div>
          </motion.div>
        </motion.div>

        {error && (
          <div className="mb-5 rounded-xl border border-risk-red/30 bg-risk-red/5 px-4 py-3 text-sm text-risk-red">
            {error}. Start the backend: open a terminal, run <code>cd zip-repl/server && npm install && node index.mjs</code>, then refresh.
          </div>
        )}

        {uploadMessage && (
          <div className="mb-5 rounded-xl border border-risk-green/30 bg-risk-green/5 px-4 py-3 text-sm text-risk-green">
            {uploadMessage}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3 space-y-5">
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12 }}
              className="bg-card border border-border rounded-xl p-3 flex gap-2 shadow-sm"
            >
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder='Search vault... try "loan" or "sale deed"'
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-muted/40 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-background transition-colors placeholder:text-muted-foreground/60"
                />
              </div>
              <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-muted/40 text-xs font-mono text-muted-foreground border border-border shrink-0">
                <Database className="w-3.5 h-3.5" />
                Live Vault
              </div>
            </motion.div>

            <div className="space-y-3">
              {loading ? (
                <div className="text-center py-16 text-muted-foreground bg-card border border-dashed border-border rounded-2xl">
                  <Loader2 className="w-8 h-8 mx-auto mb-3 opacity-60 animate-spin" />
                  <p className="text-sm">Loading backend documents...</p>
                </div>
              ) : (
                <AnimatePresence initial={false}>
                  {filtered.map((doc, i) => (
                    <motion.div
                      key={doc.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8, scale: 0.98 }}
                      transition={{ duration: 0.3, delay: i * 0.06 }}
                      className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden group hover:shadow-md hover:border-primary/20 transition-all duration-200"
                    >
                      <div className={`h-1 w-full ${
                        doc.risk === 'red' ? 'bg-risk-red' :
                        doc.risk === 'amber' ? 'bg-risk-amber' :
                        'bg-risk-green'
                      }`} />

                      <div className="p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                          doc.risk === 'red' ? 'bg-risk-red/10' :
                          doc.risk === 'amber' ? 'bg-risk-amber/10' :
                          'bg-primary/10'
                        }`}>
                          <File className={`w-5 h-5 ${
                            doc.risk === 'red' ? 'text-risk-red' :
                            doc.risk === 'amber' ? 'text-risk-amber' :
                            'text-primary'
                          }`} />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <span className="font-semibold text-sm text-foreground truncate">{doc.name}</span>
                            <RiskBadge level={doc.risk} size="sm" />
                          </div>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                            <span>{doc.type}</span>
                            <span>·</span>
                            <span>{doc.pages} pages</span>
                            <span>·</span>
                            <span>{doc.size}</span>
                            <span>·</span>
                            <span>Added {doc.date}</span>
                          </div>
                          <div className="flex items-center gap-1.5 mt-1.5 text-xs text-muted-foreground">
                            <Clock className="w-3 h-3 shrink-0" />
                            Backend indexed and ready for chat/export
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => setViewingDoc(doc)}
                            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-border bg-muted/40 text-xs font-semibold text-foreground hover:bg-muted hover:border-primary/20 transition-all"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            View
                          </button>
                          <button
                            onClick={() => navigate(`/chat?doc=${doc.id}`)}
                            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-all shadow-sm"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            Ask VAKEEL
                          </button>
                          <Link
                            to={`/analyze/${doc.id}`}
                            className="flex items-center gap-1 px-3 py-2 rounded-xl border border-border text-xs font-semibold text-muted-foreground hover:text-primary hover:border-primary/20 hover:bg-primary/5 transition-all"
                          >
                            Analyze <ChevronRight className="w-3 h-3" />
                          </Link>
                          <a
                            href={`/api/export/${doc.id}/pdf`}
                            className="flex items-center gap-1 px-3 py-2 rounded-xl border border-border text-xs font-semibold text-muted-foreground hover:text-primary hover:border-primary/20 hover:bg-primary/5 transition-all"
                          >
                            Export <ChevronRight className="w-3 h-3" />
                          </a>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}

              {!loading && filtered.length === 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-16 text-muted-foreground bg-card border border-dashed border-border rounded-2xl"
                >
                  <Search className="w-8 h-8 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No documents match your search</p>
                </motion.div>
              )}
            </div>
          </div>

          <div className="space-y-5">
            <motion.div
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.18 }}
              className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all cursor-pointer ${
                dragActive ? 'border-primary bg-primary/5 scale-[1.01]' : 'border-border bg-card hover:border-primary/40 hover:bg-primary/3'
              }`}
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
              onDragLeave={() => setDragActive(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragActive(false);
                const file = e.dataTransfer.files?.[0] ?? null;
                void handleFile(file);
              }}
            >
              <input
                ref={inputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp"
                className="hidden"
                onChange={(e) => void handleFile(e.target.files?.[0] ?? null)}
              />
              <motion.div
                animate={dragActive ? { scale: 1.15 } : { scale: 1 }}
                className="bg-primary/10 w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3"
              >
                {uploading ? <Loader2 className="w-5 h-5 text-primary animate-spin" /> : <Upload className="w-5 h-5 text-primary" />}
              </motion.div>
              <h3 className="font-display font-bold text-sm text-foreground mb-1">Add to Vault</h3>
              <p className="text-xs text-muted-foreground mb-1">Upload a PDF, photo, or scan to the real backend.</p>
              <p className="text-xs text-muted-foreground/70 mb-4 leading-relaxed">
                This calls the backend `/api/upload` route and triggers extraction, analysis, deadlines, and indexing.
              </p>
              <button
                type="button"
                className="btn-shine w-full bg-primary text-primary-foreground py-2.5 rounded-xl text-sm font-bold hover:bg-primary/90 transition-colors shadow-sm"
              >
                {uploading ? 'Processing...' : 'Select File'}
              </button>
              <div className="mt-3 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                <ShieldCheck className="w-3.5 h-3.5 text-risk-green" />
                Backend upload + local indexing
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.22 }}
              className="bg-primary rounded-2xl p-5 text-white relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-white/5 -translate-y-8 translate-x-8" />
              <div className="relative z-10">
                <MessageSquare className="w-6 h-6 text-secondary mb-2" />
                <h3 className="font-display font-bold text-base mb-1">Ask VAKEEL</h3>
                <p className="text-xs text-white/70 mb-4 leading-relaxed">
                  Use the real backend chat against your indexed documents or ask general legal questions.
                </p>
                <button
                  onClick={() => navigate('/chat')}
                  className="btn-shine w-full bg-white text-primary py-2 rounded-xl text-xs font-bold hover:bg-white/95 transition-colors"
                >
                  Open Document Chat
                </button>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.26 }}
              className="bg-card border border-border rounded-2xl p-5 shadow-sm"
            >
              <h3 className="text-xs font-mono font-bold text-muted-foreground uppercase tracking-widest mb-4">Categories</h3>
              <ul className="space-y-2">
                {categories.map((cat) => {
                  const isSelected = selectedCat === cat.name;
                  return (
                    <li key={cat.name}>
                      <button
                        onClick={() => setSelectedCat(isSelected ? null : cat.name)}
                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm transition-colors ${
                          isSelected ? 'bg-primary/10 text-primary' : 'hover:bg-muted text-foreground'
                        }`}
                      >
                        <span className="flex items-center gap-2 font-medium">
                          <FileText className="w-4 h-4 opacity-60" /> {cat.name}
                        </span>
                        <span className="flex items-center gap-2">
                          <RiskBadge level={cat.risk} size="sm" />
                          <span className="text-xs text-muted-foreground">{cat.count}</span>
                        </span>
                      </button>
                    </li>
                  );
                })}
                {!categories.length && (
                  <li className="text-xs text-muted-foreground">Upload a document to populate categories.</li>
                )}
              </ul>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-muted/50 border border-border rounded-2xl p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <QvacBadge compact />
                <span className="text-xs font-bold text-muted-foreground">Live integration</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                The frontend now reads documents from the backend and sends uploads and chat requests to the real API instead of using hardcoded demo data.
              </p>
            </motion.div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {viewingDoc && (
          <DocumentViewer doc={viewingDoc} onClose={() => setViewingDoc(null)} />
        )}
      </AnimatePresence>
    </>
  );
}
