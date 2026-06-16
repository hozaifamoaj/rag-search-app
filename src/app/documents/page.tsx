'use client';
import { useEffect, useState } from 'react';
import Navigation from '../components/Navigation';
import PDFViewerModal from '../components/PDFViewerModal';
import UploadModal, { type UploadStatus } from '../components/UploadModal';
import { formatDate, formatFileSize } from '@/lib/utils/format';
import type { Document } from '@/lib/types';

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPDF, setSelectedPDF] = useState<{
    url: string;
    name: string;
    id?: string;
    isPDF?: boolean;
  } | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>(null);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/documents');
      const json = await res.json();
      if (json.error) setError(json.error.message);
      else setDocuments(json.data?.documents || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch documents');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (doc: Document) => {
    const id = doc.id;
    if (!id) {
      alert('Error: Document ID is missing. Refresh the page and try again.');
      return;
    }
    if (!confirm(`Delete "${doc.file_name}"? This will permanently delete the document, embeddings, and file.`)) return;
    setDeletingId(id);
    try {
      const res = await fetch('/api/documents', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const json = await res.json();
      if (json.error) alert(`Error: ${json.error.message}`);
      else setDocuments((prev) => prev.filter((d) => d.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="min-h-screen">
      <Navigation />
      <main className="max-w-7xl mx-auto p-8">
        {uploadStatus && (
          <div
            role="alert"
            className={`mb-6 rounded-lg border-2 px-4 py-3 ${
              uploadStatus.type === 'success'
                ? 'border-green-600 bg-green-100 text-green-900'
                : 'border-red-600 bg-red-100 text-red-900'
            }`}
          >
            <p className="font-semibold">
              {uploadStatus.type === 'success' ? 'Upload successful' : 'Upload failed'}
            </p>
            <p className="mt-1 text-sm">{uploadStatus.text}</p>
            <button
              type="button"
              onClick={() => setUploadStatus(null)}
              className="mt-2 text-sm font-medium underline"
            >
              Dismiss
            </button>
          </div>
        )}

        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">Documents</h1>
          <button
            onClick={() => setShowUploadModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            Upload Document
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">Loading documents...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <p className="text-red-800 dark:text-red-200">Error: {error}</p>
          </div>
        ) : documents.length === 0 ? (
          <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-12 text-center">
            <p className="text-gray-500 dark:text-gray-400 mb-4">No documents uploaded yet.</p>
            <button
              onClick={() => setShowUploadModal(true)}
              className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
            >
              Upload your first document
            </button>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    {['File Name', 'Type', 'Size', 'Chunks', 'Upload Date', 'Actions'].map((h) => (
                      <th
                        key={h}
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
                  {documents.map((doc) => (
                    <tr key={doc.id ?? doc.file_path ?? doc.file_name} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                        {doc.file_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                          {doc.file_type || 'unknown'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {formatFileSize(doc.file_size)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {doc.total_chunks}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {formatDate(doc.upload_date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex gap-3 items-center">
                          {doc.file_name.toLowerCase().endsWith('.pdf') ? (
                            <button
                              onClick={() => {
                                const pdfUrl = doc.file_url
                                  ? `${doc.file_url}?view=true`
                                  : `/api/documents?id=${doc.id}&file=true&view=true`;
                                setSelectedPDF({ url: pdfUrl, name: doc.file_name, id: doc.id });
                              }}
                              className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                            >
                              Preview
                            </button>
                          ) : (
                            <>
                              <button
                                onClick={() =>
                                  setSelectedPDF({
                                    url: doc.file_url || `/api/documents?id=${doc.id}&file=true`,
                                    name: doc.file_name,
                                    id: doc.id,
                                    isPDF: false,
                                  })
                                }
                                className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                              >
                                View
                              </button>
                              {(doc.file_url || doc.file_path) && (
                                <a
                                  href={doc.file_url || `/api/documents?id=${doc.id}&file=true`}
                                  download={doc.file_name}
                                  className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300"
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  Download
                                </a>
                              )}
                            </>
                          )}
                          <button
                            onClick={() => handleDelete(doc)}
                            disabled={!doc.id || deletingId === doc.id}
                            className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {deletingId === doc.id ? 'Deleting...' : 'Delete'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {selectedPDF && (
          <PDFViewerModal
            isOpen={true}
            onClose={() => setSelectedPDF(null)}
            fileUrl={selectedPDF.url}
            fileName={selectedPDF.name}
            documentId={selectedPDF.id}
            isPDF={selectedPDF.isPDF !== false}
          />
        )}

        <UploadModal
          isOpen={showUploadModal}
          onClose={() => setShowUploadModal(false)}
          onUploadSuccess={fetchDocuments}
          onStatusChange={setUploadStatus}
        />
      </main>
    </div>
  );
}
