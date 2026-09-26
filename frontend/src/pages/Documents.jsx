import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

const STATUS_COLORS = { PENDING: '#64748b', PROCESSING: '#0369a1', ANALYZED: '#059669', FAILED: '#dc2626' };

export default function Documents() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/documents/').then((res) => setDocuments(res.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="page">Loading...</div>;

  return (
    <div className="page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <h1 style={{ color: 'var(--navy)', margin: 0 }}>My Documents</h1>
        <Link to="/upload"><button style={{ padding: '0.6rem 1.2rem' }}>+ Upload Report</button></Link>
      </div>

      {documents.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', marginTop: '2rem' }}>
          <p>No health documents uploaded yet.</p>
          <Link to="/upload"><button style={{ padding: '0.75rem 1.5rem' }}>Upload Your First Report</button></Link>
        </div>
      ) : (
        <div className="card" style={{ marginTop: '1.5rem', padding: 0, overflow: 'hidden' }}>
          <table>
            <thead>
              <tr><th>Title</th><th>Type</th><th>Status</th><th>Uploaded</th><th></th></tr>
            </thead>
            <tbody>
              {documents.map((doc) => (
                <tr key={doc.id}>
                  <td>{doc.title}</td>
                  <td>{doc.document_type}</td>
                  <td>
                    <span className="badge" style={{ backgroundColor: STATUS_COLORS[doc.analysis_status] || '#64748b' }}>
                      {doc.analysis_status}
                    </span>
                  </td>
                  <td>{new Date(doc.uploaded_at).toLocaleDateString()}</td>
                  <td><Link to={`/documents/${doc.id}`}>View</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}