'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { consumeUploadProcessStream } from '@/lib/utils/consume-upload-stream';
import { uploadToSignedUrlWithProgress } from '@/lib/utils/signed-upload';
import { mapUploadBytesPercent, PROGRESS } from '@/lib/utils/upload-progress';

export type UploadStatus = { type: 'success' | 'error'; text: string } | null;

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess?: () => void;
  onStatusChange?: (status: UploadStatus) => void;
}

const MAX_FILE_BYTES = 50 * 1024 * 1024;

type ProgressState = {
  percent: number;
  label: string;
};

function StatusBanner({ status }: { status: NonNullable<UploadStatus> }) {
  const isSuccess = status.type === 'success';
  return (
    <div
      role="alert"
      aria-live="polite"
      className={
        isSuccess
          ? 'p-4 rounded-lg border border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-900/40 dark:text-green-200'
          : 'p-4 rounded-lg border border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-900/40 dark:text-red-200'
      }
    >
      <p className="font-medium">{isSuccess ? 'Upload successful' : 'Upload failed'}</p>
      <p className="mt-1 text-sm">{status.text}</p>
    </div>
  );
}

function UploadProgressBar({ progress }: { progress: ProgressState }) {
  return (
    <div className="mb-6" role="status" aria-live="polite" aria-busy="true">
      <div className="flex justify-between text-sm mb-2">
        <span className="font-medium text-gray-700 dark:text-gray-300">{progress.label}</span>
        <span className="tabular-nums text-gray-600 dark:text-gray-400">{progress.percent}%</span>
      </div>
      <div
        className="h-2.5 w-full rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden"
        aria-valuenow={progress.percent}
        aria-valuemin={0}
        aria-valuemax={100}
        role="progressbar"
        aria-label={progress.label}
      >
        <div
          className="h-full rounded-full bg-blue-600 transition-[width] duration-200 ease-out"
          style={{ width: `${Math.min(100, Math.max(0, progress.percent))}%` }}
        />
      </div>
    </div>
  );
}

