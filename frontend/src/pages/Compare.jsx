import { useState, useEffect } from 'react';
import api from '../services/api';

export default function Compare() {
  const [documents, setDocuments] = useState([]);
  const [doc1, setDoc1] = useState('');
  const [doc2, setDoc2] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get('/documents/').then((res) => {
      setDocuments(res.data.filter((d) => d.analysis_status === 'ANALYZED'));
    });
  }, []);

  const handleCompare = async () => {
    setError('');
    setResult(null);
    if (!doc1 || !doc2 || doc1 === doc2) {
      setError('Please select two different analyzed reports.');
      return;
    }
    setLoading(true);
    try {
      const res = await api.get(`/documents/compare/?doc1=${doc1}&doc2=${doc2}`);
      setResult(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Comparison failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <h1 style={{ color: 'var(--navy)' }}>Compare Reports</h1>
      <p style={{ color: 'var(--text-muted)' }}>Select two analyzed reports to see how shared test values changed.</p>

      {documents.length < 2 ? (
        <div className="card" style={{ textAlign: 'center', marginTop: '1.5rem' }}>
          <p>Not enough analyzed reports for comparison. Upload and analyze at least two reports.</p>
        </div>
      ) : (
        <div className="card">
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
            <div style={{ flex: 1, minWidth: '200px' }}>
              <label style={{ fontWeight: 600, fontSize: '0.9rem' }}>Report 1</label>
              <select value={doc1} onChange={(e) => setDoc1(e.target.value)} style={{ width: '100%', padding: '0.6rem', marginTop: '0.3rem' }}>
                <option value="">Select a report</option>
                {documents.map((d) => (
                  <option key={d.id} value={d.id}>{d.title} ({new Date(d.uploaded_at).toLocaleDateString()})</option>
                ))}
              </select>
            </div>
            <div style={{ flex: 1, minWidth: '200px' }}>
              <label style={{ fontWeight: 600, fontSize: '0.9rem' }}>Report 2</label>
              <select value={doc2} onChange={(e) => setDoc2(e.target.value)} style={{ width: '100%', padding: '0.6rem', marginTop: '0.3rem' }}>
                <option value="">Select a report</option>
                {documents.map((d) => (
                  <option key={d.id} value={d.id}>{d.title} ({new Date(d.uploaded_at).toLocaleDateString()})</option>
                ))}
              </select>
            </div>
          </div>
          <button onClick={handleCompare} disabled={loading} style={{ padding: '0.7rem 1.4rem' }}>
            {loading ? 'Comparing...' : 'Compare'}
          </button>
          {error && <p style={{ color: 'var(--danger)', marginTop: '0.75rem' }}>{error}</p>}
        </div>
      )}

      {result && (
        <div className="card" style={{ marginTop: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1rem' }}>
            <span>Previous: <strong style={{ color: 'var(--text)' }}>{result.previous_report.title}</strong> ({new Date(result.previous_report.uploaded_at).toLocaleDateString()})</span>
            <span>Latest: <strong style={{ color: 'var(--text)' }}>{result.latest_report.title}</strong> ({new Date(result.latest_report.uploaded_at).toLocaleDateString()})</span>
          </div>

          {result.comparisons.length === 0 ? (
            <p>No comparable test parameters (same test name and unit) were found in both reports.</p>
          ) : (
            <table>
              <thead>
                <tr><th>Test</th><th>Previous</th><th>Latest</th><th>Change</th><th>% Change</th></tr>
              </thead>
              <tbody>
                {result.comparisons.map((c, i) => (
                  <tr key={i}>
                    <td>{c.test_name}</td>
                    <td>{c.previous_value} {c.unit}</td>
                    <td>{c.latest_value} {c.unit}</td>
                    <td style={{ color: c.absolute_change > 0 ? 'var(--danger)' : c.absolute_change < 0 ? 'var(--teal)' : 'var(--text)' }}>
                      {c.absolute_change > 0 ? '+' : ''}{c.absolute_change} {c.unit}
                    </td>
                    <td>{c.percentage_change !== null ? `${c.percentage_change > 0 ? '+' : ''}${c.percentage_change}%` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic', marginTop: '1rem' }}>
            This shows numerical changes only and does not represent a medical conclusion.
          </p>
        </div>
      )}
    </div>
  );
}