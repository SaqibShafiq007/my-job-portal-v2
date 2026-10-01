// frontend/app/dashboard/profile/ResumeUpload.tsx
'use client';

import { useState } from 'react';

export default function ResumeUpload() {
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleResumeUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setMessage(null);

    try {
      // Step 1: get presigned URL from our backend (via proxy route)
      const uploadUrlRes = await fetch('/api/applicants/profile/resume-upload', {
        method: 'POST',
      });
      const { uploadUrl, key } = await uploadUrlRes.json();

      // Step 2: PUT directly to MinIO/S3 — no API server involved
      await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': 'application/pdf' },
      });

      // Step 3: confirm the upload with our backend
      const confirmRes = await fetch('/api/applicants/profile/resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, filename: file.name }),
      });

      if (confirmRes.ok) {
        setMessage('Résumé uploaded successfully!');
      } else {
        setMessage('Upload failed during confirmation.');
      }
    } catch {
      setMessage('Upload failed — please try again.');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="mt-6 border-t pt-4">
      <h2 className="text-lg font-medium mb-2">Résumé</h2>
      <input
        type="file"
        accept="application/pdf"
        onChange={handleResumeUpload}
        disabled={uploading}
        className="text-sm"
      />
      {uploading && <p className="text-sm text-gray-500 mt-2">Uploading…</p>}
      {message && <p className="text-sm mt-2">{message}</p>}
    </div>
  );
}