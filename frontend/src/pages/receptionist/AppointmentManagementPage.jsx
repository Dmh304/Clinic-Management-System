/**
 * Page: AppointmentManagementPage (UC-13: gộp Dashboard hôm nay + Lịch khám Calendar)
 * Chức năng: Quản lý lịch khám cho Lễ tân với 3 chế độ xem Ngày / Tuần / Tháng.
 *  - Ngày: dashboard thống kê + bảng lịch hẹn hôm nay, đầy đủ thao tác
 *    (Xác nhận, Check-in, Bắt đầu khám, Hủy, Nhắc lịch) dùng Redux slice.
 *  - Tuần/Tháng: lưới lịch chỉ để xem (fetch qua /schedule-range), không thao tác.
 *  - Click 1 lịch hẹn ở mọi chế độ -> mở modal chi tiết (read-only).
 * DucTKHHE204463 / Le Thi Bich Ngan - HE204710
 */
import { useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import dayjs from 'dayjs'
import { useNavigate } from 'react-router-dom'
import {
  Table, Tag, Select, Button, Space, Typography, Card,
  message, Modal, Form, Statistic, Row, Col, Segmented,
} from 'antd'
import {
  ReloadOutlined, CheckCircleOutlined, LoginOutlined,
  CloseCircleOutlined, BellOutlined,
  CloseCircleOutlined, DollarOutlined,
} from '@ant-design/icons'
import {
  fetchTodayAppointments,
  fetchDashboard,
  confirmAppointment,
  checkInAppointment,
  changeAppointmentStatus,
} from '../../store/slices/appointmentSlice'
import { fetchAllInvoices } from '../../store/slices/invoiceSlice'
import { doctorService } from '../../services/doctorService'
import { appointmentService } from '../../services/appointmentService'
import axiosClient from '../../api/axiosClient'
import AppointmentDetailModal from '../../components/receptionist/AppointmentDetailModal'

// Cấu hình màu/nhãn cho Tag trạng thái trong bảng (chế độ Ngày)
const STATUS_CONFIG = {
  PENDING:     { color: 'gold',       label: 'Chờ xác nhận' },
  CONFIRMED:   { color: 'blue',       label: 'Đã xác nhận' },
  WAITING:     { color: 'cyan',       label: 'Chờ khám' },
  IN_PROGRESS: { color: 'processing', label: 'Đang khám' },
  COMPLETED:   { color: 'green',      label: 'Hoàn thành' },
  CANCELLED:   { color: 'red',        label: 'Đã hủy' },
}

// Màu nền/chữ cho chip lịch hẹn trong lưới Tuần/Tháng
const STATUS_INFO = {
  PENDING:     { label: 'Chờ',          color: '#d97706', bg: '#fef3c7' },
  CONFIRMED:   { label: 'Đã xác nhận',  color: '#2563eb', bg: '#dbeafe' },
  WAITING:     { label: 'Đang chờ khám', color: '#7c3aed', bg: '#ede9fe' },
  IN_PROGRESS: { label: 'Đang khám',    color: '#ea580c', bg: '#ffedd5' },
  COMPLETED:   { label: 'Hoàn thành',   color: '#16a34a', bg: '#dcfce7' },
  CANCELLED:   { label: 'Đã huỷ',       color: '#dc2626', bg: '#fee2e2' },
}

const WEEKDAY_SHORT = ['CN', 'Th 2', 'Th 3', 'Th 4', 'Th 5', 'Th 6', 'Th 7']
const VIEW_LABELS = [
  { label: 'Ngày', value: 'day' },
  { label: 'Tuần', value: 'week' },
  { label: 'Tháng', value: 'month' },
]

// Tuần bắt đầu từ Thứ Hai theo quy ước Việt Nam
function startOfWeekMonday(d) {
  const dow = d.day()
  const diff = dow === 0 ? -6 : 1 - dow
  return d.add(diff, 'day').startOf('day')
}

function formatTime(dt) {
  if (!dt) return ''
  const d = new Date(dt)
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
}

export default function AppointmentManagementPage() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { list, loading, error, dashboard } = useSelector((s) => s.appointment)

  // ── Chế độ xem & điều hướng ──
  const [viewMode, setViewMode] = useState('day')
  const [anchorDate, setAnchorDate] = useState(dayjs().startOf('day'))

  // ── Chế độ Ngày (Redux) ──
  const { list: invoices } = useSelector((s) => s.invoice)

  const billedIds = new Set(
    invoices.filter((i) => i.status !== 'CANCELLED').map((i) => i.appointmentId)
  )
  const [filterStatus, setFilterStatus] = useState('ALL')
  const [doctors, setDoctors] = useState([])
  const [confirmModal, setConfirmModal] = useState({ open: false, appointment: null })
  const [confirmLoading, setConfirmLoading] = useState(false)
  const [selectedDoctorId, setSelectedDoctorId] = useState(null)

  // ── Chế độ Tuần/Tháng (fetch trực tiếp) ──
  const [rangeAppointments, setRangeAppointments] = useState([])
  const [rangeLoading, setRangeLoading] = useState(false)
  const [filterDoctor, setFilterDoctor] = useState('')

  // ── Modal chi tiết dùng chung 3 chế độ ──
  const [detail, setDetail] = useState(null)

  // Khoảng ngày cần tải cho lưới Tuần/Tháng
  const range = useMemo(() => {
    if (viewMode === 'week') {
      const start = startOfWeekMonday(anchorDate)
      const end = start.add(6, 'day')
      return { start, end, gridStart: start, gridEnd: end }
    }
    // month
    const monthStart = anchorDate.startOf('month')
    const monthEnd = anchorDate.endOf('month')
    const gridStart = startOfWeekMonday(monthStart)
    const gridEnd = startOfWeekMonday(monthEnd).add(6, 'day')
    return { start: monthStart, end: monthEnd, gridStart, gridEnd }
  }, [viewMode, anchorDate])

  // Tải dữ liệu chế độ Ngày khi mount + danh sách bác sĩ
  useEffect(() => {
    dispatch(fetchTodayAppointments())
    dispatch(fetchDashboard())
    dispatch(fetchAllInvoices())
    doctorService.getAllDoctors().then((res) => setDoctors(res.data)).catch(() => {})
  }, [dispatch])

  useEffect(() => {
    if (error) message.error(error)
  }, [error])

  // Tải dữ liệu chế độ Tuần/Tháng khi đổi chế độ hoặc khoảng ngày
  const fetchRange = async () => {
    setRangeLoading(true)
    try {
      const res = await axiosClient.get('/v1/appointments/schedule-range', {
        params: {
          startDate: range.gridStart.format('YYYY-MM-DD'),
          endDate: range.gridEnd.format('YYYY-MM-DD'),
        },
      })
      setRangeAppointments(res.data || [])
    } catch {
      message.error('Không thể tải lịch khám')
    } finally {
      setRangeLoading(false)
    }
  }

  useEffect(() => {
    if (viewMode === 'week' || viewMode === 'month') fetchRange()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode, range.gridStart.format('YYYY-MM-DD'), range.gridEnd.format('YYYY-MM-DD')])

  const reload = () => {
    dispatch(fetchTodayAppointments())
    dispatch(fetchDashboard())
  }

  const filtered =
    filterStatus === 'ALL' ? list : list.filter((a) => a.status === filterStatus)

  // ── Thao tác chế độ Ngày ──
  const handleOpenConfirm = (appointment) => {
    setSelectedDoctorId(appointment.doctorId ?? null)
    setConfirmModal({ open: true, appointment })
  }

  const handleConfirm = async () => {
    setConfirmLoading(true)
    try {
      await dispatch(confirmAppointment({
        id: confirmModal.appointment.id,
        doctorId: selectedDoctorId || null,
      })).unwrap()
      message.success('Xác nhận lịch hẹn thành công')
      setConfirmModal({ open: false, appointment: null })
      dispatch(fetchDashboard())
    } catch (err) {
      message.error(err)
    } finally {
      setConfirmLoading(false)
    }
  }

  const handleCheckIn = (id) => {
    dispatch(checkInAppointment(id))
      .unwrap()
      .then(() => {
        message.success('Check-in thành công')
        dispatch(fetchDashboard())
      })
      .catch((err) => message.error(err))
  }

  const handleCancel = (id) => {
    dispatch(changeAppointmentStatus({ id, status: 'CANCELLED' }))
      .unwrap()
      .then(() => {
        message.success('Đã hủy lịch hẹn')
        dispatch(fetchDashboard())
      })
      .catch((err) => message.error(err))
  }

  const showCancelConfirm = (record) => {
    Modal.confirm({
      title: 'Xác nhận hủy lịch hẹn',
      content: `Bạn có chắc muốn hủy lịch hẹn của ${record.patientName || 'bệnh nhân này'} không?`,
      okText: 'Hủy lịch',
      cancelText: 'Không',
      okType: 'danger',
      onOk: () => handleCancel(record.id),
    })
  }

  // UC-13: gửi nhắc lịch thủ công cho 1 lịch hẹn (ALT-1)
  const handleSendReminder = async (id) => {
    try {
      await appointmentService.sendReminder(id)
      message.success('Đã gửi nhắc lịch')
    } catch {
      message.error('Không thể gửi nhắc lịch')
    }
  }

  const columns = [
    { title: 'STT', key: 'index', width: 55, render: (_, __, i) => i + 1 },
    { title: 'Bệnh nhân', dataIndex: 'patientName', key: 'patientName' },
    { title: 'SĐT', dataIndex: 'patientPhone', key: 'patientPhone', width: 125 },
    { title: 'Giờ khám', dataIndex: 'timeSlot', key: 'timeSlot', width: 100 },
    {
      title: 'STT hàng đợi', dataIndex: 'queueNumber', key: 'queueNumber', width: 110,
      render: (q) => (q ? <Tag color="blue">#{q}</Tag> : '—'),
    },
    {
      title: 'Bác sĩ', dataIndex: 'doctorName', key: 'doctorName',
      render: (name) => name || <span style={{ color: '#94a3b8' }}>Chưa phân công</span>,
    },
    {
      title: 'Dịch vụ', dataIndex: 'serviceName', key: 'serviceName',
      render: (name) => name || '—',
    },
    {
      title: 'Trạng thái', dataIndex: 'status', key: 'status', width: 135,
      render: (status) => {
        const cfg = STATUS_CONFIG[status] || {}
        return <Tag color={cfg.color}>{cfg.label}</Tag>
      },
    },
    {
      title: 'Hành động', key: 'action', width: 240,
      // stopPropagation để không mở modal chi tiết khi bấm nút thao tác
      render: (_, record) => (
        <Space onClick={(e) => e.stopPropagation()}>
          {record.status === 'PENDING' && (
            <>
              <Button size="small" type="primary" icon={<CheckCircleOutlined />}
                onClick={() => handleOpenConfirm(record)}>
                Xác nhận
              </Button>
              <Button size="small" danger icon={<CloseCircleOutlined />}
                onClick={() => showCancelConfirm(record)}>
                Hủy
              </Button>
            </>
          )}
          {record.status === 'CONFIRMED' && (
            <>
              <Button size="small" type="primary" icon={<LoginOutlined />}
                onClick={() => handleCheckIn(record.id)}>
                Check-in
              </Button>
              <Button size="small" icon={<BellOutlined />}
                onClick={() => handleSendReminder(record.id)}>
                Nhắc lịch
              </Button>
              <Button size="small" danger icon={<CloseCircleOutlined />}
                onClick={() => showCancelConfirm(record)}>
                Hủy
              </Button>
            </>
          )}
          {record.status === 'WAITING' && (
            <>
                <Button size="small" type="primary"
                    style={{ backgroundColor: '#8b5cf6', borderColor: '#8b5cf6', marginRight: '8px' }}
                    onClick={() => dispatch(changeAppointmentStatus({ id: record.id, status: 'IN_PROGRESS' }))
                    .unwrap()
                    .then(() => { message.success('Bắt đầu khám'); dispatch(fetchDashboard()) })
                    .catch((err) => message.error(err))
                }>
                    Bắt đầu khám
                </Button>
                
                <Button
                    size="small"
                    danger
                    icon={<CloseCircleOutlined />}
                    onClick={() => showCancelConfirm(record)}
                >
                    Hủy
                </Button>
            </>

          )}
          {record.status === 'COMPLETED' && (
            billedIds.has(record.id)
              ? <Tag color="green" icon={<CheckCircleOutlined />}>Đã xuất HĐ</Tag>
              : (
                <Button
                  size="small"
                  type="primary"
                  icon={<DollarOutlined />}
                  style={{ backgroundColor: '#10b981', borderColor: '#10b981' }}
                  onClick={() => navigate('/receptionist/invoice')}
                >
                  Thu phí & HĐ
                </Button>
              )
          )}
        </Space>
      ),
    },
  ]

  const today = new Date().toLocaleDateString('vi-VN', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })

  // ── Lọc theo bác sĩ + nhóm theo ngày cho lưới Tuần/Tháng ──
  const rangeFiltered = filterDoctor
    ? rangeAppointments.filter((a) => String(a.doctorId) === filterDoctor)
    : rangeAppointments
  const rangeDoctors = useMemo(
    () => [...new Map(rangeAppointments.filter((a) => a.doctorName).map((a) => [a.doctorId, a.doctorName])).entries()]
      .map(([id, name]) => ({ id, name })),
    [rangeAppointments],
  )
  const byDate = useMemo(() => {
    const map = new Map()
    for (const a of rangeFiltered) {
      if (!a.appointmentTime) continue
      const key = dayjs(a.appointmentTime).format('YYYY-MM-DD')
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(a)
    }
    for (const arr of map.values()) arr.sort((a, b) => new Date(a.appointmentTime) - new Date(b.appointmentTime))
    return map
  }, [rangeFiltered])

  const rangeStats = {
    total: rangeFiltered.length,
    confirmed: rangeFiltered.filter((a) => a.status === 'CONFIRMED' || a.status === 'WAITING').length,
    completed: rangeFiltered.filter((a) => a.status === 'COMPLETED').length,
    cancelled: rangeFiltered.filter((a) => a.status === 'CANCELLED').length,
  }

  const goPrev = () => setAnchorDate((d) => d.subtract(1, viewMode === 'week' ? 'week' : 'month'))
  const goNext = () => setAnchorDate((d) => d.add(1, viewMode === 'week' ? 'week' : 'month'))
  const goToday = () => setAnchorDate(dayjs().startOf('day'))

  const rangeTitle = viewMode === 'week'
    ? `${range.start.format('DD/MM/YYYY')} – ${range.end.format('DD/MM/YYYY')}`
    : anchorDate.toDate().toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
        <div>
          <Typography.Title level={4} style={{ marginBottom: 4 }}>Lịch khám</Typography.Title>
          <Typography.Text type="secondary">
            {viewMode === 'day' ? today : rangeTitle}
          </Typography.Text>
        </div>
        <Segmented value={viewMode} onChange={setViewMode} options={VIEW_LABELS} />
      </div>

      {viewMode === 'day' ? (
        <>
          {/* Thống kê hôm nay */}
          {dashboard && (
            <Row gutter={12} style={{ marginBottom: 16 }}>
              {[
                { label: 'Tổng', value: dashboard.total, color: '#6366f1' },
                { label: 'Chờ xác nhận', value: dashboard.pending, color: '#f59e0b' },
                { label: 'Đã xác nhận', value: dashboard.confirmed, color: '#3b82f6' },
                { label: 'Chờ khám', value: dashboard.waiting, color: '#06b6d4' },
                { label: 'Đang khám', value: dashboard.inProgress, color: '#8b5cf6' },
                { label: 'Hoàn thành', value: dashboard.completed, color: '#10b981' },
                { label: 'Đã hủy', value: dashboard.cancelled, color: '#ef4444' },
              ].map(({ label, value, color }) => (
                <Col key={label} flex="1">
                  <Card size="small" style={{ textAlign: 'center', borderTop: `3px solid ${color}` }}>
                    <Statistic
                      title={<span style={{ fontSize: 11 }}>{label}</span>}
                      value={value}
                      styles={{ value: { fontSize: 20, color } }}
                    />
                  </Card>
                </Col>
              ))}
            </Row>
          )}

          <Card>
            <Space style={{ marginBottom: 16 }}>
              <Select
                value={filterStatus}
                onChange={setFilterStatus}
                style={{ width: 180 }}
                options={[
                  { label: 'Tất cả trạng thái', value: 'ALL' },
                  ...Object.entries(STATUS_CONFIG).map(([v, c]) => ({ label: c.label, value: v })),
                ]}
              />
              <Button icon={<ReloadOutlined />} onClick={reload} loading={loading}>Làm mới</Button>
            </Space>

            <Table
              columns={columns}
              dataSource={filtered}
              rowKey="id"
              loading={loading}
              pagination={{ pageSize: 10, showSizeChanger: false }}
              locale={{ emptyText: 'Không có lịch hẹn nào hôm nay' }}
              onRow={(record) => ({
                onClick: () => setDetail(record),
                style: { cursor: 'pointer' },
              })}
            />
          </Card>
        </>
      ) : (
        <>
          {/* Toolbar điều hướng Tuần/Tháng */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
            <Space>
              <Button onClick={goPrev}>‹</Button>
              <Button onClick={goToday} type="primary" ghost>Hôm nay</Button>
              <Button onClick={goNext}>›</Button>
            </Space>
            <Space>
              {rangeDoctors.length > 0 && (
                <Select
                  value={filterDoctor || undefined}
                  onChange={(v) => setFilterDoctor(v || '')}
                  allowClear
                  placeholder="Tất cả bác sĩ"
                  style={{ width: 200 }}
                  options={rangeDoctors.map((d) => ({ label: d.name, value: String(d.id) }))}
                />
              )}
              <Button icon={<ReloadOutlined />} onClick={fetchRange} loading={rangeLoading}>Làm mới</Button>
            </Space>
          </div>

          {/* Thống kê khoảng đang xem */}
          <Row gutter={12} style={{ marginBottom: 16 }}>
            {[
              { label: 'Tổng cộng', value: rangeStats.total, color: '#2563eb' },
              { label: 'Đang chờ/Xác nhận', value: rangeStats.confirmed, color: '#7c3aed' },
              { label: 'Hoàn thành', value: rangeStats.completed, color: '#16a34a' },
              { label: 'Đã huỷ', value: rangeStats.cancelled, color: '#dc2626' },
            ].map(({ label, value, color }) => (
              <Col key={label} flex="1">
                <Card size="small" style={{ textAlign: 'center', borderTop: `3px solid ${color}` }}>
                  <Statistic title={<span style={{ fontSize: 11 }}>{label}</span>} value={value}
                    styles={{ value: { fontSize: 20, color } }} />
                </Card>
              </Col>
            ))}
          </Row>

          {rangeLoading ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>Đang tải...</div>
          ) : viewMode === 'week' ? (
            <WeekGrid gridStart={range.gridStart} byDate={byDate} onSelect={setDetail} />
          ) : (
            <MonthGrid gridStart={range.gridStart} gridEnd={range.gridEnd}
              currentMonth={anchorDate.month()} byDate={byDate} onSelect={setDetail} />
          )}
        </>
      )}

      {/* Modal xác nhận + phân công bác sĩ (chế độ Ngày) */}
      <Modal
        title="Xác nhận lịch hẹn"
        open={confirmModal.open}
        onOk={handleConfirm}
        onCancel={() => setConfirmModal({ open: false, appointment: null })}
        confirmLoading={confirmLoading}
        okText="Xác nhận"
        cancelText="Hủy"
      >
        {confirmModal.appointment && (
          <div style={{ marginBottom: 16 }}>
            <p style={{ margin: '0 0 4px' }}><strong>Bệnh nhân:</strong> {confirmModal.appointment.patientName}</p>
            <p style={{ margin: '0 0 4px' }}><strong>Giờ khám:</strong> {confirmModal.appointment.timeSlot}</p>
          </div>
        )}
        <Form layout="vertical">
          <Form.Item label="Phân công bác sĩ (không bắt buộc)">
            <Select
              allowClear
              placeholder="Chọn bác sĩ"
              value={selectedDoctorId}
              onChange={setSelectedDoctorId}
              options={doctors.map((d) => ({
                label: `${d.fullName}${d.specialization ? ` — ${d.specialization}` : ''}`,
                value: d.id,
              }))}
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal chi tiết lịch hẹn (read-only, dùng chung 3 chế độ) */}
      <AppointmentDetailModal appointment={detail} onClose={() => setDetail(null)} />
    </div>
  )
}

