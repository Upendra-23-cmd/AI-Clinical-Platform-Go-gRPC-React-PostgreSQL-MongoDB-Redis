import { useState } from 'react';
import {  Clock, Video, MapPin, Plus, Filter, ChevronRight, User } from 'lucide-react';

const MOCK_APPOINTMENTS = [
  { id: 'a-001', patient_id: 'p-001', doctor_id: 'd-01', doctor_name: 'Dr. Sarah Chen', department: 'Cardiology', scheduled_at: '2025-06-05T09:00:00Z', duration_minutes: 30, status: 'confirmed', appointment_type: 'Follow-up', notes: 'Quarterly cardiac review', room: '3B-12', is_telemedicine: false, wait_time_minutes: 0, created_at: '' },
  { id: 'a-002', patient_id: 'p-003', doctor_id: 'd-02', doctor_name: 'Dr. Marcus Patel', department: 'Pulmonology', scheduled_at: '2025-06-05T10:30:00Z', duration_minutes: 45, status: 'checked_in', appointment_type: 'Specialist', notes: 'Asthma management review', room: '2A-05', is_telemedicine: false, wait_time_minutes: 12, created_at: '' },
  { id: 'a-003', patient_id: 'p-005', doctor_id: 'd-03', doctor_name: 'Dr. Anika Williams', department: 'General', scheduled_at: '2025-06-05T11:00:00Z', duration_minutes: 20, status: 'scheduled', appointment_type: 'Check-up', notes: 'Annual wellness visit', room: '', is_telemedicine: true, meeting_url: 'https://meet.healthos.io/room-123', wait_time_minutes: 0, created_at: '' },
  { id: 'a-004', patient_id: 'p-002', doctor_id: 'd-04', doctor_name: 'Dr. James Rodriguez', department: 'Neurology', scheduled_at: '2025-06-05T14:00:00Z', duration_minutes: 60, status: 'scheduled', appointment_type: 'Consultation', notes: 'Initial consultation post-MRI', room: '4C-08', is_telemedicine: false, wait_time_minutes: 0, created_at: '' },
  { id: 'a-005', patient_id: 'p-004', doctor_id: 'd-01', doctor_name: 'Dr. Sarah Chen', department: 'Cardiology', scheduled_at: '2025-06-06T09:30:00Z', duration_minutes: 30, status: 'scheduled', appointment_type: 'Follow-up', notes: 'Post-procedure check', room: '3B-12', is_telemedicine: false, wait_time_minutes: 0, created_at: '' },
  { id: 'a-006', patient_id: 'p-006', doctor_id: 'd-05', doctor_name: 'Dr. Lin Zhao', department: 'Oncology', scheduled_at: '2025-06-06T11:00:00Z', duration_minutes: 90, status: 'confirmed', appointment_type: 'Treatment', notes: 'Chemotherapy cycle 4', room: 'ONC-02', is_telemedicine: false, wait_time_minutes: 0, created_at: '' },
];

const PATIENT_NAMES: Record<string, string> = {
  'p-001': 'Amara Okafor', 'p-002': 'James Harrington', 'p-003': 'Sofia Reyes',
  'p-004': 'David Chen', 'p-005': 'Priya Sharma', 'p-006': 'Michael Thompson',
};

const STATUS_COLORS: Record<string, string> = {
  scheduled: 'badge-info', confirmed: 'badge-success',
  checked_in: 'badge-warning', completed: 'badge-purple', cancelled: 'badge-danger',
};

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
}

