import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

const STATUS_COLORS = { PENDING: '#64748b', PROCESSING: '#0369a1', ANALYZED: '#059669', FAILED: '#dc2626' };

export default function Timeline() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/documents/timeline/').then((res) => setEvents(res.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="page">Loading...</div>;

  return (
    <div className="page">
      <h1 style={{ color: 'var(--navy)' }}>Health Timeline</h1>
      <p style={{ color: 'var(--text-muted)' }}>A chronological view of all your uploaded health reports.</p>

      {events.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', marginTop: '1.5rem' }}>
          <p>No health reports yet.</p>
          <Link to="/upload"><button style={{ padding: '0.75rem 1.5rem' }}>Upload Your First Report</button></Link>
        </div>
      ) : (
        <div style={{ position: 'relative', marginTop: '2rem', paddingLeft: '1.5rem' }}>
          <div style={{ position: 'absolute', left: '6px', top: '8px', bottom: '8px', width: '2px', background: 'var(--border)' }} />
          {events.map((e) => (
            <div key={e.id} style={{ position: 'relative', marginBottom: '1.5rem' }}>
              <div style={{
                position: 'absolute', left: '-1.5rem', top: '6px', width: '14px', height: '14px',
                borderRadius: '50%', background: STATUS_COLORS[e.analysis_status] || '#64748b',
                border: '3px solid var(--bg)',
              }} />
              <Link to={`/documents/${e.id}`} className="card" style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <strong style={{ color: 'var(--navy)' }}>{e.title}</strong>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    {new Date(e.uploaded_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                  </span>
                </div>
                <div style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                  {e.document_type} &bull;{' '}
                  {e.analysis_status === 'ANALYZED' ? (
                    <>
                      {e.total_parameters} parameter{e.total_parameters !== 1 ? 's' : ''} detected
                      {e.outside_range_count > 0 && (
                        <span style={{ color: 'var(--danger)' }}> &bull; {e.outside_range_count} outside reference range</span>
                      )}
                    </>
                  ) : (
                    <span className="badge" style={{ backgroundColor: STATUS_COLORS[e.analysis_status] }}>{e.analysis_status}</span>
                  )}
                </div>
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}