# VAKEEL — AI Legal Advisor

VAKEEL is a 100% offline AI legal advisor for Indian documents. It allows users to upload their legal documents (like Loan Agreements, Rental Agreements, Sale Deeds) and get an instant, plain-language risk analysis and legal advice in multiple Indian languages, all powered by on-device AI.

## Core Features
- **100% Offline Processing**: Uses local AI models (Llama 3.2 1B, Whisper, Nomic Embeddings) — no data ever leaves the user's device.
- **Risk Analysis**: Detects predatory clauses, fraud flags, and overall risk levels.
- **Rights Engine**: Automatically maps document content to relevant Indian government schemes and statutory rights (e.g., Consumer Protection Act, Rent Control Act).
- **Deadline Engine**: Extracts key time-bound obligations and notice periods.
- **Voice Q&A**: Ask questions in your native language via voice (Whisper integration).
- **Multilingual Support**: Real-time translation of reports into Hindi, Marathi, Tamil, and English.

## Architecture
- **Frontend**: React + Vite + Tailwind CSS
- **Backend**: Node.js + Express
- **Desktop Wrapper**: Electron (packages the app for Mac/Windows)
- **AI Core**: `@qvac/sdk` for running Llama.cpp models natively on device

## Installation & Development

### Requirements
- Node.js >= 22.17
- Mac or Windows OS

### Setup
\`\`\`bash
npm install
npm run build
\`\`\`

### Running Locally
\`\`\`bash
# Run the Vite dev server (frontend) and Express server (backend) concurrently
npm run dev
\`\`\`

### Building the Desktop App (Installer)
\`\`\`bash
# Build the production React bundle and the Electron installer (.dmg / .exe)
npm run build:app
\`\`\`
The output installer will be placed in the `release/` directory.

## Deployment / Distribution
VAKEEL is distributed via GitHub Releases.
1. Build the app using `npm run build:app`.
2. Upload the `.dmg` or `.exe` file from the `release/` directory to a new GitHub Release.
3. Deploy the landing page located in `vakeel-landing/` to Vercel. The landing page automatically fetches the latest release from GitHub.
