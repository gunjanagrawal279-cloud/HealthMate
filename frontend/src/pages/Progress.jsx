import { useEffect, useState } from 'react';
import api from '../services/api';

function TrendCard({ name, points }) {
  const values = points.map((point) => Number(point.value));

  const firstValue = values[0];
  const latestValue = values[values.length - 1];
  const difference = latestValue - firstValue;

  const changeText =
    difference > 0
      ? `+${difference.toFixed(1)}`
      : difference.toFixed(1);

  const maxValue = Math.max(...values);
  const minValue = Math.min(...values);

  const range = maxValue - minValue || 1;

  const chartWidth = 600;
  const chartHeight = 220;
  const paddingX = 45;
  const paddingY = 30;

  const getX = (index) => {
    if (points.length === 1) return chartWidth / 2;

    return (
      paddingX +
      (index * (chartWidth - paddingX * 2)) /
        (points.length - 1)
    );
  };

  const getY = (value) => {
    return (
      chartHeight -
      paddingY -
      ((value - minValue) / range) *
        (chartHeight - paddingY * 2)
    );
  };

  const polylinePoints = points
    .map((point, index) => {
      return `${getX(index)},${getY(Number(point.value))}`;
    })
    .join(' ');

  return (
    <div className="progress-card">

      <div className="progress-card-header">
        <div>
          <div className="progress-test-icon">🧪</div>

          <div>
            <h3>{name}</h3>
            <p>Historical test values</p>
          </div>
        </div>

        <div className="progress-count">
          {points.length} tests
        </div>
      </div>

      <div className="progress-summary">

        <div className="progress-stat">
          <span>First</span>
          <strong>
            {firstValue} {points[0].unit}
          </strong>
        </div>

        <div className="progress-stat">
          <span>Latest</span>
          <strong>
            {latestValue} {points[points.length - 1].unit}
          </strong>
        </div>

        <div className="progress-stat">
          <span>Change</span>
          <strong
            className={
              difference > 0
                ? 'change-positive'
                : difference < 0
                ? 'change-negative'
                : 'change-neutral'
            }
          >
            {changeText}
          </strong>
        </div>

      </div>

      <div className="progress-chart-wrapper">

        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          className="progress-chart"
          preserveAspectRatio="none"
        >

          {/* Horizontal guide lines */}
          <line
            x1={paddingX}
            y1={paddingY}
            x2={chartWidth - paddingX}
            y2={paddingY}
            className="chart-grid"
          />

          <line
            x1={paddingX}
            y1={chartHeight / 2}
            x2={chartWidth - paddingX}
            y2={chartHeight / 2}
            className="chart-grid"
          />

          <line
            x1={paddingX}
            y1={chartHeight - paddingY}
            x2={chartWidth - paddingX}
            y2={chartHeight - paddingY}
            className="chart-grid"
          />

          {/* Trend line */}
          <polyline
            points={polylinePoints}
            fill="none"
            className="chart-line"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Points */}
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
                {
                  month: 'short',
                  day: 'numeric',
                }
              )}
            </span>
          ))}
        </div>

      </div>

      <div className="progress-history">

        <div className="history-title">
          Test history
        </div>

        {points.map((point, index) => (
          <div
            className="history-row"
            key={`${point.date}-${index}`}
          >

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

            <strong>
              {point.value} {point.unit}
            </strong>

          </div>
        ))}

      </div>

    </div>
  );
}


