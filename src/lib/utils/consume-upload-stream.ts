export type StreamProgressEvent = {
  step: 'download' | 'extract' | 'split' | 'embedding' | 'done';
  percent: number;
  message: string;
  chunk?: number;
  totalChunks?: number;
};

export type StreamCompleteEvent = {
  success: true;
  fileName: string;
  chunks: number;
  documentId: string;
};

type StreamErrorEvent = { success: false; error: string };

type StreamPayload = StreamProgressEvent | StreamCompleteEvent | StreamErrorEvent;

function isComplete(data: StreamPayload): data is StreamCompleteEvent {
  return 'success' in data && data.success === true;
}

function isError(data: StreamPayload): data is StreamErrorEvent {
  return 'success' in data && data.success === false;
}

export async function consumeUploadProcessStream(
  body: {
    documentId: string;
    filePath: string;
    fileName: string;
    fileType: string;
    fileSize: number;
  },
  onProgress: (event: StreamProgressEvent) => void
): Promise<StreamCompleteEvent> {
  const res = await fetch('/api/upload/stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      typeof err.error === 'string' ? err.error : `Processing failed (${res.status})`
    );
  }

  if (!res.body) {
    throw new Error('No response stream from server');
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split('\n\n');
    buffer = parts.pop() ?? '';

    for (const part of parts) {
      const line = part
        .split('\n')
        .find((l) => l.startsWith('data: '));
      if (!line) continue;

      const data = JSON.parse(line.slice(6)) as StreamPayload;

      if (isError(data)) {
        throw new Error(data.error);
      }
      if (isComplete(data)) {
        return data;
      }
      onProgress(data);
    }
  }

  throw new Error('Processing ended unexpectedly');
}
