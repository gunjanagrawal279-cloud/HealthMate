import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, Upload, FileText, TrendingUp, User, LogOut, HeartPulse, Clock, GitCompareArrows } from 'lucide-react';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

    const links = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/upload', label: 'Upload', icon: Upload },
    { to: '/documents', label: 'My Reports', icon: FileText },
    { to: '/progress', label: 'Progress', icon: TrendingUp },
    { to: '/timeline', label: 'Timeline', icon: Clock },
    { to: '/profile', label: 'Profile', icon: User },
    { to: '/compare', label: 'Compare', icon: GitCompareArrows }, 
  ];
  return (
    <nav style={{
      background: 'var(--navy)',
      color: 'white',
      padding: '0 1.5rem',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      flexWrap: 'wrap',
      boxShadow: '0 2px 10px rgba(0,0,0,0.15)',
      position: 'sticky',
      top: 0,
      zIndex: 100,
    }}>
      <Link to={user ? '/dashboard' : '/login'} style={{
        color: 'white', fontWeight: 700, fontSize: '1.15rem', textDecoration: 'none',
        display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.9rem 0',
      }}>
        <HeartPulse size={22} color="var(--emerald)" />
        AI Health
      </Link>

      {user ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', flexWrap: 'wrap' }}>
          {links.map(({ to, label, icon: Icon }) => {
            const active = location.pathname === to;
            return (
              <Link key={to} to={to} style={{
                display: 'flex', alignItems: 'center', gap: '0.4rem',
                color: active ? 'white' : '#94a3b8',
                background: active ? 'rgba(255,255,255,0.12)' : 'transparent',
                textDecoration: 'none', fontSize: '0.88rem', fontWeight: 500,
                padding: '0.5rem 0.75rem', borderRadius: '8px',
                transition: 'background 0.15s ease, color 0.15s ease',
              }}>
                <Icon size={16} />
                <span>{label}</span>
              </Link>
            );
          })}
          <button onClick={handleLogout} style={{
            display: 'flex', alignItems: 'center', gap: '0.4rem',
            background: 'transparent', border: '1px solid rgba(255,255,255,0.3)',
            color: 'white', padding: '0.5rem 0.9rem', marginLeft: '0.75rem',
            fontSize: '0.85rem',
          }}>
            <LogOut size={15} />
            Logout
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: '1rem', padding: '0.9rem 0' }}>
          <Link to="/login" style={{ color: '#cbd5e1', textDecoration: 'none' }}>Login</Link>
          <Link to="/register" style={{ color: '#cbd5e1', textDecoration: 'none' }}>Register</Link>
        </div>
      )}
    </nav>
  );
}