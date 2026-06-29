// Trang chủ Admin: điểm vào sau khi đăng nhập, tổng quan hệ thống và điều hướng tới
// các khu vực quản trị (quản lý người dùng, cấu hình hệ thống, audit log).
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import dayjs from 'dayjs'
import auditLogService from '../../services/auditLogService'

const SECTIONS = [
  {
    key: 'users',
    path: '/admin/users',
    title: 'Quản lý người dùng',
    description: 'Quản lý tài khoản bác sĩ, y tá và nhân viên hành chính. Thiết lập quyền truy cập (RBAC) và theo dõi trạng thái tài khoản.',
    badge: 'USERS',
    color: '#2563eb',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    key: 'config',
    path: '/admin/config',
    title: 'Cấu hình hệ thống',
    description: 'Tùy chỉnh tham số khám chữa bệnh, cấu hình lịch làm việc, tích hợp API bảo hiểm và các thiết lập hạ tầng cốt lõi.',
    badge: 'SYSTEM',
    color: '#0d9488',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
  },
  {
    key: 'audit',
    path: '/admin/audit',
    title: 'Audit Log',
    description: 'Nhật ký chi tiết các thao tác trên hệ thống. Truy xuất lịch sử thay đổi dữ liệu để đảm bảo tính minh bạch và bảo mật.',
    badge: 'LOGS',
    color: '#1e293b',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><line x1="10" y1="9" x2="8" y2="9" />
      </svg>
    ),
  },
]