export default function AppointmentsPage() {
  const [view, setView] = useState<'list' | 'calendar'>('list');
  const [statusFilter, setStatusFilter] = useState('all');

  const filtered = MOCK_APPOINTMENTS.filter(a =>
    statusFilter === 'all' || a.status === statusFilter
  );

  const today = filtered.filter(a => new Date(a.scheduled_at).toDateString() === new Date().toDateString());
  const upcoming = filtered.filter(a => new Date(a.scheduled_at).toDateString() !== new Date().toDateString());

  return (
    <div className="appt-root">
      <div className="page-header">
        <div>
          <h1 className="page-title">Appointments</h1>
          <p className="page-subtitle">{today.length} today · {upcoming.length} upcoming</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <div className="view-toggle">
            {(['list', 'calendar'] as const).map(v => (
              <button key={v} className={`view-btn ${view === v ? 'active' : ''}`} onClick={() => setView(v)}>
                {v.charAt(0).toUpperCase() + v.slice(1)}
              </button>
            ))}
          </div>
          <button className="btn btn-primary"><Plus size={14} /> New Appointment</button>
        </div>
      </div>

      {/* Stats */}
      <div className="appt-stats">
        {[
          { label: 'Today', value: today.length, color: '#4f8ef7' },
          { label: 'Checked In', value: filtered.filter(a => a.status === 'checked_in').length, color: '#f59e0b' },
          { label: 'Confirmed', value: filtered.filter(a => a.status === 'confirmed').length, color: '#06d6a0' },
          { label: 'Telemedicine', value: filtered.filter(a => a.is_telemedicine).length, color: '#8b5cf6' },
        ].map(s => (
          <div key={s.label} className="appt-stat">
            <span className="appt-stat-val" style={{ color: s.color }}>{s.value}</span>
            <span className="appt-stat-label">{s.label}</span>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="filter-row">
        <Filter size={14} style={{ color: 'var(--text-muted)' }} />
        {['all', 'scheduled', 'confirmed', 'checked_in', 'completed', 'cancelled'].map(s => (
          <button
            key={s}
            className={`filter-tab ${statusFilter === s ? 'filter-tab-active' : ''}`}
            onClick={() => setStatusFilter(s)}
          >
            {s.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Appointments list grouped by day */}
      <div className="appt-list">
        {today.length > 0 && (
          <div className="appt-group">
            <div className="appt-group-label">Today — {new Date().toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}</div>
            {today.map((appt, i) => (
              <ApptCard key={appt.id} appt={appt} idx={i} />
            ))}
          </div>
        )}
        {upcoming.length > 0 && (
          <div className="appt-group">
            <div className="appt-group-label">Upcoming</div>
            {upcoming.map((appt, i) => (
              <ApptCard key={appt.id} appt={appt} idx={i} />
            ))}
          </div>
        )}
      </div>

      <style>{`
        .appt-root { display: flex; flex-direction: column; gap: 20px; }
        .appt-stats {
          display: flex; gap: 4px;
          background: var(--bg-card);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          overflow: hidden;
        }
        .appt-stat {
          flex: 1; display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          padding: 18px 12px;
          gap: 4px;
          border-right: 1px solid var(--border-subtle);
        }
        .appt-stat:last-child { border-right: none; }
        .appt-stat-val { font-family: var(--font-display); font-size: 28px; font-weight: 800; }
        .appt-stat-label { font-size: 11px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; }

        .view-toggle {
          display: flex;
          background: var(--bg-card);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-sm);
          padding: 3px;
        }
        .view-btn {
          padding: 6px 14px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 500;
          background: transparent;
          border: none;
          color: var(--text-muted);
          transition: all 0.15s;
        }
        .view-btn.active { background: var(--bg-hover); color: var(--text-primary); border: 1px solid var(--border-default); }

        .filter-row {
          display: flex; align-items: center; gap: 6px; flex-wrap: wrap;
        }
        .filter-tabs { display: flex; gap: 4px; }
        .filter-tab {
          padding: 5px 12px;
          border-radius: 100px;
          font-size: 12px;
          font-weight: 500;
          background: transparent;
          border: 1px solid transparent;
          color: var(--text-muted);
          transition: all 0.15s;
          text-transform: capitalize;
        }
        .filter-tab:hover { color: var(--text-primary); background: var(--bg-hover); }
        .filter-tab-active {
          background: rgba(79, 142, 247, 0.12);
          border-color: rgba(79, 142, 247, 0.25);
          color: var(--accent-primary);
        }

        .appt-list { display: flex; flex-direction: column; gap: 20px; }
        .appt-group { display: flex; flex-direction: column; gap: 8px; }
        .appt-group-label {
          font-size: 12px; font-weight: 600;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.06em;
          padding: 0 4px;
          margin-bottom: 4px;
        }
      `}</style>
    </div>
  );
}

function ApptCard({ appt, idx }: { appt: typeof MOCK_APPOINTMENTS[0]; idx: number }) {
  return (
    <div className="appt-card animate-fade-in" style={{ animationDelay: `${idx * 0.06}s` }}>
      {/* Time */}
      <div className="appt-time-col">
        <span className="appt-time">{formatTime(appt.scheduled_at)}</span>
        <span className="appt-date-sm">{formatDate(appt.scheduled_at)}</span>
        <span className="appt-duration"><Clock size={10} />{appt.duration_minutes}m</span>
      </div>

      {/* Divider */}
      <div className="appt-divider">
        <div className="appt-dot" />
        <div className="appt-line" />
      </div>

      {/* Content */}
      <div className="appt-content">
        <div className="appt-main-row">
          <div>
            <div className="appt-title">{appt.appointment_type} · {appt.department}</div>
            <div className="appt-doctor">{appt.doctor_name}</div>
          </div>
          <div className="appt-badges">
            <span className={`badge ${STATUS_COLORS[appt.status] || 'badge-info'}`}>{appt.status.replace('_', ' ')}</span>
            {appt.is_telemedicine && <span className="badge badge-purple"><Video size={9} />Telemedicine</span>}
          </div>
        </div>
        <div className="appt-meta-row">
          <span><User size={11} />{PATIENT_NAMES[appt.patient_id] || appt.patient_id}</span>
          {appt.room && <span><MapPin size={11} />Room {appt.room}</span>}
          {appt.wait_time_minutes > 0 && <span className="wait-badge"><Clock size={10} />Waiting {appt.wait_time_minutes}m</span>}
          {appt.notes && <span className="appt-notes">{appt.notes}</span>}
        </div>
      </div>

      <button className="btn btn-ghost appt-action">
        <ChevronRight size={14} />
      </button>

      <style>{`
        .appt-card {
          background: var(--bg-card);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          padding: 14px 18px;
          display: flex;
          align-items: stretch;
          gap: 14px;
          transition: all 0.2s;
        }
        .appt-card:hover {
          border-color: var(--border-default);
          background: var(--bg-hover);
        }
        .appt-time-col {
          display: flex; flex-direction: column;
          align-items: flex-end;
          min-width: 70px;
          padding-top: 2px;
        }
        .appt-time { font-size: 16px; font-weight: 700; color: var(--accent-primary); }
        .appt-date-sm { font-size: 10px; color: var(--text-muted); }
        .appt-duration {
          display: flex; align-items: center; gap: 3px;
          font-size: 10px; color: var(--text-muted);
          margin-top: 4px;
        }
        .appt-divider {
          display: flex; flex-direction: column;
          align-items: center; gap: 0;
          flex-shrink: 0;
        }
        .appt-dot {
          width: 10px; height: 10px;
          border-radius: 50%;
          background: var(--accent-primary);
          border: 2px solid var(--bg-card);
          flex-shrink: 0;
          margin-top: 4px;
          box-shadow: 0 0 8px rgba(79,142,247,0.4);
        }
        .appt-line {
          flex: 1; width: 2px;
          background: linear-gradient(to bottom, rgba(79,142,247,0.4), transparent);
        }
        .appt-content { flex: 1; min-width: 0; }
        .appt-main-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
          margin-bottom: 6px;
        }
        .appt-title { font-size: 14px; font-weight: 600; margin-bottom: 2px; }
        .appt-doctor { font-size: 12px; color: var(--text-secondary); }
        .appt-badges { display: flex; gap: 5px; flex-wrap: wrap; flex-shrink: 0; }
        .appt-meta-row {
          display: flex; align-items: center; gap: 12px;
          font-size: 11px; color: var(--text-muted);
          flex-wrap: wrap;
        }
        .appt-meta-row span { display: flex; align-items: center; gap: 4px; }
        .appt-notes {
          font-style: italic;
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
          max-width: 200px;
        }
        .wait-badge {
          display: flex; align-items: center; gap: 4px;
          color: var(--warning) !important;
          font-weight: 600;
        }
        .appt-action {
          align-self: center;
          padding: 6px;
          flex-shrink: 0;
        }
      `}</style>
    </div>
  );
}


