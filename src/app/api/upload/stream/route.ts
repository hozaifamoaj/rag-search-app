import processUploadedDocument from '@/lib/services/upload.service';
import { ProcessInputSchema } from '@/lib/validators/upload';
import { PROGRESS } from '@/lib/utils/upload-progress';

export const maxDuration = 60;

function sseLine(data: object): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

export async function POST(req: Request) {
  const encoder = new TextEncoder();

  const body = await req.json().catch(() => null);
  const parsed = ProcessInputSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(
      JSON.stringify({ error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0].message } }),
      { status: 400 }
    );
  }

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => controller.enqueue(encoder.encode(sseLine(data)));

      try {
        const result = await processUploadedDocument(parsed.data, (update) => send(update));
        send({
          success: true,
          fileName: result.fileName,
          chunks: result.chunksInserted,
          documentId: result.documentId,
          percent: PROGRESS.PROCESS_END,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to process file';
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