export default function UploadModal({
  isOpen,
  onClose,
  onUploadSuccess,
  onStatusChange,
}: UploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<ProgressState | null>(null);
  const [status, setStatus] = useState<UploadStatus>(null);
  const [mounted, setMounted] = useState(false);
  const wasOpenRef = useRef(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reportStatus = useCallback(
    (next: NonNullable<UploadStatus>) => {
      setStatus(next);
      onStatusChange?.(next);
    },
    [onStatusChange]
  );

  const clearCloseTimer = useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : 'unset';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      setFile(null);
      setStatus(null);
      setProgress(null);
      clearCloseTimer();
    }
    wasOpenRef.current = isOpen;
  }, [isOpen, clearCloseTimer]);

  useEffect(() => () => clearCloseTimer(), [clearCloseTimer]);

  const handleClose = useCallback(() => {
    if (uploading) return;
    clearCloseTimer();
    onClose();
  }, [uploading, clearCloseTimer, onClose]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setFile(e.target.files[0]);
      setStatus(null);
      setProgress(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      reportStatus({ type: 'error', text: 'Please select a file' });
      return;
    }

    if (file.size > MAX_FILE_BYTES) {
      reportStatus({
        type: 'error',
        text: `File is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum size is 50 MB.`,
      });
      return;
    }

    setUploading(true);
    setStatus(null);
    setProgress({ percent: 0, label: 'Preparing upload…' });
    onStatusChange?.(null);
    clearCloseTimer();

    try {
      setProgress({ percent: 2, label: 'Preparing upload…' });

      const prepareRes = await fetch('/api/upload/prepare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: file.name }),
      });
      const prepareData = await prepareRes.json();
      if (!prepareRes.ok) {
        throw new Error(prepareData.error || 'Could not prepare upload');
      }

      const { documentId, filePath, signedUrl } = prepareData as {
        documentId: string;
        filePath: string;
        signedUrl: string;
      };

      if (!signedUrl) {
        throw new Error('Server did not return a signed upload URL');
      }

      setProgress({ percent: PROGRESS.PREPARE, label: 'Uploading to storage…' });

      await uploadToSignedUrlWithProgress(signedUrl, file, (uploadPct) => {
        setProgress({
          percent: mapUploadBytesPercent(uploadPct),
          label: `Uploading to storage… ${uploadPct}%`,
        });
      });

      setProgress({ percent: PROGRESS.UPLOAD_END, label: 'Processing document…' });

      const result = await consumeUploadProcessStream(
        {
          documentId,
          filePath,
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
        },
        (event) => {
          setProgress({
            percent: event.percent,
            label: event.message,
          });
        }
      );

      setProgress({ percent: 100, label: 'Complete' });

      const successStatus: NonNullable<UploadStatus> = {
        type: 'success',
        text: `File "${result.fileName}" uploaded successfully! Processed ${result.chunks} chunks.`,
      };
      reportStatus(successStatus);
      setFile(null);
      const input = document.getElementById('upload-file-input') as HTMLInputElement | null;
      if (input) input.value = '';

      closeTimerRef.current = setTimeout(() => {
        onUploadSuccess?.();
        onClose();
      }, 2500);
    } catch (error: unknown) {
      const text = error instanceof Error ? error.message : 'Upload failed';
      reportStatus({ type: 'error', text });
      setProgress(null);
    } finally {
      setUploading(false);
    }
  };

  const toast =
    mounted && isOpen && status
      ? createPortal(
          <div className="fixed inset-x-0 top-4 z-[60] flex justify-center px-4 pointer-events-none">
            <div className="w-full max-w-lg pointer-events-auto shadow-lg">
              <StatusBanner status={status} />
            </div>
          </div>,
          document.body
        )
      : null;

  if (!isOpen) return toast;

  return (
    <>
      {toast}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 p-4"
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) handleClose();
        }}
      >
        <div
          className="relative bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-800">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
              Upload Document
            </h2>
            <button
              type="button"
              onClick={handleClose}
              disabled={uploading}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Close"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {status && (
            <div className="px-6 pt-6">
              <StatusBanner status={status} />
            </div>
          )}

          <div className="p-6">
            <div className="mb-6">
              <label
                htmlFor="upload-file-input"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                Select a file (PDF, DOCX, or TXT)
              </label>
              <input
                id="upload-file-input"
                type="file"
                accept=".pdf,.docx,.txt"
                onChange={handleFileChange}
                disabled={uploading}
                className="block w-full text-sm text-gray-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-lg file:border-0
                file:text-sm file:font-semibold
                file:bg-blue-50 file:text-blue-700
                hover:file:bg-blue-100
                dark:file:bg-blue-900 dark:file:text-blue-300
                dark:hover:file:bg-blue-800
                disabled:opacity-50"
              />
            </div>

            {file && (
              <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg text-sm text-gray-600 dark:text-gray-400 space-y-1">
                <p>
                  <span className="font-medium">Selected:</span> {file.name}
                </p>
                <p>
                  <span className="font-medium">Size:</span> {(file.size / 1024).toFixed(2)} KB
                </p>
                <p>
                  <span className="font-medium">Type:</span>{' '}
                  {file.type || file.name.split('.').pop()}
                </p>
              </div>
            )}

            {uploading && progress && <UploadProgressBar progress={progress} />}

            <button
              type="button"
              onClick={handleUpload}
              disabled={!file || uploading}
              className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
            >
              {uploading ? 'Upload in progress…' : 'Upload Document'}
            </button>

            <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm">
              <p className="font-medium text-blue-900 dark:text-blue-200 mb-2">
                Supported: PDF, DOCX, TXT (up to 50 MB)
              </p>
              <p className="text-blue-700 dark:text-blue-400">
                Files upload directly to Supabase (bypasses Vercel&apos;s 4.5 MB API limit), then are
                processed for RAG search.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
