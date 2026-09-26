import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import ReportChat from '../components/ReportChat';

const STATUS_COLORS = { NORMAL: '#059669', LOW: '#d97706', HIGH: '#dc2626', UNKNOWN: '#64748b' };

export default function DocumentDetails() {
  const { id } = useParams();
  const [doc, setDoc] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState('');

  const fetchDoc = () => api.get(`/documents/${id}/`).then((res) => setDoc(res.data));
  const fetchAnalysis = () => api.get(`/documents/${id}/analysis/`).then((res) => setAnalysis(res.data)).catch(() => setAnalysis(null));

  useEffect(() => {
    Promise.all([fetchDoc(), fetchAnalysis()]).finally(() => setLoading(false));
    // eslint-disable-next-line
  }, [id]);

  const handleAnalyze = async () => {
    setAnalyzing(true);
    setError('');
    try {
      await api.post(`/documents/${id}/analyze/`);
      await fetchAnalysis();
      await fetchDoc();
    } catch (err) {
      setError(err.response?.data?.detail || 'Analysis failed. Please try again.');
    } finally {
      setAnalyzing(false);
    }
  };

  if (loading) return <div className="page">Loading...</div>;
  if (!doc) return <div className="page">Document not found.</div>;

  return (
    <div className="page">
      <p><Link to="/documents">&larr; Back to My Documents</Link></p>
      <h1 style={{ color: 'var(--navy)', marginBottom: '0.3rem' }}>{doc.title}</h1>
      <p style={{ color: 'var(--text-muted)' }}>
        {doc.document_type} &bull; Uploaded {new Date(doc.uploaded_at).toLocaleString()} &bull;{' '}
        <a href={doc.file} target="_blank" rel="noreferrer">View original PDF</a>
      </p>

      {doc.analysis_status !== 'ANALYZED' ? (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <button onClick={handleAnalyze} disabled={analyzing} style={{ padding: '0.75rem 1.5rem' }}>
            {analyzing ? 'Analyzing... this may take 10-20 seconds' : 'Analyze with AI'}
          </button>
          {error && <p style={{ color: 'var(--danger)' }}>{error}</p>}
        </div>
      ) : (
        <div style={{ marginBottom: '1.5rem' }}>
          <button onClick={handleAnalyze} disabled={analyzing} style={{ padding: '0.5rem 1rem', background: 'var(--navy)' }}>
            {analyzing ? 'Re-analyzing...' : 'Re-analyze'}
          </button>
          {error && <p style={{ color: 'var(--danger)' }}>{error}</p>}
        </div>
      )}

      {analysis && (
        <>
          <div className="card" style={{ marginBottom: '1.25rem' }}>
            <h3 style={{ marginTop: 0, color: 'var(--navy)' }}>Summary</h3>
            <p>{analysis.summary}</p>
          </div>

          {analysis.key_observations?.length > 0 && (
            <div className="card" style={{ marginBottom: '1.25rem' }}>
              <h3 style={{ marginTop: 0, color: 'var(--navy)' }}>Key Observations</h3>
              <ul>{analysis.key_observations.map((o, i) => <li key={i}>{o}</li>)}</ul>
            </div>
          )}

          {analysis.test_results?.length > 0 && (
            <div className="card" style={{ marginBottom: '1.25rem' }}>
              <h3 style={{ marginTop: 0, color: 'var(--navy)' }}>Test Results</h3>
              <table>
                <thead><tr><th>Test</th><th>Value</th><th>Reference Range</th><th>Status</th></tr></thead>
                <tbody>
                  {analysis.test_results.map((t) => (
                    <tr key={t.id}>
                      <td>{t.test_name}</td>
                      <td>{t.value} {t.unit}</td>
                      <td>{t.reference_range || '—'}</td>
                      <td><span className="badge" style={{ backgroundColor: STATUS_COLORS[t.status] || '#64748b' }}>{t.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {analysis.test_results.map((t) => (
                <p key={t.id + '-exp'} style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginTop: '0.8rem' }}>
                  <strong style={{ color: 'var(--text)' }}>{t.test_name}:</strong> {t.explanation}
                </p>
              ))}
            </div>
          )}

          {analysis.doctor_questions?.length > 0 && (
            <div className="card" style={{ marginBottom: '1.25rem' }}>
              <h3 style={{ marginTop: 0, color: 'var(--navy)' }}>Questions to Discuss with a Doctor</h3>
              <ul>{analysis.doctor_questions.map((q, i) => <li key={i}>{q}</li>)}</ul>
            </div>
          )}

          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
            This platform provides educational information and is not a substitute for professional medical advice.
          </p>

          <ReportChat documentId={id} />
        </>
      )}
    </div>
  );
}