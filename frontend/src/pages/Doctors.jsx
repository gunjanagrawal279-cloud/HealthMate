
import { useEffect, useState } from 'react';
import {
  Search,
  MapPin,
  BriefcaseMedical,
  GraduationCap,
  CalendarDays,
  Clock,
  IndianRupee,
  Stethoscope,
  CheckCircle2,
  FileText,
  RefreshCw,
  X,
  CalendarCheck,
  HeartPulse,
} from 'lucide-react';

const API = 'http://127.0.0.1:8000/api/doctors/';

const colors = {
  navy: '#163653',
  blue: '#2477a8',
  teal: '#16a085',
  background: '#f2f7fb',
  muted: '#74869a',
  border: '#e5edf4',
};

const inputStyle = {
  width: '100%',
  padding: '13px 14px',
  marginTop: 7,
  border: `1px solid ${colors.border}`,
  borderRadius: 10,
  background: '#fff',
  fontSize: 14,
  outline: 'none',
};

const primaryButton = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  padding: '12px 19px',
  border: 'none',
  borderRadius: 10,
  background: `linear-gradient(120deg, ${colors.blue}, ${colors.teal})`,
  color: 'white',
  fontWeight: 700,
  fontSize: 14,
  cursor: 'pointer',
};

const statusColors = {
  PENDING: { bg: '#fff4db', color: '#a36a00' },
  ACCEPTED: { bg: '#e5f1ff', color: '#2467a8' },
  COMPLETED: { bg: '#e3f7ef', color: '#13845e' },
  CANCELLED: { bg: '#ffebeb', color: '#c44747' },
};

