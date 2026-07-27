/**
 * Page: AppointmentManagementPage (UC-13: gộp Dashboard hôm nay + Lịch khám Calendar)
 * Chức năng: Quản lý lịch khám cho Lễ tân với 3 chế độ xem Ngày / Tuần / Tháng.
 *  - Ngày: dashboard thống kê + bảng lịch hẹn hôm nay, đầy đủ thao tác
 *    (Xác nhận, Check-in, Bắt đầu khám, Hủy, Nhắc lịch) dùng Redux slice.
 *  - Tuần/Tháng: lưới lịch chỉ để xem (fetch qua /schedule-range), không thao tác.
 *  - Click 1 lịch hẹn ở mọi chế độ -> mở modal chi tiết (read-only).
 * DucTKHHE204463 / Le Thi Bich Ngan - HE204710
 *Created: 2026-06-01
 *Last Update: 2026-07-20
 */
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import dayjs from 'dayjs'
import {
  Table, Tag, Select, Button, Space, Typography, Card,
  message, Modal, Form, Statistic, Row, Col, Segmented, Input, DatePicker,
} from 'antd'
import {
  ReloadOutlined, CheckCircleOutlined, LoginOutlined,
  CloseCircleOutlined, BellOutlined, SwapOutlined,
} from '@ant-design/icons'
import {
  fetchDayAppointments,
  fetchDashboard,
  confirmAppointment,
  checkInAppointment,
} from '../../store/slices/appointmentSlice'
import { doctorService } from '../../services/doctorService'
import { appointmentService } from '../../services/appointmentService'
import { careSessionService } from '../../services/careSessionService'
import axiosClient from '../../api/axiosClient'
import AppointmentDetailModal from '../../components/receptionist/AppointmentDetailModal'

// Trạng thái buổi khám dịch vụ (care session) — khác vòng đời với lịch hẹn khám bác sĩ
const CARE_SESSION_STATUS_CONFIG = {
  BOOKED: { color: 'gold', label: 'Chờ khám' },
  IN_PROGRESS: { color: 'processing', label: 'Đang khám' },
  COMPLETED: { color: 'green', label: 'Hoàn thành' },
  CHECKED_OUT: { color: 'default', label: 'Đã check-out' },
  CANCELLED: { color: 'red', label: 'Đã hủy' },
}

// Chuyển 1 buổi khám dịch vụ (care session) về dạng hàng bảng dùng chung với lịch hẹn khám bác sĩ,
// để lễ tân thấy được đầy đủ bệnh nhân đến khám hôm nay (cả khám bác sĩ lẫn đến dùng dịch vụ chăm sóc).
function careSessionToRow(s) {
  return {
    id: `cs-${s.id}`,
    careSessionId: s.id,
    isCareSession: true,
    checkedIn: s.checkedIn,
    patientName: s.patientName,
    patientPhone: s.patientPhone,
    appointmentTime: s.scheduledDateTime,
    timeSlot: formatTime(s.scheduledDateTime),
    queueNumber: s.sessionNumber,
    doctorId: null,
    doctorName: s.nurseName ? `ĐD. ${s.nurseName}` : null,
    serviceName: s.serviceName,
    status: s.status,
    notes: s.notes,
    bookedByName: null,
    cancelReason: null,
  }
}

// Quy về 1 "nhóm trạng thái" dùng chung cho cả lịch hẹn khám bác sĩ và buổi khám dịch vụ —
// 2 nguồn dữ liệu này dùng 2 bộ mã status khác nhau (WAITING/BOOKED, COMPLETED/CHECKED_OUT...)
// nhưng hiển thị cùng nhãn tiếng Việt ("Chờ khám", "Hoàn thành"...), nên cần gộp lại để ô
// thống kê và dropdown lọc phản ánh đúng cả 2 loại, không chỉ riêng lịch hẹn.
function getStatusBucket(record) {
  if (record.isCareSession) {
    if (record.status === 'BOOKED') return 'WAITING'
    if (record.status === 'CHECKED_OUT') return 'COMPLETED'
    return record.status // IN_PROGRESS | COMPLETED | CANCELLED đã trùng mã
  }
  return record.status
}

// Cấu hình màu/nhãn cho Tag trạng thái trong bảng (chế độ Ngày)
const STATUS_CONFIG = {
  PENDING: { color: 'gold', label: 'Chờ xác nhận' },
  CONFIRMED: { color: 'blue', label: 'Đã xác nhận' },
  WAITING: { color: 'cyan', label: 'Chờ khám' },
  IN_PROGRESS: { color: 'processing', label: 'Đang khám' },
  COMPLETED: { color: 'green', label: 'Hoàn thành' },
  CANCELLED: { color: 'red', label: 'Đã hủy' },
}

// Màu nền/chữ cho chip lịch hẹn trong lưới Tuần/Tháng
const STATUS_INFO = {
  PENDING: { label: 'Chờ', color: '#d97706', bg: '#fef3c7' },
  CONFIRMED: { label: 'Đã xác nhận', color: '#2563eb', bg: '#dbeafe' },
  WAITING: { label: 'Đang chờ khám', color: '#7c3aed', bg: '#ede9fe' },
  IN_PROGRESS: { label: 'Đang khám', color: '#ea580c', bg: '#ffedd5' },
  COMPLETED: { label: 'Hoàn thành', color: '#16a34a', bg: '#dcfce7' },
  CANCELLED: { label: 'Đã huỷ', color: '#dc2626', bg: '#fee2e2' },
}

