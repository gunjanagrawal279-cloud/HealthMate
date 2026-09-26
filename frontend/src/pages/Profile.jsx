import { useState, useEffect } from 'react';
import api from '../services/api';

export default function Profile() {
  const [formData, setFormData] = useState({
    full_name: '', age: '', gender: '', blood_group: '',
    height: '', weight: '', allergies: '', health_notes: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    api.get('/profile/')
      .then((res) => {
        setFormData({
          full_name: res.data.full_name || '',
          age: res.data.age ?? '',
          gender: res.data.gender || '',
          blood_group: res.data.blood_group || '',
          height: res.data.height ?? '',
          weight: res.data.weight ?? '',
          allergies: res.data.allergies || '',
          health_notes: res.data.health_notes || '',
        });
      })
      .finally(() => setLoading(false));
  }, []);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      await api.put('/profile/', formData);
      setMessage('Profile updated successfully!');
    } catch {
      setMessage('Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="page">Loading...</div>;

  const field = (label, name, type = 'text', extra = {}) => (
    <div style={{ marginBottom: '1rem' }}>
      <label style={{ fontWeight: 600, fontSize: '0.9rem' }}>{label}</label>
      <input name={name} type={type} value={formData[name]} onChange={handleChange}
        style={{ width: '100%', padding: '0.6rem', marginTop: '0.3rem' }} {...extra} />
    </div>
  );

  return (
    <div className="page" style={{ maxWidth: '550px' }}>
      <h1 style={{ color: 'var(--navy)' }}>Health Profile</h1>
      <div className="card">
        <form onSubmit={handleSubmit}>
          {field('Full Name', 'full_name')}
          {field('Age', 'age', 'number')}
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ fontWeight: 600, fontSize: '0.9rem' }}>Gender</label>
            <select name="gender" value={formData.gender} onChange={handleChange}
              style={{ width: '100%', padding: '0.6rem', marginTop: '0.3rem' }}>
              <option value="">Select</option>
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
          {field('Blood Group', 'blood_group')}
          {field('Height (cm)', 'height', 'number')}
          {field('Weight (kg)', 'weight', 'number')}
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ fontWeight: 600, fontSize: '0.9rem' }}>Allergies</label>
            <textarea name="allergies" value={formData.allergies} onChange={handleChange}
              style={{ width: '100%', padding: '0.6rem', marginTop: '0.3rem' }} />
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ fontWeight: 600, fontSize: '0.9rem' }}>Health Notes</label>
            <textarea name="health_notes" value={formData.health_notes} onChange={handleChange}
              style={{ width: '100%', padding: '0.6rem', marginTop: '0.3rem' }} />
          </div>
          {message && <p style={{ color: 'var(--emerald)', fontWeight: 600 }}>{message}</p>}
          <button type="submit" disabled={saving} style={{ width: '100%', padding: '0.75rem' }}>
            {saving ? 'Saving...' : 'Save Profile'}
          </button>
        </form>
      </div>
    </div>
  );
}