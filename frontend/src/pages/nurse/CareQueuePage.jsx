import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import { Avatar, Button, Empty, Input, Progress, Select, Tag, Tooltip, message } from 'antd'
import {
  SearchOutlined, ReloadOutlined, ClockCircleOutlined, SwapOutlined,
  AlertOutlined, CheckCircleFilled, ExclamationCircleFilled,
} from '@ant-design/icons'
import { careSessionService } from '../../services/careSessionService'

const STATUS_INFO = {
  BOOKED: { label: 'Chờ khám', color: 'blue' },
  IN_PROGRESS: { label: 'Đang thực hiện', color: 'orange' },
  COMPLETED: { label: 'Hoàn thành', color: 'green' },
  CHECKED_OUT: { label: 'Đã trả', color: 'green' },
  CANCELLED: { label: 'Đã huỷ', color: 'red' },
}

// Chỉ những buổi còn thao tác được (chưa bắt đầu / đang khám dở) mới cho vào trang thực hiện
const ACTIONABLE_STATUSES = new Set(['BOOKED', 'IN_PROGRESS'])
const PAGE_SIZE = 8

// UC-31 POST-1: "queue refreshed in real time" — polling nhẹ, cùng chu kỳ với chuông
// thông báo (NotificationBell) trong hệ thống, không dùng websocket.
const POLL_INTERVAL_MS = 30000

const SERVICE_ICONS = [
  [/thiền/i, '🧘'],
  [/massage/i, '💆'],
  [/công nghệ|thư giãn/i, '💧'],
  [/phục hồi/i, '👁️'],
  [/toàn diện/i, '🌿'],
]
function iconFor(serviceName) {
  const hit = SERVICE_ICONS.find(([re]) => re.test(serviceName || ''))
  return hit ? hit[1] : '🩺'
}

const AVATAR_COLORS = ['#2563eb', '#0d9488', '#c026d3', '#ea580c', '#65a30d', '#dc2626', '#7c3aed']
function colorFor(id) {
  return AVATAR_COLORS[(id || 0) % AVATAR_COLORS.length]
}
function initials(name) {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  return parts[parts.length - 1][0]?.toUpperCase() || '?'
}

function formatTime(dt) {
  return dt ? dayjs(dt).format('HH:mm') : ''
}

function StatCard({ title, children }) {
  return (
    <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: '16px 18px', flex: 1, minWidth: 180 }}>
      <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600, marginBottom: 8 }}>{title}</div>
      {children}
    </div>
  )
}

