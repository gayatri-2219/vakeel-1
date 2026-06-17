import React from "react";
import { ShieldCheck, Calendar, IndianRupee, AlertTriangle, Database, Scale, Search } from "lucide-react";

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');
  @font-face {
    font-family: 'Cabinet Grotesk';
    src: url('https://fonts.cdnfonts.com/s/71202/CabinetGrotesk-Bold.woff') format('woff');
    font-weight: 700;
    font-style: normal;
  }
  @font-face {
    font-family: 'Cabinet Grotesk';
    src: url('https://fonts.cdnfonts.com/s/71202/CabinetGrotesk-Extrabold.woff') format('woff');
    font-weight: 800;
    font-style: normal;
  }
  .fc-card {
    background: white;
    border: 1px solid hsl(160 15% 88%);
    border-radius: 16px;
    padding: 24px;
    display: flex;
    flex-direction: column;
    height: 100%;
    box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03);
    transition: transform 0.3s ease, box-shadow 0.3s ease;
    position: relative;
  }
  .fc-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04);
  }
  .fc-accent {
    position: absolute;
    top: 0;
    left: 24px;
    width: 32px;
    height: 4px;
    border-radius: 0 0 4px 4px;
  }
  .fc-heading {
    font-family: 'Cabinet Grotesk', sans-serif;
    font-weight: 700;
    font-size: 18px;
    color: #0b3b2d;
    margin: 0 0 8px 0;
    line-height: 1.3;
  }
  .fc-section-title {
    font-family: 'Cabinet Grotesk', sans-serif;
    font-weight: 800;
    font-size: 40px;
    color: #0b3b2d;
    text-align: center;
    margin: 0 0 16px 0;
  }
  .fc-body {
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: 13px;
    color: #4b5563;
    line-height: 1.6;
    margin: 0;
    flex: 1;
  }
  .fc-model {
    font-family: 'JetBrains Mono', monospace;
    font-size: 10px;
    color: #6b7280;
    background: #f9fafb;
    border: 1px solid #f0f0f0;
    border-radius: 4px;
    padding: 2px 6px;
  }
  .fc-subtitle {
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: 18px;
    color: rgba(11,59,45,0.75);
    text-align: center;
    max-width: 560px;
    margin: 0 auto 64px;
    line-height: 1.6;
  }
`;

const features = [
  { title: "Trust Score", description: "GST, PAN, CIN, MCA21 cross-reference gives a counterparty trust verdict in seconds.", model: "LLAMA_3_2_1B_INST_Q4_0", icon: ShieldCheck, accent: "#3b82f6" },
  { title: "Deadline Detection", description: "Auto-extracted dates become calendar alerts. Never miss a lock-in window again.", model: "LLAMA_3_2_1B_INST_Q4_0", icon: Calendar, accent: "#f59e0b" },
  { title: "Consequences in Money", description: "Every clause translated to \u20B9 impact. Hidden penalties surfaced automatically.", model: "LLAMA_3_2_11B_VISION_INSTRUCT", icon: IndianRupee, accent: "#10b981" },
  { title: "Fraud Pattern Detection", description: "Missing annexures, contradictory clauses, blank signature fields caught instantly.", model: "LLAMA_3_2_11B_VISION_INSTRUCT", icon: AlertTriangle, accent: "#ef4444" },
  { title: "Personal Document Vault", description: "Vector search across all your signed documents via on-device SQLite.", model: "NOMIC_EMBED_TEXT_V1_5_Q8_0", icon: Database, accent: "#8b5cf6" },
  { title: "Rights Engine", description: "PM-Kisan, PMFBY, MUDRA, ESIC, eShram surfaced against your profile.", model: "LLAMA_3_2_1B_INST_Q4_0", icon: Scale, accent: "#06b6d4" },
  { title: "Counterparty Verification", description: "GST / PAN / QR code \u2192 trust verdict in under 1 second.", model: "LLAMA_3_2_1B_INST_Q4_0", icon: Search, accent: "#f97316" },
];

export function FeatureCards() {
  return (
    <div style={{ backgroundColor: "#faf8f4", minHeight: "100vh", padding: "96px 24px" }}>
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <h2 className="fc-section-title">Seven Engines. One Answer.</h2>
        <p className="fc-subtitle">
          Every QVAC model runs on your device &mdash; zero cloud, zero compromise.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }}>
          {features.map((feature, idx) => {
            const Icon = feature.icon;
            const isLast = idx === features.length - 1;
            return (
              <div
                key={idx}
                className="fc-card"
                style={isLast ? { gridColumn: "2" } : undefined}
              >
                <div className="fc-accent" style={{ backgroundColor: feature.accent }} />
                <div style={{ color: feature.accent, marginTop: 8, marginBottom: 20 }}>
                  <Icon size={32} strokeWidth={1.5} />
                </div>
                <h3 className="fc-heading">{feature.title}</h3>
                <p className="fc-body">{feature.description}</p>
                <div style={{ marginTop: 24, paddingTop: 16, borderTop: "1px solid #f3f4f6", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#c5a880" }}>
                    QVAC Powered
                  </span>
                  <span className="fc-model">{feature.model}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
