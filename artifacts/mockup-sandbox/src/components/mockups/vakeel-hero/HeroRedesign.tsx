import React from 'react';
import { Shield, FileText, Lock, Globe, Clock, CheckCircle, AlertTriangle } from 'lucide-react';

export function HeroRedesign() {
  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#faf8f4] font-['Plus_Jakarta_Sans',sans-serif] text-[#0b3b2d]">
      <div 
        dangerouslySetInnerHTML={{ 
          __html: `
            <style>
              @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');
              @import url('https://api.fontshare.com/v2/css?f[]=cabinet-grotesk@800,700&display=swap');

              .font-display {
                font-family: 'Cabinet Grotesk', sans-serif;
              }

              @keyframes scan-line {
                0% { transform: translateY(0); opacity: 0; }
                10% { opacity: 1; }
                90% { opacity: 1; }
                100% { transform: translateY(100px); opacity: 0; }
              }

              @keyframes fade-in-up {
                0% { opacity: 0; transform: translateY(10px); }
                100% { opacity: 1; transform: translateY(0); }
              }

              @keyframes progress-fill {
                0% { width: 0%; }
                100% { width: 100%; }
              }

              .animate-row-1 { animation: fade-in-up 0.4s ease-out 1.5s forwards; opacity: 0; }
              .animate-row-2 { animation: fade-in-up 0.4s ease-out 2.0s forwards; opacity: 0; }
              .animate-row-3 { animation: fade-in-up 0.4s ease-out 2.5s forwards; opacity: 0; }
              
              .progress-bar-fill {
                animation: progress-fill 1.2s ease-out 0.2s forwards;
              }
            </style>
          `
        }} 
      />

      <div className="mx-auto max-w-7xl px-6 lg:px-8 py-20 lg:py-32 flex flex-col lg:flex-row items-center gap-16 min-h-screen">
        
        {/* Left Content */}
        <div className="flex-1 w-full space-y-8 z-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#0b3b2d]/20 bg-[#0b3b2d]/5 px-3 py-1.5 text-sm font-semibold text-[#0b3b2d]">
            <Lock className="w-4 h-4" />
            <span>QVAC-Powered · On-Device AI</span>
          </div>
          
          <div className="space-y-4">
            <h1 className="font-display text-6xl sm:text-7xl lg:text-8xl font-extrabold leading-[1.05] tracking-tight text-[#0b3b2d]">
              Know before <br className="hidden sm:block" />
              you sign.
            </h1>
            <p className="text-lg sm:text-xl text-[#0b3b2d]/70 max-w-xl leading-relaxed">
              Analyze contracts, loan agreements, and land documents instantly. 
              Powered by QVAC AI running locally on your device — absolutely zero cloud upload.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            <button className="inline-flex h-14 items-center justify-center rounded-xl bg-[#0b3b2d] px-8 text-base font-semibold text-[#c5a880] transition-colors hover:bg-[#0b3b2d]/90 shadow-lg shadow-[#0b3b2d]/20">
              <FileText className="mr-2 h-5 w-5" />
              Analyze a Document
            </button>
            <button className="inline-flex h-14 items-center justify-center rounded-xl border-2 border-[#0b3b2d] bg-transparent px-8 text-base font-semibold text-[#0b3b2d] transition-colors hover:bg-[#0b3b2d]/5">
              See How It Works
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-x-8 gap-y-4 pt-8 text-sm font-medium text-[#0b3b2d]/80 border-t border-[#0b3b2d]/10">
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-[#c5a880]" />
              <span>19 Languages</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-[#c5a880]" />
              <span>0 Cloud Uploads</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-[#c5a880]" />
              <span>&lt; 1s Analysis</span>
            </div>
          </div>
        </div>

        {/* Right Content - Animated Card */}
        <div className="flex-1 w-full relative max-w-lg lg:max-w-xl mx-auto">
          {/* Subtle Glow */}
          <div className="absolute inset-0 bg-[#c5a880]/20 blur-[100px] rounded-full" />
          
          <div className="relative rounded-3xl border border-[#0b3b2d]/10 bg-white p-6 sm:p-8 shadow-2xl overflow-hidden flex flex-col gap-8">
            
            {/* Header Badge */}
            <div className="flex items-center justify-between border-b border-[#0b3b2d]/5 pb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#0b3b2d] flex items-center justify-center">
                  <Shield className="w-4 h-4 text-[#c5a880]" />
                </div>
                <span className="font-semibold text-lg">Document Analysis</span>
              </div>
              <div className="px-2.5 py-1 rounded-md bg-[#0b3b2d]/5 text-xs font-bold text-[#0b3b2d] uppercase tracking-wider">
                QVAC SDK — Offline
              </div>
            </div>

            {/* Blurred Document Snippet */}
            <div className="relative space-y-3 p-4 rounded-xl bg-gray-50 border border-gray-100">
              <div className="h-2.5 w-3/4 rounded-full bg-gray-200" />
              <div className="h-2.5 w-full rounded-full bg-gray-200" />
              <div className="h-2.5 w-5/6 rounded-full bg-gray-200" />
              <div className="h-2.5 w-2/3 rounded-full bg-gray-200" />
              
              {/* Scanline overlay */}
              <div 
                className="absolute left-0 right-0 top-0 h-1 bg-gradient-to-r from-transparent via-[#c5a880] to-transparent"
                style={{ animation: 'scan-line 2s ease-in-out infinite' }}
              />
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-semibold text-[#0b3b2d]/70">
                <span>QVAC Analysis</span>
                <span>Processing...</span>
              </div>
              <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-[#0b3b2d] progress-bar-fill rounded-full w-0" />
              </div>
            </div>

            {/* Results Rows */}
            <div className="space-y-3">
              <div className="animate-row-1 flex items-center justify-between p-3 rounded-lg bg-emerald-50 border border-emerald-100">
                <span className="text-sm font-medium text-emerald-900">Trust Score</span>
                <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-emerald-100 text-emerald-700 text-xs font-bold">
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>84 / 100</span>
                </div>
              </div>

              <div className="animate-row-2 flex items-center justify-between p-3 rounded-lg bg-amber-50 border border-amber-100">
                <span className="text-sm font-medium text-amber-900">Deadlines</span>
                <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-amber-100 text-amber-700 text-xs font-bold">
                  <Clock className="w-3.5 h-3.5" />
                  <span>7 Days (Oct 24)</span>
                </div>
              </div>

              <div className="animate-row-3 flex items-center justify-between p-3 rounded-lg bg-red-50 border border-red-100">
                <span className="text-sm font-medium text-red-900">Risk Detected</span>
                <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-red-100 text-red-700 text-xs font-bold">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Annexure Missing</span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-2 text-center">
              <span className="text-[10px] font-mono text-gray-400">
                LLAMA_3_2_1B_INST_Q4_0 · Offline · 847ms
              </span>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
