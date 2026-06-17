import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare, Send, Lock, FileText, ChevronDown, ShieldCheck,
  Cpu, User, Loader2
} from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { apiGet, apiPost, type ApiAskResponse, type ApiDocument } from '../lib/api';

interface VaultDoc {
  id: string;
  name: string;
  type: string;
  pages: number;
  date: string;
}

type MessageRole = 'user' | 'assistant';

interface Message {
  id: string;
  role: MessageRole;
  text: string;
  streaming?: boolean;
  model?: string;
}

/** Lightweight markdown → HTML renderer for LLM answers */
function renderMarkdown(text: string): string {
  return text
    // Bold **text**
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // Numbered lists: "1. " at start of line
    .replace(/^(\d+)\.\s+(.+)$/gm, '<div class="md-list-item"><span class="md-num">$1.</span> $2</div>')
    // Bullet points: "• " or "- " at start of line
    .replace(/^[•\-]\s+(.+)$/gm, '<div class="md-bullet"><span class="md-dot">•</span> $1</div>')
    // Section headers: lines starting with ALL CAPS followed by colon
    .replace(/^([A-Z][A-Z\s]{4,}):/gm, '<div class="md-header">$1:</div>')
    // Double newlines = paragraph break
    .replace(/\n\n/g, '<br/><br/>')
    // Single newlines between non-list items
    .replace(/(?<!>)\n(?!<div)/g, '<br/>');
}

const GENERAL_SUGGESTIONS = [
  'What are my rights if a contract has an unfair clause?',
  'How do I verify a company on MCA21?',
  'What should I check before signing a property agreement?',
];

const DOCUMENT_SUGGESTIONS = [
  'Summarize the biggest legal risks in this document.',
  'What deadlines or action items should I note?',
  'Explain this document in simple language.',
];

