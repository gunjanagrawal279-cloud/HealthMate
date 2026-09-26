import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { UploadCloud, FileText, X } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';

const DOCUMENT_TYPES = [
  ['BLOOD_TEST', 'Blood Test'], ['CBC', 'CBC'], ['LIPID_PROFILE', 'Lipid Profile'],
  ['DIABETES_TEST', 'Diabetes Test'], ['THYROID_TEST', 'Thyroid Test'],
  ['LIVER_FUNCTION', 'Liver Function Test'], ['KIDNEY_FUNCTION', 'Kidney Function Test'],
  ['PRESCRIPTION', 'Prescription'], ['DISCHARGE_SUMMARY', 'Discharge Summary'], ['OTHER', 'Other'],
];

const PIPELINE_STEPS = ['Uploading report...', 'Saving to your account...', 'Upload complete ✓'];

export default function UploadDocument() {
  const [title, setTitle] = useState('');
  const [documentType, setDocumentType] = useState('BLOOD_TEST');
  const [documentDate, setDocumentDate] = useState('');
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const validateAndSetFile = (f) => {
    if (!f) return;
    if (!f.name.toLowerCase().endsWith('.pdf')) {
      setError('Only PDF files are allowed.');
      toast.error('Only PDF files are allowed.');
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      setError('File size must be under 10MB.');
      toast.error('File too large (max 10MB).');
      return;
    }
    setError('');
    setFile(f);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    validateAndSetFile(e.dataTransfer.files?.[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!file) {
      setError('Please select a PDF file.');
      return;
    }

    const formData = new FormData();
    formData.append('title', title);
    formData.append('document_type', documentType);
    if (documentDate) formData.append('document_date', documentDate);
    formData.append('file', file);

    setUploading(true);
    setStepIndex(0);

    try {
      setStepIndex(1);
      const res = await api.post('/documents/upload/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setStepIndex(2);
      toast.success('Report uploaded successfully!');
      setTimeout(() => navigate(`/documents/${res.data.id}`), 700);
    } catch (err) {
      const data = err.response?.data;
      let msg = 'Upload failed. Please try again.';
      if (data) {
        const firstKey = Object.keys(data)[0];
        msg = Array.isArray(data[firstKey]) ? data[firstKey][0] : String(data[firstKey]);
      }
      setError(msg);
      toast.error(msg);
      setUploading(false);
    }
  };

  return (
    <div className="page" style={{ maxWidth: '560px' }}>
      <h1 style={{ color: 'var(--navy)' }}>Upload Health Document</h1>
      <p style={{ color: 'var(--text-muted)' }}>Upload a PDF lab report to get an AI-powered explanation.</p>

      <div className="card fade-in">
        {uploading ? (
          <div style={{ padding: '1rem 0' }}>
            {PIPELINE_STEPS.map((step, i) => (
              <motion.div
                key={step}
                initial={{ opacity: 0.3 }}
                animate={{ opacity: i <= stepIndex ? 1 : 0.3 }}
                style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.75rem' }}
              >
                <span style={{
                  width: '20px', height: '20px', borderRadius: '50%',
                  background: i < stepIndex ? 'var(--emerald)' : i === stepIndex ? 'var(--teal)' : 'var(--border)',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  color: 'white', fontSize: '0.7rem', flexShrink: 0,
                }}>
                  {i < stepIndex ? '✓' : i === stepIndex ? '' : ''}
                </span>
                <span style={{ color: i <= stepIndex ? 'var(--text)' : 'var(--text-muted)', fontWeight: i === stepIndex ? 600 : 400 }}>
                  {step}
                </span>
              </motion.div>
            ))}
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ fontWeight: 600, fontSize: '0.9rem' }}>Title</label>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required
                placeholder="e.g. Blood Test - Jan 2026" style={{ width: '100%', padding: '0.6rem', marginTop: '0.3rem' }} />
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ fontWeight: 600, fontSize: '0.9rem' }}>Document Type</label>
              <select value={documentType} onChange={(e) => setDocumentType(e.target.value)}
                style={{ width: '100%', padding: '0.6rem', marginTop: '0.3rem' }}>
                {DOCUMENT_TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ fontWeight: 600, fontSize: '0.9rem' }}>Document Date (optional)</label>
              <input type="date" value={documentDate} onChange={(e) => setDocumentDate(e.target.value)}
                style={{ width: '100%', padding: '0.6rem', marginTop: '0.3rem' }} />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ fontWeight: 600, fontSize: '0.9rem' }}>PDF File</label>
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                onDragLeave={() => setDragActive(false)}
                onDrop={handleDrop}
                style={{
                  marginTop: '0.4rem', border: `2px dashed ${dragActive ? 'var(--teal)' : 'var(--border)'}`,
                  borderRadius: '12px', padding: '2rem 1rem', textAlign: 'center', cursor: 'pointer',
                  background: dragActive ? 'var(--soft-blue)' : 'transparent', transition: 'all 0.15s ease',
                }}
              >
                <input
                  ref={fileInputRef} type="file" accept="application/pdf" hidden
                  onChange={(e) => validateAndSetFile(e.target.files?.[0])}
                />
                {file ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem' }}>
                    <FileText color="var(--teal)" />
                    <span>{file.name}</span>
                    <button type="button" onClick={(e) => { e.stopPropagation(); setFile(null); }}
                      style={{ background: 'none', padding: '2px' }}>
                      <X size={16} color="var(--text-muted)" />
                    </button>
                  </div>
                ) : (
                  <>
                    <UploadCloud size={32} color="var(--text-muted)" style={{ marginBottom: '0.5rem' }} />
                    <p style={{ margin: 0, color: 'var(--text-muted)' }}>
                      Drag & drop your PDF here, or <strong style={{ color: 'var(--teal)' }}>click to browse</strong>
                    </p>
                    <p style={{ margin: '0.3rem 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>PDF only, max 10MB</p>
                  </>
                )}
              </div>
            </div>

            {error && <p style={{ color: 'var(--danger)', fontSize: '0.9rem' }}>{error}</p>}
            <button type="submit" style={{ width: '100%', padding: '0.75rem' }}>
              Upload
            </button>
          </form>
        )}
      </div>
    </div>
  );
}