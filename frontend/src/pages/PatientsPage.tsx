import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Search, UserPlus, ChevronRight, AlertCircle,
  Heart, Phone, Mail, Activity
} from 'lucide-react';
import { patientApi } from '@/services/api';
import type { Patient } from '@/types';

const MOCK_PATIENTS: Patient[] = [
  {
    id: 'p-001', first_name: 'Amara',   last_name: 'Okafor',   email: 'amara.o@mail.com', phone: '+1-555-0142',
    date_of_birth: '1985-03-14', gender: 'Female', blood_type: 'O+', address: '42 Oak Lane, Boston MA',
    emergency_contact: 'Kwame Okafor +1-555-0143', allergies: ['Penicillin'], chronic_conditions: ['Type 2 Diabetes', 'Hypertension'],
    status: 'active', risk_score: 72, created_at: '2024-01-10T08:00:00Z', updated_at: '2025-05-15T14:30:00Z'
  },
  {
    id: 'p-002', first_name: 'James',   last_name: 'Harrington', email: 'j.harrington@corp.com', phone: '+1-555-0219',
    date_of_birth: '1972-11-28', gender: 'Male', blood_type: 'A-', address: '88 Elm St, Chicago IL',
    emergency_contact: 'Linda Harrington +1-555-0220', allergies: ['Sulfa', 'Aspirin'], chronic_conditions: ['Coronary Artery Disease'],
    status: 'critical', risk_score: 91, created_at: '2023-06-20T09:15:00Z', updated_at: '2025-06-01T11:00:00Z'
  },
  {
    id: 'p-003', first_name: 'Sofia',   last_name: 'Reyes',     email: 'sofia.r@gmail.com', phone: '+1-555-0387',
    date_of_birth: '1995-07-05', gender: 'Female', blood_type: 'B+', address: '15 Maple Ave, Austin TX',
    emergency_contact: 'Marco Reyes +1-555-0388', allergies: [], chronic_conditions: ['Asthma'],
    status: 'active', risk_score: 28, created_at: '2024-03-01T10:45:00Z', updated_at: '2025-05-20T16:00:00Z'
  },
  {
    id: 'p-004', first_name: 'David',   last_name: 'Chen',      email: 'd.chen@techcorp.io', phone: '+1-555-0461',
    date_of_birth: '1968-09-17', gender: 'Male', blood_type: 'AB+', address: '303 Pine Rd, Seattle WA',
    emergency_contact: 'Wei Chen +1-555-0462', allergies: ['Codeine'], chronic_conditions: ['COPD', 'Depression'],
    status: 'active', risk_score: 64, created_at: '2022-11-14T07:30:00Z', updated_at: '2025-05-28T09:45:00Z'
  },
  {
    id: 'p-005', first_name: 'Priya',   last_name: 'Sharma',    email: 'priya.s@hospital.net', phone: '+1-555-0534',
    date_of_birth: '1990-01-22', gender: 'Female', blood_type: 'O-', address: '9 Birch Ct, San Jose CA',
    emergency_contact: 'Raj Sharma +1-555-0535', allergies: ['Latex'], chronic_conditions: [],
    status: 'active', risk_score: 15, created_at: '2025-01-05T11:00:00Z', updated_at: '2025-05-30T10:30:00Z'
  },
  {
    id: 'p-006', first_name: 'Michael', last_name: 'Thompson',  email: 'm.thompson@mail.com', phone: '+1-555-0612',
    date_of_birth: '1955-06-30', gender: 'Male', blood_type: 'A+', address: '71 Walnut Dr, Phoenix AZ',
    emergency_contact: 'Carol Thompson +1-555-0613', allergies: ['NSAIDs', 'Shellfish'], chronic_conditions: ['Heart Failure', 'CKD Stage 3'],
    status: 'critical', risk_score: 95, created_at: '2021-08-07T14:20:00Z', updated_at: '2025-06-04T08:15:00Z'
  },
];

function getRiskBadge(score: number) {
  if (score >= 80) return { label: 'Critical', cls: 'badge-danger' };
  if (score >= 60) return { label: 'High',     cls: 'badge-warning' };
  if (score >= 40) return { label: 'Moderate', cls: 'badge-purple' };
  return { label: 'Low', cls: 'badge-success' };
}

