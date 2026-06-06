import { useState } from 'react';
import { Brain, Plus, X, Zap, AlertTriangle, CheckCircle, ChevronDown, ChevronUp, Pill } from 'lucide-react';
import { diagnosticApi } from '@/services/api';
import type { SymptomAnalysis, DrugInteraction } from '@/types';
import toast from 'react-hot-toast';

const COMMON_SYMPTOMS = [
  'Chest pain', 'Shortness of breath', 'Fever', 'Headache', 'Nausea',
  'Fatigue', 'Dizziness', 'Back pain', 'Cough', 'Joint pain',
  'Abdominal pain', 'Palpitations', 'Swelling', 'Numbness', 'Vomiting',
];

const URGENCY_CONFIG: Record<string, { color: string; label: string; cls: string }> = {
  low:      { color: '#06d6a0', label: 'Low Urgency',      cls: 'badge-success' },
  medium:   { color: '#f59e0b', label: 'Medium Urgency',   cls: 'badge-warning' },
  high:     { color: '#f43f5e', label: 'High Urgency',     cls: 'badge-danger'  },
  critical: { color: '#ff1744', label: 'CRITICAL',         cls: 'badge-danger'  },
};

const SEVERITY_COLORS: Record<string, string> = {
  minor: '#06d6a0', moderate: '#f59e0b', major: '#f43f5e', contraindicated: '#ff1744'
};