export default function CareQueuePage() {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [anchorDate, setAnchorDate] = useState(dayjs().startOf('day'))
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [sortDir, setSortDir] = useState('asc')
  const [page, setPage] = useState(1)
  const navigate = useNavigate()

  const fetchQueue = async (date = anchorDate, { silent = false } = {}) => {
    if (!silent) setLoading(true)
    setError('')
    try {
      const res = await careSessionService.getQueue(date.format('YYYY-MM-DD'))
      setSessions(res.data || [])
    } catch {
      if (!silent) setError('Không thể tải hàng đợi')
    } finally {
      if (!silent) setLoading(false)
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchQueue(anchorDate)
    // Chỉ polling khi đang xem đúng ngày hôm nay — xem ngày khác thì dữ liệu tĩnh, không cần.
    if (!anchorDate.isSame(dayjs(), 'day')) return
    const timer = setInterval(() => fetchQueue(anchorDate, { silent: true }), POLL_INTERVAL_MS)
    return () => clearInterval(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anchorDate])

  const goToday = () => {
    const today = dayjs().startOf('day')
    if (today.isSame(anchorDate, 'day')) fetchQueue(today) // đã ở hôm nay → ép tải lại
    else setAnchorDate(today)
  }
  const goPrev = () => setAnchorDate(d => d.subtract(1, 'day'))
  const goNext = () => setAnchorDate(d => d.add(1, 'day'))

  const isToday = anchorDate.isSame(dayjs(), 'day')
  const dateTitle = anchorDate.toDate().toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  // ---- Thống kê tổng quan trong ngày — tất cả tính từ dữ liệu thật, không có số ảo ----
  const doneCount = sessions.filter(s => s.status === 'COMPLETED' || s.status === 'CHECKED_OUT').length
  const activeSession = sessions.find(s => s.status === 'IN_PROGRESS')
  const upcoming = [...sessions]
    .filter(s => s.status === 'BOOKED')
    .sort((a, b) => new Date(a.scheduledDateTime) - new Date(b.scheduledDateTime))[0]
  const minutesToNext = upcoming ? dayjs(upcoming.scheduledDateTime).diff(dayjs(), 'minute') : null

  const waitingCount = sessions.filter(s => s.status === 'BOOKED').length
  const overdueCount = sessions.filter(s => s.status === 'BOOKED' && s.checkedIn && dayjs(s.scheduledDateTime).isBefore(dayjs())).length
  const incidentCount = sessions.filter(s => s.isIncident).length

  // Tìm nhanh theo tên/mã/SĐT bệnh nhân — giống ô tìm bệnh nhân của lễ tân
  const kw = search.trim().toLowerCase()
  const filtered = useMemo(() => {
    let list = sessions
    if (kw) list = list.filter(s => [s.patientName, s.patientPhone, s.patientCode].filter(Boolean).some(v => v.toLowerCase().includes(kw)))
    if (statusFilter !== 'ALL') list = list.filter(s => s.status === statusFilter)
    list = [...list].sort((a, b) => {
      const diff = new Date(a.scheduledDateTime) - new Date(b.scheduledDateTime)
      return sortDir === 'asc' ? diff : -diff
    })
    return list
  }, [sessions, kw, statusFilter, sortDir])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pageItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  const handleEmergency = () => {
    if (activeSession) navigate(`/nurse/deliver/${activeSession.id}`)
    else message.info('Hiện không có buổi khám nào đang thực hiện để báo sự cố.')
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', padding: '32px 16px' }}>
      <div style={{ maxWidth: 1180, margin: '0 auto' }}>
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1e293b', margin: 0 }}>Hàng đợi buổi khám</h1>
          <p style={{ color: '#64748b', margin: '4px 0 0', fontSize: 14, textTransform: 'capitalize' }}>
            {isToday ? `Hôm nay — ${dateTitle}` : dateTitle}
          </p>
        </div>

        {error && <div style={{ background: '#fee2e2', color: '#dc2626', padding: '12px 16px', borderRadius: 8, marginBottom: 16 }}>{error}</div>}

        {/* Stat cards */}
        <div style={{ display: 'flex', gap: 14, marginBottom: 20, flexWrap: 'wrap' }}>
          <StatCard title="Mục tiêu hôm nay">
            <div style={{ fontSize: 24, fontWeight: 700, color: '#1e293b' }}>{doneCount}/{sessions.length}</div>
            <Progress percent={sessions.length ? Math.round((doneCount / sessions.length) * 100) : 0} showInfo={false} size="small" strokeColor="#2563eb" style={{ marginTop: 6 }} />
          </StatCard>

          <StatCard title="Phiên đang thực hiện">
            <div style={{ fontSize: 20, fontWeight: 700, color: activeSession ? '#ea580c' : '#1e293b' }}>
              {activeSession ? activeSession.patientName : 'Không có'}
            </div>
            <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
              {activeSession
                ? activeSession.serviceName
                : minutesToNext != null
                  ? (minutesToNext <= 0 ? 'Đến giờ buổi tiếp theo' : `Tiếp theo sau ${minutesToNext} phút`)
                  : 'Không có buổi nào tiếp theo'}
            </div>
          </StatCard>

          <StatCard title="Tình trạng hàng đợi">
            <div style={{ fontSize: 20, fontWeight: 700, color: overdueCount > 0 ? '#dc2626' : '#16a34a' }}>
              {overdueCount > 0 ? 'Cần chú ý' : 'Ổn định'}
            </div>
            <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
              {waitingCount} đang chờ{overdueCount > 0 ? ` • ${overdueCount} đã trễ giờ` : ''}
            </div>
          </StatCard>

          <StatCard title="Cảnh báo sự cố">
            <div style={{ fontSize: 24, fontWeight: 700, color: incidentCount > 0 ? '#dc2626' : '#1e293b' }}>{incidentCount}</div>
            <div style={{ fontSize: 12, color: incidentCount > 0 ? '#dc2626' : '#94a3b8', marginTop: 4 }}>
              {incidentCount > 0 ? 'Có buổi ghi nhận sự cố' : 'Không có sự cố'}
            </div>
          </StatCard>
        </div>

        {/* Thanh điều hướng ngày + tìm kiếm/lọc/sắp xếp */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', border: '1px solid #d1d5db', borderRadius: 8, overflow: 'hidden' }}>
            <button onClick={goPrev} style={{ padding: '8px 12px', border: 'none', background: '#fff', cursor: 'pointer', borderRight: '1px solid #e2e8f0' }}>‹</button>
            <button onClick={goToday} style={{ padding: '8px 14px', border: 'none', background: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#2563eb', borderRight: '1px solid #e2e8f0' }}>Hôm nay</button>
            <button onClick={goNext} style={{ padding: '8px 12px', border: 'none', background: '#fff', cursor: 'pointer' }}>›</button>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Input
              allowClear
              placeholder="Tìm bệnh nhân theo tên hoặc số điện thoại..."
              prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              style={{ width: 260 }}
            />
            <Select
              value={statusFilter}
              onChange={(v) => { setStatusFilter(v); setPage(1) }}
              style={{ width: 170 }}
              options={[
                { value: 'ALL', label: 'Tất cả trạng thái' },
                { value: 'BOOKED', label: 'Chờ khám' },
                { value: 'IN_PROGRESS', label: 'Đang thực hiện' },
                { value: 'COMPLETED', label: 'Hoàn thành' },
                { value: 'CANCELLED', label: 'Đã huỷ' },
              ]}
            />
            <Tooltip title={sortDir === 'asc' ? 'Đang xếp: sớm nhất trước' : 'Đang xếp: muộn nhất trước'}>
              <Button icon={<SwapOutlined rotate={90} />} onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')}>
                Sắp xếp
              </Button>
            </Tooltip>
            <Button icon={<ReloadOutlined />} onClick={() => fetchQueue()} loading={loading}>
              Làm mới
            </Button>
          </div>
        </div>

        {/* Danh sách buổi khám */}
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid #e2e8f0' }}>
            <div style={{ fontWeight: 700, color: '#1e293b', fontSize: 15 }}>Danh sách buổi khám</div>
            <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>Xem và thực hiện các buổi chăm sóc được phân công cho bạn</div>
          </div>

          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>Đang tải...</div>
          ) : pageItems.length === 0 ? (
            <div style={{ padding: 40 }}>
              <Empty description={kw ? `Không tìm thấy bệnh nhân nào khớp "${search}"` : 'Không có buổi khám nào trong ngày này'} />
            </div>
          ) : (
            <div>
              {pageItems.map(s => {
                const info = STATUS_INFO[s.status] || { label: s.status, color: 'default' }
                const endTime = dayjs(s.scheduledDateTime).add(s.durationMinutes || 30, 'minute')
                const minsAway = dayjs(s.scheduledDateTime).diff(dayjs(), 'minute')
                const overdue = s.status === 'BOOKED' && minsAway < 0
                const soon = s.status === 'BOOKED' && minsAway >= 0 && minsAway <= 30
                const canStart = ACTIONABLE_STATUSES.has(s.status) && (s.status === 'IN_PROGRESS' || s.checkedIn)

                return (
                  <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px', borderBottom: '1px solid #f1f5f9', flexWrap: 'wrap' }}>
                    <Avatar size={40} style={{ background: colorFor(s.patientId), flexShrink: 0 }}>{initials(s.patientName)}</Avatar>

                    <div style={{ minWidth: 150, flex: '1 1 150px' }}>
                      <div style={{ fontWeight: 600, color: '#1e293b' }}>{s.patientName}</div>
                      <div style={{ fontSize: 12, color: '#94a3b8' }}>ID: {s.patientCode}</div>
                    </div>

                    <div style={{ minWidth: 160, flex: '1 1 160px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#334155', fontSize: 13 }}>
                        <span>{iconFor(s.serviceName)}</span> {s.serviceName}
                      </div>
                      <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>Buổi {s.sessionNumber}/{s.totalSessions}</div>
                    </div>

                    <div style={{ minWidth: 130, flex: '0 0 130px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#334155', fontSize: 13, fontWeight: 600 }}>
                        <ClockCircleOutlined style={{ fontSize: 12 }} /> {formatTime(s.scheduledDateTime)} - {formatTime(endTime)}
                      </div>
                      <div style={{ fontSize: 12, marginTop: 2, color: overdue ? '#dc2626' : soon ? '#d97706' : '#94a3b8' }}>
                        {overdue ? `Trễ ${Math.abs(minsAway)} phút` : soon ? `Trong ${minsAway} phút` : 'Đã lên lịch'}
                      </div>
                    </div>

                    <div style={{ minWidth: 150, flex: '0 0 150px' }}>
                      <Tag color={info.color}>{info.label}</Tag>
                      {s.isIncident && <Tag color="warning" icon={<ExclamationCircleFilled />} style={{ marginTop: 4 }}>Sự cố</Tag>}
                      {s.status === 'BOOKED' && !s.checkedIn && <Tag color="red" style={{ marginTop: 4 }}>Chưa check-in</Tag>}
                      {s.status === 'BOOKED' && s.checkedIn && <Tag color="cyan" icon={<CheckCircleFilled />} style={{ marginTop: 4 }}>Đã check-in</Tag>}
                    </div>

                    <div style={{ flexShrink: 0, marginLeft: 'auto' }}>
                      {ACTIONABLE_STATUSES.has(s.status) ? (
                        <Button
                          type="primary"
                          disabled={!canStart}
                          title={!canStart ? 'Bệnh nhân cần check-in tại quầy lễ tân trước' : undefined}
                          onClick={() => navigate(`/nurse/deliver/${s.id}`)}
                        >
                          {s.status === 'IN_PROGRESS' ? 'Tiếp tục' : canStart ? 'Bắt đầu khám' : 'Chờ check-in'}
                        </Button>
                      ) : null}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {filtered.length > PAGE_SIZE && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, padding: '14px 0' }}>
              <Button size="small" disabled={safePage === 1} onClick={() => setPage(p => Math.max(1, p - 1))}>‹ Trước</Button>
              <span style={{ fontSize: 13, color: '#64748b' }}>Trang {safePage}/{totalPages}</span>
              <Button size="small" disabled={safePage === totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>Sau ›</Button>
            </div>
          )}
        </div>
      </div>

      {/* Nút báo sự cố khẩn cấp — mở thẳng buổi đang thực hiện để đánh dấu sự cố khi hoàn thành */}
      <Tooltip title={activeSession ? `Mở buổi đang thực hiện: ${activeSession.patientName}` : 'Không có buổi nào đang thực hiện'}>
        <Button
          shape="round"
          size="large"
          icon={<AlertOutlined />}
          onClick={handleEmergency}
          style={{
            position: 'fixed', bottom: 28, right: 28, height: 52, padding: '0 22px',
            background: activeSession ? '#0d9488' : '#94a3b8', borderColor: activeSession ? '#0d9488' : '#94a3b8',
            color: '#fff', fontWeight: 700, boxShadow: '0 8px 20px rgba(0,0,0,0.15)',
          }}
        >
          Sự cố khẩn cấp
        </Button>
      </Tooltip>
    </div>
  )
}