// ─── Chip lịch hẹn dùng cho lưới Tuần/Tháng ──────────────────
function AppointmentChip({ a, compact, onSelect }) {
  const info = STATUS_INFO[a.status] || { label: a.status, color: '#6b7280', bg: '#f3f4f6' }
  return (
    <div
      onClick={(e) => { e.stopPropagation(); onSelect(a) }}
      title={`${formatTime(a.appointmentTime)} — ${a.patientName}${a.doctorName ? ' — ' + a.doctorName : ''}`}
      style={{
        background: info.bg, color: info.color, borderRadius: 6, cursor: 'pointer',
        padding: compact ? '2px 6px' : '4px 8px',
        fontSize: compact ? 11 : 12, fontWeight: 600,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}
    >
      {formatTime(a.appointmentTime)} {a.patientName}
    </div>
  )
}

// ─── View Tuần: 7 cột Thứ 2 → Chủ Nhật ─────────────────────────────
function WeekGrid({ gridStart, byDate, onSelect }) {
  const days = Array.from({ length: 7 }, (_, i) => gridStart.add(i, 'day'))
  const isToday = (d) => d.isSame(dayjs(), 'day')

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 10 }}>
      {days.map((d) => {
        const key = d.format('YYYY-MM-DD')
        const items = byDate.get(key) || []
        return (
          <div key={key} style={{ background: '#fff', borderRadius: 12, border: isToday(d) ? '2px solid #2563eb' : '1px solid #e2e8f0', minHeight: 240, display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9' }}>
              <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>{WEEKDAY_SHORT[d.day()]}</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: isToday(d) ? '#2563eb' : '#1e293b' }}>{d.format('DD/MM')}</div>
            </div>
            <div style={{ padding: 8, display: 'flex', flexDirection: 'column', gap: 5, overflowY: 'auto', flex: 1 }}>
              {items.length === 0 ? (
                <span style={{ fontSize: 12, color: '#cbd5e1', textAlign: 'center', marginTop: 8 }}>—</span>
              ) : (
                items.map((a) => <AppointmentChip key={a.id} a={a} onSelect={onSelect} />)
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── View Tháng: lưới 6 hàng x 7 cột ────────────────────────────────
function MonthGrid({ gridStart, gridEnd, currentMonth, byDate, onSelect }) {
  const totalDays = gridEnd.diff(gridStart, 'day') + 1
  const days = Array.from({ length: totalDays }, (_, i) => gridStart.add(i, 'day'))
  const isToday = (d) => d.isSame(dayjs(), 'day')
  const MAX_VISIBLE = 3

  return (
    <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid #e2e8f0' }}>
        {WEEKDAY_SHORT.map((w) => (
          <div key={w} style={{ padding: '8px 0', textAlign: 'center', fontSize: 12, fontWeight: 700, color: '#64748b', background: '#f8fafc' }}>{w}</div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
        {days.map((d) => {
          const key = d.format('YYYY-MM-DD')
          const items = byDate.get(key) || []
          const inMonth = d.month() === currentMonth
          return (
            <div key={key} style={{
              minHeight: 110, padding: 6, borderRight: '1px solid #f1f5f9', borderBottom: '1px solid #f1f5f9',
              background: inMonth ? '#fff' : '#fafafa', display: 'flex', flexDirection: 'column', gap: 4,
            }}>
              <span style={{
                fontSize: 13, fontWeight: 700, alignSelf: 'flex-start',
                color: isToday(d) ? '#fff' : inMonth ? '#1e293b' : '#cbd5e1',
                background: isToday(d) ? '#2563eb' : 'transparent',
                borderRadius: '50%', width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {d.date()}
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {items.slice(0, MAX_VISIBLE).map((a) => <AppointmentChip key={a.id} a={a} compact onSelect={onSelect} />)}
                {items.length > MAX_VISIBLE && (
                  <span style={{ fontSize: 11, color: '#2563eb', fontWeight: 600 }}>+{items.length - MAX_VISIBLE} nữa</span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
