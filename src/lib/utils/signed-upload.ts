/**
 * Upload to a Supabase signed URL with XMLHttpRequest so upload progress is available.
 * Mirrors storage-js uploadToSignedUrl (PUT + FormData).
 */
export function uploadToSignedUrlWithProgress(
  signedUrl: string,
  file: File,
  onProgress: (uploadPercent: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append('cacheControl', '3600');
    formData.append('', file);

    const xhr = new XMLHttpRequest();
    xhr.open('PUT', signedUrl);

    const apiKey =
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;
    if (apiKey) {
      xhr.setRequestHeader('apikey', apiKey);
      xhr.setRequestHeader('Authorization', `Bearer ${apiKey}`);
    }
    xhr.setRequestHeader('x-upsert', 'false');

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && e.total > 0) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress(100);
        resolve();
      } else {
        let message = `Storage upload failed (${xhr.status})`;
        try {
          const body = JSON.parse(xhr.responseText) as { message?: string; error?: string };
          message = body.message || body.error || message;
        } catch {
          if (xhr.responseText) message = xhr.responseText.slice(0, 200);
        }
        reject(new Error(message));
      }
    });

    xhr.addEventListener('error', () => reject(new Error('Network error during file upload')));
    xhr.addEventListener('abort', () => reject(new Error('Upload cancelled')));

    xhr.send(formData);
  });
}
