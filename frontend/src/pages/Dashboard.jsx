import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useState, useEffect } from 'react';
import api from '../services/api';
import {
  Upload,
  FileText,
  UserRound,
  Clock3,
  GitCompare,
  Activity,
  Brain,
  TrendingUp,
  AlertCircle,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api.get('/dashboard/').then((res) => setStats(res.data));
  }, []);

  const latestReport = stats?.recent_reports?.[0];

  return (
    <div
      className="page"
      style={{
        paddingBottom: '3rem',
      }}
    >
      {/* HERO / WELCOME */}
      <section
        style={{
          background:
            'linear-gradient(135deg, var(--navy) 0%, #24456f 65%, #3f9189 100%)',
          borderRadius: '20px',
          padding: '2rem',
          color: '#fff',
          marginBottom: '1.5rem',
          boxShadow: '0 12px 30px rgba(18, 45, 75, 0.16)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            width: '180px',
            height: '180px',
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.07)',
            right: '-55px',
            top: '-65px',
          }}
        />

        <div
          style={{
            position: 'absolute',
            width: '120px',
            height: '120px',
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.05)',
            right: '100px',
            bottom: '-75px',
          }}
        />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.4rem 0.75rem',
              borderRadius: '999px',
              background: 'rgba(255,255,255,0.12)',
              fontSize: '0.85rem',
              marginBottom: '0.9rem',
            }}
          >
            <Sparkles size={15} />
            AI HealthMate
          </div>

          <h1
            style={{
              margin: '0 0 0.5rem',
              color: '#fff',
              fontSize: 'clamp(1.7rem, 4vw, 2.35rem)',
            }}
          >
            Welcome back, {user?.username || 'there'} 👋
          </h1>

          <p
            style={{
              margin: 0,
              maxWidth: '650px',
              lineHeight: 1.7,
              color: 'rgba(255,255,255,0.86)',
            }}
          >
            Keep your health reports organized, review your AI analysis, and
            track your report history from one place.
          </p>

          <Link
            to="/upload"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginTop: '1.25rem',
              padding: '0.75rem 1.15rem',
              borderRadius: '10px',
              background: '#fff',
              color: 'var(--navy)',
              textDecoration: 'none',
              fontWeight: 700,
            }}
          >
            <Upload size={17} />
            Upload New Report
            <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      {/* OVERVIEW */}
      {stats && (
        <section
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
            gap: '1rem',
            marginBottom: '1.5rem',
          }}
        >
          <div
            className="card"
            style={{
              padding: '1.25rem',
              borderTop: '4px solid var(--teal)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
              }}
            >
              <div>
                <div
                  style={{
                    color: 'var(--text-muted)',
                    fontSize: '0.9rem',
                  }}
                >
                  Total Reports
                </div>

                <div
                  style={{
                    fontSize: '2rem',
                    fontWeight: 800,
                    color: 'var(--navy)',
                    marginTop: '0.35rem',
                  }}
                >
                  {stats.total_reports}
                </div>
              </div>

              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '12px',
                  background: 'rgba(63,145,137,0.12)',
                  display: 'grid',
                  placeItems: 'center',
                  color: 'var(--teal)',
                }}
              >
                <FileText size={21} />
              </div>
            </div>
          </div>

          <div
            className="card"
            style={{
              padding: '1.25rem',
              borderTop: '4px solid var(--emerald)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
              }}
            >
              <div>
                <div
                  style={{
                    color: 'var(--text-muted)',
                    fontSize: '0.9rem',
                  }}
                >
                  AI Analyzed
                </div>

                <div
                  style={{
                    fontSize: '2rem',
                    fontWeight: 800,
                    color: 'var(--navy)',
                    marginTop: '0.35rem',
                  }}
                >
                  {stats.analyzed_reports}
                </div>
              </div>

              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '12px',
                  background: 'rgba(22,163,74,0.10)',
                  display: 'grid',
                  placeItems: 'center',
                  color: 'var(--emerald)',
                }}
              >
                <Brain size={21} />
              </div>
            </div>
          </div>

          <div
            className="card"
            style={{
              padding: '1.25rem',
              borderTop: '4px solid var(--danger)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
              }}
            >
              <div>
                <div
                  style={{
                    color: 'var(--text-muted)',
                    fontSize: '0.9rem',
                  }}
                >
                  Range Observations
                </div>

                <div
                  style={{
                    fontSize: '2rem',
                    fontWeight: 800,
                    color: 'var(--navy)',
                    marginTop: '0.35rem',
                  }}
                >
                  {stats.abnormal_observations}
                </div>
              </div>

              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '12px',
                  background: 'rgba(220,38,38,0.09)',
                  display: 'grid',
                  placeItems: 'center',
                  color: 'var(--danger)',
                }}
              >
                <AlertCircle size={21} />
              </div>
            </div>
          </div>

          <div
            className="card"
            style={{
              padding: '1.25rem',
              borderTop: '4px solid var(--navy)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
              }}
            >
              <div>
                <div
                  style={{
                    color: 'var(--text-muted)',
                    fontSize: '0.9rem',
                  }}
                >
                  Trackable Trends
                </div>

                <div
                  style={{
                    fontSize: '2rem',
                    fontWeight: 800,
                    color: 'var(--navy)',
                    marginTop: '0.35rem',
                  }}
                >
                  {stats.trends_available}
                </div>
              </div>

              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '12px',
                  background: 'rgba(30,58,95,0.09)',
                  display: 'grid',
                  placeItems: 'center',
                  color: 'var(--navy)',
                }}
              >
                <TrendingUp size={21} />
              </div>
            </div>
          </div>
        </section>
      )}

      {/* AI ASSISTANT + LATEST REPORT */}
      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '1.25rem',
          marginBottom: '1.5rem',
        }}
      >
        <div
          className="card"
          style={{
            padding: '1.5rem',
            background:
              'linear-gradient(135deg, rgba(63,145,137,0.10), rgba(255,255,255,1))',
          }}
        >
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '13px',
              background: 'rgba(63,145,137,0.14)',
              color: 'var(--teal)',
              display: 'grid',
              placeItems: 'center',
              marginBottom: '1rem',
            }}
          >
            <Brain size={23} />
          </div>

          <h3
            style={{
              margin: '0 0 0.45rem',
              color: 'var(--navy)',
            }}
          >
            AI Health Assistant
          </h3>

          <p
            style={{
              margin: 0,
              color: 'var(--text-muted)',
              lineHeight: 1.65,
            }}
          >
            Upload a health report to organize its results and view the
            available AI-powered analysis in your account.
          </p>

          <Link
            to="/upload"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              marginTop: '1rem',
              color: 'var(--teal)',
              fontWeight: 700,
              textDecoration: 'none',
            }}
          >
            Analyze a report <ArrowRight size={16} />
          </Link>
        </div>

        <div className="card" style={{ padding: '1.5rem' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: '1rem',
              alignItems: 'flex-start',
            }}
          >
            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  color: 'var(--teal)',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  marginBottom: '0.45rem',
                }}
              >
                <Activity size={16} />
                LATEST REPORT
              </div>

              <h3
                style={{
                  margin: 0,
                  color: 'var(--navy)',
                }}
              >
                {latestReport?.title || 'No report available'}
              </h3>
            </div>

            {latestReport && (
              <span
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  padding: '0.35rem 0.55rem',
                  borderRadius: '999px',
                  background: 'rgba(22,163,74,0.10)',
                  color: 'var(--emerald)',
                  whiteSpace: 'nowrap',
                }}
              >
                {latestReport.analysis_status}
              </span>
            )}
          </div>

          {latestReport ? (
            <>
              <p
                style={{
                  color: 'var(--text-muted)',
                  margin: '0.75rem 0 1rem',
                }}
              >
                Open your latest uploaded report to review its available
                details.
              </p>

              <Link
                to={`/documents/${latestReport.id}`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  color: 'var(--navy)',
                  fontWeight: 700,
                  textDecoration: 'none',
                }}
              >
                View Latest Report <ArrowRight size={16} />
              </Link>
            </>
          ) : (
            <Link
              to="/upload"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                marginTop: '1rem',
                color: 'var(--teal)',
                fontWeight: 700,
                textDecoration: 'none',
              }}
            >
              Upload your first report <ArrowRight size={16} />
            </Link>
          )}
        </div>
      </section>

      {/* HEALTH INSIGHTS */}
      {stats?.insights?.length > 0 && (
        <div
          className="card"
          style={{
            marginBottom: '1.5rem',
            padding: '1.5rem',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.65rem',
              marginBottom: '1rem',
            }}
          >
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '11px',
                background: 'rgba(63,145,137,0.12)',
                color: 'var(--teal)',
                display: 'grid',
                placeItems: 'center',
              }}
            >
              <Activity size={20} />
            </div>

            <div>
              <h3
                style={{
                  margin: 0,
                  color: 'var(--navy)',
                }}
              >
                Health Insights
              </h3>

              <p
                style={{
                  margin: '0.2rem 0 0',
                  color: 'var(--text-muted)',
                  fontSize: '0.85rem',
                }}
              >
                Based on your available report data
              </p>
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gap: '0.65rem',
            }}
          >
            {stats.insights.map((insight, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  gap: '0.65rem',
                  alignItems: 'flex-start',
                  padding: '0.75rem',
                  borderRadius: '10px',
                  background: 'var(--background, #f8fafc)',
                }}
              >
                <span
                  style={{
                    width: '7px',
                    height: '7px',
                    minWidth: '7px',
                    borderRadius: '50%',
                    background: 'var(--teal)',
                    marginTop: '0.5rem',
                  }}
                />

                <span
                  style={{
                    color: 'var(--text)',
                    lineHeight: 1.55,
                  }}
                >
                  {insight}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* QUICK ACTIONS */}
      <div
        className="card"
        style={{
          marginBottom: '1.5rem',
          padding: '1.5rem',
        }}
      >
        <h3
          style={{
            margin: '0 0 1rem',
            color: 'var(--navy)',
          }}
        >
          Quick Actions
        </h3>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
            gap: '0.75rem',
          }}
        >
          <Link to="/upload" style={{ textDecoration: 'none' }}>
            <button
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.45rem',
              }}
            >
              <Upload size={17} />
              Upload Report
            </button>
          </Link>

          <Link to="/documents" style={{ textDecoration: 'none' }}>
            <button
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                background: 'var(--navy)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.45rem',
              }}
            >
              <FileText size={17} />
              My Reports
            </button>
          </Link>

          <Link to="/profile" style={{ textDecoration: 'none' }}>
            <button
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                background: 'var(--navy)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.45rem',
              }}
            >
              <UserRound size={17} />
              Health Profile
            </button>
          </Link>

          <Link to="/timeline" style={{ textDecoration: 'none' }}>
            <button
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                background: 'var(--navy)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.45rem',
              }}
            >
              <Clock3 size={17} />
              Timeline
            </button>
          </Link>

          <Link to="/compare" style={{ textDecoration: 'none' }}>
            <button
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                background: 'var(--navy)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.45rem',
              }}
            >
              <GitCompare size={17} />
              Compare Reports
            </button>
          </Link>
        </div>
      </div>

      {/* TREND PREVIEW */}
      {stats && (
        <div
          className="card"
          style={{
            marginBottom: '1.5rem',
            padding: '1.5rem',
            background:
              'linear-gradient(135deg, rgba(30,58,95,0.04), rgba(63,145,137,0.08))',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: '1rem',
              alignItems: 'center',
              flexWrap: 'wrap',
            }}
          >
            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.55rem',
                }}
              >
                <TrendingUp size={21} color="var(--teal)" />

                <h3
                  style={{
                    margin: 0,
                    color: 'var(--navy)',
                  }}
                >
                  Health Trends
                </h3>
              </div>

              <p
                style={{
                  margin: '0.5rem 0 0',
                  color: 'var(--text-muted)',
                }}
              >
                {stats.trends_available > 0
                  ? `${stats.trends_available} parameters have enough history to show a trend.`
                  : 'Upload and analyze more reports to build health trends.'}
              </p>
            </div>

            <Link
              to="/progress"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                textDecoration: 'none',
                color: 'var(--navy)',
                fontWeight: 700,
                padding: '0.65rem 0.9rem',
                border: '1px solid var(--border)',
                borderRadius: '9px',
                background: '#fff',
              }}
            >
              View Progress
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      )}

      {/* RECENT REPORTS */}
      {stats?.recent_reports?.length > 0 ? (
        <div
          className="card"
          style={{
            padding: '1.5rem',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '1rem',
              marginBottom: '0.75rem',
            }}
          >
            <div>
              <h3
                style={{
                  margin: 0,
                  color: 'var(--navy)',
                }}
              >
                Recent Reports
              </h3>

              <p
                style={{
                  margin: '0.25rem 0 0',
                  color: 'var(--text-muted)',
                  fontSize: '0.85rem',
                }}
              >
                Your latest uploaded health documents
              </p>
            </div>

            <Link
              to="/documents"
              style={{
                color: 'var(--teal)',
                textDecoration: 'none',
                fontWeight: 700,
                fontSize: '0.9rem',
              }}
            >
              View All
            </Link>
          </div>

          {stats.recent_reports.map((r) => (
            <div
              key={r.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '1rem',
                padding: '0.9rem 0',
                borderBottom: '1px solid var(--border)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  minWidth: 0,
                }}
              >
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    minWidth: '38px',
                    borderRadius: '10px',
                    background: 'rgba(63,145,137,0.10)',
                    color: 'var(--teal)',
                    display: 'grid',
                    placeItems: 'center',
                  }}
                >
                  <FileText size={18} />
                </div>

                <Link
                  to={`/documents/${r.id}`}
                  style={{
                    color: 'var(--navy)',
                    fontWeight: 600,
                    textDecoration: 'none',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {r.title}
                </Link>
              </div>

              <span
                style={{
                  color:
                    r.analysis_status === 'ANALYZED'
                      ? 'var(--emerald)'
                      : 'var(--text-muted)',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  whiteSpace: 'nowrap',
                }}
              >
                {r.analysis_status}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div
          className="card"
          style={{
            marginTop: '0.5rem',
            textAlign: 'center',
            padding: '2.5rem 1.5rem',
          }}
        >
          <FileText
            size={40}
            color="var(--teal)"
            style={{ marginBottom: '0.75rem' }}
          />

          <h3 style={{ color: 'var(--navy)', margin: '0 0 0.4rem' }}>
            No health reports yet
          </h3>

          <p style={{ color: 'var(--text-muted)', marginTop: 0 }}>
            Upload your first report to start building your health dashboard.
          </p>

          <Link to="/upload">
            <button style={{ padding: '0.7rem 1.4rem' }}>
              <Upload size={16} style={{ marginRight: '0.35rem' }} />
              Upload Your First Report
            </button>
          </Link>
        </div>
      )}
    </div>
  );
}