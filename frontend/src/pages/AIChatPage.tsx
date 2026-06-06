import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, AlertTriangle, Sparkles, RefreshCw, Brain } from 'lucide-react';
import { diagnosticApi } from '@/services/api';
import type { ChatMessage } from '@/types';
import toast from 'react-hot-toast';

const SUGGESTIONS = [
  'What are the symptoms of Type 2 Diabetes?',
  'Check drug interactions for Metformin and Lisinopril',
  'What lifestyle changes help with hypertension?',
  'Explain the difference between Type 1 and Type 2 diabetes',
  'What are warning signs of a cardiac event?',
  'Generate a summary for patient p-001',
];

function MessageBubble({ msg }: { msg: ChatMessage & { escalate?: boolean } }) {
  const isAI = msg.role === 'assistant';
  return (
    <div className={`msg-wrap ${isAI ? 'msg-ai' : 'msg-user'}`}>
      <div className="msg-avatar">
        {isAI ? <Bot size={15} /> : <User size={15} />}
      </div>
      <div className="msg-content">
        {msg.escalate && (
          <div className="escalation-banner">
            <AlertTriangle size={14} />
            This may require immediate medical attention. Please contact emergency services.
          </div>
        )}
        <div className="msg-text">{msg.content}</div>
        <div className="msg-time">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="msg-wrap msg-ai">
      <div className="msg-avatar"><Bot size={15} /></div>
      <div className="msg-content typing-indicator">
        <span /><span /><span />
      </div>
    </div>
  );
}