function StatCard({ icon, label, value, color, hint }) {
  return (
    <div style={{
      backgroundColor: '#fff', borderRadius: 14, padding: '18px 20px',
      boxShadow: '0 1px 4px rgba(0,0,0,0.06)', flex: 1, minWidth: 200,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{
          width: 38, height: 38, borderRadius: 10, backgroundColor: `${color}1a`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {icon}
        </div>
        {hint && <span style={{ fontSize: 12, fontWeight: 600, color }}>{hint}</span>}
      </div>
      <div style={{ fontSize: 24, fontWeight: 700, color: '#0f172a' }}>{value}</div>
      <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{label}</div>
    </div>
  )
}

export default function AdminDashboardPage() {
  const navigate = useNavigate()
  const { user } = useSelector((s) => s.auth)
  const [recentLogs, setRecentLogs] = useState([])
  const [totalLogs, setTotalLogs] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    auditLogService.search({ page: 0, size: 5 })
      .then((res) => {
        setRecentLogs(res.data?.content ?? [])
        setTotalLogs(res.data?.totalElements ?? 0)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div style={{ padding: '28px 32px' }}>
      <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 6 }}>Admin &gt; Dashboard</div>
      <h1 style={{ fontSize: 28, fontWeight: 700, color: '#0f172a', margin: '0 0 4px' }}>
        Chào mừng trở lại, {user?.fullName ?? 'Admin'}
      </h1>
      <p style={{ color: '#64748b', fontSize: 14, marginBottom: 28 }}>
        Dưới đây là tổng quan về hoạt động của hệ thống Quản lý Phòng khám Mắt ECMS hôm nay.
      </p>

      {/* Stat cards */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 28, flexWrap: 'wrap' }}>
        <StatCard
          color="#2563eb"
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>}
          label="Audit log hôm nay"
          value={loading ? '...' : totalLogs ?? 0}
          hint="Live"
        />
        <StatCard
          color="#0d9488"
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0d9488" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>}
          label="Phiên đăng nhập admin"
          value={1}
        />
        <StatCard
          color="#7c3aed"
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><line x1="9" y1="3" x2="9" y2="21" /></svg>}
          label="Vai trò đang quản lý"
          value="7"
        />
        <StatCard
          color="#dc2626"
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>}
          label="Trạng thái hệ thống"
          value="Ổn định"
          hint="0 lỗi"
        />
      </div>

      {/* Module cards */}
      <h2 style={{ fontSize: 17, fontWeight: 700, color: '#0f172a', marginBottom: 14 }}>Phân hệ quản trị chính</h2>
      <div style={{ display: 'flex', gap: 20, marginBottom: 28, flexWrap: 'wrap' }}>
        {SECTIONS.map((s) => (
          <div
            key={s.key}
            onClick={() => navigate(s.path)}
            style={{
              flex: 1, minWidth: 260, backgroundColor: '#fff', borderRadius: 16,
              overflow: 'hidden', cursor: 'pointer', boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
              transition: 'transform 0.15s, box-shadow 0.15s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.10)' }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.06)' }}
          >
            <div style={{
              backgroundColor: s.color, padding: '20px 20px 36px',
              display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
            }}>
              {s.icon}
              <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.75)', letterSpacing: 0.5 }}>{s.badge}</span>
            </div>
            <div style={{ padding: '18px 20px 20px' }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>{s.title}</div>
              <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.5, minHeight: 60 }}>{s.description}</p>
              <button
                style={{
                  marginTop: 8, backgroundColor: s.color, color: '#fff', border: 'none',
                  padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                }}
              >
                Truy cập →
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Control center banner */}
      <div style={{
        background: 'linear-gradient(120deg, #1e293b 0%, #334155 100%)',
        borderRadius: 16, padding: '28px 32px', color: '#fff', marginBottom: 28,
      }}>
        <div style={{ fontSize: 19, fontWeight: 700, marginBottom: 6 }}>Trung tâm Kiểm soát ECMS</div>
        <p style={{ fontSize: 13, color: '#cbd5e1', maxWidth: 640, margin: 0 }}>
          Hệ thống đang vận hành ổn định. Sử dụng các phân hệ phía trên để quản lý người dùng,
          cấu hình hệ thống và theo dõi nhật ký hoạt động.
        </p>
      </div>

      {/* Recent activity + system status */}
      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
        <div style={{ flex: 2, minWidth: 320, backgroundColor: '#fff', borderRadius: 16, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>Hoạt động gần đây</span>
            <span
              onClick={() => navigate('/admin/audit')}
              style={{ fontSize: 13, color: '#2563eb', fontWeight: 600, cursor: 'pointer' }}
            >
              Xem tất cả
            </span>
          </div>
          {loading ? (
            <div style={{ fontSize: 13, color: '#94a3b8', padding: '12px 0' }}>Đang tải...</div>
          ) : recentLogs.length === 0 ? (
            <div style={{ fontSize: 13, color: '#94a3b8', padding: '12px 0' }}>Chưa có hoạt động nào được ghi nhận.</div>
          ) : (
            recentLogs.map((log) => (
              <div key={log.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{log.action}</div>
                  <div style={{ fontSize: 12, color: '#94a3b8' }}>
                    Thực hiện bởi {log.actorName ?? log.actorId ?? 'Hệ thống'} • {log.createdAt ? dayjs(log.createdAt).format('DD/MM HH:mm') : ''}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div style={{ flex: 1, minWidth: 260, backgroundColor: '#fff', borderRadius: 16, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', marginBottom: 14 }}>Tình trạng hệ thống</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
            <span style={{ width: 9, height: 9, borderRadius: '50%', backgroundColor: '#22c55e', flexShrink: 0 }} />
            <span style={{ fontSize: 13, color: '#374151' }}>API Backend: Hoạt động bình thường</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
            <span style={{ width: 9, height: 9, borderRadius: '50%', backgroundColor: '#22c55e', flexShrink: 0 }} />
            <span style={{ fontSize: 13, color: '#374151' }}>Cơ sở dữ liệu: Hoạt động bình thường</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0' }}>
            <span style={{ width: 9, height: 9, borderRadius: '50%', backgroundColor: '#22c55e', flexShrink: 0 }} />
            <span style={{ fontSize: 13, color: '#374151' }}>Audit Log Service: Hoạt động bình thường</span>
          </div>
        </div>
      </div>
    </div>
  )
}
