import { Link } from 'react-router-dom';
import { VakeelLogo, VakeelWordmark } from './Logo';
import { ExternalLink } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-foreground text-background/80 relative z-10">
      <div className="container mx-auto px-4 max-w-7xl py-16">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-12 mb-12">
          {/* Brand */}
          <div className="md:col-span-2">
            <Link to="/" className="flex items-center gap-2.5 mb-5 w-fit group">
              <div className="opacity-90 group-hover:opacity-100 transition-opacity">
                <VakeelLogo className="w-7 h-8 [&_path:first-child]:fill-background [&_path:first-child]:stroke-background [&_path:not(:first-child)]:stroke-secondary" />
              </div>
              <VakeelWordmark className="text-xl text-background" />
            </Link>
            <p className="text-sm text-background/60 max-w-xs leading-relaxed mb-5">
              Privacy-first legal intelligence for India and beyond. Powered by <span className="text-secondary font-semibold">QVAC</span> — every analysis runs entirely on your device.
            </p>
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-background/5 border border-background/10 w-fit">
              <span className="w-2 h-2 rounded-full bg-risk-green shrink-0" />
              <span className="text-xs font-mono text-background/60">@qvac/sdk · 100% offline</span>
            </div>
          </div>

          {/* Product */}
          <div>
            <h4 className="text-sm font-display font-bold text-background mb-4">Product</h4>
            <ul className="space-y-2.5 text-sm text-background/60">
              {[
                ['/', 'Home'],
                ['/features', 'Features'],
                ['/vault', 'My Vault'],
                ['/how-it-works', 'Architecture'],
              ].map(([to, label]) => (
                <li key={to}>
                  <Link to={to} className="hover:text-background transition-colors">{label}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Demos */}
          <div>
            <h4 className="text-sm font-display font-bold text-background mb-4">Live Demos</h4>
            <ul className="space-y-2.5 text-sm text-background/60">
              {[
                ['/analyze/tax-loan', 'Home Loan Analysis'],
                ['/analyze/land-title', 'Land Title Check'],
                ['/analyze/cross-border-tax', 'Remote Work Contract'],
                ['/analyze/contract-verify', 'Freelancer Contract'],
              ].map(([to, label]) => (
                <li key={to}>
                  <Link to={to} className="hover:text-background transition-colors">{label}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Built on */}
          <div>
            <h4 className="text-sm font-display font-bold text-background mb-4">Powered by QVAC</h4>
            <ul className="space-y-2.5 text-xs font-mono text-background/50">
              {[
                'LLAMA_3_2_1B_INST_Q4_0',
                'LLAMA_3_2_11B_VISION',
                'NOMIC_EMBED_TEXT_V1_5',
                'WHISPER_TINY',
                'VAD_SILERO_5_1_2',
              ].map((model) => (
                <li key={model} className="flex items-center gap-2">
                  <span className="w-1 h-1 rounded-full bg-secondary shrink-0" />
                  {model}
                </li>
              ))}
            </ul>
            <a
              href="https://qvac.io"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 mt-4 text-xs text-secondary hover:text-secondary/80 transition-colors"
            >
              qvac.io <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        <div className="border-t border-background/10 pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-background/40">
          <p>VAKEEL · Built on QVAC by Tether · Apache 2.0 · Hackathon demo</p>
          <p>No data leaves your device. Ever.</p>
        </div>
      </div>
    </footer>
  );
}