export default function AIChatPage() {
  const [messages, setMessages] = useState<(ChatMessage & { escalate?: boolean })[]>([
    {
      role: 'assistant',
      content: "Hello! I'm HealthOS AI, your intelligent clinical assistant powered by Claude. I can help you analyze symptoms, check drug interactions, answer medical questions, and generate patient summaries.\n\nHow can I assist you today?",
      timestamp: new Date().toISOString(),
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [patientId, setPatientId] = useState('p-001');
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const send = async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: ChatMessage = {
      role: 'user',
      content: text.trim(),
      timestamp: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const resp = await diagnosticApi.chat(patientId, text.trim(), messages);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: resp.content,
        timestamp: resp.timestamp || new Date().toISOString(),
        escalate: (resp as any).escalate_to_doctor,
      }]);
    } catch {
      // Fallback demo response when API is unavailable
      const demoResponses: Record<string, string> = {
        'drug': "**Drug Interaction Check**\n\nMetformin + Lisinopril: ✅ Generally safe combination.\n\n• **Metformin** (antidiabetic) — no significant interaction with ACE inhibitors\n• **Lisinopril** (ACE inhibitor) — may slightly improve insulin sensitivity\n\n⚠️ Monitor: Blood pressure and kidney function (eGFR) quarterly. Both drugs can rarely cause lactic acidosis in severe renal impairment.",
        'diabetes': "**Type 2 Diabetes Overview**\n\nType 2 Diabetes is a metabolic condition where the body doesn't use insulin effectively.\n\n**Key Symptoms:**\n• Frequent urination (polyuria)\n• Increased thirst (polydipsia)\n• Unexplained weight loss\n• Blurred vision\n• Slow-healing wounds\n\n**Risk Factors:** Obesity, sedentary lifestyle, family history, age >45\n\n**Diagnosis:** Fasting glucose ≥126 mg/dL or HbA1c ≥6.5%",
        'hypertension': "**Hypertension Lifestyle Modifications**\n\nEvidence-based interventions that can reduce BP by 5–20 mmHg:\n\n1. **DASH Diet** — reduces sodium, increases K⁺, Mg²⁺ (↓8–14 mmHg)\n2. **Exercise** — 150 min/week moderate aerobic activity (↓4–9 mmHg)\n3. **Weight loss** — every 10 kg lost = ~5–20 mmHg reduction\n4. **Limit alcohol** — max 2 drinks/day for men, 1 for women\n5. **Quit smoking** — immediate cardiovascular benefit\n6. **Stress management** — mindfulness, sleep hygiene",
        'cardiac': "**⚠️ Cardiac Warning Signs — Immediate Action Required**\n\nCall 911 / Emergency if you observe:\n• **Chest pain or pressure** (squeezing, heavy sensation)\n• **Pain radiating** to left arm, jaw, neck, or back\n• **Shortness of breath** at rest\n• **Sudden dizziness or loss of consciousness**\n• **Rapid or irregular heartbeat with sweating**\n• **Cold, clammy skin**\n\nTime is critical — every minute of delayed treatment increases myocardial damage.",
      };
      const lowerText = text.toLowerCase();
      const key = Object.keys(demoResponses).find(k => lowerText.includes(k)) || '';
      const content = demoResponses[key] || `I understand you're asking about: "${text}"\n\nI'm currently operating in demo mode (AI service not connected). In production, I provide:\n• Real-time symptom analysis\n• Evidence-based treatment recommendations\n• Drug interaction checking\n• Patient-specific clinical summaries\n\nPlease configure your AI_API_KEY to enable full AI capabilities.`;

      setMessages(prev => [...prev, {
        role: 'assistant',
        content,
        timestamp: new Date().toISOString(),
        escalate: lowerText.includes('cardiac') || lowerText.includes('chest pain'),
      }]);
      toast.error('AI service unavailable — showing demo response', { duration: 2000 });
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  };

  const clearChat = () => {
    setMessages([{
      role: 'assistant',
      content: "Chat cleared. How can I assist you?",
      timestamp: new Date().toISOString(),
    }]);
  };

  return (
    <div className="chat-root">
      {/* Header */}
      <div className="chat-header">
        <div className="chat-header-left">
          <div className="ai-icon">
            <Brain size={22} />
          </div>
          <div>
            <h1 className="page-title">AI Medical Assistant</h1>
            <p className="page-subtitle">Powered by Claude · Agentic clinical reasoning</p>
          </div>
        </div>
        <div className="chat-header-right">
          <div className="input-group" style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <label className="input-label" style={{ whiteSpace: 'nowrap' }}>Patient ID</label>
            <input
              className="input"
              style={{ width: 120 }}
              value={patientId}
              onChange={e => setPatientId(e.target.value)}
              placeholder="p-001"
            />
          </div>
          <button className="btn btn-ghost" onClick={clearChat}>
            <RefreshCw size={14} /> Clear
          </button>
        </div>
      </div>

      {/* Capabilities banner */}
      <div className="capabilities-bar">
        {['Symptom Analysis', 'Drug Interactions', 'Risk Assessment', 'Treatment Plans', 'Patient Summaries'].map(cap => (
          <span key={cap} className="capability-chip">
            <Sparkles size={10} />{cap}
          </span>
        ))}
      </div>

      {/* Messages */}
      <div className="chat-window">
        {messages.map((msg, i) => (
          <MessageBubble key={i} msg={msg} />
        ))}
        {loading && <TypingIndicator />}
        <div ref={bottomRef} />
      </div>

      {/* Suggestions */}
      {messages.length <= 1 && (
        <div className="suggestions-row">
          {SUGGESTIONS.map(s => (
            <button key={s} className="suggestion-chip" onClick={() => send(s)}>
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="chat-input-area">
        <textarea
          ref={inputRef}
          className="chat-textarea"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask a medical question, describe symptoms, or request a patient summary… (Enter to send)"
          rows={2}
          disabled={loading}
        />
        <button
          className="send-btn"
          onClick={() => send(input)}
          disabled={!input.trim() || loading}
        >
          {loading ? <span className="login-spinner" /> : <Send size={18} />}
        </button>
      </div>

      <div className="chat-disclaimer">
        ⚕️ HealthOS AI is a clinical decision support tool. Always verify AI recommendations with qualified medical professionals. Not a substitute for professional medical judgment.
      </div>

      <style>{`
        .chat-root {
          display: flex; flex-direction: column;
          gap: 16px;
          height: calc(100vh - var(--header-height) - 56px);
        }

        .chat-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 12px;
        }
        .chat-header-left { display: flex; align-items: center; gap: 14px; }
        .chat-header-right { display: flex; align-items: center; gap: 12px; }
        .ai-icon {
          width: 52px; height: 52px;
          background: var(--gradient-brand);
          border-radius: 14px;
          display: flex; align-items: center; justify-content: center;
          color: white;
          box-shadow: var(--shadow-glow-sm);
        }

        .capabilities-bar {
          display: flex; gap: 8px; flex-wrap: wrap;
        }
        .capability-chip {
          display: flex; align-items: center; gap: 5px;
          padding: 5px 12px;
          background: rgba(79, 142, 247, 0.08);
          border: 1px solid rgba(79, 142, 247, 0.18);
          border-radius: 100px;
          font-size: 11px; color: var(--accent-primary); font-weight: 500;
        }

        .chat-window {
          flex: 1;
          overflow-y: auto;
          background: var(--bg-card);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-lg);
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          min-height: 0;
        }

        .msg-wrap {
          display: flex;
          gap: 10px;
          max-width: 85%;
          animation: fadeIn 0.25s ease both;
        }
        .msg-ai { align-self: flex-start; }
        .msg-user { align-self: flex-end; flex-direction: row-reverse; }

        .msg-avatar {
          width: 32px; height: 32px;
          border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
          font-size: 13px;
        }
        .msg-ai .msg-avatar {
          background: var(--gradient-brand);
          color: white;
        }
        .msg-user .msg-avatar {
          background: var(--bg-elevated);
          border: 1px solid var(--border-default);
          color: var(--text-secondary);
        }

        .msg-content {
          display: flex; flex-direction: column; gap: 4px;
        }
        .msg-ai .msg-content {
          background: var(--bg-elevated);
          border: 1px solid var(--border-subtle);
          border-radius: 4px 16px 16px 16px;
          padding: 12px 16px;
        }
        .msg-user .msg-content {
          background: rgba(79, 142, 247, 0.15);
          border: 1px solid rgba(79, 142, 247, 0.25);
          border-radius: 16px 4px 16px 16px;
          padding: 12px 16px;
        }
        .msg-text {
          font-size: 14px;
          line-height: 1.65;
          white-space: pre-wrap;
          color: var(--text-primary);
        }
        .msg-time { font-size: 10px; color: var(--text-muted); align-self: flex-end; }

        .escalation-banner {
          display: flex; align-items: center; gap: 6px;
          padding: 8px 12px;
          background: rgba(244, 63, 94, 0.12);
          border: 1px solid rgba(244, 63, 94, 0.3);
          border-radius: 8px;
          font-size: 12px; font-weight: 600; color: var(--danger);
          margin-bottom: 8px;
        }

        .typing-indicator {
          display: flex !important;
          align-items: center !important;
          gap: 5px !important;
          padding: 14px 18px !important;
          flex-direction: row !important;
        }
        .typing-indicator span {
          width: 7px; height: 7px;
          background: var(--text-muted);
          border-radius: 50%;
          animation: typing-bounce 1.2s ease-in-out infinite;
        }
        .typing-indicator span:nth-child(2) { animation-delay: 0.2s; }
        .typing-indicator span:nth-child(3) { animation-delay: 0.4s; }
        @keyframes typing-bounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
          40%            { transform: translateY(-6px); opacity: 1; }
        }

        .suggestions-row {
          display: flex; flex-wrap: wrap; gap: 8px;
        }
        .suggestion-chip {
          padding: 7px 14px;
          background: var(--bg-card);
          border: 1px solid var(--border-default);
          border-radius: 100px;
          font-size: 12px;
          color: var(--text-secondary);
          transition: all 0.15s;
          white-space: nowrap;
        }
        .suggestion-chip:hover {
          background: var(--bg-hover);
          border-color: var(--accent-primary);
          color: var(--accent-primary);
        }

        .chat-input-area {
          display: flex;
          gap: 10px;
          align-items: flex-end;
        }
        .chat-textarea {
          flex: 1;
          background: var(--bg-card);
          border: 1px solid var(--border-default);
          border-radius: var(--radius-md);
          padding: 12px 16px;
          color: var(--text-primary);
          font-family: var(--font-body);
          font-size: 14px;
          resize: none;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
          line-height: 1.5;
        }
        .chat-textarea:focus {
          border-color: var(--accent-primary);
          box-shadow: 0 0 0 3px rgba(79, 142, 247, 0.12);
        }
        .chat-textarea::placeholder { color: var(--text-muted); }

        .send-btn {
          width: 48px; height: 48px;
          background: var(--gradient-brand);
          border: none;
          border-radius: var(--radius-md);
          color: white;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
          transition: all 0.2s;
          box-shadow: 0 4px 16px rgba(79, 142, 247, 0.3);
        }
        .send-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 6px 24px rgba(79, 142, 247, 0.45); }
        .send-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

        .chat-disclaimer {
          font-size: 11px;
          color: var(--text-muted);
          text-align: center;
          padding: 8px;
          background: var(--bg-card);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-sm);
        }

        .login-spinner {
          width: 16px; height: 16px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
      `}</style>
    </div>
  );
}