function formatDate(unixSeconds: number) {
  return new Date(unixSeconds * 1000).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function inferType(filename: string) {
  const value = filename.toLowerCase();
  if (value.includes('loan')) return 'Loan Agreement';
  if (value.includes('sale') || value.includes('deed')) return 'Property Document';
  if (value.includes('offer') || value.includes('employment')) return 'Employment Contract';
  if (value.includes('msa') || value.includes('agreement')) return 'Contract';
  return 'Legal Document';
}

export default function Chat() {
  const [searchParams, setSearchParams] = useSearchParams();
  const preselect = searchParams.get('doc');
  const initialQ = searchParams.get('q');
  const [documents, setDocuments] = useState<VaultDoc[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<VaultDoc | null>(null);
  const [dropOpen, setDropOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [language, setLanguage] = useState('English');
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    const loadDocuments = async () => {
      try {
        setLoadingDocs(true);
        setLoadError(null);
        const data = await apiGet<ApiDocument[]>('/api/documents');
        const mapped = data.map((doc) => ({
          id: doc.id,
          name: doc.filename,
          type: inferType(doc.filename),
          pages: doc.pages ?? 0,
          date: formatDate(doc.created_at),
        }));
        setDocuments(mapped);
        if (preselect) {
          setSelectedDoc(mapped.find((doc) => doc.id === preselect) ?? null);
        }
      } catch (error) {
        setLoadError(error instanceof Error ? error.message : 'Failed to load vault documents');
      } finally {
        setLoadingDocs(false);
      }
    };

    loadDocuments();
  }, [preselect]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    return () => {
      timers.current.forEach(clearTimeout);
    };
  }, []);

  useEffect(() => {
    if (initialQ && !loadingDocs) {
      sendMessage(initialQ);
      setSearchParams((prev) => {
        prev.delete('q');
        return prev;
      }, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQ, loadingDocs]);

  const suggestions = useMemo(
    () => (selectedDoc ? DOCUMENT_SUGGESTIONS : GENERAL_SUGGESTIONS),
    [selectedDoc]
  );

  const streamAnswer = (answer: string, model: string) => {
    const assistantId = (Date.now() + 1).toString();
    setMessages((prev) => [...prev, { id: assistantId, role: 'assistant', text: '', streaming: true }]);

    const words = answer.split(' ');
    let wordIndex = 0;

    const interval = setInterval(() => {
      wordIndex += 1;
      setMessages((prev) =>
        prev.map((message) =>
          message.id === assistantId
            ? {
                ...message,
                text: words.slice(0, wordIndex).join(' '),
                streaming: wordIndex < words.length,
                model,
              }
            : message
        )
      );

      if (wordIndex >= words.length) {
        clearInterval(interval);
        setStreaming(false);
      }
    }, 30);

    timers.current.push(setTimeout(() => clearInterval(interval), words.length * 40 + 500));
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || streaming) return;

    const cleanText = text.trim();
    setMessages((prev) => [...prev, { id: Date.now().toString(), role: 'user', text: cleanText }]);
    setInput('');
    setStreaming(true);

    try {
      const result = selectedDoc
        ? await apiPost<ApiAskResponse>('/api/chat', {
            question: cleanText,
            documentId: selectedDoc.id,
            language,
          })
        : await apiPost<ApiAskResponse>('/api/ask', {
            question: cleanText,
            language,
            jurisdiction: 'India',
          });

      streamAnswer(result.answer, selectedDoc ? 'QVAC Document Chat' : 'QVAC Legal Advisor');
    } catch (error) {
      setStreaming(false);
      const message = error instanceof Error ? error.message : 'Chat request failed';
      setMessages((prev) => [
        ...prev,
        {
          id: `${Date.now()}-error`,
          role: 'assistant',
          text: message,
          model: 'Backend Error',
        },
      ]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void sendMessage(input);
  };

  return (
    <div className="container mx-auto max-w-4xl px-4 py-10 flex flex-col h-[calc(100dvh-4rem)]" style={{ minHeight: 0 }}>
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-5 shrink-0">
        <Link to="/" className="hover:text-foreground transition-colors">VAKEEL</Link>
        <span>/</span>
        <span className="text-foreground font-medium">Document Chat</span>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-5 shrink-0">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shrink-0">
            <MessageSquare className="w-4.5 h-4.5 text-secondary" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-display font-bold text-foreground">Document Chat</h1>
            <p className="text-xs text-muted-foreground font-mono">Real backend · `/api/chat` and `/api/ask`</p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="px-3.5 py-2.5 border border-border bg-card rounded-xl text-sm font-medium hover:bg-muted transition-colors outline-none focus:border-primary appearance-none"
          >
            <option value="English">🇬🇧 English</option>
            <option value="Hindi">🇮🇳 Hindi</option>
            <option value="Marathi">🇮🇳 Marathi</option>
            <option value="Tamil">🇮🇳 Tamil</option>
            <option value="Telugu">🇮🇳 Telugu</option>
            <option value="Bengali">🇮🇳 Bengali</option>
          </select>
          <div className="relative shrink-0">
            <button
              onClick={() => setDropOpen(!dropOpen)}
              className="flex items-center gap-2 px-3.5 py-2.5 border border-border bg-card rounded-xl text-sm font-medium hover:bg-muted transition-colors min-w-[220px] justify-between"
            >
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="w-4 h-4 text-primary shrink-0" />
                <span className="truncate text-left">
                  {selectedDoc ? selectedDoc.name.replace('.pdf', '') : 'General Legal Chat'}
                </span>
              </div>
              <ChevronDown className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform ${dropOpen ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence>
              {dropOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 4, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 4, scale: 0.98 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-full mt-2 w-72 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden"
                >
                  <div className="p-2">
                    <button
                      onClick={() => { setSelectedDoc(null); setDropOpen(false); }}
                      className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors ${!selectedDoc ? 'bg-primary/8 text-primary font-semibold' : 'hover:bg-muted text-foreground'}`}
                    >
                      General Legal Chat
                      <span className="block text-xs text-muted-foreground font-normal">Ask the backend legal advisor</span>
                    </button>
                    <div className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-widest px-3 pt-3 pb-1.5">Your Vault</div>
                    {loadingDocs && (
                      <div className="px-3 py-3 text-xs text-muted-foreground flex items-center gap-2">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Loading documents...
                      </div>
                    )}
                    {!loadingDocs && documents.length === 0 && (
                      <div className="px-3 py-3 text-xs text-muted-foreground">No uploaded documents yet.</div>
                    )}
                    {documents.map((doc) => (
                      <button
                        key={doc.id}
                        onClick={() => { setSelectedDoc(doc); setDropOpen(false); }}
                        className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors flex items-start gap-2.5 ${selectedDoc?.id === doc.id ? 'bg-primary/8' : 'hover:bg-muted'}`}
                      >
                        <span className="mt-0.5 w-2 h-2 rounded-full shrink-0 bg-primary" />
                        <div className="min-w-0">
                          <div className={`text-xs font-semibold truncate ${selectedDoc?.id === doc.id ? 'text-primary' : 'text-foreground'}`}>{doc.name}</div>
                          <div className="text-[10px] text-muted-foreground">{doc.type} · {doc.pages}p · {doc.date}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

      {selectedDoc && (
        <div className="flex items-center gap-2.5 px-4 py-2.5 bg-primary/5 border border-primary/15 rounded-xl mb-4 shrink-0">
          <Lock className="w-3.5 h-3.5 text-primary shrink-0" />
          <span className="text-xs font-mono text-primary font-semibold">{selectedDoc.name}</span>
          <span className="text-xs text-muted-foreground">{selectedDoc.pages} pages · indexed in backend vault</span>
        </div>
      )}

      {loadError && (
        <div className="mb-4 rounded-xl border border-risk-red/30 bg-risk-red/5 px-4 py-3 text-sm text-risk-red shrink-0">
          {loadError}. Start the backend: open a terminal, run <code>cd zip-repl/server && npm install && node index.mjs</code>, then refresh.
        </div>
      )}

      <div className="flex-1 overflow-y-auto rounded-2xl border border-border bg-card min-h-0">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center p-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/8 border border-primary/15 flex items-center justify-center mb-4">
              <MessageSquare className="w-7 h-7 text-primary" />
            </div>
            <h3 className="font-display font-bold text-lg mb-2">
              {selectedDoc ? `Ask about ${selectedDoc.type}` : 'Ask any legal question'}
            </h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-sm">
              {selectedDoc
                ? `This chat now calls the real backend for ${selectedDoc.name}. Ask about clauses, risks, deadlines, or rights.`
                : 'This chat now uses the backend legal advisor for general questions about Indian legal workflows.'}
            </p>
            <div className="flex flex-col gap-2 w-full max-w-sm">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => void sendMessage(suggestion)}
                  className="text-left px-4 py-2.5 rounded-xl border border-border bg-background hover:bg-muted text-sm text-foreground transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="p-4 space-y-4">
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0 mt-0.5">
                    <ShieldCheck className="w-4 h-4 text-secondary" />
                  </div>
                )}
                <div className={`max-w-[82%] ${msg.role === 'user' ? 'order-first' : ''}`}>
                  <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-primary text-white rounded-tr-sm whitespace-pre-wrap'
                      : 'bg-muted/50 border border-border text-foreground rounded-tl-sm'
                  }`}>
                    {msg.role === 'user' ? (
                      msg.text
                    ) : msg.streaming ? (
                      <span className="whitespace-pre-wrap">{msg.text}<motion.span
                        animate={{ opacity: [1, 0] }}
                        transition={{ duration: 0.5, repeat: Infinity }}
                        className="inline-block w-0.5 h-4 bg-muted-foreground ml-0.5 align-middle"
                      /></span>
                    ) : (
                      <div
                        className="vakeel-md"
                        dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.text) }}
                      />
                    )}
                  </div>
                  {msg.role === 'assistant' && !msg.streaming && msg.model && (
                    <div className="mt-1 flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground">
                      <Cpu className="w-3 h-3" />
                      {msg.model}
                    </div>
                  )}
                </div>
                {msg.role === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-muted border border-border flex items-center justify-center shrink-0 mt-0.5">
                    <User className="w-4 h-4 text-muted-foreground" />
                  </div>
                )}
              </motion.div>
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="mt-4 flex gap-3 shrink-0">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={selectedDoc ? 'Ask about this document...' : 'Ask a legal question...'}
          className="flex-1 rounded-2xl border border-border bg-card px-4 py-3 text-sm outline-none focus:border-primary"
        />
        <button
          type="submit"
          disabled={streaming || !input.trim()}
          className="px-4 py-3 rounded-2xl bg-primary text-primary-foreground font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {streaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          Send
        </button>
      </form>
    </div>
  );
}
