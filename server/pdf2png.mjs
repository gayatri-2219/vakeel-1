import { readFileSync, writeFileSync } from 'fs';
import { createCanvas } from 'canvas';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

const pdfPath = process.argv[2];
const outPrefix = process.argv[3];

if (!pdfPath || !outPrefix) {
  console.error("Usage: node pdf2png.mjs <pdfPath> <outPrefix>");
  process.exit(1);
}

async function renderPdf() {
  try {
    const data = new Uint8Array(readFileSync(pdfPath));
    const loadingTask = getDocument({ data });
    const pdf = await loadingTask.promise;
    const numPages = pdf.numPages;
    const maxPages = Math.min(numPages, 10);
    const generatedFiles = [];

    for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const scale = 2.0; // ~150 DPI
      const viewport = page.getViewport({ scale });
      const canvas = createCanvas(viewport.width, viewport.height);
      const ctx = canvas.getContext('2d');

      await page.render({
        canvasContext: ctx,
        viewport,
      }).promise;

      const imgPath = `${outPrefix}-page${pageNum}.png`;
      const pngBuffer = canvas.toBuffer('image/png');
      writeFileSync(imgPath, pngBuffer);
      generatedFiles.push(imgPath);
    }
    
    // Output generated file paths line by line
    console.log(generatedFiles.join('\n'));
    process.exit(0);
  } catch (err) {
    console.error("PDF_RENDER_ERROR:", err.message);
    process.exit(1);
  }
}

renderPdf();
