
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Upload,
  FileText,
  TrendingUp,
  User,
  LogOut,
  HeartPulse,
  Clock,
  GitCompareArrows,
  Stethoscope
} from 'lucide-react';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const patientLinks = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/upload', label: 'Upload', icon: Upload },
    { to: '/documents', label: 'My Reports', icon: FileText },
    { to: '/doctors', label: 'Doctors', icon: Stethoscope },
    { to: '/progress', label: 'Progress', icon: TrendingUp },
    { to: '/timeline', label: 'Timeline', icon: Clock },
    { to: '/profile', label: 'Profile', icon: User },
    { to: '/compare', label: 'Compare', icon: GitCompareArrows },
  ];

  const doctorLinks = [
    { to: '/doctor-dashboard', label: 'Doctor Dashboard', icon: LayoutDashboard },
  ];

  const links = user?.role === 'doctor' ? doctorLinks : patientLinks;

  const linkStyle = (active) => ({
    display: 'flex',
    alignItems: 'center',
    gap: '7px',
    color: active ? '#ffffff' : '#c3d3df',
    background: active
      ? 'rgba(22, 160, 133, 0.22)'
      : 'transparent',
    border: active
      ? '1px solid rgba(22, 160, 133, 0.35)'
      : '1px solid transparent',
    textDecoration: 'none',
    fontSize: '13px',
    fontWeight: active ? 700 : 500,
    padding: '9px 12px',
    borderRadius: '9px',
    whiteSpace: 'nowrap',
    transition: 'all 0.2s ease',
  });

  return (
    <nav
      style={{
        background: 'linear-gradient(110deg, #102b45, #163f5c)',
        color: 'white',
        padding: '10px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px',
        boxShadow: '0 4px 18px rgba(16, 43, 69, 0.18)',
        position: 'sticky',
        top: 0,
        zIndex: 1000,
        borderBottom: '2px solid #16a085',
      }}
    >
      <Link
        to={user?.role === 'doctor' ? '/doctor-dashboard' : user ? '/dashboard' : '/login'}
        style={{
          color: '#ffffff',
          fontWeight: 800,
          fontSize: '21px',
          textDecoration: 'none',
          display: 'flex',
          alignItems: 'center',
          gap: '9px',
          fontFamily: 'Manrope, sans-serif',
          letterSpacing: '-0.5px',
        }}
      >
        <span
          style={{
            background: '#16a085',
            width: '38px',
            height: '38px',
            borderRadius: '11px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <HeartPulse size={23} color="white" />
        </span>
        AI <span style={{ color: '#5de0c0', marginLeft: '-6px' }}>Health</span>
      </Link>

      {user ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            flexWrap: 'wrap',
            justifyContent: 'center',
          }}
        >
          {links.map(({ to, label, icon: Icon }) => {
            const active =
              location.pathname === to ||
              location.pathname.startsWith(to + '/');

            return (
              <Link
                key={to}
                to={to}
                style={linkStyle(active)}
              >
                <Icon size={16} />
                <span>{label}</span>
              </Link>
            );
          })}

          <button
            onClick={handleLogout}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '7px',
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.2)',
              color: '#ffffff',
              padding: '9px 13px',
              borderRadius: '9px',
              marginLeft: '6px',
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            <LogOut size={15} />
            Logout
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Link
            to="/login"
            style={linkStyle(location.pathname === '/login')}
          >
            Login
          </Link>

          <Link
            to="/register"
            style={{
              ...linkStyle(location.pathname === '/register'),
              background: '#16a085',
              color: 'white',
              border: '1px solid #16a085',
            }}
          >
            Register
          </Link>
        </div>
      )}
    </nav>
  );
}
