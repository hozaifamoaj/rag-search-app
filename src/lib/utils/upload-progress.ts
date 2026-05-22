/** Overall progress weights: prepare → upload (5–65%) → process (65–100%). */
export const PROGRESS = {
  PREPARE: 5,
  UPLOAD_START: 5,
  UPLOAD_END: 65,
  PROCESS_START: 65,
  PROCESS_END: 100,
} as const;

export type ProcessStep = 'download' | 'extract' | 'split' | 'embedding' | 'done';

export function mapUploadBytesPercent(uploadPct: number): number {
  const range = PROGRESS.UPLOAD_END - PROGRESS.UPLOAD_START;
  return Math.round(PROGRESS.UPLOAD_START + (uploadPct / 100) * range);
}

export function mapProcessStepPercent(
  step: ProcessStep,
  chunkIndex = 0,
  totalChunks = 1
): number {
  const range = PROGRESS.PROCESS_END - PROGRESS.PROCESS_START;
  const base = PROGRESS.PROCESS_START;
  switch (step) {
    case 'download':
      return Math.round(base + range * 0.08);
    case 'extract':
      return Math.round(base + range * 0.18);
    case 'split':
      return Math.round(base + range * 0.22);
    case 'embedding': {
      const ratio = totalChunks > 0 ? (chunkIndex + 1) / totalChunks : 1;
      return Math.round(base + range * (0.22 + 0.78 * ratio));
    }
    case 'done':
      return PROGRESS.PROCESS_END;
    default:
      return base;
  }
}

export function processStepLabel(
  step: ProcessStep,
  chunkIndex?: number,
  totalChunks?: number
): string {
  switch (step) {
    case 'download':
      return 'Downloading from storage…';
    case 'extract':
      return 'Extracting text…';
    case 'split':
      return 'Splitting into chunks…';
    case 'embedding':
      if (totalChunks && totalChunks > 0) {
        const current = (chunkIndex ?? 0) + 1;
        return `Generating embeddings (${current}/${totalChunks})…`;
      }
      return 'Generating embeddings…';
    case 'done':
      return 'Finishing up…';
    default:
      return 'Processing…';
  }
}
