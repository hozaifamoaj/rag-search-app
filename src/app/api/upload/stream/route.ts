import processUploadedDocument from '@/lib/services/upload.service';
import { PROGRESS } from '@/lib/utils/upload-progress';

export const maxDuration = 60;

function sseLine(data: object): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

export async function POST(req: Request) {
  const encoder = new TextEncoder();

  let body: {
    documentId?: string;
    filePath?: string;
    fileName?: string;
    fileType?: string;
    fileSize?: number;
  };

  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400 });
  }

  const { documentId, filePath, fileName, fileType, fileSize } = body;

  if (!documentId || !filePath || !fileName) {
    return new Response(
      JSON.stringify({ error: 'documentId, filePath, and fileName are required' }),
      { status: 400 }
    );
  }

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        controller.enqueue(encoder.encode(sseLine(data)));
      };

      try {
        const result = await processUploadedDocument(
          {
            documentId,
            filePath,
            fileName,
            fileType: fileType || '',
            fileSize: typeof fileSize === 'number' ? fileSize : 0,
          },
          (update) => send(update)
        );

        send({
          success: true,
          fileName: result.fileName,
          chunks: result.chunksInserted,
          documentId: result.documentId,
          percent: PROGRESS.PROCESS_END,
        });
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to process file';
        send({ success: false, error: message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
