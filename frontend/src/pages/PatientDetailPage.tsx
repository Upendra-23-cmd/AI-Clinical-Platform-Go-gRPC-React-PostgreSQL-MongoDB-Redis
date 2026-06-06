import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Brain, Heart, Pill, FileText, Phone, Mail, MapPin, AlertTriangle } from 'lucide-react';

const MOCK_PATIENT = {
  id: 'p-001', first_name: 'Amara', last_name: 'Okafor', email: 'amara.o@mail.com', phone: '+1-555-0142',
  date_of_birth: '1985-03-14', gender: 'Female', blood_type: 'O+', address: '42 Oak Lane, Boston MA',
  emergency_contact: 'Kwame Okafor +1-555-0143', allergies: ['Penicillin'],
  chronic_conditions: ['Type 2 Diabetes', 'Hypertension'], status: 'active', risk_score: 72,
  created_at: '2024-01-10T08:00:00Z', updated_at: '2025-05-15T14:30:00Z',
};

const MOCK_RECORDS = [
  { id: 'r-1', diagnosis: 'Type 2 Diabetes - Routine Follow-up', treatment: 'Metformin dosage adjustment', doctor_id: 'Dr. Chen', visit_date: '2025-05-15', record_type: 'follow-up', medications: ['Metformin 1000mg', 'Lisinopril 10mg'], notes: 'HbA1c improved to 7.2. Continue current regimen with dietary modifications.' },
  { id: 'r-2', diagnosis: 'Hypertension Management', treatment: 'ACE Inhibitor therapy continuation', doctor_id: 'Dr. Patel', visit_date: '2025-03-22', record_type: 'follow-up', medications: ['Lisinopril 10mg'], notes: 'BP stable at 128/82. No adverse effects noted.' },
  { id: 'r-3', diagnosis: 'Diabetic Neuropathy Screening', treatment: 'Gabapentin prescribed', doctor_id: 'Dr. Rodriguez', visit_date: '2024-11-10', record_type: 'specialist', medications: ['Gabapentin 300mg'], notes: 'Early signs of peripheral neuropathy detected. Refer to endocrinology.' },
];

