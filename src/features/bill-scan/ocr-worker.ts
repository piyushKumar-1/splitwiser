import Tesseract from 'tesseract.js';

let worker: Tesseract.Worker | null = null;

export async function initOCR(): Promise<void> {
  if (worker) return;
  worker = await Tesseract.createWorker('eng', undefined, {
    logger: () => {}, // silent
  });
}

export async function recognizeText(image: File | Blob | string): Promise<string> {
  if (!worker) await initOCR();
  const result = await worker!.recognize(image);
  return result.data.text;
}

export async function terminateOCR(): Promise<void> {
  if (worker) {
    await worker.terminate();
    worker = null;
  }
}
