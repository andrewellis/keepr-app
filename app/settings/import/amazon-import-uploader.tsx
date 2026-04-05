'use client';

import { useCallback, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

type UploadState =
  | { status: 'idle' }
  | { status: 'selected'; file: File }
  | { status: 'uploading' }
  | { status: 'success'; imported: number }
  | { status: 'error'; message: string };

export function AmazonImportUploader() {
  const [state, setState] = useState<UploadState>({ status: 'idle' });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleReset = useCallback(() => {
    setState({ status: 'idle' });
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const handleUpload = useCallback(async () => {
    if (state.status !== 'selected') return;

    setState({ status: 'uploading' });

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setState({ status: 'error', message: 'You must be signed in to import order history.' });
        return;
      }

      const formData = new FormData();
      formData.append('file', state.file);

      const response = await fetch('/api/tracker/import', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: formData,
      });

      const json = await response.json();

      if (!response.ok) {
        setState({ status: 'error', message: json.error ?? 'Upload failed.' });
        return;
      }

      setState({ status: 'success', imported: json.imported });
    } catch {
      setState({ status: 'error', message: 'Something went wrong. Please try again.' });
    }
  }, [state]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith('.csv')) {
      setState({ status: 'error', message: 'Please select a .csv file.' });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setState({ status: 'error', message: 'File is too large. Maximum size is 10MB.' });
      return;
    }
    setState({ status: 'selected', file });
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    if (!file.name.endsWith('.csv')) {
      setState({ status: 'error', message: 'Please drop a .csv file.' });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setState({ status: 'error', message: 'File is too large. Maximum size is 10MB.' });
      return;
    }
    setState({ status: 'selected', file });
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); }, []);

  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold text-gray-900">Upload Order History</h2>

      {state.status === 'success' && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-6 text-center">
          <p className="text-sm font-medium text-green-800">{state.imported} repeat-purchase items imported</p>
          <p className="mt-1 text-xs text-green-700">K33pr will check prices weekly and alert you when prices drop.</p>
          <button onClick={handleReset} className="mt-4 text-sm font-medium text-[#534AB7] underline underline-offset-2">Upload another file</button>
        </div>
      )}

      {state.status === 'error' && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-6">
          <p className="text-sm font-medium text-red-800">{state.message}</p>
          <button onClick={handleReset} className="mt-2 text-sm font-medium text-red-700 underline underline-offset-2">Try again</button>
        </div>
      )}

      {(state.status === 'idle' || state.status === 'selected' || state.status === 'uploading') && (
        <div>
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors ${state.status === 'selected' ? 'border-[#534AB7] bg-indigo-50' : 'border-gray-300 bg-white hover:border-gray-400'}`}
          >
            {state.status === 'idle' && (
              <>
                <p className="text-sm text-gray-600">Drag and drop your <strong>Order_History.csv</strong> here</p>
                <p className="mt-1 text-xs text-gray-500">or</p>
                <label className="mt-2 cursor-pointer rounded-md bg-[#534AB7] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#4339a0]">
                  Choose file
                  <input ref={fileInputRef} type="file" accept=".csv" onChange={handleFileSelect} className="hidden" />
                </label>
              </>
            )}
            {state.status === 'selected' && (
              <>
                <p className="text-sm font-medium text-gray-900">{state.file.name}</p>
                <p className="mt-1 text-xs text-gray-500">{(state.file.size / 1024).toFixed(0)} KB</p>
                <div className="mt-4 flex gap-3">
                  <button onClick={handleUpload} className="rounded-md bg-[#534AB7] px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-[#4339a0]">Upload and import</button>
                  <button onClick={handleReset} className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50">Cancel</button>
                </div>
              </>
            )}
            {state.status === 'uploading' && (
              <p className="text-sm font-medium text-gray-900">Processing your order history...</p>
            )}
          </div>
          {state.status === 'idle' && (
            <p className="mt-3 text-center text-xs text-gray-500">Accepts .csv files up to 10MB. Only Order_History.csv from Amazon data export is supported.</p>
          )}
        </div>
      )}
    </div>
  );
}
