import { useQuery } from '@tanstack/react-query';
import {
  Users, Calendar, BedDouble, AlertTriangle,
  Clock, Star, TrendingUp, TrendingDown,
  Activity, DollarSign, RefreshCw
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import { analyticsApi } from '@/services/api';
import type { DashboardMetrics, DepartmentStat } from '@/types';

function MetricCard({
  icon: Icon, label, value, unit, change, color, trend
}: {
  icon: React.ElementType; label: string; value: string | number;
  unit?: string; change?: number; color: string; trend?: 'up' | 'down' | 'neutral';
}) {
  return (
    <div className="metric-card animate-fade-in">
      <div className="metric-icon" style={{ background: `${color}18`, border: `1px solid ${color}30` }}>
        <Icon size={20} style={{ color }} />
      </div>
      <div className="metric-body">
        <span className="metric-label">{label}</span>
        <div className="metric-value-row">
          <span className="metric-value">{value}</span>
          {unit && <span className="metric-unit">{unit}</span>}
        </div>
        {change !== undefined && (
          <div className={`metric-change ${trend === 'up' ? 'change-up' : trend === 'down' ? 'change-down' : 'change-neutral'}`}>
            {trend === 'up' ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
            <span>{Math.abs(change)}% from yesterday</span>
          </div>
        )}
      </div>
    </div>
  );
}

const DEPT_COLORS = ['#4f8ef7', '#06d6a0', '#f59e0b', '#f43f5e', '#8b5cf6', '#ec4899'];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'var(--bg-elevated)', border: '1px solid var(--border-default)',
      borderRadius: 8, padding: '10px 14px', fontSize: 12
    }}>
      <p style={{ color: 'var(--text-muted)', marginBottom: 4 }}>{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }}>{p.name}: <strong>{p.value}</strong></p>
      ))}
    </div>
  );
};

// Fallback mock data for when API is unavailable
const mockMetrics: DashboardMetrics = {
  total_patients_today: 247,
  appointments_today: 118,
  available_beds: 64,
  critical_alerts: 3,
  avg_wait_time: 18,
  patient_satisfaction: 4.6,
  admission_trend: [
    { label: 'Mon', value: 62 }, { label: 'Tue', value: 78 },
    { label: 'Wed', value: 85 }, { label: 'Thu', value: 71 },
    { label: 'Fri', value: 93 }, { label: 'Sat', value: 54 },
    { label: 'Sun', value: 47 },
  ],
  department_stats: [
    { department: 'Emergency',  patient_count: 42, avg_wait_time: 8,  satisfaction_score: 4.1, appointments_today: 38, available_beds: 4  },
    { department: 'Cardiology', patient_count: 31, avg_wait_time: 22, satisfaction_score: 4.8, appointments_today: 24, available_beds: 12 },
    { department: 'Neurology',  patient_count: 27, avg_wait_time: 35, satisfaction_score: 4.5, appointments_today: 19, available_beds: 7  },
    { department: 'Orthopedics',patient_count: 38, avg_wait_time: 18, satisfaction_score: 4.7, appointments_today: 22, available_beds: 15 },
    { department: 'Pediatrics', patient_count: 55, avg_wait_time: 12, satisfaction_score: 4.9, appointments_today: 31, available_beds: 9  },
    { department: 'Oncology',   patient_count: 22, avg_wait_time: 28, satisfaction_score: 4.6, appointments_today: 14, available_beds: 5  },
  ],
  revenue_this_month: 318750,
  bed_occupancy_rate: 0.74,
};

