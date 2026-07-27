// UC-49: Dashboard vận hành thời gian thực cho Quản lý (auto-refresh 60s).
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { FiSearch, FiBell, FiChevronDown, FiMoreHorizontal, FiRefreshCw, FiCalendar, FiCheckCircle, FiDollarSign } from 'react-icons/fi'
import { FaPills, FaFlask } from 'react-icons/fa'
import { reportService } from '../../services/reportService'

const pad2 = (n) => (n == null ? '—' : String(n).padStart(2, '0'))
const fmtAmount = (v) => {
  const n = Number(v) || 0
  if (n >= 1_000_000) return `${(n / 1_000_000).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} triệu đ`
  return `${n.toLocaleString('vi-VN')} đ`
}
const fmtTime = (iso) => (iso ? new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '')
const initials = (name) => (name || '').replace(/^BS\.?\s*/i, '').split(' ').filter(Boolean).slice(-2).map((w) => w[0]).join('').toUpperCase()

const STATUS_CFG = {
  'Đang khám': { c: '#16a34a', bg: '#dcfce7' },
  'Sẵn sàng': { c: '#4f46e5', bg: '#eef2ff' },
  'Tạm nghỉ': { c: '#64748b', bg: '#f1f5f9' },
}
const BAR_COLORS = ['#4f46e5', '#f59e0b', '#10b981', '#0ea5e9', '#ec4899']

const STAT_ICONS = {
  cal: { bg: '#eef2ff', Icon: FiCalendar },
  check: { bg: '#dcfce7', Icon: FiCheckCircle },
  pill: { bg: '#fef3c7', Icon: FaPills },
  money: { bg: '#fee2e2', Icon: FiDollarSign },
  lab: { bg: '#e0e7ff', Icon: FaFlask },
}