// Giờ làm việc phòng khám — đồng bộ với backend CLINIC_OPEN_TIME/CLINIC_CLOSE_TIME
// (07:30–17:00), dùng để giới hạn DatePicker ở modal "Đổi lịch".
const CLINIC_OPEN_HOUR = 7
const CLINIC_CLOSE_HOUR = 17

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

// Bỏ dấu tiếng Việt để tìm không phân biệt dấu (lễ tân gõ nhanh, thường không gõ dấu)
function stripDiacritics(s) {
  return (s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
}

// Tìm theo tên hoặc SĐT bệnh nhân — dùng chung cho cả 3 chế độ Ngày/Tuần/Tháng
function matchesSearch(record, query) {
  const q = stripDiacritics(query.trim())
  if (!q) return true
  const haystack = stripDiacritics(`${record.patientName || ''} ${record.patientPhone || ''}`)
  return haystack.includes(q)
}

function formatTime(dt) {
  if (!dt) return ''
  const d = new Date(dt)
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
}

export default function AppointmentManagementPage() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { list, loading, error } = useSelector((s) => s.appointment)

  // ── Chế độ xem & điều hướng ──
  const [viewMode, setViewMode] = useState('day')
  const [anchorDate, setAnchorDate] = useState(dayjs().startOf('day'))
  const [filterStatus, setFilterStatus] = useState('ALL')
  const [searchText, setSearchText] = useState('')
  const [doctors, setDoctors] = useState([])
  const [confirmModal, setConfirmModal] = useState({ open: false, appointment: null })
  const [confirmLoading, setConfirmLoading] = useState(false)
  const [selectedDoctorId, setSelectedDoctorId] = useState(null)
  const [changeReason, setChangeReason] = useState('')

  // ── Đổi lịch hẹn (UC-18, lễ tân) ──
  const [rescheduleModal, setRescheduleModal] = useState({ open: false, appointment: null })
  const [rescheduleDoctorId, setRescheduleDoctorId] = useState(null)
  const [rescheduleTime, setRescheduleTime] = useState(null)
  const [rescheduleReason, setRescheduleReason] = useState('')
  const [rescheduleSaving, setRescheduleSaving] = useState(false)

  // Le Thi Bich Ngan - HE204710 | Tạo: 19/07/2026 | BR-05 (huỷ lịch — điều
  // kiện ≥1h chỉ áp dụng khi bệnh nhân tự huỷ, không áp dụng cho lễ tân)
  // Chức năng: state cho modal "Huỷ lịch hẹn" có ô nhập lý do — trước đây nút
  // Hủy của lễ tân gọi thẳng changeAppointmentStatus (PATCH /status), một API
  // generic không lưu lý do và không gửi email cho bệnh nhân. Nay đổi sang gọi
  // đúng appointmentService.cancelAppointment(id, reason) để lý do được lưu
  // vào cancelReason và bệnh nhân nhận được email thông báo huỷ (xem
  // AppointmentServiceImpl.cancelAppointment() ở backend).
  // ── Huỷ lịch hẹn (lễ tân nhập lý do để bệnh nhân nhận được trong email thông báo huỷ) ──
  const [cancelModal, setCancelModal] = useState({ open: false, appointment: null })
  const [cancelReasonInput, setCancelReasonInput] = useState('')
  const [cancelSaving, setCancelSaving] = useState(false)

  // ── Chế độ Tuần/Tháng (fetch trực tiếp) ──
  const [rangeAppointments, setRangeAppointments] = useState([])
  const [rangeLoading, setRangeLoading] = useState(false)
  const [filterDoctor, setFilterDoctor] = useState('')

  // ── Modal chi tiết dùng chung 3 chế độ ──
  const [detail, setDetail] = useState(null)

  // Buổi khám dịch vụ (đến dùng dịch vụ chăm sóc, không phải khám bác sĩ) trong ngày đang xem
  const [careSessions, setCareSessions] = useState([])

  // Ngày đang xem ở chế độ Ngày (dạng 'YYYY-MM-DD') — cho phép xem hôm qua/hôm sau
  const dayParam = anchorDate.format('YYYY-MM-DD')

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

  // Tải danh sách bác sĩ một lần khi mount
  useEffect(() => {
    doctorService.getAllDoctors().then((res) => setDoctors(res.data)).catch(() => { })
  }, [])

  // Tải lịch hẹn + thống kê của ngày đang chọn (chế độ Ngày)
  useEffect(() => {
    if (viewMode === 'day') {
      dispatch(fetchDayAppointments(dayParam))
      dispatch(fetchDashboard(dayParam))
      careSessionService.getAll(dayParam).then((res) => setCareSessions(res.data || [])).catch(() => setCareSessions([]))
    }
  }, [dispatch, viewMode, dayParam])

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
    dispatch(fetchDayAppointments(dayParam))
    dispatch(fetchDashboard(dayParam))
    careSessionService.getAll(dayParam).then((res) => setCareSessions(res.data || [])).catch(() => setCareSessions([]))
  }

  // Gộp lịch hẹn khám bác sĩ + buổi khám dịch vụ chăm sóc thành 1 danh sách chung cho lễ tân
  const combinedList = useMemo(
    () => [...list, ...careSessions.map(careSessionToRow)],
    [list, careSessions],
  )

  // Le Thi Bich Ngan - HE204710 | Tạo: 27/07/2026
  // Chức năng: lọc danh sách lịch hẹn của chế độ Ngày theo bác sĩ (dùng chung
  // state filterDoctor với chế độ Tuần/Tháng) — trước đây chế độ Ngày chỉ lọc
  // được theo trạng thái + tìm kiếm, lễ tân không thể thu hẹp danh sách theo
  // một bác sĩ cụ thể khi phòng khám có nhiều bác sĩ khám cùng ngày.
  // Business rule: không gắn BR cụ thể — đây là tiện ích tra cứu/hiển thị cho
  // lễ tân, không ảnh hưởng tới việc đặt/xác nhận lịch hẹn.
  const filtered = (
    filterStatus === 'ALL' ? combinedList
      : filterStatus === 'CARE_SESSION' ? combinedList.filter((a) => a.isCareSession)
        : combinedList.filter((a) => getStatusBucket(a) === filterStatus)
  )
    .filter((a) => !filterDoctor || String(a.doctorId) === filterDoctor)
    .filter((a) => matchesSearch(a, searchText))

  // Thống kê hợp nhất cả lịch hẹn khám bác sĩ lẫn buổi khám dịch vụ, theo cùng "nhóm trạng thái"
  // ở trên — thay cho dashboard.* (chỉ tính riêng lịch hẹn, khiến số liệu lệch với bảng hiển thị).
  const mergedStats = useMemo(() => {
    const s = { total: combinedList.length, pending: 0, confirmed: 0, waiting: 0, inProgress: 0, completed: 0, cancelled: 0 }
    for (const r of combinedList) {
      const bucket = getStatusBucket(r)
      if (bucket === 'PENDING') s.pending++
      else if (bucket === 'CONFIRMED') s.confirmed++
      else if (bucket === 'WAITING') s.waiting++
      else if (bucket === 'IN_PROGRESS') s.inProgress++
      else if (bucket === 'COMPLETED') s.completed++
      else if (bucket === 'CANCELLED') s.cancelled++
    }
    return s
  }, [combinedList])

  // "STT hàng đợi" là độc lập theo TỪNG BÁC SĨ trong ngày (BR-13) — sắp lại để
  // các lịch hẹn của cùng 1 bác sĩ nằm liền kề nhau, tránh trông như 1 hàng đợi
  // chung của cả phòng khám mà bị lặp số (#1, #2, #1, #2...).
  const sortedFiltered = useMemo(() => {
    const arr = [...filtered]
    arr.sort((a, b) => {
      const da = a.doctorId ?? Number.MAX_SAFE_INTEGER
      const db = b.doctorId ?? Number.MAX_SAFE_INTEGER
      if (da !== db) return da - db
      const qa = a.queueNumber ?? Number.MAX_SAFE_INTEGER
      const qb = b.queueNumber ?? Number.MAX_SAFE_INTEGER
      if (qa !== qb) return qa - qb
      return new Date(a.appointmentTime) - new Date(b.appointmentTime)
    })
    return arr
  }, [filtered])

  // Map theo id (không theo index trang) để tô màu xen kẽ + kẻ vạch đầu mỗi
  // nhóm bác sĩ — an toàn khi bảng có phân trang vì không phụ thuộc vị trí dòng
  // trên trang hiện tại.
  const rowGroupInfo = useMemo(() => {
    const map = new Map()
    let lastDoctorId
    let tint = false
    sortedFiltered.forEach((a, i) => {
      const isNewGroup = i === 0 || a.doctorId !== lastDoctorId
      if (isNewGroup && i > 0) tint = !tint
      map.set(a.id, { tint, isGroupStart: isNewGroup && i > 0 })
      lastDoctorId = a.doctorId
    })
    return map
  }, [sortedFiltered])

  // ── Thao tác chế độ Ngày ──
  const handleOpenConfirm = (appointment) => {
    setSelectedDoctorId(appointment.doctorId ?? null)
    setChangeReason('')
    setConfirmModal({ open: true, appointment })
  }

  const handleConfirm = async () => {
    // Đổi sang bác sĩ KHÁC bác sĩ bệnh nhân đã đặt → bắt buộc nhập lý do
    const originalDoctorId = confirmModal.appointment?.doctorId ?? null
    const doctorChanged = originalDoctorId != null && selectedDoctorId !== originalDoctorId
    if (doctorChanged && !changeReason.trim()) {
      message.error('Vui lòng nhập lý do đổi bác sĩ')
      return
    }
    setConfirmLoading(true)
    try {
      await dispatch(confirmAppointment({
        id: confirmModal.appointment.id,
        doctorId: selectedDoctorId || null,
        reason: doctorChanged ? changeReason.trim() : null,
      })).unwrap()
      message.success('Xác nhận lịch hẹn thành công')
      setConfirmModal({ open: false, appointment: null })
      dispatch(fetchDashboard(dayParam))
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
        dispatch(fetchDashboard(dayParam))
      })
      .catch((err) => message.error(err))
  }

  const handleCheckInCareSession = async (id) => {
    try {
      await careSessionService.checkIn(id)
      message.success('Check-in thành công — buổi đã sẵn sàng cho điều dưỡng')
      careSessionService.getAll(dayParam).then((res) => setCareSessions(res.data || []))
    } catch (err) {
      message.error(err.response?.data?.message || 'Check-in thất bại')
    }
  }

  // Le Thi Bich Ngan - HE204710 | Tạo: 19/07/2026
  // Chức năng: mở modal huỷ lịch (thay Modal.confirm cũ) để lễ tân nhập lý do
  // huỷ trước khi xác nhận.
  // Dùng đúng endpoint cancelAppointment (có ghi cancelReason + gửi email thông báo huỷ
  // cho bệnh nhân) thay vì updateStatus chung chung (không lưu lý do, không gửi email).
  const showCancelConfirm = (record) => {
    setCancelReasonInput('')
    setCancelModal({ open: true, appointment: record })
  }

  // Le Thi Bich Ngan - HE204710 | Tạo: 19/07/2026 | BR-05 (huỷ lịch)
  // Chức năng: gọi PATCH /v1/appointments/{id}/cancel kèm lý do lễ tân vừa
  // nhập — endpoint này ghi cancelReason/cancelledAt/cancelledBy và gửi email
  // sendCancellationNotice cho bệnh nhân (khác hẳn updateStatus cũ trước đây).
  const handleCancel = async () => {
    const appointment = cancelModal.appointment
    setCancelSaving(true)
    try {
      await appointmentService.cancelAppointment(appointment.id, cancelReasonInput.trim() || null)
      message.success('Đã hủy lịch hẹn')
      setCancelModal({ open: false, appointment: null })
      reload()
    } catch (err) {
      message.error(err.response?.data?.message || 'Không thể hủy lịch hẹn')
    } finally {
      setCancelSaving(false)
    }
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

  // UC-18: lễ tân đổi lịch hẹn (ngày/giờ và/hoặc bác sĩ) ngay tại quầy — thay
  // cho thao tác 2 bước "Hủy rồi đặt lại". Giữ nguyên trạng thái hiện tại của
  // lịch hẹn (không đưa về PENDING) vì lễ tân xử lý xong ngay lúc này.
  const handleOpenReschedule = (record) => {
    setRescheduleDoctorId(record.doctorId ?? null)
    setRescheduleTime(null)
    setRescheduleReason('')
    setRescheduleModal({ open: true, appointment: record })
  }

  const handleReschedule = async () => {
    const original = rescheduleModal.appointment
    if (!rescheduleTime) {
      message.error('Vui lòng chọn ngày giờ khám mới')
      return
    }
    const originalDoctorId = original?.doctorId ?? null
    const doctorChanged = originalDoctorId != null && rescheduleDoctorId !== originalDoctorId
    if (doctorChanged && !rescheduleReason.trim()) {
      message.error('Vui lòng nhập lý do khi đổi sang bác sĩ khác')
      return
    }
    setRescheduleSaving(true)
    try {
      await appointmentService.reassignAppointment(original.id, {
        doctorId: doctorChanged ? rescheduleDoctorId : null,
        newAppointmentTime: rescheduleTime.format('YYYY-MM-DDTHH:mm:ss'),
        reason: rescheduleReason.trim() || null,
      })
      message.success('Đổi lịch hẹn thành công')
      setRescheduleModal({ open: false, appointment: null })
      reload()
    } catch (err) {
      message.error(err.response?.data?.message || 'Đổi lịch hẹn thất bại')
    } finally {
      setRescheduleSaving(false)
    }
  }

  const columns = [
    { title: 'STT', key: 'index', width: 55, render: (_, __, i) => i + 1 },
    {
      title: 'Bệnh nhân', dataIndex: 'patientName', key: 'patientName',
      render: (name, record) => (
        <span>
          {name}
          {record.isCareSession && <Tag color="cyan" style={{ marginLeft: 6 }}>Đến khám dịch vụ</Tag>}
          {record.bookedByName && <Tag color="purple" style={{ marginLeft: 6 }}>Đặt hộ</Tag>}
          {record.notes && <span title="Có ghi chú triệu chứng" style={{ marginLeft: 6 }}>📝</span>}
        </span>
      ),
    },
    { title: 'SĐT', dataIndex: 'patientPhone', key: 'patientPhone', width: 125 },
    { title: 'Giờ khám', dataIndex: 'timeSlot', key: 'timeSlot', width: 100 },
    {
      title: (
        <span>
          STT hàng đợi
          <br />
          <span style={{ fontSize: 11, fontWeight: 400, color: '#94a3b8' }}>(riêng theo từng bác sĩ)</span>
        </span>
      ),
      dataIndex: 'queueNumber', key: 'queueNumber', width: 130,
      render: (q, record) => {
        if (!q) return '—'
        return record.isCareSession ? <Tag color="cyan">Buổi #{q}</Tag> : <Tag color="blue">#{q}</Tag>
      },
    },
    {
      title: 'Bác sĩ / Điều dưỡng', dataIndex: 'doctorName', key: 'doctorName',
      render: (name) => name || <span style={{ color: '#94a3b8' }}>Chưa phân công</span>,
    },
    {
      title: 'Dịch vụ', dataIndex: 'serviceName', key: 'serviceName',
      render: (name) => name || '—',
    },
    {
      title: 'Trạng thái', dataIndex: 'status', key: 'status', width: 170,
      render: (status, record) => {
        const cfg = (record.isCareSession ? CARE_SESSION_STATUS_CONFIG[status] : STATUS_CONFIG[status]) || {}
        // Bệnh nhân chưa check-in mà giờ hẹn đã trôi qua: chỉ cảnh báo để lễ tân tự
        // quyết định (vẫn nhận khám hoặc bấm Hủy) — hệ thống chỉ tự động hủy hẳn khi
        // đến giờ đóng cửa phòng khám (cron 17:05).
        const isOverdue = !record.isCareSession
          && (status === 'PENDING' || status === 'CONFIRMED')
          && dayjs(record.appointmentTime).isBefore(dayjs())
        return (
          <div>
            <Tag color={cfg.color}>{cfg.label}</Tag>
            {isOverdue && (
              <Tag color="volcano" style={{ marginTop: 4 }} title="Đã quá giờ hẹn nhưng bệnh nhân chưa check-in">
                Quá giờ hẹn
              </Tag>
            )}
            {status === 'CANCELLED' && record.cancelReason && (
              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4, whiteSpace: 'normal', lineHeight: 1.3 }}>
                Lý do: {record.cancelReason}
              </div>
            )}
          </div>
        )
      },
    },
    {
      title: 'Hành động', key: 'action', width: 260,
      // stopPropagation để không mở modal chi tiết khi bấm nút thao tác
      render: (_, record) => {
        if (record.isCareSession) {
          // Chỉ trỏ sang trang Check-out khi buổi đã COMPLETED — trang đó chỉ liệt kê
          // đúng trạng thái này, trỏ sớm hơn sẽ khiến lễ tân vào thấy trống, gây hiểu nhầm.
          if (record.status === 'COMPLETED') {
            return <span style={{ color: '#94a3b8', fontSize: 12 }}>Xem tại "Check-out dịch vụ"</span>
          }
          // Khách phải check-in tại quầy trước khi vào hàng đợi điều dưỡng — cùng luồng
          // check-in đã có ở lịch khám bác sĩ (CONFIRMED → Check-in → WAITING).
          if (record.status === 'BOOKED' && !record.checkedIn) {
            return (
              <Button size="small" type="primary" icon={<LoginOutlined />}
                onClick={(e) => { e.stopPropagation(); handleCheckInCareSession(record.careSessionId) }}>
                Check-in
              </Button>
            )
          }
          const pendingLabel = {
            BOOKED: 'Đã check-in, chờ điều dưỡng thực hiện',
            IN_PROGRESS: 'Điều dưỡng đang thực hiện',
            CHECKED_OUT: 'Đã check-out',
            CANCELLED: 'Đã hủy',
          }[record.status] || '—'
          return <span style={{ color: '#cbd5e1', fontSize: 12 }}>{pendingLabel}</span>
        }
        return (
        <Space onClick={(e) => e.stopPropagation()} wrap size={[6, 6]}>
          {record.status === 'PENDING' && (
            <>
              <Button size="small" type="primary" icon={<CheckCircleOutlined />}
                onClick={() => handleOpenConfirm(record)}>
                Xác nhận
              </Button>
              <Button size="small" icon={<SwapOutlined />}
                onClick={() => handleOpenReschedule(record)}>
                Đổi lịch
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
              <Button size="small" icon={<SwapOutlined />}
                onClick={() => handleOpenReschedule(record)}>
                Đổi lịch
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
              {/* Bắt đầu khám là hành động của Bác sĩ (xem DoctorDashboard.jsx) — lễ tân
                  chỉ theo dõi trạng thái chờ, không được bấm thay bác sĩ. */}
              <span style={{ color: '#94a3b8', fontSize: 12 }}>Chờ bác sĩ bắt đầu khám</span>
              {/* Khách đã check-in nhưng có việc đột xuất cần đổi giờ/bác sĩ ngay —
                  dùng lại modal/luồng reassign chung, giữ nguyên trạng thái WAITING. */}
              <Button size="small" icon={<SwapOutlined />}
                onClick={() => handleOpenReschedule(record)}>
                Đổi lịch
              </Button>
            </>
          )}
          {record.status === 'COMPLETED' && (
            <Button size="small" type="primary"
              icon={<CheckCircleOutlined />}
              style={{ backgroundColor: '#10b981', borderColor: '#10b981' }}
              onClick={() => navigate('/receptionist/invoice', { state: { appointmentId: record.id } })}>
              Thu phí & HĐ
            </Button>
          )}
        </Space>
        )
      },
    },
  ]

  const isAnchorToday = anchorDate.isSame(dayjs(), 'day')
  const dayTitle = anchorDate.toDate().toLocaleDateString('vi-VN', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })

  // ── Lọc theo bác sĩ + nhóm theo ngày cho lưới Tuần/Tháng ──
  const rangeFiltered = rangeAppointments
    .filter((a) => !filterDoctor || String(a.doctorId) === filterDoctor)
    .filter((a) => matchesSearch(a, searchText))
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

  const navUnit = viewMode === 'week' ? 'week' : viewMode === 'month' ? 'month' : 'day'
  const goPrev = () => setAnchorDate((d) => d.subtract(1, navUnit))
  const goNext = () => setAnchorDate((d) => d.add(1, navUnit))
  const goToday = () => setAnchorDate(dayjs().startOf('day'))

  // Bấm vào một ngày trong lưới Tuần/Tháng -> mở chế độ Ngày của ngày đó
  const handlePickDay = (d) => {
    setAnchorDate(d.startOf('day'))
    setViewMode('day')
  }

  const rangeTitle = viewMode === 'week'
    ? `${range.start.format('DD/MM/YYYY')} – ${range.end.format('DD/MM/YYYY')}`
    : anchorDate.toDate().toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
        <div>
          <Typography.Title level={4} style={{ marginBottom: 4 }}>Lịch khám</Typography.Title>
          <Typography.Text type="secondary">
            {viewMode === 'day' ? dayTitle : rangeTitle}
          </Typography.Text>
        </div>
        <Segmented value={viewMode} onChange={setViewMode} options={VIEW_LABELS} />
      </div>

      {viewMode === 'day' ? (
        <>
          {/* Tìm bệnh nhân (đầu dòng) + điều hướng ngày (cuối dòng) trên cùng 1 hàng */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
            <Input.Search
              allowClear
              placeholder="Tìm bệnh nhân theo tên hoặc số điện thoại..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ maxWidth: 360, flex: '1 1 240px' }}
            />
            <Space wrap>
              {!isAnchorToday && (
                <Tag color="blue">Đang xem ngày {anchorDate.format('DD/MM/YYYY')}</Tag>
              )}
              <Button onClick={goPrev}>‹ Ngày trước</Button>
              <Button onClick={goToday} type="primary" ghost disabled={isAnchorToday}>Hôm nay</Button>
              <Button onClick={goNext}>Ngày sau ›</Button>
            </Space>
          </div>

          {/* Thống kê lịch hẹn khám bác sĩ của ngày đang xem — không dùng dashboard.*
              nữa vì API đó chỉ tính riêng lịch hẹn, khiến số liệu lệch với bảng. */}
          <Row gutter={12} style={{ marginBottom: 12 }}>
              {[
                { label: 'Tổng', value: mergedStats.total, color: '#6366f1' },
                { label: 'Chờ xác nhận', value: mergedStats.pending, color: '#f59e0b' },
                { label: 'Đã xác nhận', value: mergedStats.confirmed, color: '#3b82f6' },
                { label: 'Chờ khám', value: mergedStats.waiting, color: '#06b6d4' },
                { label: 'Đang khám', value: mergedStats.inProgress, color: '#8b5cf6' },
                { label: 'Hoàn thành', value: mergedStats.completed, color: '#10b981' },
                { label: 'Đã hủy', value: mergedStats.cancelled, color: '#ef4444' },
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

          {/* Thống kê buổi khám dịch vụ (chăm sóc) — tách riêng dòng dưới (khác luồng
              trạng thái với lịch hẹn khám bác sĩ ở trên), nhưng vẫn cùng cỡ 1/7 với các
              ô phía trên cho đồng đều — 6 Col rỗng còn lại để giữ đúng chiều rộng. */}
          <Row gutter={12} style={{ marginBottom: 16 }}>
            <Col flex="1">
              <Card size="small" style={{ textAlign: 'center', borderTop: '3px solid #0891b2' }}>
                <Statistic
                  title={<span style={{ fontSize: 11 }}>Đến khám dịch vụ</span>}
                  value={careSessions.filter(s => s.status !== 'CANCELLED').length}
                  styles={{ value: { fontSize: 20, color: '#0891b2' } }}
                />
              </Card>
            </Col>
            {Array.from({ length: 6 }).map((_, i) => <Col key={i} flex="1" />)}
          </Row>

      <Card>
        <Space style={{ marginBottom: 16 }} wrap>
          <Select
            value={filterStatus}
            onChange={setFilterStatus}
            style={{ width: 180 }}
            options={[
              { label: 'Tất cả trạng thái', value: 'ALL' },
              ...Object.entries(STATUS_CONFIG).map(([v, c]) => ({
                label: c.label,
                value: v,
              })),
              { label: 'Đến khám dịch vụ', value: 'CARE_SESSION' },
            ]}
          />
          {/* Le Thi Bich Ngan - HE204710 | Tạo: 27/07/2026
              Chức năng: lọc lịch hẹn trong ngày theo bác sĩ — dùng chung state
              filterDoctor với bộ lọc bác sĩ ở chế độ Tuần/Tháng (lựa chọn được
              giữ nguyên khi lễ tân đổi qua lại giữa các chế độ xem). Nguồn dữ
              liệu là danh sách bác sĩ đầy đủ (doctors, tải 1 lần khi mount) chứ
              không chỉ những bác sĩ xuất hiện trong ngày đang xem.
              Business rule: không gắn BR cụ thể — hỗ trợ tra cứu cho lễ tân. */}
          <Select
            value={filterDoctor || 'ALL'}
            onChange={(v) => setFilterDoctor(v === 'ALL' ? '' : v)}
            style={{ width: 220 }}
            options={[
              { label: '👥 Tất cả bác sĩ', value: 'ALL' },
              ...doctors.map((d) => ({ label: d.fullName, value: String(d.id) })),
            ]}
          />
          <Button icon={<ReloadOutlined />} onClick={reload} loading={loading}>
            Làm mới
          </Button>
        </Space>

            <Table
              columns={columns}
              dataSource={sortedFiltered}
              rowKey="id"
              loading={loading}
              pagination={{ pageSize: 10, showSizeChanger: false }}
              locale={{ emptyText: isAnchorToday ? 'Không có lịch hẹn nào hôm nay' : 'Không có lịch hẹn nào trong ngày này' }}
              onRow={(record) => {
                const info = rowGroupInfo.get(record.id) || {}
                return {
                  onClick: () => setDetail(record),
                  style: {
                    cursor: 'pointer',
                    background: info.tint ? '#f8fafc' : '#fff',
                    // Kẻ vạch đậm hơn ngăn cách giữa nhóm lịch hẹn của 2 bác sĩ khác nhau
                    borderTop: info.isGroupStart ? '2px solid #cbd5e1' : undefined,
                  },
                }
              }}
            />
          </Card>
        </>
      ) : (
        <>
          {/* Tìm bệnh nhân (đầu dòng) + điều hướng Tuần/Tháng (cuối dòng) trên cùng 1 hàng */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
            <Input.Search
              allowClear
              placeholder="Tìm bệnh nhân theo tên hoặc số điện thoại..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ maxWidth: 360, flex: '1 1 240px' }}
            />
            <Space wrap>
              <Button onClick={goPrev}>‹</Button>
              <Button onClick={goToday} type="primary" ghost>Hôm nay</Button>
              <Button onClick={goNext}>›</Button>
            </Space>
            <Space>
              {rangeDoctors.length > 0 && (
                <Select
                  value={filterDoctor || 'ALL'}
                  onChange={(v) => setFilterDoctor(v === 'ALL' ? '' : v)}
                  style={{ width: 220 }}
                  options={[
                    { label: '👥 Tất cả bác sĩ', value: 'ALL' },
                    ...rangeDoctors.map((d) => ({ label: d.name, value: String(d.id) })),
                  ]}
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
            <WeekGrid gridStart={range.gridStart} byDate={byDate} onSelect={setDetail} onPickDay={handlePickDay} />
          ) : (
            <MonthGrid gridStart={range.gridStart} gridEnd={range.gridEnd}
              currentMonth={anchorDate.month()} byDate={byDate} onSelect={setDetail} onPickDay={handlePickDay} />
          )}
        </>
      )}

      {/* Modal xác nhận + phân công bác sĩ (chế độ Ngày) */}


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
            {confirmModal.appointment.doctorName && (
              <p style={{ margin: '0 0 4px' }}>
                <strong>Bác sĩ bệnh nhân đã đặt:</strong> {confirmModal.appointment.doctorName}
              </p>
            )}
          </div>
        )}
        {(() => {
          const originalDoctorId = confirmModal.appointment?.doctorId ?? null
          const doctorChanged = originalDoctorId != null && selectedDoctorId !== originalDoctorId
          return (
            <Form layout="vertical">
              <Form.Item label="Phân công bác sĩ (không bắt buộc)">
                <Select
                  allowClear
                  placeholder="Chọn bác sĩ"
                  value={selectedDoctorId}
                  onChange={setSelectedDoctorId}
                  options={doctors.map((d) => ({
                    label: `${d.fullName}${d.specialization ? ` — ${d.specialization}` : ''}${d.experienceYears != null ? ` (${d.experienceYears} năm KN)` : ''}`,
                    value: d.id,
                  }))}
                />
              </Form.Item>
              {doctorChanged && (
                <Form.Item
                  label="Lý do đổi bác sĩ"
                  required
                  validateStatus={changeReason.trim() ? '' : 'error'}
                  help={changeReason.trim() ? '' : 'Bắt buộc nhập lý do khi đổi sang bác sĩ khác'}
                >
                  <Input.TextArea
                    rows={3}
                    value={changeReason}
                    onChange={(e) => setChangeReason(e.target.value)}
                    placeholder="VD: Bác sĩ bệnh nhân đặt bận đột xuất / chuyên môn phù hợp hơn..."
                    maxLength={500}
                    showCount
                  />
                </Form.Item>
              )}
            </Form>
          )
        })()}
      </Modal>

      {/* Modal đổi lịch hẹn (UC-18, lễ tân) */}
      <Modal
        title="Đổi lịch hẹn"
        open={rescheduleModal.open}
        onOk={handleReschedule}
        onCancel={() => setRescheduleModal({ open: false, appointment: null })}
        confirmLoading={rescheduleSaving}
        okText="Xác nhận đổi lịch"
        cancelText="Hủy"
      >
        {rescheduleModal.appointment && (
          <div style={{ marginBottom: 16 }}>
            <p style={{ margin: '0 0 4px' }}><strong>Bệnh nhân:</strong> {rescheduleModal.appointment.patientName}</p>
            <p style={{ margin: '0 0 4px' }}>
              <strong>Lịch hiện tại:</strong> {rescheduleModal.appointment.timeSlot} — {dayjs(rescheduleModal.appointment.appointmentTime).format('DD/MM/YYYY')}
              {rescheduleModal.appointment.doctorName && ` • BS. ${rescheduleModal.appointment.doctorName}`}
            </p>
          </div>
        )}
        {(() => {
          const originalDoctorId = rescheduleModal.appointment?.doctorId ?? null
          const doctorChanged = originalDoctorId != null && rescheduleDoctorId !== originalDoctorId
          return (
            <Form layout="vertical">
              <Form.Item label="Ngày giờ khám mới" required>
                <DatePicker
                  showTime={{ format: 'HH:mm', minuteStep: 5 }}
                  format="DD/MM/YYYY HH:mm"
                  value={rescheduleTime}
                  onChange={setRescheduleTime}
                  style={{ width: '100%' }}
                  disabledDate={(d) => d && d.isBefore(dayjs(), 'day')}
                  disabledTime={() => ({
                    disabledHours: () => {
                      const hours = []
                      for (let h = 0; h < 24; h++) {
                        if (h < CLINIC_OPEN_HOUR || h > CLINIC_CLOSE_HOUR) hours.push(h)
                      }
                      return hours
                    },
                    disabledMinutes: (h) => {
                      const mins = new Set()
                      if (h === CLINIC_OPEN_HOUR) for (let m = 0; m < 30; m++) mins.add(m) // trước 07:30
                      if (h === CLINIC_CLOSE_HOUR) for (let m = 1; m < 60; m++) mins.add(m) // sau 17:00
                      return [...mins]
                    },
                  })}
                />
              </Form.Item>
              <Form.Item label="Đổi bác sĩ (không bắt buộc)">
                <Select
                  allowClear
                  placeholder="Giữ nguyên bác sĩ hiện tại"
                  value={rescheduleDoctorId}
                  onChange={(v) => setRescheduleDoctorId(v ?? null)}
                  options={doctors.map((d) => ({
                    label: `${d.fullName}${d.specialization ? ` — ${d.specialization}` : ''}`,
                    value: d.id,
                  }))}
                />
              </Form.Item>
              {doctorChanged && (
                <Form.Item
                  label="Lý do đổi bác sĩ"
                  required
                  validateStatus={rescheduleReason.trim() ? '' : 'error'}
                  help={rescheduleReason.trim() ? '' : 'Bắt buộc nhập lý do khi đổi sang bác sĩ khác'}
                >
                  <Input.TextArea
                    rows={2}
                    value={rescheduleReason}
                    onChange={(e) => setRescheduleReason(e.target.value)}
                    placeholder="VD: Bác sĩ cũ không còn giờ trống trong khung mới..."
                    maxLength={500}
                    showCount
                  />
                </Form.Item>
              )}
            </Form>
          )
        })()}
      </Modal>

      {/* Le Thi Bich Ngan - HE204710 | Tạo: 19/07/2026
          Modal huỷ lịch hẹn — lý do nhập ở đây được gửi kèm trong email thông báo huỷ cho bệnh nhân */}
      <Modal
        title="Xác nhận hủy lịch hẹn"
        open={cancelModal.open}
        onOk={handleCancel}
        onCancel={() => setCancelModal({ open: false, appointment: null })}
        confirmLoading={cancelSaving}
        okText="Hủy lịch"
        cancelText="Không"
        okButtonProps={{ danger: true }}
      >
        {cancelModal.appointment && (
          <p>Bạn có chắc muốn hủy lịch hẹn của <strong>{cancelModal.appointment.patientName || 'bệnh nhân này'}</strong> không?</p>
        )}
        <Form layout="vertical">
          <Form.Item label="Lý do hủy (không bắt buộc, sẽ gửi kèm email báo cho bệnh nhân)">
            <Input.TextArea
              rows={2}
              value={cancelReasonInput}
              onChange={(e) => setCancelReasonInput(e.target.value)}
              placeholder="VD: Bác sĩ đột xuất nghỉ, phòng khám tạm ngưng nhận khách..."
              maxLength={500}
              showCount
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
function WeekGrid({ gridStart, byDate, onSelect, onPickDay }) {
  const days = Array.from({ length: 7 }, (_, i) => gridStart.add(i, 'day'))
  const isToday = (d) => d.isSame(dayjs(), 'day')

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 10 }}>
      {days.map((d) => {
        const key = d.format('YYYY-MM-DD')
        const items = byDate.get(key) || []
        return (
          <div key={key} style={{ background: '#fff', borderRadius: 12, border: isToday(d) ? '2px solid #2563eb' : '1px solid #e2e8f0', minHeight: 240, display: 'flex', flexDirection: 'column' }}>
            <div
              onClick={() => onPickDay?.(d)}
              title="Xem chi tiết ngày này"
              style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }}
            >
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
function MonthGrid({ gridStart, gridEnd, currentMonth, byDate, onSelect, onPickDay }) {
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
              <span
                onClick={() => onPickDay?.(d)}
                title="Xem chi tiết ngày này"
                style={{
                  fontSize: 13, fontWeight: 700, alignSelf: 'flex-start', cursor: 'pointer',
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
