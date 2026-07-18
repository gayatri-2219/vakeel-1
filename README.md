# VAKEEL — 100% Offline AI Legal Advisor ⚖️

VAKEEL is a privacy-first, 100% offline legal AI assistant. By leveraging powerful on-device models, VAKEEL gives users the power to understand complex legal contracts, spot potential fraud, and track critical deadlines in seconds—without a single byte of sensitive data ever leaving your device.

walkthrough video- https://youtu.be/zKDY3PKH7O8?si=f5lx0z8KXjWVUD9E


**Built by Team VAKEEL:**
* **Sahil (Frontend Developer):** Crafted the native-feeling macOS interface and highly responsive React interactions.
* **Gayatri (AI Engineer):** Architected the local AI integration, managing the on-device RAG systems, document processing, and the offline QVAC models.

---

## ✨ Core Features
- **Absolute Privacy (100% Offline)**: Uses local AI models (`LLAMA_3_2_1B_INST_Q4_0`, Whisper, Nomic Embeddings). Your documents never touch the cloud.
- **Intelligent Risk Analysis**: Automatically detects predatory clauses, hidden risks, and flags them for you before you sign.
- **Decision Engine**: Extracts key time-bound obligations, notice periods, and critical deadlines.
- **Contextual Chat (RAG)**: Chat directly with your document to ask questions and get plain-English (or translated) legal advice.

---

## 🏗️ Architecture Stack
- **Frontend**: React + Vite + TypeScript + Tailwind CSS
- **Backend Server**: Node.js + Express (Handles SQLite database & AI inference routing)
- **Database**: `better-sqlite3` (Compiled natively via `@electron/rebuild` for Apple Silicon)
- **Desktop Wrapper**: Electron (Using an optimized `utilityProcess` for the backend to prevent the UI from freezing during heavy AI model loads)
- **AI Core**: `@qvac/sdk` (For running Llama.cpp models natively on device)

---

## 🚀 Super Solid Guide for Newbies (Running from Source)

If you have never used Electron or QVAC before, don't worry! Follow these steps carefully to run VAKEEL locally on your machine.

### Step 1: Prerequisites
Before you start, make sure you have the following installed on your Mac/Windows:
1. **Node.js**: You need Node.js version 22 or higher. You can download it from [nodejs.org](https://nodejs.org/).
2. **Git**: To clone the repository.
3. **Apple Silicon (Mac)**: This guide assumes you are running an M1/M2/M3 Mac (arm64 architecture).

### Step 2: Clone & Install Dependencies
Open your Terminal and run the following commands:
```bash
# Clone the repository (replace with actual repository URL)
git clone https://github.com/yourusername/vakeel.git
cd vakeel

# Install all JavaScript packages and dependencies
npm install
```

### Step 3: Running in Development Mode
VAKEEL has two parts: a React Frontend and an Express Backend. You can run them both simultaneously using our `dev` script.
```bash
npm run dev
```
*This will start the frontend on `http://localhost:5000` and the backend server. You can view the app in your browser to test UI changes.*

### Step 4: Running the Native Desktop App (Electron)
To run the app exactly as it will look when installed natively on your computer:
```bash
# In a new terminal window, run:
npm run electron:dev
```
*This wraps the app in a native macOS window using Electron.*

---

## 📦 Building the Final Release (For macOS)

When you are ready to release the app, you need to package it into a `.app` bundle. 

**Important Note on ASAR:** We have explicitly disabled `.asar` compression (`"asar": false`) in the `package.json`. This is incredibly important because our backend `utilityProcess` needs raw file system access to load native C++ bindings for the SQLite database.

To build the final production release:
```bash
# This compiles the React frontend and packages the Electron app
npm run build:app
```

**Where is the app?**
Once the build finishes, open Finder and navigate to the `release/mac-arm64/` folder inside your project. You will see a `VAKEEL.app` file. 
* Right-click the app and choose **Compress "VAKEEL.app"** to create a `.zip` file. 
* You can now upload this `.zip` file to GitHub for your users to download!

---

## ⚠️ Known Limitations & Hacks (For Demo Purposes)

Running AI completely offline on a laptop requires massive compression. Our model (`LLAMA_3_2_1B_INST_Q4_0`) has been shrunk down to less than 1 GB. Because of this, please be aware of the following:
1. **Gibberish Text / Bad OCR**: If you upload a highly stylized or blurry scanned PDF, our offline OCR engine might extract gibberish text. If the AI is hallucinating weird clauses, it is because it is trying to read a bad scan. **Fix:** Use clean, digitally exported PDFs (e.g., exported from Microsoft Word) for the best results.
2. **Language Constraints**: While we have pushed the 1B parameter model to its absolute limits, it struggles heavily with complex non-English languages (like Hindi). It may default back to English summaries if confused. **Fix:** Stick to English prompts and documents during live demonstrations for the most reliable results.

---
*Built on QVAC by Tether · Apache 2.0*