export default function Progress() {

  const [trends, setTrends] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {

    api
      .get('/dashboard/progress/')
      .then((res) => {
        setTrends(res.data?.trends || {});
      })
      .catch((err) => {
        console.error('Progress error:', err);

        setError(
          err.response?.data?.detail ||
          'Could not load health progress.'
        );
      })
      .finally(() => {
        setLoading(false);
      });

  }, []);

  if (loading) {
    return (
      <div className="progress-page">
        <div className="progress-loading">
          <div className="progress-spinner" />
          <p>Loading your health progress...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="progress-page">

        <div className="progress-header">
          <div>
            <span className="progress-eyebrow">
              HEALTH TRACKING
            </span>

            <h1>Progress</h1>

            <p>
              Track repeated test values over time.
            </p>
          </div>
        </div>

        <div className="progress-error">
          <div>⚠️</div>
          <strong>Could not load progress</strong>
          <p>{error}</p>
        </div>

      </div>
    );
  }

  const testNames = Object.keys(trends);

  return (
    <div className="progress-page">

      <div className="progress-header">

        <div>
          <span className="progress-eyebrow">
            HEALTH TRACKING
          </span>

          <h1>Progress</h1>

          <p>
            See how your repeated test values change over time.
          </p>
        </div>

        <div className="progress-header-icon">
          📈
        </div>

      </div>

      {testNames.length === 0 ? (

        <div className="progress-empty">

          <div className="empty-icon">
            📊
          </div>

          <h2>No trends available yet</h2>

          <p>
            Once the same test appears in at least two
            analyzed reports, its historical progress will
            appear here.
          </p>

        </div>

      ) : (

        <>
          <div className="progress-overview">

            <div>
              <span>Tracked tests</span>
              <strong>{testNames.length}</strong>
            </div>

            <div>
              <span>Historical records</span>
              <strong>
                {testNames.reduce(
                  (total, name) =>
                    total + trends[name].length,
                  0
                )}
              </strong>
            </div>

          </div>

          {testNames.map((name) => (
            <TrendCard
              key={name}
              name={name}
              points={trends[name]}
            />
          ))}
        </>
      )}

      <div className="progress-note">
        <span>ℹ️</span>
        <p>
          These charts show historical values only and do
          not represent medical conclusions.
        </p>
      </div>

      <style>{`

        .progress-page {
          max-width: 1100px;
          margin: 0 auto;
          padding: 2.5rem 1.5rem 4rem;
        }

        .progress-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;
          margin-bottom: 2rem;
        }

        .progress-eyebrow {
          display: block;
          font-size: 0.75rem;
          font-weight: 800;
          letter-spacing: 0.12em;
          color: #0f766e;
          margin-bottom: 0.45rem;
        }

        .progress-header h1 {
          margin: 0;
          color: var(--navy, #12304a);
          font-size: 2.1rem;
        }

        .progress-header p {
          margin: 0.5rem 0 0;
          color: var(--text-muted, #64748b);
        }

        .progress-header-icon {
          width: 58px;
          height: 58px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 18px;
          background: #ecfeff;
          font-size: 1.7rem;
        }

        .progress-overview {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        .progress-overview > div {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 18px;
          padding: 1.25rem;
          box-shadow: 0 8px 25px rgba(15, 23, 42, 0.05);
        }

        .progress-overview span,
        .progress-stat span {
          display: block;
          color: #64748b;
          font-size: 0.8rem;
          margin-bottom: 0.35rem;
        }

        .progress-overview strong {
          font-size: 1.7rem;
          color: #12304a;
        }

        .progress-card {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 22px;
          padding: 1.4rem;
          margin-bottom: 1.5rem;
          box-shadow: 0 10px 30px rgba(15, 23, 42, 0.06);
        }

        .progress-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;
        }

        .progress-card-header > div:first-child {
          display: flex;
          align-items: center;
          gap: 0.8rem;
        }

        .progress-test-icon {
          width: 46px;
          height: 46px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 14px;
          background: #f0fdfa;
          font-size: 1.3rem;
        }

        .progress-card h3 {
          margin: 0;
          color: #12304a;
          font-size: 1.15rem;
        }

        .progress-card-header p {
          margin: 0.2rem 0 0;
          color: #64748b;
          font-size: 0.82rem;
        }

        .progress-count {
          background: #f1f5f9;
          color: #475569;
          padding: 0.45rem 0.7rem;
          border-radius: 999px;
          font-size: 0.78rem;
          font-weight: 700;
        }

        .progress-summary {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 0.75rem;
          margin: 1.4rem 0;
        }

        .progress-stat {
          background: #f8fafc;
          border-radius: 14px;
          padding: 0.85rem;
        }

        .progress-stat strong {
          color: #12304a;
          font-size: 1rem;
        }

        .change-positive {
          color: #0f766e !important;
        }

        .change-negative {
          color: #b91c1c !important;
        }

        .change-neutral {
          color: #475569 !important;
        }

        .progress-chart-wrapper {
          width: 100%;
          overflow-x: auto;
          padding-top: 0.5rem;
        }

        .progress-chart {
          display: block;
          width: 100%;
          min-width: 500px;
          height: 240px;
        }

        .chart-grid {
          stroke: #e2e8f0;
          stroke-width: 1;
        }

        .chart-line {
          stroke: #0f766e;
        }

        .chart-point {
          fill: white;
          stroke: #0f766e;
          stroke-width: 4;
        }

        .chart-value {
          fill: #334155;
          font-size: 13px;
          font-weight: 700;
        }

        .chart-dates {
          display: flex;
          justify-content: space-between;
          gap: 0.5rem;
          color: #64748b;
          font-size: 0.75rem;
          min-width: 500px;
          padding: 0 2rem;
        }

        .progress-history {
          margin-top: 1.5rem;
          border-top: 1px solid #e2e8f0;
          padding-top: 1rem;
        }

        .history-title {
          color: #334155;
          font-size: 0.85rem;
          font-weight: 800;
          margin-bottom: 0.65rem;
        }

        .history-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;
          padding: 0.8rem 0;
          border-bottom: 1px solid #f1f5f9;
        }

        .history-row > div {
          display: flex;
          flex-direction: column;
          gap: 0.2rem;
        }

        .history-row strong {
          color: #334155;
          font-size: 0.88rem;
        }

        .history-row span {
          color: #64748b;
          font-size: 0.75rem;
        }

        .progress-empty {
          text-align: center;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 22px;
          padding: 4rem 2rem;
          box-shadow: 0 10px 30px rgba(15, 23, 42, 0.05);
        }

        .empty-icon {
          font-size: 3rem;
          margin-bottom: 0.8rem;
        }

        .progress-empty h2 {
          margin: 0;
          color: #12304a;
        }

        .progress-empty p {
          max-width: 550px;
          margin: 0.7rem auto 0;
          color: #64748b;
          line-height: 1.6;
        }

        .progress-note {
          display: flex;
          gap: 0.65rem;
          align-items: flex-start;
          background: #f8fafc;
          border-radius: 14px;
          padding: 0.9rem 1rem;
          color: #64748b;
        }

        .progress-note p {
          margin: 0;
          font-size: 0.78rem;
          line-height: 1.5;
        }

        .progress-error {
          text-align: center;
          background: #fff7ed;
          border: 1px solid #fed7aa;
          border-radius: 18px;
          padding: 2rem;
        }

        .progress-error > div {
          font-size: 2rem;
          margin-bottom: 0.5rem;
        }

        .progress-error strong {
          color: #9a3412;
        }

        .progress-error p {
          color: #7c2d12;
          margin-bottom: 0;
        }

        .progress-loading {
          min-height: 300px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          gap: 1rem;
          color: #64748b;
        }

        .progress-spinner {
          width: 34px;
          height: 34px;
          border: 4px solid #e2e8f0;
          border-top-color: #0f766e;
          border-radius: 50%;
          animation: progressSpin 0.8s linear infinite;
        }

        @keyframes progressSpin {
          to {
            transform: rotate(360deg);
          }
        }

        @media (max-width: 650px) {

          .progress-page {
            padding: 1.5rem 1rem 3rem;
          }

          .progress-header h1 {
            font-size: 1.7rem;
          }

          .progress-overview {
            grid-template-columns: 1fr;
          }

          .progress-summary {
            grid-template-columns: 1fr;
          }

          .progress-card {
            padding: 1rem;
          }

        }

      `}</style>

    </div>
  );
}