export default function PatientDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const patient = MOCK_PATIENT; // in prod: useQuery(['patient', id], () => patientApi.get(id!))

  return (
    <div className="detail-root">
      <button className="btn btn-ghost back-btn" onClick={() => navigate('/patients')}>
        <ArrowLeft size={15} /> Back to Patients
      </button>

      {/* Hero */}
      <div className="patient-hero-card">
        <div className="hero-avatar" data-gender={patient.gender}>
          {patient.first_name[0]}{patient.last_name[0]}
        </div>
        <div className="hero-info">
          <div className="hero-name-row">
            <h1 className="hero-name">{patient.first_name} {patient.last_name}</h1>
            <span className={`badge ${patient.status === 'active' ? 'badge-success' : 'badge-danger'}`}>
              {patient.status}
            </span>
          </div>
          <div className="hero-meta">
            <span><Mail size={12} />{patient.email}</span>
            <span><Phone size={12} />{patient.phone}</span>
            <span><MapPin size={12} />{patient.address}</span>
          </div>
          <div className="hero-tags">
            <span className="hero-tag"><Heart size={11} /> {patient.blood_type}</span>
            <span className="hero-tag">{patient.gender}</span>
            <span className="hero-tag">DOB: {patient.date_of_birth}</span>
            <span className="hero-tag">ID: {id}</span>
          </div>
        </div>
        <div className="hero-actions">
          <button className="btn btn-primary" onClick={() => navigate('/diagnostics')}>
            <Brain size={14} /> AI Diagnostics
          </button>
          <button className="btn btn-ghost">Schedule Appointment</button>
        </div>
      </div>

      {/* Stats row */}
      <div className="detail-stats">
        <div className="detail-stat-card">
          <span className="detail-stat-label">Risk Score</span>
          <span className="detail-stat-value" style={{ color: patient.risk_score >= 70 ? 'var(--danger)' : 'var(--warning)' }}>
            {patient.risk_score}/100
          </span>
          <div className="detail-stat-bar">
            <div style={{ width: `${patient.risk_score}%`, background: patient.risk_score >= 70 ? 'var(--danger)' : 'var(--warning)', height: '100%', borderRadius: 3 }} />
          </div>
        </div>
        <div className="detail-stat-card">
          <span className="detail-stat-label"><Pill size={11} /> Allergies</span>
          <div className="tag-list">
            {patient.allergies.map(a => (
              <span key={a} className="badge badge-danger">{a}</span>
            ))}
            {patient.allergies.length === 0 && <span style={{ color: 'var(--success)', fontSize: 13 }}>None known</span>}
          </div>
        </div>
        <div className="detail-stat-card">
          <span className="detail-stat-label"><AlertTriangle size={11} /> Chronic Conditions</span>
          <div className="tag-list">
            {patient.chronic_conditions.map(c => (
              <span key={c} className="badge badge-warning">{c}</span>
            ))}
          </div>
        </div>
        <div className="detail-stat-card">
          <span className="detail-stat-label">Emergency Contact</span>
          <span className="detail-stat-value" style={{ fontSize: 13 }}>{patient.emergency_contact}</span>
        </div>
      </div>

      {/* Medical history */}
      <div className="section-card">
        <div className="section-header">
          <h2 className="section-title"><FileText size={16} /> Medical History</h2>
          <button className="btn btn-ghost" style={{ fontSize: 12 }}>+ Add Record</button>
        </div>
        <div className="records-list">
          {MOCK_RECORDS.map(rec => (
            <div key={rec.id} className="record-card animate-fade-in">
              <div className="record-header">
                <div>
                  <div className="record-diagnosis">{rec.diagnosis}</div>
                  <div className="record-meta">
                    <span>{rec.doctor_id}</span>
                    <span>·</span>
                    <span>{rec.visit_date}</span>
                    <span className="badge badge-info" style={{ fontSize: 10 }}>{rec.record_type}</span>
                  </div>
                </div>
              </div>
              <p className="record-notes">{rec.notes}</p>
              <div className="record-meds">
                {rec.medications.map(m => (
                  <span key={m} className="med-tag"><Pill size={10} />{m}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        .detail-root { display: flex; flex-direction: column; gap: 20px; }
        .back-btn { align-self: flex-start; }

        .patient-hero-card {
          background: var(--bg-card);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-lg);
          padding: 28px;
          display: flex;
          align-items: flex-start;
          gap: 20px;
          flex-wrap: wrap;
        }
        .hero-avatar {
          width: 72px; height: 72px;
          border-radius: 18px;
          display: flex; align-items: center; justify-content: center;
          font-size: 24px; font-weight: 800;
          flex-shrink: 0;
        }
        .hero-avatar[data-gender="Female"] {
          background: linear-gradient(135deg, rgba(236,72,153,0.25), rgba(139,92,246,0.25));
          color: #ec4899; border: 2px solid rgba(236,72,153,0.4);
        }
        .hero-avatar[data-gender="Male"] {
          background: linear-gradient(135deg, rgba(79,142,247,0.25), rgba(6,214,160,0.25));
          color: #4f8ef7; border: 2px solid rgba(79,142,247,0.4);
        }
        .hero-info { flex: 1; min-width: 240px; }
        .hero-name-row { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
        .hero-name { font-size: 24px; font-family: var(--font-display); font-weight: 800; }
        .hero-meta { display: flex; flex-wrap: wrap; gap: 14px; font-size: 12px; color: var(--text-secondary); margin-bottom: 10px; }
        .hero-meta span { display: flex; align-items: center; gap: 5px; }
        .hero-tags { display: flex; flex-wrap: wrap; gap: 6px; }
        .hero-tag {
          display: flex; align-items: center; gap: 4px;
          padding: 3px 10px;
          background: var(--bg-surface);
          border: 1px solid var(--border-subtle);
          border-radius: 100px;
          font-size: 11px; color: var(--text-secondary);
        }
        .hero-actions { display: flex; gap: 8px; flex-wrap: wrap; align-self: center; }

        .detail-stats {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
          gap: 14px;
        }
        .detail-stat-card {
          background: var(--bg-card);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          padding: 18px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .detail-stat-label {
          font-size: 11px; color: var(--text-muted);
          text-transform: uppercase; letter-spacing: 0.05em;
          display: flex; align-items: center; gap: 4px;
        }
        .detail-stat-value { font-size: 22px; font-weight: 700; }
        .detail-stat-bar {
          height: 6px; background: var(--bg-surface);
          border-radius: 3px; overflow: hidden;
        }
        .tag-list { display: flex; flex-wrap: wrap; gap: 5px; }

        .section-card {
          background: var(--bg-card);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-lg);
          padding: 24px;
        }
        .section-header {
          display: flex; justify-content: space-between; align-items: center;
          margin-bottom: 18px;
        }
        .section-title {
          font-size: 16px; font-weight: 700;
          display: flex; align-items: center; gap: 8px;
        }
        .records-list { display: flex; flex-direction: column; gap: 12px; }
        .record-card {
          background: var(--bg-surface);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          padding: 16px 18px;
          transition: border-color 0.2s;
        }
        .record-card:hover { border-color: var(--border-default); }
        .record-diagnosis { font-weight: 600; font-size: 14px; margin-bottom: 4px; }
        .record-meta {
          display: flex; align-items: center; gap: 8px;
          font-size: 12px; color: var(--text-muted); margin-bottom: 8px;
        }
        .record-notes { font-size: 13px; color: var(--text-secondary); margin-bottom: 10px; line-height: 1.5; }
        .record-meds { display: flex; flex-wrap: wrap; gap: 6px; }
        .med-tag {
          display: flex; align-items: center; gap: 4px;
          padding: 3px 10px;
          background: rgba(79, 142, 247, 0.1);
          border: 1px solid rgba(79, 142, 247, 0.2);
          border-radius: 100px;
          font-size: 11px; color: var(--accent-primary);
        }
      `}</style>
    </div>
  );
}
