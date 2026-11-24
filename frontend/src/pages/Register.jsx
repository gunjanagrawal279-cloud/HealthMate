
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password must contain at least 8 characters.');
      return;
    }

    setLoading(true);

    try {
      await register(
        username.trim(),
        email.trim(),
        password
      );

      navigate('/dashboard');
    } catch (err) {
      setError(
        err.message || 'Registration failed. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      padding: '3rem 1rem'
    }}>
      <div className="card" style={{
        maxWidth: '400px',
        width: '100%'
      }}>
        <h2 style={{
          color: 'var(--navy)',
          marginTop: 0
        }}>
          Create Account
        </h2>

        <p style={{
          color: 'var(--text-muted)',
          marginTop: '-0.5rem'
        }}>
          Start understanding your health reports
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{
              fontWeight: 600,
              fontSize: '0.9rem'
            }}>
              Username
            </label>

            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoComplete="username"
              style={{
                width: '100%',
                padding: '0.65rem',
                marginTop: '0.3rem'
              }}
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{
              fontWeight: 600,
              fontSize: '0.9rem'
            }}>
              Email
            </label>

            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              style={{
                width: '100%',
                padding: '0.65rem',
                marginTop: '0.3rem'
              }}
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{
              fontWeight: 600,
              fontSize: '0.9rem'
            }}>
              Password
            </label>

            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
              style={{
                width: '100%',
                padding: '0.65rem',
                marginTop: '0.3rem'
              }}
            />
          </div>

          {error && (
            <p
              role="alert"
              style={{
                color: 'var(--danger)',
                fontSize: '0.9rem'
              }}
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '0.75rem',
              marginTop: '0.5rem',
              opacity: loading ? 0.7 : 1,
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? 'Creating account...' : 'Register'}
          </button>
        </form>

        <p style={{
          marginTop: '1.2rem',
          textAlign: 'center',
          fontSize: '0.9rem'
        }}>
          Already have an account? <Link to="/login">Login</Link>
        </p>
      </div>
    </div>
  );
}
