
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import {
  Activity,
  TrendingUp,
  TrendingDown,
  Minus,
  FlaskConical,
  CalendarDays,
  FileText,
  HeartPulse,
  Upload,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  BarChart3,
  Clock,
} from 'lucide-react';

function TrendCard({ name, points }) {
  if (!Array.isArray(points) || points.length === 0) return null;

  const values = points.map(point => Number(point.value));
  const firstValue = values[0];
  const latestValue = values[values.length - 1];
  const difference = latestValue - firstValue;

  const maxValue = Math.max(...values);
  const minValue = Math.min(...values);
  const range = maxValue - minValue || 1;

  const chartWidth = 600;
  const chartHeight = 220;
  const paddingX = 45;
  const paddingY = 30;

  const getX = index => {
    if (points.length === 1) return chartWidth / 2;

    return paddingX +
      (index * (chartWidth - paddingX * 2)) /
      (points.length - 1);
  };

  const getY = value =>
    chartHeight - paddingY -
    ((value - minValue) / range) *
    (chartHeight - paddingY * 2);

  const polylinePoints = points
    .map((point, index) =>
      `${getX(index)},${getY(Number(point.value))}`
    )
    .join(' ');

  const changeText = difference > 0
    ? `+${difference.toFixed(1)}`
    : difference.toFixed(1);

  const ChangeIcon = difference > 0
    ? TrendingUp
    : difference < 0
      ? TrendingDown
      : Minus;

  return (
    <article className="progress-card">
      <div className="progress-card-header">
        <div className="test-heading">
          <div className="test-icon">
            <FlaskConical size={23} />
          </div>
          <div>
            <h3>{name}</h3>
            <p>Historical test values</p>
          </div>
        </div>

        <span className="progress-count">
          {points.length} tests
        </span>
      </div>

      <div className="progress-summary">
        <div className="progress-stat">
          <span>First Value</span>
          <strong>
            {firstValue} {points[0].unit}
          </strong>
        </div>

        <div className="progress-stat">
          <span>Latest Value</span>
          <strong>
            {latestValue} {points[points.length - 1].unit}
          </strong>
        </div>

        <div className="progress-stat">
          <span>Change</span>
          <strong className="change-value">
            <ChangeIcon size={16} />
            {changeText}
          </strong>
        </div>
      </div>

      <div className="progress-chart-wrapper">
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          className="progress-chart"
          preserveAspectRatio="none"
          role="img"
          aria-label={`${name} historical values chart`}
        >
          {[paddingY, chartHeight / 2, chartHeight - paddingY].map(
            (y, index) => (
              <line
                key={index}
                x1={paddingX}
                y1={y}
                x2={chartWidth - paddingX}
                y2={y}
                className="chart-grid"
              />
            )
          )}

          {points.length > 1 && (
            <polyline
              points={polylinePoints}
              fill="none"
              className="chart-line"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {points.map((point, index) => (
            <g key={`${point.date}-${index}`}>
              <circle
                cx={getX(index)}
                cy={getY(Number(point.value))}
                r="7"
                className="chart-point"
              />

              <text
                x={getX(index)}
                y={getY(Number(point.value)) - 15}
                textAnchor="middle"
                className="chart-value"
              >
                {point.value}
              </text>
            </g>
          ))}
        </svg>

        <div className="chart-dates">
          {points.map((point, index) => (
            <span key={`${point.date}-label-${index}`}>
              {new Date(point.date).toLocaleDateString(
                undefined,
                { month: 'short', day: 'numeric' }
              )}
            </span>
          ))}
        </div>
      </div>

      <div className="progress-history">
        <h4>Test History</h4>

        {points.map((point, index) => (
          <div
            className="history-row"
            key={`${point.date}-${index}`}
          >
            <div className="history-date">
              <CalendarDays size={15} />
              <div>
                <strong>
                  {new Date(point.date).toLocaleDateString(
                    undefined,
                    {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    }
                  )}
                </strong>
                <span>{point.status}</span>
              </div>
            </div>

            <strong className="history-value">
              {point.value} {point.unit}
            </strong>
          </div>
        ))}
      </div>
    </article>
  );
}

export default function Progress() {
  const [trends, setTrends] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadProgress = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await api.get('/dashboard/progress/');
      setTrends(response.data?.trends || {});
    } catch (err) {
      console.error('Progress error:', err);

      setError(
        err.response?.data?.detail ||
        'Could not load your health progress. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProgress();
  }, []);

  const testNames = Object.keys(trends);

  const totalRecords = testNames.reduce(
    (total, name) =>
      total + (Array.isArray(trends[name]) ? trends[name].length : 0),
    0
  );

  const allPoints = testNames.flatMap(name =>
    Array.isArray(trends[name]) ? trends[name] : []
  );

  const normalCount = allPoints.filter(
    point => String(point.status).toLowerCase() === 'normal'
  ).length;

  const attentionCount = allPoints.filter(point =>
    ['high', 'low'].includes(String(point.status).toLowerCase())
  ).length;

  const latestDate = allPoints.length
    ? allPoints
        .map(point => new Date(point.date))
        .filter(date => !Number.isNaN(date.getTime()))
        .sort((a, b) => b - a)[0]
    : null;

  if (loading) {
    return (
      <div className="progress-page">
        <div className="progress-loading">
          <div className="progress-spinner" />
          <h3>Preparing your health dashboard...</h3>
          <p>Loading your medical report history</p>
        </div>
        <style>{styles}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div className="progress-page">
        <div className="progress-hero">
          <div>
            <span className="hero-label">HEALTH ANALYTICS</span>
            <h1>My Health Progress</h1>
            <p>Track your health journey over time.</p>
          </div>
          <Activity size={65} />
        </div>

        <div className="progress-error">
          <AlertCircle size={36} />
          <h2>Unable to load progress</h2>
          <p>{error}</p>
          <button onClick={loadProgress} className="upload-button">
            <RefreshCw size={17} /> Try Again
          </button>
        </div>

        <style>{styles}</style>
      </div>
    );
  }

  return (
    <div className="progress-page">

      {/* Hero */}
      <section className="progress-hero">
        <div className="hero-content">
          <span className="hero-label">
            <HeartPulse size={15} />
            YOUR PERSONAL HEALTH ANALYTICS
          </span>

          <h1>My Health Progress</h1>

          <p>
            Understand your health journey through your medical
            reports and historical test results.
          </p>

          <Link to="/upload" className="hero-button">
            <Upload size={17} />
            Upload New Report
          </Link>
        </div>

        <div className="hero-decoration">
          <Activity size={115} />
        </div>
      </section>

      {/* Overview */}
      <section className="overview-section">
        <div className="section-heading">
          <div>
            <h2>Health Overview</h2>
            <p>A summary of your available historical test data</p>
          </div>
        </div>

        <div className="overview-grid">
          <div className="overview-card blue-card">
            <div className="overview-icon">
              <FlaskConical size={23} />
            </div>
            <span>Tracked Tests</span>
            <strong>{testNames.length}</strong>
            <small>Different test parameters</small>
          </div>

          <div className="overview-card teal-card">
            <div className="overview-icon">
              <FileText size={23} />
            </div>
            <span>Historical Records</span>
            <strong>{totalRecords}</strong>
            <small>Recorded test values</small>
          </div>

          <div className="overview-card green-card">
            <div className="overview-icon">
              <CheckCircle2 size={23} />
            </div>
            <span>Normal Results</span>
            <strong>{normalCount}</strong>
            <small>Results marked normal</small>
          </div>

          <div className="overview-card orange-card">
            <div className="overview-icon">
              <AlertCircle size={23} />
            </div>
            <span>Needs Attention</span>
            <strong>{attentionCount}</strong>
            <small>Results marked high or low</small>
          </div>
        </div>
      </section>

      {/* Latest activity */}
      <section className="latest-section">
        <div className="latest-card">
          <div className="latest-icon">
            <Clock size={22} />
          </div>
          <div>
            <span>Latest Recorded Test</span>
            <strong>
              {latestDate
                ? latestDate.toLocaleDateString(undefined, {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })
                : 'No test records yet'}
            </strong>
          </div>
        </div>
      </section>

      {/* Trends */}
      <section className="trends-section">
        <div className="section-heading">
          <div>
            <h2>Health Trends</h2>
            <p>Visualize how repeated test values change over time</p>
          </div>
          <div className="heading-icon">
            <BarChart3 size={23} />
          </div>
        </div>

        {testNames.length === 0 ? (
          <div className="progress-empty">
            <div className="empty-icon">
              <Activity size={42} />
            </div>

            <span className="empty-label">YOUR HEALTH JOURNEY</span>

            <h2>Your Health Story Starts Here!</h2>

            <p>
              Upload and analyze your medical reports to see
              your health trends, track test values and monitor
              changes over time.
            </p>

            <div className="empty-features">
              <div>
                <span>📊</span>
                <strong>Health Trends</strong>
                <small>Visualize your test results</small>
              </div>

              <div>
                <span>🧪</span>
                <strong>Test History</strong>
                <small>Track previous test values</small>
              </div>

              <div>
                <span>💚</span>
                <strong>Health Tracking</strong>
                <small>Monitor changes over time</small>
              </div>
            </div>

            <Link to="/upload" className="upload-button">
              <Upload size={17} />
              Upload Medical Report
            </Link>
          </div>
        ) : (
          <div>
            {testNames.map(name => (
              <TrendCard
                key={name}
                name={name}
                points={trends[name]}
              />
            ))}
          </div>
        )}
      </section>

      {/* Footer note */}
      <div className="progress-note">
        <HeartPulse size={19} />
        <p>
          These charts display historical test values from your
          analyzed reports. Changes in values do not necessarily
          indicate improvement or deterioration. Consult a qualified
          healthcare professional for medical interpretation.
        </p>
      </div>

      <style>{styles}</style>
    </div>
  );
}

const styles = `
.progress-page {
  max-width: 1160px;
  margin: auto;
  padding: 30px 22px 55px;
  color: #26394b;
}

.progress-hero {
  position: relative;
  overflow: hidden;
  display: flex;
  justify-content: space-between;
  align-items: center;
  min-height: 220px;
  padding: 35px;
  margin-bottom: 30px;
  border-radius: 22px;
  color: white;
  background: linear-gradient(115deg, #163653, #2477a8 65%, #16a085);
  box-shadow: 0 12px 30px rgba(22,54,83,0.15);
}

.hero-content {
  position: relative;
  z-index: 1;
  max-width: 650px;
}

.hero-label {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 7px 12px;
  border-radius: 30px;
  background: rgba(255,255,255,0.15);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 1px;
}

.progress-hero h1 {
  margin: 16px 0 9px;
  color: white;
  font-size: clamp(27px, 4vw, 37px);
}

.progress-hero p {
  max-width: 550px;
  color: #e2f0f7;
  font-size: 14px;
  line-height: 1.7;
}

.hero-decoration {
  position: absolute;
  right: 55px;
  bottom: 15px;
  color: white;
  opacity: 0.13;
}

.hero-button,
.upload-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  padding: 12px 19px;
  margin-top: 12px;
  border: none;
  border-radius: 10px;
  background: #ffffff;
  color: #163653;
  text-decoration: none;
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;
  transition: 0.2s;
}

.hero-button:hover {
  background: #e8f7f3;
  color: #147e69;
  transform: translateY(-2px);
}

.upload-button {
  background: linear-gradient(120deg, #2477a8, #16a085);
  color: white;
}

.upload-button:hover {
  color: white;
  transform: translateY(-2px);
  box-shadow: 0 7px 18px rgba(22,160,133,0.2);
}

.section-heading {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 17px;
}

.section-heading h2 {
  color: #163653;
  font-size: 21px;
  margin: 0 0 5px;
}

.section-heading p {
  color: #74869a;
  font-size: 13px;
  margin: 0;
}

.overview-section {
  margin-bottom: 30px;
}

.overview-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
}

.overview-card {
  padding: 19px;
  background: white;
  border: 1px solid #e5edf4;
  border-radius: 17px;
  box-shadow: 0 5px 20px rgba(22,54,83,0.045);
  transition: 0.2s;
}

.overview-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 10px 24px rgba(22,54,83,0.09);
}

.overview-icon {
  display: grid;
  place-items: center;
  width: 43px;
  height: 43px;
  border-radius: 12px;
  margin-bottom: 14px;
}

.overview-card > span {
  display: block;
  color: #74869a;
  font-size: 12px;
  font-weight: 600;
}

.overview-card > strong {
  display: block;
  color: #163653;
  font-size: 29px;
  margin: 4px 0;
}

.overview-card small {
  color: #8494a5;
  font-size: 11px;
}

.blue-card .overview-icon {
  background: #e9f3fc;
  color: #2477a8;
}

.teal-card .overview-icon {
  background: #e3f7f2;
  color: #16a085;
}

.green-card .overview-icon {
  background: #e6f7ed;
  color: #159b76;
}

.orange-card .overview-icon {
  background: #fff3e5;
  color: #c47b25;
}

.latest-section {
  margin-bottom: 32px;
}

.latest-card {
  display: flex;
  align-items: center;
  gap: 14px;
  background: white;
  border: 1px solid #e5edf4;
  border-radius: 15px;
  padding: 17px 20px;
}

.latest-icon {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: #e8f5fb;
  color: #2477a8;
}

.latest-card span {
  display: block;
  color: #74869a;
  font-size: 12px;
}

.latest-card strong {
  display: block;
  color: #163653;
  margin-top: 3px;
  font-size: 15px;
}

.trends-section {
  margin-bottom: 25px;
}

.heading-icon {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: #e5f6f0;
  color: #16a085;
}

.progress-card {
  background: white;
  border: 1px solid #e5edf4;
  border-radius: 19px;
  padding: 23px;
  margin-bottom: 20px;
  box-shadow: 0 6px 22px rgba(22,54,83,0.05);
}

.progress-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.test-heading {
  display: flex;
  align-items: center;
  gap: 12px;
}

.test-icon {
  display: grid;
  place-items: center;
  width: 46px;
  height: 46px;
  border-radius: 13px;
  background: #e7f5f1;
  color: #16a085;
}

.progress-card h3 {
  color: #163653;
  font-size: 17px;
  margin: 0;
}

.progress-card-header p {
  color: #74869a;
  font-size: 12px;
  margin: 3px 0 0;
}

.progress-count {
  padding: 7px 12px;
  border-radius: 30px;
  background: #e9f3fb;
  color: #2477a8;
  font-size: 11px;
  font-weight: 800;
}

.progress-summary {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin: 22px 0;
}

.progress-stat {
  padding: 15px;
  background: #f3f8fc;
  border-radius: 12px;
}

.progress-stat span {
  display: block;
  color: #74869a;
  font-size: 11px;
  margin-bottom: 7px;
}

.progress-stat strong {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #163653;
  font-size: 15px;
}

.change-value {
  color: #2477a8 !important;
}

.progress-chart-wrapper {
  width: 100%;
  overflow-x: auto;
  padding-top: 8px;
}

.progress-chart {
  display: block;
  width: 100%;
  min-width: 500px;
  height: 230px;
}

.chart-grid {
  stroke: #e5edf4;
  stroke-width: 1;
}

.chart-line {
  stroke: #16a085;
}

.chart-point {
  fill: white;
  stroke: #16a085;
  stroke-width: 4;
}

.chart-value {
  fill: #163653;
  font-size: 13px;
  font-weight: 700;
}

.chart-dates {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  min-width: 500px;
  padding: 0 30px;
  color: #74869a;
  font-size: 11px;
}

.progress-history {
  margin-top: 23px;
  border-top: 1px solid #e5edf4;
  padding-top: 16px;
}

.progress-history h4 {
  margin: 0 0 10px;
  color: #163653;
  font-size: 14px;
}

.history-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid #edf2f6;
}

.history-date {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #2477a8;
}

.history-date div {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.history-date strong,
.history-value {
  color: #344b60;
  font-size: 12px;
}

.history-date span {
  color: #74869a;
  font-size: 11px;
}

.progress-empty {
  text-align: center;
  padding: 38px 25px;
  background: white;
  border: 1px solid #e5edf4;
  border-radius: 20px;
  box-shadow: 0 7px 24px rgba(22,54,83,0.05);
}

.empty-icon {
  display: grid;
  place-items: center;
  width: 75px;
  height: 75px;
  margin: 0 auto 15px;
  border-radius: 22px;
  background: #e5f5f0;
  color: #16a085;
}

.empty-label {
  color: #16a085;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 1.5px;
}

.progress-empty h2 {
  color: #163653;
  font-size: 23px;
  margin: 10px 0;
}

.progress-empty > p {
  max-width: 550px;
  margin: 0 auto;
  color: #74869a;
  font-size: 13px;
  line-height: 1.7;
}

.empty-features {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
  max-width: 700px;
  margin: 27px auto;
}

.empty-features > div {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 18px 10px;
  border-radius: 14px;
  background: #f0f7fb;
}

.empty-features span {
  font-size: 26px;
}

.empty-features strong {
  color: #163653;
  font-size: 13px;
}

.empty-features small {
  color: #74869a;
  font-size: 11px;
}

.progress-note {
  display: flex;
  align-items: flex-start;
  gap: 11px;
  padding: 15px;
  border-radius: 13px;
  background: #eaf4fa;
  color: #2477a8;
}

.progress-note p {
  margin: 0;
  color: #526c80;
  font-size: 11px;
  line-height: 1.7;
}

.progress-error {
  padding: 35px;
  text-align: center;
  background: white;
  border: 1px solid #f2d4d4;
  border-radius: 18px;
  color: #bd4141;
}

.progress-error h2 {
  color: #163653;
}

.progress-error p {
  color: #74869a;
}

.progress-loading {
  min-height: 350px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  color: #74869a;
  gap: 8px;
}

.progress-loading h3 {
  color: #163653;
}

.progress-spinner {
  width: 38px;
  height: 38px;
  border: 4px solid #e2edf3;
  border-top-color: #16a085;
  border-radius: 50%;
  animation: progressSpin 0.8s linear infinite;
}

@keyframes progressSpin {
  to { transform: rotate(360deg); }
}

@media (max-width: 850px) {
  .overview-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 600px) {
  .progress-page {
    padding: 20px 13px 35px;
  }

  .progress-hero {
    padding: 25px 19px;
    min-height: 210px;
  }

  .hero-decoration {
    right: 10px;
    bottom: 5px;
  }

  .overview-grid {
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }

  .overview-card {
    padding: 14px;
  }

  .overview-card > strong {
    font-size: 24px;
  }

  .progress-summary {
    grid-template-columns: 1fr;
  }

  .progress-card {
    padding: 15px;
  }

  .progress-empty {
    padding: 30px 15px;
  }

  .empty-features {
    grid-template-columns: 1fr;
  }

  .section-heading h2 {
    font-size: 19px;
  }
}
`;
