import { useState } from 'react';
import api from '../services/api';

export default function ReportChat({ documentId }) {
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAsk = async (e) => {
    e.preventDefault();

    if (!question.trim() || loading) return;

    const q = question.trim();

    // Add user message
    setMessages((prev) => [
      ...prev,
      {
        role: 'user',
        text: q,
      },
    ]);

    setQuestion('');
    setError('');
    setLoading(true);

    try {
      const res = await api.post(
        `/documents/${documentId}/chat/`,
        {
          question: q,
        }
      );

      // Add AI response
      setMessages((prev) => [
        ...prev,
        {
          role: 'ai',
          text: res.data.answer,
        },
      ]);
    } catch (err) {
      console.error('HealthMate AI chat error:', err);

      const backendError =
        err.response?.data?.detail ||
        err.response?.data?.error ||
        err.message ||
        'Could not get a response. Please try again.';

      setError(backendError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        .healthmate-chat {
          margin-top: 24px;
          background: #ffffff;
          border: 1px solid #e5eaf0;
          border-radius: 18px;
          padding: 22px;
          box-shadow: 0 8px 24px rgba(31, 55, 80, 0.08);
        }

        .healthmate-chat-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 18px;
        }

        .healthmate-ai-icon {
          width: 44px;
          height: 44px;
          border-radius: 14px;
          background: linear-gradient(135deg, #e6f7f4, #d9f1ff);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 22px;
          flex-shrink: 0;
        }

        .healthmate-chat-title {
          margin: 0;
          font-size: 20px;
          font-weight: 700;
          color: #17324d;
        }

        .healthmate-chat-subtitle {
          margin: 4px 0 0;
          font-size: 13px;
          color: #7b8794;
        }

        .healthmate-chat-messages {
          min-height: 90px;
          max-height: 360px;
          overflow-y: auto;
          padding: 8px 4px;
          margin-bottom: 16px;
          scroll-behavior: smooth;
        }

        .healthmate-chat-messages::-webkit-scrollbar {
          width: 6px;
        }

        .healthmate-chat-messages::-webkit-scrollbar-thumb {
          background: #cbd5df;
          border-radius: 10px;
        }

        .healthmate-chat-empty {
          min-height: 90px;
          display: flex;
          align-items: center;
          justify-content: center;
          text-align: center;
          color: #8a96a3;
          font-size: 14px;
          background: #f8fafc;
          border-radius: 14px;
          border: 1px dashed #d8e0e8;
          padding: 18px;
        }

        .healthmate-message-row {
          display: flex;
          margin: 10px 0;
        }

        .healthmate-message-row.user {
          justify-content: flex-end;
        }

        .healthmate-message-row.ai {
          justify-content: flex-start;
        }

        .healthmate-message {
          max-width: 82%;
          padding: 11px 15px;
          border-radius: 16px;
          font-size: 14px;
          line-height: 1.55;
          white-space: pre-wrap;
          word-break: break-word;
        }

        .healthmate-message.user {
          color: #ffffff;
          background: linear-gradient(135deg, #16a394, #138f83);
          border-bottom-right-radius: 5px;
          box-shadow: 0 4px 12px rgba(22, 163, 148, 0.18);
        }

        .healthmate-message.ai {
          color: #263746;
          background: #f1f7f8;
          border: 1px solid #e0ecee;
          border-bottom-left-radius: 5px;
        }

        .healthmate-thinking {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          color: #71808f;
          font-size: 13px;
        }

        .healthmate-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #16a394;
          animation: healthmatePulse 1.2s infinite ease-in-out;
        }

        .healthmate-dot:nth-child(2) {
          animation-delay: 0.15s;
        }

        .healthmate-dot:nth-child(3) {
          animation-delay: 0.3s;
        }

        @keyframes healthmatePulse {
          0%, 60%, 100% {
            opacity: 0.3;
            transform: translateY(0);
          }

          30% {
            opacity: 1;
            transform: translateY(-3px);
          }
        }

        .healthmate-chat-error {
          background: #fff4f4;
          border: 1px solid #f1caca;
          color: #b42318;
          border-radius: 12px;
          padding: 11px 13px;
          margin-bottom: 14px;
          font-size: 13px;
          line-height: 1.45;
          word-break: break-word;
        }

        .healthmate-chat-form {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 7px;
          background: #f7f9fb;
          border: 1px solid #e1e7ed;
          border-radius: 15px;
        }

        .healthmate-chat-input {
          flex: 1;
          min-width: 0;
          border: none;
          outline: none;
          background: transparent;
          padding: 10px 12px;
          color: #263746;
          font-size: 14px;
        }

        .healthmate-chat-input::placeholder {
          color: #9aa6b2;
        }

        .healthmate-chat-input:disabled {
          cursor: not-allowed;
          opacity: 0.7;
        }

        .healthmate-chat-button {
          border: none;
          outline: none;
          cursor: pointer;
          border-radius: 11px;
          padding: 10px 18px;
          font-size: 14px;
          font-weight: 600;
          color: #ffffff;
          background: linear-gradient(135deg, #16a394, #138f83);
          transition: transform 0.15s ease, opacity 0.15s ease;
          white-space: nowrap;
        }

        .healthmate-chat-button:hover:not(:disabled) {
          transform: translateY(-1px);
        }

        .healthmate-chat-button:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        @media (max-width: 600px) {
          .healthmate-chat {
            padding: 16px;
            border-radius: 15px;
          }

          .healthmate-chat-title {
            font-size: 18px;
          }

          .healthmate-message {
            max-width: 90%;
          }

          .healthmate-chat-form {
            gap: 5px;
          }

          .healthmate-chat-button {
            padding: 9px 13px;
          }
        }
      `}</style>

      <div className="healthmate-chat">

        {/* Header */}
        <div className="healthmate-chat-header">
          <div className="healthmate-ai-icon">
            🤖
          </div>

          <div>
            <h3 className="healthmate-chat-title">
              Ask HealthMate AI
            </h3>

            <p className="healthmate-chat-subtitle">
              Ask anything about this report
            </p>
          </div>
        </div>

        {/* Messages */}
        <div className="healthmate-chat-messages">

          {messages.length === 0 && (
            <div className="healthmate-chat-empty">
              Ask HealthMate AI anything about this report.
            </div>
          )}

          {messages.map((message, index) => (
            <div
              key={index}
              className={`healthmate-message-row ${message.role}`}
            >
              <div
                className={`healthmate-message ${message.role}`}
              >
                {message.text}
              </div>
            </div>
          ))}

          {loading && (
            <div className="healthmate-message-row ai">
              <div className="healthmate-message ai">
                <span className="healthmate-thinking">
                  <span>HealthMate AI is thinking</span>
                  <span className="healthmate-dot"></span>
                  <span className="healthmate-dot"></span>
                  <span className="healthmate-dot"></span>
                </span>
              </div>
            </div>
          )}

        </div>

        {/* Error */}
        {error && (
          <div className="healthmate-chat-error">
            <strong>Chat failed:</strong> {error}
          </div>
        )}

        {/* Input */}
        <form
          onSubmit={handleAsk}
          className="healthmate-chat-form"
        >
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask something about this report..."
            disabled={loading}
            className="healthmate-chat-input"
          />

          <button
            type="submit"
            disabled={loading || !question.trim()}
            className="healthmate-chat-button"
          >
            {loading ? 'Asking...' : 'Ask'}
          </button>
        </form>

      </div>
    </>
  );
}