export default function DashboardPage() {
  const { data: metrics = mockMetrics, isLoading, refetch, isFetching } = useQuery<DashboardMetrics>({
    queryKey: ['dashboard'],
    queryFn: analyticsApi.getDashboard,
    refetchInterval: 30_000,
  });

  const occupancyData = metrics.department_stats.map((d: DepartmentStat, i: number) => ({
    name: d.department.substring(0, 5),
    value: d.patient_count,
    fill: DEPT_COLORS[i % DEPT_COLORS.length],
  }));

  const satisfactionData = metrics.department_stats.map((d: DepartmentStat) => ({
    name: d.department.substring(0, 5),
    score: +d.satisfaction_score.toFixed(1),
    wait: Math.round(d.avg_wait_time),
  }));

  return (
    <div className="dashboard-root">
      {/* Page header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Clinical Dashboard</h1>
          <p className="page-subtitle">Real-time hospital operations overview · Auto-refreshes every 30s</p>
        </div>
        <button
          className="btn btn-ghost"
          onClick={() => refetch()}
          disabled={isFetching}
        >
          <RefreshCw size={15} className={isFetching ? 'spin' : ''} />
          Refresh
        </button>
      </div>

      {/* KPI grid */}
      {isLoading ? (
        <div className="kpi-grid">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 110, borderRadius: 16 }} />
          ))}
        </div>
      ) : (
        <div className="kpi-grid">
          <MetricCard icon={Users}        label="Patients Today"       value={metrics.total_patients_today} change={12}  color="#4f8ef7" trend="up"      />
          <MetricCard icon={Calendar}     label="Appointments Today"   value={metrics.appointments_today}   change={5}   color="#06d6a0" trend="up"      />
          <MetricCard icon={BedDouble}    label="Available Beds"       value={metrics.available_beds}       change={-8}  color="#f59e0b" trend="down"    />
          <MetricCard icon={AlertTriangle}label="Critical Alerts"      value={metrics.critical_alerts}      color="#f43f5e"                              />
          <MetricCard icon={Clock}        label="Avg Wait Time"        value={metrics.avg_wait_time} unit="min" change={-3} color="#8b5cf6" trend="up"   />
          <MetricCard icon={Star}         label="Patient Satisfaction" value={metrics.patient_satisfaction.toFixed(1)} unit="/5" color="#ec4899"         />
        </div>
      )}

      {/* Charts row 1 */}
      <div className="charts-row">
        {/* Admission trend */}
        <div className="chart-card chart-large">
          <div className="chart-header">
            <div>
              <h3 className="chart-title">Patient Admissions</h3>
              <p className="chart-subtitle">7-day rolling trend</p>
            </div>
            <div className="chart-badge">
              <Activity size={13} />
              Live
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={metrics.admission_trend} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="admissionGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#4f8ef7" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#4f8ef7" stopOpacity={0}    />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,130,199,0.1)" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#4a5a7a' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#4a5a7a' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone" dataKey="value" name="Admissions"
                stroke="#4f8ef7" strokeWidth={2.5}
                fill="url(#admissionGrad)" dot={{ r: 4, fill: '#4f8ef7', strokeWidth: 0 }}
                activeDot={{ r: 6, fill: '#4f8ef7', stroke: 'rgba(79,142,247,0.3)', strokeWidth: 4 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Department occupancy */}
        <div className="chart-card chart-small">
          <div className="chart-header">
            <div>
              <h3 className="chart-title">Department Load</h3>
              <p className="chart-subtitle">Active patients by dept</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={occupancyData} cx="50%" cy="50%"
                innerRadius={60} outerRadius={88}
                paddingAngle={3} dataKey="value"
              >
                {occupancyData.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} stroke="transparent" />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="pie-legend">
            {occupancyData.map((d, i) => (
              <div key={i} className="pie-legend-item">
                <span className="pie-legend-dot" style={{ background: d.fill }} />
                <span className="pie-legend-label">{d.name}</span>
                <span className="pie-legend-value">{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Charts row 2 */}
      <div className="charts-row">
        {/* Satisfaction vs wait */}
        <div className="chart-card chart-medium">
          <div className="chart-header">
            <div>
              <h3 className="chart-title">Satisfaction & Wait Times</h3>
              <p className="chart-subtitle">By department · Today</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={satisfactionData} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,130,199,0.1)" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#4a5a7a' }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="left"  tick={{ fontSize: 11, fill: '#4a5a7a' }} axisLine={false} tickLine={false} domain={[3, 5]} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: '#4a5a7a' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar yAxisId="left"  dataKey="score" name="Satisfaction" fill="#06d6a0" radius={[4,4,0,0]} maxBarSize={22} />
              <Bar yAxisId="right" dataKey="wait"  name="Wait (min)"  fill="#f59e0b" radius={[4,4,0,0]} maxBarSize={22} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Summary cards */}
        <div className="chart-card chart-small summary-cards">
          <h3 className="chart-title" style={{ marginBottom: 16 }}>Hospital Overview</h3>
          <div className="summary-list">
            <div className="summary-row">
              <span className="summary-label"><DollarSign size={13} /> Revenue (MTD)</span>
              <span className="summary-val">${(metrics.revenue_this_month / 1000).toFixed(0)}K</span>
            </div>
            <div className="summary-row">
              <span className="summary-label"><BedDouble size={13} /> Bed Occupancy</span>
              <span className="summary-val">{(metrics.bed_occupancy_rate * 100).toFixed(0)}%</span>
            </div>
            {metrics.department_stats.slice(0, 4).map((d: DepartmentStat) => (
              <div key={d.department} className="summary-row">
                <span className="summary-label">{d.department}</span>
                <div className="summary-right">
                  <span className="summary-count">{d.patient_count} pts</span>
                  <div className="summary-bar">
                    <div
                      className="summary-bar-fill"
                      style={{ width: `${Math.min(100, d.patient_count / 60 * 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        .dashboard-root { display: flex; flex-direction: column; gap: 24px; }

        .page-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
          flex-wrap: wrap;
        }
        .page-title {
          font-size: 28px;
          font-family: var(--font-display);
          font-weight: 800;
          letter-spacing: -0.02em;
          margin-bottom: 4px;
        }
        .page-subtitle { color: var(--text-muted); font-size: 13px; }

        .kpi-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
          gap: 16px;
        }

        .metric-card {
          background: var(--bg-card);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-lg);
          padding: 20px;
          display: flex;
          align-items: flex-start;
          gap: 14px;
          transition: border-color 0.2s, transform 0.2s;
        }
        .metric-card:hover {
          border-color: var(--border-default);
          transform: translateY(-2px);
        }
        .metric-icon {
          width: 44px; height: 44px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .metric-body { display: flex; flex-direction: column; gap: 4px; }
        .metric-label { font-size: 12px; color: var(--text-muted); font-weight: 500; text-transform: uppercase; letter-spacing: 0.04em; }
        .metric-value-row { display: flex; align-items: baseline; gap: 5px; }
        .metric-value { font-family: var(--font-display); font-size: 28px; font-weight: 800; letter-spacing: -0.02em; }
        .metric-unit { font-size: 13px; color: var(--text-secondary); }
        .metric-change { display: flex; align-items: center; gap: 4px; font-size: 11px; margin-top: 2px; }
        .change-up   { color: var(--success); }
        .change-down { color: var(--danger); }
        .change-neutral { color: var(--text-muted); }

        .charts-row {
          display: grid;
          grid-template-columns: 1fr 320px;
          gap: 16px;
        }
        @media (max-width: 1024px) {
          .charts-row { grid-template-columns: 1fr; }
        }

        .chart-card {
          background: var(--bg-card);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-lg);
          padding: 22px;
        }
        .chart-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          margin-bottom: 20px;
        }
        .chart-title { font-size: 15px; font-weight: 700; margin-bottom: 3px; }
        .chart-subtitle { font-size: 12px; color: var(--text-muted); }
        .chart-badge {
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 4px 10px;
          background: rgba(6, 214, 160, 0.12);
          border: 1px solid rgba(6, 214, 160, 0.25);
          border-radius: 100px;
          color: var(--success);
          font-size: 11px;
          font-weight: 600;
        }

        .pie-legend {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 6px;
          margin-top: 12px;
        }
        .pie-legend-item {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          color: var(--text-secondary);
        }
        .pie-legend-dot {
          width: 8px; height: 8px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .pie-legend-label { flex: 1; }
        .pie-legend-value { font-weight: 600; color: var(--text-primary); }

        .summary-cards { display: flex; flex-direction: column; }
        .summary-list { display: flex; flex-direction: column; gap: 10px; }
        .summary-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 10px;
          background: var(--bg-surface);
          border-radius: 8px;
          gap: 8px;
        }
        .summary-label {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          color: var(--text-secondary);
        }
        .summary-val {
          font-weight: 700;
          font-size: 14px;
          color: var(--text-primary);
        }
        .summary-right { display: flex; align-items: center; gap: 8px; }
        .summary-count { font-size: 12px; color: var(--accent-primary); font-weight: 600; }
        .summary-bar {
          width: 60px; height: 4px;
          background: var(--bg-hover);
          border-radius: 2px;
          overflow: hidden;
        }
        .summary-bar-fill {
          height: 100%;
          background: var(--gradient-brand);
          border-radius: 2px;
          transition: width 0.8s ease;
        }

        .spin { animation: spin 1s linear infinite; }
      `}</style>
    </div>
  );
}