export default function DiagnosticsPage() {
  const [tab, setTab] = useState<'symptoms' | 'drug-check'>('symptoms');

  // Symptom analysis state
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [customSymptom, setCustomSymptom] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [conditions, setConditions] = useState('');
  const [meds, setMeds] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<SymptomAnalysis | null>(null);
  const [expanded, setExpanded] = useState<number | null>(0);

  // Drug interaction state
  const [drugInput, setDrugInput] = useState('');
  const [drugs, setDrugs] = useState<string[]>(['Metformin', 'Lisinopril']);
  const [checkingDrugs, setCheckingDrugs] = useState(false);
  const [drugResult, setDrugResult] = useState<{ interactions: DrugInteraction[]; safety_summary: string; warnings: string[] } | null>(null);

  const addSymptom = (s: string) => {
    if (!symptoms.includes(s)) setSymptoms(p => [...p, s]);
  };
  const removeSymptom = (s: string) => setSymptoms(p => p.filter(x => x !== s));

  const analyzeSymptoms = async () => {
    if (symptoms.length === 0) { toast.error('Add at least one symptom'); return; }
    if (!age || !gender) { toast.error('Age and gender are required'); return; }
    setAnalyzing(true);
    setResult(null);
    try {
      const res = await diagnosticApi.analyzeSymptoms({
        patient_id: 'demo', symptoms, age, gender,
        existing_conditions: conditions ? conditions.split(',').map(s => s.trim()) : [],
        current_medications: meds ? meds.split(',').map(s => s.trim()) : [],
      });
      setResult(res);
      toast.success('Analysis complete');
    } catch {
      // Demo fallback
      setResult({
        session_id: 'demo-session',
        possible_diagnoses: [
          { condition: 'Hypertensive Crisis', confidence: 0.82, description: 'Severely elevated blood pressure causing symptoms', icd_code: 'I16.0', urgency_level: 'high' },
          { condition: 'Migraine with Aura', confidence: 0.71, description: 'Vascular headache with neurological symptoms', icd_code: 'G43.1', urgency_level: 'medium' },
          { condition: 'Tension Headache', confidence: 0.55, description: 'Muscular tension causing head/neck pain', icd_code: 'G44.2', urgency_level: 'low' },
        ],
        urgency_level: 'high',
        recommendation: 'Given the combination of symptoms, recommend immediate blood pressure measurement. If BP >180/120, seek emergency care.',
        follow_up_questions: ['Is the headache throbbing or constant?', 'Any visual disturbances?', 'History of high blood pressure?'],
        emergency_referral: false,
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const checkDrugInteractions = async () => {
    if (drugs.length < 2) { toast.error('Add at least 2 medications'); return; }
    setCheckingDrugs(true);
    setDrugResult(null);
    try {
      const res = await diagnosticApi.checkDrugInteractions(drugs);
      setDrugResult(res);
    } catch {
      setDrugResult({
        interactions: [
          { drug1: 'Metformin', drug2: 'Lisinopril', severity: 'minor', description: 'ACE inhibitors may enhance the hypoglycemic effect of antidiabetics.', recommendation: 'Monitor blood glucose levels; adjust doses if needed.' },
        ],
        safety_summary: '✅ This combination is generally safe. Minor interaction noted — monitor glucose.',
        warnings: ['Monitor renal function (eGFR) quarterly', 'Watch for signs of hypoglycemia'],
      });
    } finally {
      setCheckingDrugs(false);
    }
  };

  const addDrug = () => {
    const d = drugInput.trim();
    if (d && !drugs.includes(d)) { setDrugs(p => [...p, d]); setDrugInput(''); }
  };

  return (
    <div className="diag-root">
      <div className="page-header">
        <div>
          <h1 className="page-title">AI Diagnostics</h1>
          <p className="page-subtitle">Claude-powered clinical decision support</p>
        </div>
        <div className="ai-status-pill">
          <Brain size={13} />
          <span>Claude AI Active</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="diag-tabs">
        {[
          { id: 'symptoms',   label: '🔬 Symptom Analysis' },
          { id: 'drug-check', label: '💊 Drug Interactions' },
        ].map(t => (
          <button
            key={t.id}
            className={`diag-tab ${tab === t.id ? 'diag-tab-active' : ''}`}
            onClick={() => setTab(t.id as any)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Symptom Analysis */}
      {tab === 'symptoms' && (
        <div className="diag-layout">
          <div className="diag-form-col">
            <div className="card" style={{ gap: 20, display: 'flex', flexDirection: 'column' }}>
              <h3 className="section-title">Patient Information</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="input-group">
                  <label className="input-label">Age</label>
                  <input className="input" value={age} onChange={e => setAge(e.target.value)} placeholder="e.g. 45" />
                </div>
                <div className="input-group">
                  <label className="input-label">Gender</label>
                  <select className="input" value={gender} onChange={e => setGender(e.target.value)}>
                    <option value="">Select</option>
                    <option>Male</option><option>Female</option><option>Other</option>
                  </select>
                </div>
              </div>
              <div className="input-group">
                <label className="input-label">Existing Conditions (comma-separated)</label>
                <input className="input" value={conditions} onChange={e => setConditions(e.target.value)} placeholder="e.g. Diabetes, Hypertension" />
              </div>
              <div className="input-group">
                <label className="input-label">Current Medications</label>
                <input className="input" value={meds} onChange={e => setMeds(e.target.value)} placeholder="e.g. Metformin, Lisinopril" />
              </div>

              <h3 className="section-title">Symptoms</h3>
              <div className="symptom-chips">
                {COMMON_SYMPTOMS.map(s => (
                  <button
                    key={s}
                    className={`symptom-chip ${symptoms.includes(s) ? 'symptom-chip-active' : ''}`}
                    onClick={() => symptoms.includes(s) ? removeSymptom(s) : addSymptom(s)}
                  >
                    {symptoms.includes(s) && <CheckCircle size={11} />}
                    {s}
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  className="input"
                  value={customSymptom}
                  onChange={e => setCustomSymptom(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { addSymptom(customSymptom); setCustomSymptom(''); } }}
                  placeholder="Custom symptom…"
                />
                <button className="btn btn-ghost" onClick={() => { addSymptom(customSymptom); setCustomSymptom(''); }}>
                  <Plus size={14} />
                </button>
              </div>

              {symptoms.length > 0 && (
                <div className="selected-symptoms">
                  <span className="input-label">Selected:</span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                    {symptoms.map(s => (
                      <span key={s} className="selected-tag">
                        {s}
                        <button onClick={() => removeSymptom(s)} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', display: 'flex' }}>
                          <X size={11} />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <button className="btn btn-primary analyze-btn" onClick={analyzeSymptoms} disabled={analyzing}>
                {analyzing ? <span className="login-spinner" /> : <><Zap size={15} />Analyze with AI</>}
              </button>
            </div>
          </div>

          {/* Results */}
          <div className="diag-result-col">
            {!result && !analyzing && (
              <div className="diag-empty">
                <Brain size={48} style={{ color: 'var(--text-muted)', marginBottom: 16 }} />
                <h3>AI Diagnostic Engine</h3>
                <p>Fill in patient details and select symptoms, then click <strong>Analyze with AI</strong> to receive Claude-powered differential diagnoses.</p>
              </div>
            )}

            {analyzing && (
              <div className="diag-empty">
                <div className="ai-thinking">
                  <Brain size={32} style={{ color: 'var(--accent-primary)' }} />
                  <span>Claude is analyzing symptoms…</span>
                </div>
              </div>
            )}

            {result && (
              <div className="result-card">
                {/* Urgency banner */}
                <div className="urgency-banner" style={{ background: `${URGENCY_CONFIG[result.urgency_level]?.color}18`, borderColor: `${URGENCY_CONFIG[result.urgency_level]?.color}40` }}>
                  <AlertTriangle size={15} style={{ color: URGENCY_CONFIG[result.urgency_level]?.color }} />
                  <span style={{ color: URGENCY_CONFIG[result.urgency_level]?.color, fontWeight: 600 }}>
                    {URGENCY_CONFIG[result.urgency_level]?.label}
                  </span>
                  {result.emergency_referral && <span className="badge badge-danger">Emergency Referral Required</span>}
                </div>

                <h3 className="section-title" style={{ margin: '18px 0 12px' }}>Differential Diagnoses</h3>
                <div className="diagnosis-list">
                  {result.possible_diagnoses.map((d, i) => (
                    <div key={i} className="diagnosis-item">
                      <div className="diag-header" onClick={() => setExpanded(expanded === i ? null : i)}>
                        <div className="diag-main">
                          <span className="diag-rank">#{i + 1}</span>
                          <span className="diag-name">{d.condition}</span>
                          <span className="diag-icd">ICD: {d.icd_code}</span>
                        </div>
                        <div className="diag-right">
                          <div className="confidence-bar">
                            <div style={{ width: `${d.confidence * 100}%`, background: URGENCY_CONFIG[d.urgency_level]?.color }} />
                          </div>
                          <span className="confidence-pct">{Math.round(d.confidence * 100)}%</span>
                          <span className={`badge ${URGENCY_CONFIG[d.urgency_level]?.cls}`}>{d.urgency_level}</span>
                          {expanded === i ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </div>
                      </div>
                      {expanded === i && (
                        <div className="diag-body">{d.description}</div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="recommendation-box">
                  <h4>Clinical Recommendation</h4>
                  <p>{result.recommendation}</p>
                </div>

                {result.follow_up_questions.length > 0 && (
                  <div className="followup-list">
                    <h4>Follow-up Questions</h4>
                    {result.follow_up_questions.map((q, i) => (
                      <div key={i} className="followup-item">
                        <span className="followup-num">{i + 1}</span>
                        {q}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Drug Interactions */}
      {tab === 'drug-check' && (
        <div className="diag-layout">
          <div className="diag-form-col">
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <h3 className="section-title"><Pill size={15} /> Drug Interaction Checker</h3>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  className="input"
                  value={drugInput}
                  onChange={e => setDrugInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addDrug()}
                  placeholder="Add medication name…"
                />
                <button className="btn btn-ghost" onClick={addDrug}><Plus size={14} /></button>
              </div>
              <div className="drug-chips">
                {drugs.map(d => (
                  <span key={d} className="drug-chip">
                    <Pill size={11} />{d}
                    <button onClick={() => setDrugs(p => p.filter(x => x !== d))} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}>
                      <X size={11} />
                    </button>
                  </span>
                ))}
              </div>
              <button className="btn btn-primary analyze-btn" onClick={checkDrugInteractions} disabled={checkingDrugs}>
                {checkingDrugs ? <span className="login-spinner" /> : <><Zap size={15} />Check Interactions</>}
              </button>
            </div>
          </div>
          <div className="diag-result-col">
            {drugResult && (
              <div className="result-card">
                <div className="safety-summary">{drugResult.safety_summary}</div>
                {drugResult.interactions.length > 0 && (
                  <>
                    <h3 className="section-title" style={{ margin: '18px 0 12px' }}>Interactions Found</h3>
                    {drugResult.interactions.map((inter, i) => (
                      <div key={i} className="interaction-item">
                        <div className="interaction-drugs">
                          <span className="drug-pill">{inter.drug1}</span>
                          <span style={{ color: 'var(--text-muted)' }}>+</span>
                          <span className="drug-pill">{inter.drug2}</span>
                          <span className="badge" style={{ background: `${SEVERITY_COLORS[inter.severity]}20`, color: SEVERITY_COLORS[inter.severity], border: `1px solid ${SEVERITY_COLORS[inter.severity]}40` }}>{inter.severity}</span>
                        </div>
                        <p className="interaction-desc">{inter.description}</p>
                        <p className="interaction-rec"><strong>Recommendation:</strong> {inter.recommendation}</p>
                      </div>
                    ))}
                  </>
                )}
                {drugResult.warnings.length > 0 && (
                  <div className="warnings-list">
                    <h4>Clinical Warnings</h4>
                    {drugResult.warnings.map((w, i) => (
                      <div key={i} className="warning-item"><AlertTriangle size={12} />{w}</div>
                    ))}
                  </div>
                )}
              </div>
            )}
            {!drugResult && !checkingDrugs && (
              <div className="diag-empty">
                <Pill size={48} style={{ color: 'var(--text-muted)', marginBottom: 16 }} />
                <h3>Drug Interaction Checker</h3>
                <p>Add medications above and click <strong>Check Interactions</strong> for AI-powered safety analysis.</p>
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        .diag-root { display: flex; flex-direction: column; gap: 20px; }
        .ai-status-pill {
          display: flex; align-items: center; gap: 6px;
          padding: 6px 14px;
          background: rgba(79,142,247,0.1);
          border: 1px solid rgba(79,142,247,0.25);
          border-radius: 100px;
          font-size: 12px; font-weight: 600;
          color: var(--accent-primary);
          animation: pulse-glow 3s ease-in-out infinite;
        }
        .diag-tabs {
          display: flex; gap: 4px;
          background: var(--bg-card);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-sm);
          padding: 4px;
          align-self: flex-start;
        }
        .diag-tab {
          padding: 8px 20px;
          border-radius: 8px;
          font-size: 13px; font-weight: 500;
          background: transparent; border: none;
          color: var(--text-muted);
          transition: all 0.15s;
        }
        .diag-tab:hover { color: var(--text-primary); background: var(--bg-hover); }
        .diag-tab-active { background: var(--bg-hover); color: var(--text-primary); border: 1px solid var(--border-default); }
        .diag-layout { display: grid; grid-template-columns: 380px 1fr; gap: 16px; }
        @media (max-width: 900px) { .diag-layout { grid-template-columns: 1fr; } }

        .symptom-chips { display: flex; flex-wrap: wrap; gap: 6px; }
        .symptom-chip {
          display: flex; align-items: center; gap: 5px;
          padding: 5px 12px;
          background: var(--bg-surface);
          border: 1px solid var(--border-subtle);
          border-radius: 100px;
          font-size: 12px; color: var(--text-secondary);
          transition: all 0.15s;
        }
        .symptom-chip:hover { border-color: var(--accent-primary); color: var(--accent-primary); }
        .symptom-chip-active {
          background: rgba(79,142,247,0.12);
          border-color: rgba(79,142,247,0.35);
          color: var(--accent-primary);
        }
        .selected-symptoms { }
        .selected-tag {
          display: flex; align-items: center; gap: 5px;
          padding: 4px 10px;
          background: rgba(79,142,247,0.12);
          border: 1px solid rgba(79,142,247,0.25);
          border-radius: 100px;
          font-size: 12px; color: var(--accent-primary);
        }
        .analyze-btn { width: 100%; justify-content: center; padding: 12px; font-size: 15px; }
        .diag-empty {
          display: flex; flex-direction: column; align-items: center;
          justify-content: center; text-align: center;
          padding: 60px 40px;
          background: var(--bg-card);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-lg);
          color: var(--text-secondary);
        }
        .diag-empty h3 { font-size: 18px; margin-bottom: 10px; }
        .diag-empty p { font-size: 13px; color: var(--text-muted); line-height: 1.6; max-width: 300px; }
        .ai-thinking {
          display: flex; align-items: center; gap: 12px;
          font-size: 16px; color: var(--accent-primary);
        }
        .result-card {
          background: var(--bg-card);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-lg);
          padding: 22px;
        }
        .urgency-banner {
          display: flex; align-items: center; gap: 10px;
          padding: 12px 16px;
          border: 1px solid;
          border-radius: var(--radius-sm);
          font-size: 14px;
        }
        .diagnosis-list { display: flex; flex-direction: column; gap: 8px; }
        .diagnosis-item {
          background: var(--bg-surface);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          overflow: hidden;
          transition: border-color 0.2s;
        }
        .diagnosis-item:hover { border-color: var(--border-default); }
        .diag-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 12px 14px; cursor: pointer; gap: 12px;
        }
        .diag-main { display: flex; align-items: center; gap: 10px; flex: 1; min-width: 0; }
        .diag-rank { width: 22px; height: 22px; background: var(--bg-elevated); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; flex-shrink: 0; }
        .diag-name { font-size: 14px; font-weight: 600; }
        .diag-icd { font-size: 10px; color: var(--text-muted); }
        .diag-right { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
        .confidence-bar { width: 60px; height: 5px; background: var(--bg-elevated); border-radius: 3px; overflow: hidden; }
        .confidence-bar div { height: 100%; border-radius: 3px; transition: width 0.8s ease; }
        .confidence-pct { font-size: 12px; font-weight: 700; min-width: 36px; }
        .diag-body { padding: 0 14px 12px 46px; font-size: 13px; color: var(--text-secondary); line-height: 1.5; }
        .recommendation-box {
          background: rgba(79,142,247,0.07);
          border: 1px solid rgba(79,142,247,0.18);
          border-radius: var(--radius-sm);
          padding: 14px 16px;
          margin-top: 16px;
        }
        .recommendation-box h4 { font-size: 12px; font-weight: 700; color: var(--accent-primary); margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.05em; }
        .recommendation-box p { font-size: 13px; color: var(--text-secondary); line-height: 1.6; }
        .followup-list { margin-top: 16px; }
        .followup-list h4 { font-size: 12px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px; }
        .followup-item { display: flex; align-items: flex-start; gap: 10px; font-size: 13px; color: var(--text-secondary); padding: 6px 0; }
        .followup-num { width: 20px; height: 20px; background: var(--bg-elevated); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 700; flex-shrink: 0; }
        .drug-chips { display: flex; flex-wrap: wrap; gap: 6px; }
        .drug-chip { display: flex; align-items: center; gap: 5px; padding: 5px 12px; background: rgba(79,142,247,0.1); border: 1px solid rgba(79,142,247,0.25); border-radius: 100px; font-size: 12px; color: var(--accent-primary); }
        .safety-summary { padding: 14px 16px; background: rgba(6,214,160,0.08); border: 1px solid rgba(6,214,160,0.2); border-radius: var(--radius-sm); font-size: 14px; color: var(--text-primary); }
        .interaction-item { padding: 14px; background: var(--bg-surface); border-radius: var(--radius-sm); margin-top: 8px; }
        .interaction-drugs { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; flex-wrap: wrap; }
        .drug-pill { padding: 3px 10px; background: var(--bg-elevated); border-radius: 100px; font-size: 12px; font-weight: 600; }
        .interaction-desc { font-size: 13px; color: var(--text-secondary); margin-bottom: 6px; }
        .interaction-rec { font-size: 12px; color: var(--text-muted); }
        .warnings-list { margin-top: 16px; }
        .warnings-list h4 { font-size: 12px; font-weight: 700; color: var(--warning); text-transform: uppercase; margin-bottom: 8px; }
        .warning-item { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--text-secondary); padding: 5px 0; }
        .login-spinner { width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 0.8s linear infinite; }
        .section-title { font-size: 14px; font-weight: 700; display: flex; align-items: center; gap: 7px; }
      `}</style>
    </div>
  );
}