function RiskBar({ score }: { score: number }) {
  const color = score >= 80 ? '#f43f5e' : score >= 60 ? '#f59e0b' : score >= 40 ? '#8b5cf6' : '#06d6a0';
  return (
    <div className="risk-bar-wrap">
      <div className="risk-bar-track">
        <div className="risk-bar-fill" style={{ width: `${score}%`, background: color }} />
      </div>
      <span className="risk-bar-val">{score}</span>
    </div>
  );
}

export default function PatientsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['patients', search],
    queryFn: () => (search ? patientApi.search(search) : patientApi.list()),
  });

  const patients: Patient[] = (data?.patients ?? MOCK_PATIENTS).filter((p: Patient) =>
    statusFilter === 'all' || p.status === statusFilter
  );

  const filtered = search
    ? patients.filter(p =>
        `${p.first_name} ${p.last_name} ${p.email} ${p.phone}`.toLowerCase()
          .includes(search.toLowerCase())
      )
    : patients;

  return (
    <div className="patients-root">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Patients</h1>
          <p className="page-subtitle">{filtered.length} patients registered</p>
        </div>
        <button className="btn btn-primary">
          <UserPlus size={15} />
          New Patient
        </button>
      </div>

      {/* Toolbar */}
      <div className="patients-toolbar">
        <div className="search-box">
          <Search size={16} className="search-icon" />
          <input
            className="input search-input"
            placeholder="Search patients by name, email or phone…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="filter-tabs">
          {['all', 'active', 'critical', 'inactive'].map(s => (
            <button
              key={s}
              className={`filter-tab ${statusFilter === s ? 'filter-tab-active' : ''}`}
              onClick={() => setStatusFilter(s)}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="patient-list">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 80, borderRadius: 12, animationDelay: `${i * 0.07}s` }} />
          ))}
        </div>
      ) : (
        <div className="patient-list">
          {filtered.map((patient, idx) => {
            const risk = getRiskBadge(patient.risk_score);
            return (
              <div
                key={patient.id}
                className="patient-row animate-fade-in"
                style={{ animationDelay: `${idx * 0.05}s` }}
                onClick={() => navigate(`/patients/${patient.id}`)}
              >
                {/* Avatar + name */}
                <div className="patient-identity">
                  <div className="patient-avatar" data-gender={patient.gender}>
                    {patient.first_name[0]}{patient.last_name[0]}
                  </div>
                  <div>
                    <div className="patient-name">
                      {patient.first_name} {patient.last_name}
                      {patient.status === 'critical' && (
                        <AlertCircle size={13} style={{ color: 'var(--danger)', marginLeft: 6 }} />
                      )}
                    </div>
                    <div className="patient-meta">
                      <span><Mail size={11} />{patient.email}</span>
                      <span><Phone size={11} />{patient.phone}</span>
                    </div>
                  </div>
                </div>

                {/* Details */}
                <div className="patient-details">
                  <div className="detail-item">
                    <span className="detail-label">DOB</span>
                    <span className="detail-val">{patient.date_of_birth}</span>
                  </div>
                  <div className="detail-item">
                    <Heart size={12} style={{ color: 'var(--danger)' }} />
                    <span className="detail-val">{patient.blood_type}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Conditions</span>
                    <span className="detail-val conditions-text">
                      {patient.chronic_conditions.length > 0
                        ? patient.chronic_conditions.slice(0, 2).join(', ')
                        : '—'}
                    </span>
                  </div>
                </div>

                {/* Risk */}
                <div className="patient-risk">
                  <span className="detail-label"><Activity size={11} /> Risk Score</span>
                  <RiskBar score={patient.risk_score} />
                  <span className={`badge ${risk.cls}`}>{risk.label}</span>
                </div>

                {/* Status */}
                <div className="patient-status">
                  <span className={`badge ${patient.status === 'active' ? 'badge-success' : patient.status === 'critical' ? 'badge-danger' : 'badge-info'}`}>
                    {patient.status}
                  </span>
                </div>

                <ChevronRight size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
              </div>
            );
          })}

          {filtered.length === 0 && (
            <div className="empty-state">
              <Search size={36} style={{ color: 'var(--text-muted)', marginBottom: 12 }} />
              <p>No patients found for "{search}"</p>
            </div>
          )}
        </div>
      )}

      <style>{`
        .patients-root { display: flex; flex-direction: column; gap: 20px; }

        .patients-toolbar {
          display: flex;
          gap: 12px;
          align-items: center;
          flex-wrap: wrap;
        }

        .search-box {
          position: relative;
          flex: 1;
          min-width: 240px;
          max-width: 480px;
        }
        .search-icon {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--text-muted);
          pointer-events: none;
        }
        .search-input { padding-left: 38px; }

        .filter-tabs {
          display: flex;
          gap: 4px;
          background: var(--bg-card);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-sm);
          padding: 4px;
        }
        .filter-tab {
          padding: 6px 14px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 500;
          color: var(--text-muted);
          background: transparent;
          border: none;
          transition: all 0.15s;
        }
        .filter-tab:hover { color: var(--text-primary); background: var(--bg-hover); }
        .filter-tab-active {
          background: var(--bg-hover);
          color: var(--text-primary);
          border: 1px solid var(--border-default);
        }

        .patient-list { display: flex; flex-direction: column; gap: 8px; }

        .patient-row {
          background: var(--bg-card);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          padding: 16px 20px;
          display: flex;
          align-items: center;
          gap: 20px;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .patient-row:hover {
          border-color: var(--border-strong);
          background: var(--bg-hover);
          transform: translateX(3px);
        }

        .patient-identity {
          display: flex;
          align-items: center;
          gap: 12px;
          min-width: 240px;
          flex-shrink: 0;
        }
        .patient-avatar {
          width: 44px; height: 44px;
          border-radius: 12px;
          display: flex; align-items: center; justify-content: center;
          font-size: 14px; font-weight: 700;
          flex-shrink: 0;
        }
        .patient-avatar[data-gender="Female"] {
          background: linear-gradient(135deg, rgba(236,72,153,0.2), rgba(139,92,246,0.2));
          color: #ec4899;
          border: 1px solid rgba(236,72,153,0.3);
        }
        .patient-avatar[data-gender="Male"] {
          background: linear-gradient(135deg, rgba(79,142,247,0.2), rgba(6,214,160,0.2));
          color: #4f8ef7;
          border: 1px solid rgba(79,142,247,0.3);
        }
        .patient-name {
          font-weight: 600;
          font-size: 14px;
          display: flex; align-items: center;
          margin-bottom: 3px;
        }
        .patient-meta {
          display: flex; gap: 12px;
          font-size: 11px; color: var(--text-muted);
        }
        .patient-meta span {
          display: flex; align-items: center; gap: 4px;
        }

        .patient-details {
          display: flex;
          gap: 20px;
          flex: 1;
          flex-wrap: wrap;
        }
        .detail-item {
          display: flex; align-items: center; gap: 5px;
          flex-direction: column;
          align-items: flex-start;
        }
        .detail-label {
          font-size: 10px; color: var(--text-muted);
          text-transform: uppercase; letter-spacing: 0.05em;
          display: flex; align-items: center; gap: 3px;
        }
        .detail-val { font-size: 13px; font-weight: 500; }
        .conditions-text {
          max-width: 180px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          display: block;
        }

        .patient-risk {
          display: flex; flex-direction: column; gap: 4px;
          min-width: 120px;
        }
        .risk-bar-wrap { display: flex; align-items: center; gap: 8px; }
        .risk-bar-track {
          flex: 1; height: 5px;
          background: var(--bg-surface);
          border-radius: 3px;
          overflow: hidden;
        }
        .risk-bar-fill {
          height: 100%; border-radius: 3px;
          transition: width 1s ease;
        }
        .risk-bar-val { font-size: 12px; font-weight: 700; min-width: 24px; }

        .patient-status { min-width: 80px; }

        .empty-state {
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          padding: 60px;
          color: var(--text-muted);
          font-size: 14px;
        }

        @media (max-width: 900px) {
          .patient-details { display: none; }
          .patient-identity { min-width: 0; }
        }
      `}</style>
    </div>
  );
}