function StatCard({ type, label, value, sub }) {
  const cfg = STAT_ICONS[type]
  const Icon = cfg.Icon
  return (
    <div style={{ flex: '1 1 180px', minWidth: 180, background: '#fff', borderRadius: 16, padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={20} color="#334155" />
        </div>
        <FiMoreHorizontal color="#cbd5e1" />
      </div>
      <div style={{ color: '#64748b', fontSize: 13, marginTop: 14 }}>{label}</div>
      <div style={{ marginTop: 4 }}>
        <span style={{ fontSize: 30, fontWeight: 800, color: '#0f172a' }}>{value}</span>
        {sub && <span style={{ color: '#94a3b8', fontSize: 13, marginLeft: 8 }}>{sub}</span>}
      </div>
    </div>
  )
}

export default function ManagerDashboard() {
  const [data, setData] = useState(null)
  const [updatedAt, setUpdatedAt] = useState(null)
  const [error, setError] = useState('')

  const load = async () => {
    try {
      const res = await reportService.operationalDashboard()
      setData(res.data || {})
      setUpdatedAt(new Date())
      setError('')
    } catch (e) {
      setError(e?.response?.data?.message || 'Không tải được dashboard')
    }
  }
  useEffect(() => {
    load()
    const t = setInterval(load, 60000) // UC-49: tự làm mới mỗi 60 giây
    return () => clearInterval(t)
  }, [])

  const queue = data?.doctorQueue || []
  const maxWait = Math.max(1, ...queue.map((q) => q.waiting || 0))
  const pending = data?.pendingPrescriptionList || []

  return (
    <div style={{ background: '#f5f6ff' }}>
      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 28px', background: '#fff', borderBottom: '1px solid #eef0f6' }}>
        <div style={{ flex: 1, maxWidth: 420, display: 'flex', alignItems: 'center', gap: 8, background: '#f1f5f9', borderRadius: 999, padding: '9px 16px' }}>
          <FiSearch color="#94a3b8" />
          <input placeholder="Tìm bệnh nhân, bác sĩ…" style={{ border: 'none', background: 'transparent', outline: 'none', flex: 1, fontSize: 14 }} />
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ width: 40, height: 40, borderRadius: '50%', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><FiBell color="#475569" /></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#1e293b', color: '#fff', borderRadius: 999, padding: '9px 18px', fontWeight: 600, fontSize: 14 }}>Hôm nay <FiChevronDown /></div>
      </div>

      <div style={{ padding: '24px 28px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ color: '#4f46e5', fontSize: 12, letterSpacing: 2, fontWeight: 600 }}>PHÒNG ĐIỀU HÀNH · TRỰC TIẾP</div>
            <h2 style={{ margin: '6px 0 0', fontSize: 20, fontWeight: 700, color: '#0f172a' }}>Tổng quan vận hành</h2>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>Nhịp hoạt động tại phòng khám trong hôm nay.</p>
          </div>
          <button onClick={load} style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 999, padding: '8px 16px', cursor: 'pointer', color: '#475569' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
            Cập nhật lúc {updatedAt ? fmtTime(updatedAt.toISOString()) : '—'} <FiRefreshCw size={14} />
          </button>
        </div>

        {error && <div style={{ color: '#dc2626', margin: '12px 0' }}>{error}</div>}

        {/* 5 thẻ chỉ số */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 20 }}>
          <StatCard type="cal" label="Lịch hẹn hôm nay" value={pad2(data?.todayTotalAppointments)} sub="lịch hẹn" />
          <StatCard type="check" label="Đã hoàn thành" value={pad2(data?.todayCompletedAppointments)} sub={`${data?.progressPercent ?? 0}% tiến độ`} />
          <StatCard type="pill" label="Đơn thuốc chờ cấp phát" value={pad2(data?.pendingPrescriptions)} sub="cần xử lý" />
          <StatCard type="money" label="Hóa đơn chưa thanh toán" value={pad2(data?.outstandingInvoices)} sub={fmtAmount(data?.outstandingInvoiceAmount)} />
          <StatCard type="lab" label="Xét nghiệm đang xử lý" value={pad2(data?.labOrdersInProgress)} sub="mẫu hoạt động" />
        </div>

        {/* 2 panel */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, marginTop: 20 }}>
          {/* Hàng đợi theo bác sĩ */}
          <div style={{ flex: '2 1 560px', background: '#fff', borderRadius: 16, padding: '20px 24px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ color: '#94a3b8', fontSize: 11, letterSpacing: 2, fontWeight: 600 }}>LUỒNG TIẾP NHẬN</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: '#0f172a', marginTop: 2 }}>Hàng đợi theo bác sĩ</div>
              </div>
              <Link to="/manager/daily-schedule" style={{ color: '#4f46e5', textDecoration: 'none', fontWeight: 600, fontSize: 14 }}>Xem lịch khám ›</Link>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr 0.8fr 1.4fr', gap: 8, color: '#94a3b8', fontSize: 11, letterSpacing: 1, fontWeight: 600, margin: '18px 0 6px' }}>
              <div>BÁC SĨ</div><div>TRẠNG THÁI</div><div>ĐANG CHỜ</div><div>TẢI CÔNG VIỆC</div>
            </div>
            {queue.length === 0 ? (
              <div style={{ color: '#94a3b8', padding: '16px 0' }}>Chưa có bác sĩ nào có lịch hôm nay.</div>
            ) : queue.map((q, i) => {
              const st = STATUS_CFG[q.status] || STATUS_CFG['Tạm nghỉ']
              return (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr 0.8fr 1.4fr', gap: 8, alignItems: 'center', padding: '12px 0', borderTop: '1px solid #f1f5f9' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#eef2ff', color: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>{initials(q.doctorName) || 'BS'}</div>
                    <div>
                      <div style={{ fontWeight: 600, color: '#0f172a', fontSize: 14 }}>BS. {q.doctorName}</div>
                      <div style={{ color: '#94a3b8', fontSize: 12 }}>{q.specialty || '—'}</div>
                    </div>
                  </div>
                  <div><span style={{ background: st.bg, color: st.c, borderRadius: 999, padding: '3px 12px', fontSize: 12, fontWeight: 600 }}>{q.status}</span></div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#0f172a' }}>{q.waiting}</div>
                  <div style={{ background: '#f1f5f9', borderRadius: 999, height: 8 }}>
                    <div style={{ width: `${Math.max(6, (q.waiting / maxWait) * 100)}%`, background: BAR_COLORS[i % BAR_COLORS.length], height: '100%', borderRadius: 999 }} />
                  </div>
                </div>
              )
            })}

            <div style={{ background: '#f8fafc', borderRadius: 12, padding: '12px 16px', marginTop: 16, color: '#475569', fontSize: 13 }}>
              <b>{data?.waitingPatientsTotal ?? 0} bệnh nhân</b> đang chờ tư vấn
            </div>
          </div>

          {/* Nhà thuốc — đơn chờ cấp phát */}
          <div style={{ flex: '1 1 300px', background: '#fff', borderRadius: 16, padding: '20px 24px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ color: '#94a3b8', fontSize: 11, letterSpacing: 2, fontWeight: 600 }}>NHÀ THUỐC</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: '#0f172a', marginTop: 2 }}>Đơn chờ cấp phát</div>
              </div>
              <span style={{ background: '#fef3c7', color: '#b45309', borderRadius: 999, padding: '3px 10px', fontSize: 12, fontWeight: 700 }}>{pad2(data?.pendingPrescriptions)} MỚI</span>
            </div>

            <div style={{ marginTop: 14 }}>
              {pending.length === 0 ? (
                <div style={{ color: '#94a3b8', padding: '12px 0' }}>Không có đơn thuốc chờ.</div>
              ) : pending.map((p, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 0', borderTop: i ? '1px solid #f1f5f9' : 'none' }}>
                  <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#eef2ff', color: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><FaPills size={16} /></div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, color: '#0f172a', fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.patientName || '—'}</div>
                    <div style={{ color: '#94a3b8', fontSize: 12 }}>{p.code}{p.doctorName ? ` · BS. ${p.doctorName}` : ''}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ color: '#64748b', fontSize: 12 }}>{fmtTime(p.createdAt)}</div>
                    <div style={{ background: '#f1f5f9', color: '#475569', borderRadius: 999, padding: '2px 8px', fontSize: 11, marginTop: 2 }}>{p.itemCount} loại thuốc</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