export default function Doctors() {
  const [doctors, setDoctors] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [reason, setReason] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [city, setCity] = useState('');
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const token = localStorage.getItem('access_token');

  const request = async (url, options = {}) => {
    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...options.headers,
      },
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        data.detail ||
        Object.values(data).flat().join(' ') ||
        'Request failed.'
      );
    }

    return data;
  };

  const loadData = async () => {
    setLoading(true);
    setError('');

    try {
      const params = new URLSearchParams();

      if (specialty) params.set('specialization', specialty);
      if (city.trim()) params.set('city', city.trim());

      const [doctorData, appointmentData] = await Promise.all([
        request(`${API}?${params.toString()}`),
        request(`${API}appointments/`),
      ]);

      setDoctors(
        Array.isArray(doctorData)
          ? doctorData
          : doctorData.results || []
      );

      setAppointments(
        Array.isArray(appointmentData)
          ? appointmentData
          : appointmentData.results || []
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadData();
    }, 300);

    return () => clearTimeout(timer);
  }, [specialty, city]);

  const bookAppointment = async (e) => {
    e.preventDefault();

    if (!selectedDoctor || !date || !time) {
      setError('Please select a doctor, date and time.');
      return;
    }

    setBooking(true);
    setError('');
    setMessage('');

    try {
      await request(`${API}appointments/`, {
        method: 'POST',
        body: JSON.stringify({
          doctor: selectedDoctor.id,
          appointment_date: date,
          appointment_time: time,
          reason,
        }),
      });

      setMessage('Your appointment has been booked successfully!');
      setSelectedDoctor(null);
      setDate('');
      setTime('');
      setReason('');

      await loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setBooking(false);
    }
  };

  const sectionStyle = {
    background: '#fff',
    border: `1px solid ${colors.border}`,
    borderRadius: 17,
    padding: 23,
    boxShadow: '0 5px 20px rgba(22,54,83,0.045)',
  };

  const headingStyle = {
    color: colors.navy,
    fontSize: 22,
    fontWeight: 800,
    margin: '0 0 8px',
  };

  const today = new Date();
  const minDate = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, '0'),
    String(today.getDate()).padStart(2, '0'),
  ].join('-');

  return (
    <main style={{
      minHeight: '100vh',
      background: colors.background,
      padding: '30px 20px 60px',
    }}>
      <div style={{ maxWidth: 1160, margin: 'auto' }}>

        {/* Hero section */}
        <section style={{
          background: 'linear-gradient(115deg, #163653, #2477a8 65%, #16a085)',
          borderRadius: 20,
          padding: '35px 30px',
          color: 'white',
          marginBottom: 25,
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 12px 30px rgba(22,54,83,0.16)',
        }}>
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              background: 'rgba(255,255,255,0.15)',
              padding: '7px 13px',
              borderRadius: 30,
              fontSize: 12,
              fontWeight: 700,
              marginBottom: 13,
            }}>
              <HeartPulse size={16} />
              YOUR HEALTH, OUR PRIORITY
            </div>

            <h1 style={{
              color: 'white',
              fontSize: 'clamp(26px, 4vw, 36px)',
              margin: '0 0 10px',
            }}>
              Find Your Right Doctor
            </h1>

            <p style={{
              color: '#e1f1f8',
              fontSize: 15,
              maxWidth: 600,
              margin: 0,
            }}>
              Connect with verified healthcare professionals and book
              your consultation with confidence.
            </p>
          </div>

          <Stethoscope
            size={125}
            style={{
              position: 'absolute',
              right: 45,
              bottom: -15,
              opacity: 0.13,
            }}
          />
        </section>

        {/* Alerts */}
        {message && (
          <div role="status" style={{
            padding: 15,
            borderRadius: 11,
            background: '#e4f8ef',
            color: '#147c56',
            border: '1px solid #bcebd5',
            marginBottom: 20,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}>
            <CheckCircle2 size={20} />
            {message}
          </div>
        )}

        {error && (
          <div role="alert" style={{
            padding: 15,
            borderRadius: 11,
            background: '#fff0f0',
            color: '#bd4141',
            border: '1px solid #ffd0d0',
            marginBottom: 20,
          }}>
            {error}
          </div>
        )}

        {/* Search */}
        <section style={{ ...sectionStyle, marginBottom: 30 }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            marginBottom: 19,
          }}>
            <div style={{
              background: '#e8f4fb',
              color: colors.blue,
              padding: 10,
              borderRadius: 11,
            }}>
              <Search size={21} />
            </div>
            <div>
              <h2 style={{ ...headingStyle, margin: 0 }}>
                Search Doctors
              </h2>
              <p style={{ margin: 0, fontSize: 13 }}>
                Find specialists according to your needs
              </p>
            </div>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 18,
          }}>
            <label style={{ color: colors.navy, fontWeight: 700, fontSize: 13 }}>
              Specialization
              <select
                value={specialty}
                onChange={e => setSpecialty(e.target.value)}
                style={inputStyle}
              >
                <option value="">All Specializations</option>
                <option value="cardiologist">Cardiologist</option>
                <option value="dermatologist">Dermatologist</option>
                <option value="diabetologist">Diabetologist</option>
                <option value="general">General Physician</option>
                <option value="gynecologist">Gynecologist</option>
                <option value="neurologist">Neurologist</option>
                <option value="orthopedic">Orthopedic</option>
                <option value="pulmonologist">Pulmonologist</option>
              </select>
            </label>

            <label style={{ color: colors.navy, fontWeight: 700, fontSize: 13 }}>
              City
              <input
                value={city}
                onChange={e => setCity(e.target.value)}
                placeholder="Enter your city"
                style={inputStyle}
              />
            </label>
          </div>
        </section>

        {/* Available doctors */}
        <section style={{ marginBottom: 35 }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 12,
            marginBottom: 18,
          }}>
            <div>
              <h2 style={headingStyle}>Available Doctors</h2>
              <p style={{ margin: 0, fontSize: 14 }}>
                Choose a healthcare professional for your consultation
              </p>
            </div>

            <button
              type="button"
              onClick={loadData}
              style={{
                ...primaryButton,
                padding: '10px 14px',
              }}
            >
              <RefreshCw size={15} />
              Refresh
            </button>
          </div>

          {loading ? (
            <div style={{ ...sectionStyle, textAlign: 'center', padding: 35 }}>
              <RefreshCw size={28} color={colors.teal} />
              <p>Finding available doctors...</p>
            </div>
          ) : doctors.length === 0 ? (
            <div style={{
              ...sectionStyle,
              textAlign: 'center',
              padding: '38px 20px',
            }}>
              <Stethoscope
                size={42}
                color={colors.blue}
                style={{ marginBottom: 12 }}
              />
              <h3 style={{ color: colors.navy, margin: '0 0 8px' }}>
                No verified doctors available
              </h3>
              <p style={{ fontSize: 14, maxWidth: 470, margin: 'auto' }}>
                No doctors match your search right now. Try another
                specialization or city. If this is unexpected, ask the
                administrator to verify and activate doctor profiles.
              </p>
            </div>
          ) : (
            <>
              <p style={{ color: colors.muted, fontSize: 13, marginBottom: 15 }}>
                {doctors.length} doctor(s) found
              </p>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(255px, 1fr))',
                gap: 19,
              }}>
                {doctors.map(doctor => (
                  <article
                    key={doctor.id}
                    style={{
                      background: '#fff',
                      border: `1px solid ${colors.border}`,
                      borderRadius: 17,
                      padding: 21,
                      boxShadow: '0 5px 18px rgba(22,54,83,0.05)',
                      transition: 'transform .2s, box-shadow .2s',
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 13,
                      marginBottom: 17,
                    }}>
                      <div style={{
                        width: 52,
                        height: 52,
                        borderRadius: 15,
                        background: 'linear-gradient(135deg, #dff1fb, #d8f5eb)',
                        display: 'grid',
                        placeItems: 'center',
                        color: colors.teal,
                        flexShrink: 0,
                      }}>
                        <Stethoscope size={26} />
                      </div>

                      <div>
                        <h3 style={{
                          color: colors.navy,
                          fontSize: 17,
                          margin: 0,
                        }}>
                          Dr. {doctor.name}
                        </h3>
                        <span style={{
                          color: colors.teal,
                          fontWeight: 700,
                          fontSize: 12,
                        }}>
                          <CheckCircle2 size={12} style={{ verticalAlign: 'middle' }} />
                          {' '}Verified Doctor
                        </span>
                      </div>
                    </div>

                    <div style={{
                      background: '#eaf5fb',
                      color: colors.blue,
                      display: 'inline-block',
                      padding: '6px 10px',
                      borderRadius: 7,
                      fontSize: 12,
                      fontWeight: 700,
                      marginBottom: 15,
                    }}>
                      {doctor.specialization_display || doctor.specialization}
                    </div>

                    <div style={{
                      display: 'grid',
                      gap: 11,
                      color: '#536a7e',
                      fontSize: 13,
                      marginBottom: 18,
                    }}>
                      <div style={{ display: 'flex', gap: 9 }}>
                        <GraduationCap size={17} color={colors.blue} />
                        {doctor.qualification || 'Qualification not provided'}
                      </div>

                      <div style={{ display: 'flex', gap: 9 }}>
                        <BriefcaseMedical size={17} color={colors.blue} />
                        {doctor.experience} years experience
                      </div>

                      <div style={{ display: 'flex', gap: 9 }}>
                        <MapPin size={17} color={colors.blue} />
                        {doctor.hospital || 'Hospital not provided'}
                      </div>

                      <div style={{ display: 'flex', gap: 9 }}>
                        <MapPin size={17} color={colors.blue} />
                        {doctor.city || 'Location not provided'}
                      </div>
                    </div>

                    {doctor.bio && (
                      <p style={{
                        fontSize: 13,
                        lineHeight: 1.6,
                        borderTop: `1px solid ${colors.border}`,
                        paddingTop: 12,
                      }}>
                        {doctor.bio}
                      </p>
                    )}

                    <div style={{
                      borderTop: `1px solid ${colors.border}`,
                      paddingTop: 15,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 8,
                      flexWrap: 'wrap',
                    }}>
                      <strong style={{
                        color: colors.navy,
                        fontSize: 17,
                        display: 'flex',
                        alignItems: 'center',
                      }}>
                        <IndianRupee size={16} />
                        {doctor.consultation_fee}
                      </strong>

                      <button
                        type="button"
                        style={primaryButton}
                        onClick={() => {
                          setSelectedDoctor(doctor);
                          setMessage('');
                          setError('');
                        }}
                      >
                        <CalendarCheck size={16} />
                        Book Now
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}
        </section>

        {/* Booking form */}
        {selectedDoctor && (
          <section style={{
            ...sectionStyle,
            marginBottom: 35,
            borderTop: `4px solid ${colors.teal}`,
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 12,
            }}>
              <div>
                <h2 style={headingStyle}>Book Your Appointment</h2>
                <p style={{ margin: 0, fontSize: 14 }}>
                  Booking with Dr. {selectedDoctor.name}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedDoctor(null)}
                aria-label="Close booking form"
                style={{
                  background: '#fff0f0',
                  color: '#c44747',
                  border: 'none',
                  borderRadius: 9,
                  padding: 9,
                  cursor: 'pointer',
                }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={bookAppointment} style={{ marginTop: 20 }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: 17,
              }}>
                <label style={{ color: colors.navy, fontWeight: 700, fontSize: 13 }}>
                  <CalendarDays size={15} style={{ verticalAlign: 'middle' }} />
                  {' '}Appointment Date
                  <input
                    type="date"
                    required
                    min={minDate}
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    style={inputStyle}
                  />
                </label>

                <label style={{ color: colors.navy, fontWeight: 700, fontSize: 13 }}>
                  <Clock size={15} style={{ verticalAlign: 'middle' }} />
                  {' '}Appointment Time
                  <input
                    type="time"
                    required
                    value={time}
                    onChange={e => setTime(e.target.value)}
                    style={inputStyle}
                  />
                </label>
              </div>

              <label style={{ color: colors.navy, fontWeight: 700, fontSize: 13 }}>
                <FileText size={15} style={{ verticalAlign: 'middle' }} />
                {' '}Reason for Appointment
                <textarea
                  rows={4}
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  placeholder="Briefly describe your health concern..."
                  style={{ ...inputStyle, resize: 'vertical' }}
                />
              </label>

              <button type="submit" disabled={booking} style={primaryButton}>
                <CalendarCheck size={17} />
                {booking ? 'Booking Appointment...' : 'Confirm Appointment'}
              </button>

              <button
                type="button"
                onClick={() => setSelectedDoctor(null)}
                style={{
                  ...primaryButton,
                  background: '#edf2f7',
                  color: colors.navy,
                  marginLeft: 10,
                }}
              >
                Cancel
              </button>
            </form>
          </section>
        )}

        {/* My appointments */}
        <section>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            marginBottom: 18,
          }}>
            <div style={{
              background: '#e4f5ef',
              color: colors.teal,
              padding: 11,
              borderRadius: 12,
            }}>
              <CalendarCheck size={22} />
            </div>

            <div>
              <h2 style={{ ...headingStyle, margin: 0 }}>
                My Appointments
              </h2>
              <p style={{ margin: 0, fontSize: 13 }}>
                Track your doctor consultation bookings
              </p>
            </div>
          </div>

          {appointments.length === 0 ? (
            <div style={{
              ...sectionStyle,
              textAlign: 'center',
              padding: '35px 20px',
            }}>
              <CalendarDays
                size={40}
                color={colors.blue}
                style={{ marginBottom: 12 }}
              />
              <h3 style={{ color: colors.navy, margin: '0 0 8px' }}>
                No Appointments Yet
              </h3>
              <p style={{ fontSize: 14, margin: 0 }}>
                Your booked appointments will appear here.
                Choose a doctor above to schedule your first consultation.
              </p>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(270px, 1fr))',
              gap: 17,
            }}>
              {appointments.map(item => {
                const status = statusColors[item.status] || statusColors.PENDING;

                return (
                  <article
                    key={item.id}
                    style={{
                      ...sectionStyle,
                      padding: 20,
                      borderLeft: `4px solid ${colors.teal}`,
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 8,
                      marginBottom: 14,
                      flexWrap: 'wrap',
                    }}>
                      <span style={{
                        fontSize: 12,
                        color: colors.muted,
                        fontWeight: 700,
                      }}>
                        APPOINTMENT #{item.id}
                      </span>

                      <span style={{
                        background: status.bg,
                        color: status.color,
                        borderRadius: 20,
                        padding: '6px 11px',
                        fontSize: 11,
                        fontWeight: 800,
                      }}>
                        {item.status}
                      </span>
                    </div>

                    <h3 style={{
                      color: colors.navy,
                      fontSize: 18,
                      margin: '0 0 14px',
                    }}>
                      Dr. {item.doctor_name}
                    </h3>

                    <div style={{
                      display: 'grid',
                      gap: 10,
                      color: '#536a7e',
                      fontSize: 13,
                    }}>
                      <div style={{ display: 'flex', gap: 9 }}>
                        <CalendarDays size={16} color={colors.blue} />
                        Date: {item.appointment_date}
                      </div>

                      <div style={{ display: 'flex', gap: 9 }}>
                        <Clock size={16} color={colors.blue} />
                        Time: {item.appointment_time}
                      </div>

                      <div style={{ display: 'flex', gap: 9 }}>
                        <FileText size={16} color={colors.blue} />
                        Reason: {item.reason || 'Not provided'}
                      </div>
                    </div>

                    {item.consultation_notes && (
                      <div style={{
                        marginTop: 14,
                        padding: 12,
                        background: '#f0f7fb',
                        borderRadius: 9,
                        fontSize: 13,
                      }}>
                        <strong style={{ color: colors.navy }}>
                          Doctor's Notes
                        </strong>
                        <p style={{ margin: '5px 0 0' }}>
                          {item.consultation_notes}
                        </p>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
