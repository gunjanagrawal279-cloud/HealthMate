
import { useEffect, useState } from 'react';

const API = 'http://127.0.0.1:8000/api/doctors/';

export default function DoctorDashboard() {
  const [appointments, setAppointments] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [notes, setNotes] = useState('');
  const [medicine, setMedicine] = useState({
    medicine_name: '',
    dosage: '',
    frequency: '',
    duration: '',
    instructions: '',
  });
  const [diet, setDiet] = useState({
    title: '',
    breakfast: '',
    lunch: '',
    dinner: '',
    snacks: '',
    lifestyle_advice: '',
  });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const token = localStorage.getItem('access_token');

  const request = async (path, options = {}) => {
    const response = await fetch(`${API}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const detail = data.detail ||
        Object.values(data).flat().join(' ') ||
        'Something went wrong.';
      throw new Error(detail);
    }

    return data;
  };

  const loadAppointments = async () => {
    setLoading(true);
    setError('');

    try {
      const data = await request('appointments/');
      const list = Array.isArray(data) ? data : data.results || [];
      setAppointments(list);

      if (selectedId && !list.some(item => String(item.id) === String(selectedId))) {
        setSelectedId('');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAppointments();
  }, []);

  const selectedAppointment = appointments.find(
    item => String(item.id) === String(selectedId)
  );

  const completeConsultation = async (e) => {
    e.preventDefault();
    if (!selectedId) return;

    setSaving(true);
    setMessage('');
    setError('');

    try {
      await request(`appointments/${selectedId}/consultation/`, {
        method: 'POST',
        body: JSON.stringify({ consultation_notes: notes }),
      });

      setMessage('Consultation completed successfully.');
      setNotes('');
      await loadAppointments();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const addPrescription = async (e) => {
    e.preventDefault();
    if (!selectedId) return;

    setSaving(true);
    setMessage('');
    setError('');

    try {
      await request('prescriptions/create/', {
        method: 'POST',
        body: JSON.stringify({
          appointment: Number(selectedId),
          ...medicine,
        }),
      });

      setMessage('Prescription added successfully.');
      setMedicine({
        medicine_name: '',
        dosage: '',
        frequency: '',
        duration: '',
        instructions: '',
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const addDietPlan = async (e) => {
    e.preventDefault();
    if (!selectedId) return;

    setSaving(true);
    setMessage('');
    setError('');

    try {
      await request('diet-plans/create/', {
        method: 'POST',
        body: JSON.stringify({
          appointment: Number(selectedId),
          ...diet,
        }),
      });

      setMessage('Diet plan added successfully.');
      setDiet({
        title: '',
        breakfast: '',
        lunch: '',
        dinner: '',
        snacks: '',
        lifestyle_advice: '',
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const fieldStyle = {
    width: '100%',
    padding: '10px',
    marginTop: '6px',
    marginBottom: '12px',
    border: '1px solid #ccc',
    borderRadius: '7px',
    boxSizing: 'border-box',
  };

  const buttonStyle = {
    padding: '10px 16px',
    border: 'none',
    borderRadius: '7px',
    background: 'var(--navy, #17324d)',
    color: 'white',
    cursor: 'pointer',
  };

  if (loading) return <p style={{ padding: 24 }}>Loading appointments...</p>;

  return (
    <main style={{ maxWidth: 1000, margin: 'auto', padding: 24 }}>
      <h1>Doctor Dashboard</h1>
      <p>Manage your patient appointments and consultations.</p>

      {message && <p role="status" style={{ color: 'green' }}>{message}</p>}
      {error && <p role="alert" style={{ color: 'crimson' }}>{error}</p>}

      <section className="card" style={{ padding: 18, marginBottom: 24 }}>
        <h2>My Appointments</h2>
        <button type="button" style={buttonStyle} onClick={loadAppointments}>
          Refresh
        </button>

        {appointments.length === 0 ? (
          <p>No appointments have been booked yet.</p>
        ) : (
          <div style={{ display: 'grid', gap: 12, marginTop: 16 }}>
            {appointments.map(item => (
              <div
                key={item.id}
                style={{
                  border: '1px solid #ddd',
                  borderRadius: 10,
                  padding: 14,
                }}
              >
                <strong>Patient: {item.patient_name || 'Patient'}</strong>
                <p>Date: {item.appointment_date} | Time: {item.appointment_time}</p>
                <p>Status: {item.status}</p>
                <p>Reason: {item.reason || 'Not provided'}</p>
                {item.report && <p>Attached report ID: {item.report}</p>}
                <button
                  type="button"
                  style={buttonStyle}
                  onClick={() => {
                    setSelectedId(String(item.id));
                    setNotes(item.consultation_notes || '');
                    setMessage('');
                    setError('');
                  }}
                >
                  Open appointment
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {selectedAppointment && (
        <section className="card" style={{ padding: 18 }}>
          <h2>Appointment #{selectedAppointment.id}</h2>
          <p>
            Patient: <strong>{selectedAppointment.patient_name}</strong>
          </p>
          <p>Status: {selectedAppointment.status}</p>

          <h3>Consultation Notes</h3>
          <form onSubmit={completeConsultation}>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              required
              rows={5}
              placeholder="Enter your clinical consultation notes..."
              style={fieldStyle}
            />
            <button
              type="submit"
              disabled={saving || selectedAppointment.status === 'CANCELLED'}
              style={buttonStyle}
            >
              {saving ? 'Saving...' : 'Save & Complete Consultation'}
            </button>
          </form>

          {selectedAppointment.status === 'COMPLETED' && (
            <>
              <hr />
              <h3>Add Prescription</h3>
              <form onSubmit={addPrescription}>
                {[
                  ['medicine_name', 'Medicine name'],
                  ['dosage', 'Dosage'],
                  ['frequency', 'Frequency'],
                  ['duration', 'Duration'],
                ].map(([key, label]) => (
                  <label key={key} style={{ display: 'block' }}>
                    {label}
                    <input
                      required
                      value={medicine[key]}
                      onChange={e => setMedicine({
                        ...medicine,
                        [key]: e.target.value,
                      })}
                      style={fieldStyle}
                    />
                  </label>
                ))}
                <label>
                  Instructions
                  <textarea
                    rows={3}
                    value={medicine.instructions}
                    onChange={e => setMedicine({
                      ...medicine,
                      instructions: e.target.value,
                    })}
                    style={fieldStyle}
                  />
                </label>
                <button type="submit" disabled={saving} style={buttonStyle}>
                  Save Prescription
                </button>
              </form>

              <hr />
              <h3>Create Diet Plan</h3>
              <form onSubmit={addDietPlan}>
                {[
                  ['title', 'Plan title'],
                  ['breakfast', 'Breakfast'],
                  ['lunch', 'Lunch'],
                  ['dinner', 'Dinner'],
                  ['snacks', 'Snacks'],
                  ['lifestyle_advice', 'Lifestyle advice'],
                ].map(([key, label]) => (
                  <label key={key} style={{ display: 'block' }}>
                    {label}
                    <textarea
                      required={key === 'title'}
                      rows={key === 'title' ? 1 : 3}
                      value={diet[key]}
                      onChange={e => setDiet({
                        ...diet,
                        [key]: e.target.value,
                      })}
                      style={fieldStyle}
                    />
                  </label>
                ))}
                <button type="submit" disabled={saving} style={buttonStyle}>
                  Save Diet Plan
                </button>
              </form>
            </>
          )}

          {selectedAppointment.status !== 'COMPLETED' && (
            <p>Complete the consultation first to add a prescription or diet plan.</p>
          )}
        </section>
      )}
    </main>
  );
}
