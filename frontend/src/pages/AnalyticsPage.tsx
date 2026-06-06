import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis } from 'recharts';
import { BarChart3, TrendingUp, Users, Star } from 'lucide-react';
import { analyticsApi } from '@/services/api';
import type { DashboardMetrics } from '@/types';

const mockMetrics: DashboardMetrics = {
  total_patients_today: 247, appointments_today: 118, available_beds: 64,
  critical_alerts: 3, avg_wait_time: 18, patient_satisfaction: 4.6,
  admission_trend: [
    { label: 'Mon', value: 62 }, { label: 'Tue', value: 78 }, { label: 'Wed', value: 85 },
    { label: 'Thu', value: 71 }, { label: 'Fri', value: 93 }, { label: 'Sat', value: 54 }, { label: 'Sun', value: 47 },
  ],
  department_stats: [
    { department: 'Emergency',  patient_count: 42, avg_wait_time: 8,  satisfaction_score: 4.1, appointments_today: 38, available_beds: 4  },
    { department: 'Cardiology', patient_count: 31, avg_wait_time: 22, satisfaction_score: 4.8, appointments_today: 24, available_beds: 12 },
    { department: 'Neurology',  patient_count: 27, avg_wait_time: 35, satisfaction_score: 4.5, appointments_today: 19, available_beds: 7  },
    { department: 'Orthopedics',patient_count: 38, avg_wait_time: 18, satisfaction_score: 4.7, appointments_today: 22, available_beds: 15 },
    { department: 'Pediatrics', patient_count: 55, avg_wait_time: 12, satisfaction_score: 4.9, appointments_today: 31, available_beds: 9  },
    { department: 'Oncology',   patient_count: 22, avg_wait_time: 28, satisfaction_score: 4.6, appointments_today: 14, available_beds: 5  },
  ],
  revenue_this_month: 318750, bed_occupancy_rate: 0.74,
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: 8, padding: '10px 14px', fontSize: 12 }}>
      <p style={{ color: 'var(--text-muted)', marginBottom: 4 }}>{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }}>{p.name}: <strong>{p.value}</strong></p>
      ))}
    </div>
  );
};

