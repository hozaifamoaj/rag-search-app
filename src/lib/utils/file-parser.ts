// src/lib/utils/file-parser.ts
export function safeDecodeURIComponent(str: string): string {
  try {
    return decodeURIComponent(str);
  } catch {
    try {
      return decodeURIComponent(str.replace(/%/g, '%25'));
    } catch {
      return str;
    }
  }
}

export async function extractTextFromFile(file: File): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const fileName = file.name.toLowerCase();

  if (fileName.endsWith('.pdf')) {
    const PDFParser = (await import('pdf2json')).default;
    return new Promise((resolve, reject) => {
      const pdfParser = new (PDFParser as any)(null, true);
      pdfParser.on('pdfParser_dataError', (err: any) =>
        reject(new Error(`PDF parsing error: ${err.parserError}`))
      );
      pdfParser.on('pdfParser_dataReady', (pdfData: any) => {
        try {
          let fullText = '';
          pdfData.Pages?.forEach((page: any) =>
            page.Texts?.forEach((text: any) =>
              text.R?.forEach((r: any) =>
                r.T && (fullText += safeDecodeURIComponent(r.T) + ' ')
              )
            )
          );
          resolve(fullText.trim());
        } catch (error: any) {
          reject(new Error(`Error extracting text: ${error.message}`));
        }
      });
      pdfParser.parseBuffer(buffer);
    });
  } else if (fileName.endsWith('.docx')) {
    const mammoth = (await import('mammoth')).default;
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  } else if (fileName.endsWith('.txt')) {
    return buffer.toString('utf-8');
  } else {
    throw new Error('Unsupported file type. Please upload PDF, DOCX, or TXT files.');
  }
}
