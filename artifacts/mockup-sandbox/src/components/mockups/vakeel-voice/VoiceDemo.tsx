import React, { useState, useEffect } from "react";
import { Mic, Check, Loader2, Save, FileText, MessageSquare } from "lucide-react";

const QUESTION = "Is the 3-year lock-in clause in my home loan standard under RBI guidelines?";
const RESPONSE = "Under RBI Master Circular on Housing Finance, a 3-year lock-in on prepayment is above the standard 12\u201318 months seen in most PSU bank loans. This clause may trigger a 2\u20133% penalty of outstanding principal if you refinance early. I recommend negotiating this down to 12 months or requesting a waiver in writing before signing.";

const WORDS = RESPONSE.split(" ");

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');
  @font-face {
    font-family: 'Cabinet Grotesk';
    src: url('https://fonts.cdnfonts.com/s/71202/CabinetGrotesk-Bold.woff') format('woff');
    font-weight: 700;
    font-style: normal;
  }
  @keyframes pulse-ring {
    0% { transform: scale(1); opacity: 0.6; }
    100% { transform: scale(1.8); opacity: 0; }
  }
  @keyframes bar1 { 0%,100% { height: 8px; } 50% { height: 24px; } }
  @keyframes bar2 { 0%,100% { height: 20px; } 50% { height: 40px; } }
  @keyframes bar3 { 0%,100% { height: 12px; } 50% { height: 32px; } }
  @keyframes bar4 { 0%,100% { height: 28px; } 50% { height: 48px; } }
  @keyframes bar5 { 0%,100% { height: 10px; } 50% { height: 20px; } }
  .vd-bar1 { animation: bar1 0.9s ease-in-out infinite; animation-delay: 0s; }
  .vd-bar2 { animation: bar2 0.9s ease-in-out infinite; animation-delay: 0.15s; }
  .vd-bar3 { animation: bar3 0.9s ease-in-out infinite; animation-delay: 0.3s; }
  .vd-bar4 { animation: bar4 0.9s ease-in-out infinite; animation-delay: 0.45s; }
  .vd-bar5 { animation: bar5 0.9s ease-in-out infinite; animation-delay: 0.6s; }
  .vd-pulse-ring {
    position: absolute;
    inset: -8px;
    border-radius: 50%;
    border: 2px solid rgba(11,59,45,0.5);
    animation: pulse-ring 1.8s ease-out infinite;
  }
  .vd-pulse-ring-2 {
    position: absolute;
    inset: -16px;
    border-radius: 50%;
    border: 2px solid rgba(11,59,45,0.25);
    animation: pulse-ring 1.8s ease-out infinite;
    animation-delay: 0.4s;
  }
  .vd-display { font-family: 'Cabinet Grotesk', sans-serif; }
  .vd-body { font-family: 'Plus Jakarta Sans', sans-serif; }
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(16px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .vd-fade-up { animation: fadeUp 0.4s ease forwards; }
  @keyframes blink { 0%,100% { opacity: 1; } 50% { opacity: 0; } }
  .vd-cursor { display: inline-block; width: 2px; height: 1.1em; background: #c5a880; margin-left: 2px; vertical-align: middle; animation: blink 1s ease infinite; }
`;

export function VoiceDemo() {
  const [stage, setStage] = useState(1);
  const [typedQ, setTypedQ] = useState("");
  const [wordCount, setWordCount] = useState(0);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];

    const run = () => {
      setStage(1);
      setTypedQ("");
      setWordCount(0);

      timers.push(setTimeout(() => {
        setStage(2);
        let i = 0;
        const typeInterval = setInterval(() => {
          i++;
          setTypedQ(QUESTION.slice(0, i));
          if (i >= QUESTION.length) clearInterval(typeInterval);
        }, 28);
        timers.push(setTimeout(() => clearInterval(typeInterval), QUESTION.length * 30 + 500));
      }, 1500));

      timers.push(setTimeout(() => setStage(3), 5000));

      timers.push(setTimeout(() => {
        setStage(4);
        let w = 0;
        const wordInterval = setInterval(() => {
          w++;
          setWordCount(w);
          if (w >= WORDS.length) clearInterval(wordInterval);
        }, 90);
        timers.push(setTimeout(() => clearInterval(wordInterval), WORDS.length * 95 + 500));
      }, 7500));

      timers.push(setTimeout(() => run(), 18000));
    };

    run();
    return () => timers.forEach(clearTimeout);
  }, []);

  const responseText = WORDS.slice(0, wordCount).join(" ");
  const responseComplete = wordCount >= WORDS.length;

  return (
    <div className="vd-body" style={{ minHeight: "100vh", backgroundColor: "#faf8f4", display: "flex", flexDirection: "column" }}>
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />

      {/* Header */}
      <div style={{ backgroundColor: "#0b3b2d", color: "#faf8f4", padding: "64px 24px 48px", textAlign: "center" }}>
        <h1 className="vd-display" style={{ fontSize: 44, fontWeight: 800, margin: "0 0 12px", letterSpacing: "-0.02em" }}>
          Voice Interface
        </h1>
        <p style={{ fontSize: 18, color: "#c5a880", margin: 0, opacity: 0.9 }}>
          Ask in any of 19 languages. Get legal clarity in seconds.
        </p>
      </div>

      {/* Voice UI */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 64, paddingBottom: 48, paddingLeft: 24, paddingRight: 24 }}>
        <div style={{ width: "100%", maxWidth: 680 }}>

          {/* Stage 1 — Idle mic */}
          {stage === 1 && (
            <div className="vd-fade-up" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 24 }}>
              <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                <div className="vd-pulse-ring" />
                <div className="vd-pulse-ring-2" />
                <div style={{ width: 72, height: 72, borderRadius: "50%", backgroundColor: "#0b3b2d", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", zIndex: 1, boxShadow: "0 8px 24px rgba(11,59,45,0.3)" }}>
                  <Mic size={32} color="#c5a880" />
                </div>
              </div>
              <p style={{ fontSize: 16, color: "#0b3b2d", fontWeight: 500, textAlign: "center", margin: 0 }}>
                Tap to ask a question about your document
              </p>
              <p style={{ fontSize: 11, color: "#8c8577", textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 600, margin: 0 }}>
                VAD_SILERO_5_1_2 &mdash; Listening for voice
              </p>
            </div>
          )}

          {/* Stage 2 — Listening */}
          {stage === 2 && (
            <div className="vd-fade-up" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 24 }}>
              <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ width: 72, height: 72, borderRadius: "50%", backgroundColor: "#c5a880", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 8px 24px rgba(197,168,128,0.4)" }}>
                  <Mic size={32} color="#0b3b2d" />
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 5, height: 56 }}>
                {["vd-bar1","vd-bar2","vd-bar3","vd-bar4","vd-bar5"].map((cls, i) => (
                  <div key={i} className={cls} style={{ width: 5, backgroundColor: "#0b3b2d", borderRadius: 3, minHeight: 8 }} />
                ))}
              </div>
              <p style={{ fontSize: 16, color: "#0b3b2d", fontWeight: 600, margin: 0 }}>Listening...</p>
              <div style={{ width: "100%", backgroundColor: "white", borderRadius: 16, padding: 20, border: "1px solid #e5e0d8" }}>
                <p style={{ fontSize: 16, color: "#0b3b2d", lineHeight: 1.6, margin: 0 }}>
                  &ldquo;{typedQ}<span className="vd-cursor" /></p>
              </div>
            </div>
          )}

          {/* Stage 3 — Processing */}
          {stage === 3 && (
            <div className="vd-fade-up" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ backgroundColor: "white", borderRadius: 16, padding: 20, border: "1px solid #e5e0d8", marginBottom: 8 }}>
                <p style={{ fontSize: 15, color: "#0b3b2d", lineHeight: 1.6, margin: 0, opacity: 0.8 }}>
                  &ldquo;{QUESTION}&rdquo;
                </p>
              </div>
              {[
                { label: "WHISPER_TINY \u2014 Transcribed", done: true, active: false },
                { label: "LLAMA_3_2_1B_INST_Q4_0 \u2014 Reasoning...", done: false, active: true },
                { label: "Generating response", done: false, active: false },
              ].map((step, i) => (
                <div key={i} style={{
                  display: "flex", alignItems: "center", gap: 16,
                  padding: "16px 20px", borderRadius: 12,
                  border: step.active ? "2px solid #c5a880" : "1px solid #e5e0d8",
                  backgroundColor: step.done ? "rgba(11,59,45,0.04)" : step.active ? "white" : "transparent",
                  opacity: (!step.done && !step.active) ? 0.45 : 1,
                  boxShadow: step.active ? "0 4px 12px rgba(197,168,128,0.2)" : "none",
                }}>
                  <div style={{ width: 36, height: 36, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: step.done ? "#0b3b2d" : step.active ? "rgba(197,168,128,0.15)" : "transparent", border: (!step.done && !step.active) ? "2px solid #d5d0c8" : "none", flexShrink: 0 }}>
                    {step.done && <Check size={16} color="white" />}
                    {step.active && <Loader2 size={16} color="#c5a880" style={{ animation: "spin 1s linear infinite" }} />}
                  </div>
                  <span style={{ fontSize: 15, fontWeight: 500, color: step.active ? "#0b3b2d" : step.done ? "#0b3b2d" : "#8c8577" }}>{step.label}</span>
                </div>
              ))}
            </div>
          )}

          {/* Stage 4 — Response */}
          {stage === 4 && (
            <div className="vd-fade-up" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ backgroundColor: "white", borderRadius: 16, padding: 20, border: "1px solid #e5e0d8" }}>
                <p style={{ fontSize: 14, color: "#6b7280", margin: "0 0 8px", fontWeight: 500 }}>
                  &ldquo;{QUESTION}&rdquo;
                </p>
              </div>
              <div style={{ backgroundColor: "#0b3b2d", borderRadius: 16, padding: 28, boxShadow: "0 16px 40px rgba(11,59,45,0.25)", position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", top: 16, right: 16, opacity: 0.07 }}>
                  <MessageSquare size={80} color="#c5a880" />
                </div>
                <p style={{ fontSize: 17, color: "#faf8f4", lineHeight: 1.75, margin: 0, position: "relative" }}>
                  {responseText}{!responseComplete && <span className="vd-cursor" />}
                </p>
                {responseComplete && (
                  <div style={{ marginTop: 28, paddingTop: 20, borderTop: "1px solid rgba(255,255,255,0.1)", display: "flex", flexWrap: "wrap", gap: 12 }}>
                    <button style={{ display: "flex", alignItems: "center", gap: 8, backgroundColor: "#c5a880", color: "#0b3b2d", border: "none", padding: "10px 18px", borderRadius: 100, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                      <Save size={14} /> Save to Vault
                    </button>
                    <button style={{ display: "flex", alignItems: "center", gap: 8, backgroundColor: "rgba(255,255,255,0.1)", color: "#faf8f4", border: "none", padding: "10px 18px", borderRadius: 100, fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                      <FileText size={14} /> Export PDF
                    </button>
                    <button style={{ display: "flex", alignItems: "center", gap: 8, backgroundColor: "rgba(255,255,255,0.1)", color: "#faf8f4", border: "none", padding: "10px 18px", borderRadius: 100, fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                      <MessageSquare size={14} /> Negotiate Script
                    </button>
                  </div>
                )}
              </div>
              <p style={{ fontSize: 11, color: "#8c8577", textAlign: "center", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600, margin: "8px 0 0" }}>
                WHISPER_TINY + LLAMA_3_2_1B_INST_Q4_0 &bull; On-device &bull; 1.2s
              </p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