export default function AnalyticsPage() {
  const { data: metrics = mockMetrics } = useQuery<DashboardMetrics>({ queryKey: ['analytics-dashboard'], queryFn: analyticsApi.getDashboard });

  const radarData = metrics.department_stats.map(d => ({
    dept: d.department.substring(0, 5),
    Satisfaction: +(d.satisfaction_score * 20).toFixed(0),
    Throughput: Math.round(d.patient_count / 60 * 100),
    Efficiency: Math.round(100 - d.avg_wait_time),
  }));

  const revenueData = [
    { month: 'Jan', revenue: 280000, target: 300000 },
    { month: 'Feb', revenue: 295000, target: 300000 },
    { month: 'Mar', revenue: 312000, target: 310000 },
    { month: 'Apr', revenue: 287000, target: 315000 },
    { month: 'May', revenue: 331000, target: 320000 },
    { month: 'Jun', revenue: metrics.revenue_this_month, target: 325000 },
  ];

  return (
    <div className="analytics-root">
      <div className="page-header">
        <div>
          <h1 className="page-title">Analytics & Insights</h1>
          <p className="page-subtitle">Hospital performance metrics · Updated every 30 seconds</p>
        </div>
      </div>

      {/* KPI strip */}
      <div className="kpi-strip">
        {[
          { icon: Users,    label: 'Patients Today',    value: metrics.total_patients_today, color: '#4f8ef7' },
          { icon: BarChart3,label: 'Avg Wait Time',     value: `${metrics.avg_wait_time}m`,  color: '#f59e0b' },
          { icon: Star,     label: 'Satisfaction',      value: `${metrics.patient_satisfaction.toFixed(1)}/5`, color: '#ec4899' },
          { icon: TrendingUp,label: 'Revenue MTD',      value: `$${(metrics.revenue_this_month/1000).toFixed(0)}K`, color: '#06d6a0' },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="kpi-strip-item">
            <div className="kpi-strip-icon" style={{ background: `${color}18`, border: `1px solid ${color}30` }}>
              <Icon size={18} style={{ color }} />
            </div>
            <div>
              <div className="kpi-strip-val">{value}</div>
              <div className="kpi-strip-label">{label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="analytics-grid">
        {/* Revenue vs Target */}
        <div className="analytics-card span-2">
          <div className="chart-header">
            <div>
              <h3 className="chart-title">Revenue vs Target (2025)</h3>
              <p className="chart-subtitle">Monthly financial performance · USD</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={revenueData} margin={{ top: 5, right: 20, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,130,199,0.1)" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#4a5a7a' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#4a5a7a' }} axisLine={false} tickLine={false} tickFormatter={v => `$${v/1000}K`} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="revenue" name="Revenue" stroke="#4f8ef7" strokeWidth={2.5} dot={{ r: 4, fill: '#4f8ef7' }} />
              <Line type="monotone" dataKey="target"  name="Target"  stroke="#f59e0b" strokeWidth={2} strokeDasharray="6 3" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Department performance radar */}
        <div className="analytics-card">
          <div className="chart-header">
            <div>
              <h3 className="chart-title">Department Performance</h3>
              <p className="chart-subtitle">Multi-dimensional analysis</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="rgba(99,130,199,0.15)" />
              <PolarAngleAxis dataKey="dept" tick={{ fontSize: 10, fill: '#4a5a7a' }} />
              <Radar name="Satisfaction" dataKey="Satisfaction" stroke="#4f8ef7" fill="#4f8ef7" fillOpacity={0.15} strokeWidth={2} />
              <Radar name="Efficiency"   dataKey="Efficiency"   stroke="#06d6a0" fill="#06d6a0" fillOpacity={0.1}  strokeWidth={2} />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Patient volume by department */}
        <div className="analytics-card span-2">
          <div className="chart-header">
            <div>
              <h3 className="chart-title">Patient Volume by Department</h3>
              <p className="chart-subtitle">Today · Active patients</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={metrics.department_stats} margin={{ top: 5, right: 20, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,130,199,0.1)" vertical={false} />
              <XAxis dataKey="department" tick={{ fontSize: 10, fill: '#4a5a7a' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#4a5a7a' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="patient_count" name="Patients" fill="url(#barGrad)" radius={[6, 6, 0, 0]} maxBarSize={40} />
              <defs>
                <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor="#4f8ef7" stopOpacity={1} />
                  <stop offset="100%" stopColor="#7c4dff" stopOpacity={0.7} />
                </linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Wait time vs satisfaction table */}
        <div className="analytics-card span-full">
          <h3 className="chart-title" style={{ marginBottom: 16 }}>Department Scorecard</h3>
          <div className="scorecard-table">
            <div className="scorecard-header">
              <span>Department</span>
              <span>Patients</span>
              <span>Avg Wait</span>
              <span>Satisfaction</span>
              <span>Available Beds</span>
              <span>Appointments</span>
            </div>
            {metrics.department_stats.map((d, i) => (
              <div key={i} className="scorecard-row">
                <span className="sc-dept">{d.department}</span>
                <span className="sc-val">{d.patient_count}</span>
                <span className="sc-val" style={{ color: d.avg_wait_time > 30 ? 'var(--danger)' : d.avg_wait_time > 20 ? 'var(--warning)' : 'var(--success)' }}>
                  {d.avg_wait_time}m
                </span>
                <span className="sc-val">
                  <span className="stars">{'★'.repeat(Math.round(d.satisfaction_score))}{'☆'.repeat(5 - Math.round(d.satisfaction_score))}</span>
                  {d.satisfaction_score.toFixed(1)}
                </span>
                <span className="sc-val" style={{ color: d.available_beds < 5 ? 'var(--danger)' : 'var(--text-primary)' }}>
                  {d.available_beds}
                </span>
                <span className="sc-val">{d.appointments_today}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        .analytics-root { display: flex; flex-direction: column; gap: 20px; }
        .kpi-strip {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 12px;
        }
        .kpi-strip-item {
          background: var(--bg-card);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          padding: 16px 20px;
          display: flex; align-items: center; gap: 14px;
          transition: border-color 0.2s;
        }
        .kpi-strip-item:hover { border-color: var(--border-default); }
        .kpi-strip-icon {
          width: 40px; height: 40px;
          border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .kpi-strip-val { font-family: var(--font-display); font-size: 22px; font-weight: 800; letter-spacing: -0.02em; }
        .kpi-strip-label { font-size: 11px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; }

        .analytics-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
        }
        @media (max-width: 1100px) { .analytics-grid { grid-template-columns: 1fr; } }
        .analytics-card {
          background: var(--bg-card);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-lg);
          padding: 22px;
        }
        .span-2 { grid-column: span 2; }
        .span-full { grid-column: 1 / -1; }

        .chart-header { margin-bottom: 18px; }
        .chart-title { font-size: 15px; font-weight: 700; margin-bottom: 3px; }
        .chart-subtitle { font-size: 12px; color: var(--text-muted); }

        .scorecard-table { width: 100%; }
        .scorecard-header, .scorecard-row {
          display: grid;
          grid-template-columns: 2fr 1fr 1fr 2fr 1.5fr 1.5fr;
          gap: 8px;
          padding: 10px 12px;
          border-radius: 8px;
        }
        .scorecard-header {
          font-size: 10px; font-weight: 700;
          color: var(--text-muted);
          text-transform: uppercase; letter-spacing: 0.06em;
          margin-bottom: 4px;
        }
        .scorecard-row {
          background: var(--bg-surface);
          margin-bottom: 4px;
          font-size: 13px;
          transition: background 0.15s;
        }
        .scorecard-row:hover { background: var(--bg-hover); }
        .sc-dept { font-weight: 600; }
        .sc-val { font-weight: 500; }
        .stars { color: var(--accent-amber); font-size: 11px; margin-right: 4px; }
      `}</style>
    </div>
  );
}
