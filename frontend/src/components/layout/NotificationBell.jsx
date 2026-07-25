// UC-13: Chuông thông báo + badge số chưa đọc + dropdown danh sách.
// Tái sử dụng ở Header (trang chủ) và ở sidebar Lễ tân.
// Polling số chưa đọc mỗi 30s (không dùng websocket). Click 1 thông báo:
// đánh dấu đã đọc + nếu có relatedAppointmentId thì mở modal chi tiết lịch hẹn.

import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { notificationService } from '../../services/notificationService'
import { appointmentService } from '../../services/appointmentService'
import AppointmentDetailModal from '../receptionist/AppointmentDetailModal'

const POLL_INTERVAL = 30000
const PANEL_WIDTH = 320
const PANEL_MAX_HEIGHT = 420
const GAP = 8
const EDGE_PADDING = 8

// Tính vị trí dropdown bám theo đúng vị trí thực tế của chuông (không hardcode
// góc màn hình), đồng thời kẹp trong viewport để không bao giờ tràn ra ngoài.
// - placement="right": bung sang phải chuông (dùng cho chuông nằm trong sidebar
//   hẹp, không có chỗ mở xuống dưới — vd sidebar Lễ tân).
// - placement="bottom" (mặc định): mở ngay bên dưới chuông, căn theo cạnh phải
//   của chuông (kiểu dropdown thông thường trên thanh header).
function computePanelStyle(placement, rect) {
  if (!rect) return { position: 'fixed', top: 16, right: 16 }
  const vw = window.innerWidth
  const vh = window.innerHeight

  if (placement === 'right') {
    let left = rect.right + GAP
    // Không đủ chỗ bên phải (hiếm) -> bung sang trái chuông thay vì tràn ra ngoài
    if (left + PANEL_WIDTH > vw - EDGE_PADDING) {
      left = Math.max(EDGE_PADDING, rect.left - PANEL_WIDTH - GAP)
    }
    let top = Math.min(rect.top, vh - PANEL_MAX_HEIGHT - EDGE_PADDING)
    top = Math.max(EDGE_PADDING, top)
    return { position: 'fixed', top, left }
  }

  let left = rect.right - PANEL_WIDTH
  if (left < EDGE_PADDING) left = EDGE_PADDING
  if (left + PANEL_WIDTH > vw - EDGE_PADDING) left = vw - PANEL_WIDTH - EDGE_PADDING
  let top = rect.bottom + GAP
  if (top + PANEL_MAX_HEIGHT > vh - EDGE_PADDING) {
    // Không đủ chỗ bên dưới -> mở lên trên chuông thay vì tràn ra ngoài
    top = Math.max(EDGE_PADDING, rect.top - PANEL_MAX_HEIGHT - GAP)
  }
  return { position: 'fixed', top, left }
}

// Thời gian tương đối tiếng Việt
function timeAgo(dateStr) {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const sec = Math.floor(diff / 1000)
  if (sec < 60) return 'Vừa xong'
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min} phút trước`
  const hour = Math.floor(min / 60)
  if (hour < 24) return `${hour} giờ trước`
  const day = Math.floor(hour / 24)
  if (day < 7) return `${day} ngày trước`
  return new Date(dateStr).toLocaleDateString('vi-VN')
}

export default function NotificationBell({ viewAllPath, iconColor = '#64748b', placement = 'bottom' }) {
  const navigate = useNavigate()
  const { user } = useSelector((s) => s.auth)
  const isPatient = user?.role === 'PATIENT'
  const [open, setOpen] = useState(false)
  const [unread, setUnread] = useState(0)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [detail, setDetail] = useState(null) // appointment hiển thị trong modal
  const [panelStyle, setPanelStyle] = useState(null)
  const wrapRef = useRef(null)

  const loadCount = async () => {
    try {
      const res = await notificationService.getUnreadCount()
      setUnread(res.data ?? 0)
    } catch {
      /* im lặng — không làm phiền người dùng nếu lỗi mạng tạm thời */
    }
  }

  const loadList = async () => {
    setLoading(true)
    try {
      const res = await notificationService.getAll()
      setItems(res.data ?? [])
    } catch {
      /* im lặng */
    } finally {
      setLoading(false)
    }
  }

  // Polling số chưa đọc mỗi 30s + lần đầu khi mount
  useEffect(() => {
    loadCount()
    const timer = setInterval(loadCount, POLL_INTERVAL)
    return () => clearInterval(timer)
  }, [])

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    const onClickOutside = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  // Tính vị trí dropdown bám theo chuông (đọc ref ngoài render, trong effect) —
  // chạy lại khi mở dropdown, và khi cửa sổ đổi kích thước/cuộn lúc đang mở, để
  // panel luôn bám đúng theo chuông và không tràn ra ngoài viewport.
  useEffect(() => {
    if (!open) return
    const updatePosition = () => {
      if (wrapRef.current) setPanelStyle(computePanelStyle(placement, wrapRef.current.getBoundingClientRect()))
    }
    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)
    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [open, placement])

  const toggle = () => {
    const next = !open
    setOpen(next)
    if (next) loadList()
  }

  const handleMarkAllRead = async () => {
    try {
      await notificationService.markAllAsRead()
      setItems((prev) => prev.map((x) => ({ ...x, isRead: true })))
      setUnread(0)
    } catch {
      /* im lặng */
    }
  }

  const handleClickItem = async (n) => {
    try {
      if (!n.isRead) {
        await notificationService.markAsRead(n.id)
        setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, isRead: true } : x)))
        loadCount()
      }
      setOpen(false)

      // Thông báo thanh toán (UC-22) — chưa gắn relatedEntityType nên vẫn nhận diện theo nội dung:
      //  - "cần thanh toán" → sang trang Hóa đơn của tôi để quét QR.
      //  - "Thanh toán thành công" → giữ nguyên trang, chỉ đánh dấu đã đọc.
      const msg = n.message || ''
      if (isPatient && msg.includes('cần thanh toán')) {
        navigate('/patient/invoices')
        return
      }
      if (msg.includes('Thanh toán thành công')) {
        return
      }
      if (n.relatedAppointmentId) {
      const role = user?.role
      const type = n.relatedEntityType
      const entityId = n.relatedAppointmentId

      // Đặt buổi dịch vụ thành công — patient sang lịch sử buổi khám của đúng gói đó.
      if (type === 'SUBSCRIPTION') {
        if (entityId && role === 'PATIENT') navigate(`/patient/subscriptions/${entityId}/sessions`)
        return
      }

      // Buổi dịch vụ hoàn thành, sẵn sàng check-out — lễ tân sang thẳng hàng đợi check-out.
      if (type === 'CARE_SESSION_CHECKOUT') {
        if (role === 'RECEPTIONIST') navigate('/receptionist/checkout-care-sessions')
        return
      }

      // Điều dưỡng được/gỡ phân công, hoặc sự cố buổi chăm sóc báo Manager.
      if (type === 'CARE_SESSION') {
        if (role === 'NURSE') navigate('/nurse/queue')
        else if (role === 'MANAGER') navigate('/manager/assign-nurse')
        return
      }

      // Khuyến mãi mới — sang trang chi tiết khuyến mãi (hoặc danh sách nếu thiếu id).
      if (type === 'PROMOTION') {
        navigate(entityId ? `/promotions/${entityId}` : '/promotions')
        return
      }

      // Đánh giá mới cần duyệt — Manager sang trang báo cáo đánh giá.
      if (type === 'FEEDBACK') {
        if (role === 'MANAGER') navigate('/manager/feedback-report')
        return
      }

      // Mặc định (type null hoặc "APPOINTMENT"): hành vi cũ — bệnh nhân điều hướng tới trang
      // lịch hẹn của mình, nhân viên mở modal chi tiết lịch hẹn.
      if (entityId) {
        if (isPatient) {
          navigate(`/patient/appointments?highlight=${n.relatedAppointmentId}`)
        } 
        // ── DOCTOR ──
        else if (user?.role === 'DOCTOR') {
          // Bác sĩ bấm vào thông báo liên quan đến xét nghiệm
          if (msg.toLowerCase().includes('xét nghiệm')) {
            navigate(`/doctor/lab-order?appointmentId=${n.relatedAppointmentId}`)
          } else {
            navigate(`/doctor/emr?appointmentId=${n.relatedAppointmentId}`)
          }
        } 
        // ── LAB TECHNICIAN ──
        else if (user?.role === 'LAB_TECHNICIAN') {
          // KTV bấm vào thông báo đơn kính
          if (msg.toLowerCase().includes('đơn kính')) {
            navigate(`/lab/eyeglass-queue?appointmentId=${n.relatedAppointmentId}`)
          } 
          // KTV bấm vào thông báo xét nghiệm
          else if (msg.toLowerCase().includes('xét nghiệm')) {
            navigate(`/lab/queue?appointmentId=${n.relatedAppointmentId}`)
          }
        }
        // ── RECEPTIONIST ──
        else if (user?.role === 'RECEPTIONIST') {
          // Lễ tân bấm vào thông báo bệnh nhân đặt kính
          if (msg.toLowerCase().includes('đơn kính')) {
            navigate(`/receptionist/eyeglass-orders?appointmentId=${n.relatedAppointmentId}`)
          } else {
            // Mở modal lịch hẹn bình thường
            const res = await appointmentService.getById(n.relatedAppointmentId)
            setDetail(res.data)
          }
        } 
        // Các role khác (Receptionist, Manager) mở modal chi tiết lịch hẹn
        else {
          const res = await appointmentService.getById(n.relatedAppointmentId)
          setDetail(res.data)
        }
      }
    }
    } catch {
      /* im lặng */
    }
  }

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <button
        onClick={toggle}
        aria-label="Thông báo"
        style={{
          position: 'relative', background: 'none', border: 'none', cursor: 'pointer',
          padding: 6, display: 'flex', alignItems: 'center', justifyContent: 'center',
          borderRadius: 8,
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={iconColor}
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unread > 0 && (
          <span style={{
            position: 'absolute', top: 0, right: 0,
            minWidth: 16, height: 16, padding: '0 4px',
            background: '#ef4444', color: '#fff', borderRadius: 999,
            fontSize: 10, fontWeight: 700, lineHeight: '16px', textAlign: 'center',
            boxShadow: '0 0 0 2px #fff',
          }}>
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && panelStyle && (
        <div style={{
          ...panelStyle,
          width: PANEL_WIDTH, maxHeight: PANEL_MAX_HEIGHT, overflowY: 'auto',
          background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12,
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 300,
        }}>
          <div style={{
            padding: '10px 14px', borderBottom: '1px solid #f1f5f9',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>Thông báo</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {unread > 0 && (
                <span style={{ fontSize: 11, color: '#ef4444', fontWeight: 600 }}>{unread} chưa đọc</span>
              )}
              {items.some((x) => !x.isRead) && (
                <button
                  onClick={handleMarkAllRead}
                  title="Đánh dấu tất cả đã đọc"
                  aria-label="Đánh dấu tất cả đã đọc"
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer', color: '#2563eb',
                    padding: 4, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    borderRadius: 6,
                  }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 6 7 17l-5-5" />
                    <path d="m22 10-7.5 7.5L13 16" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {loading ? (
            <div style={{ padding: 20, textAlign: 'center', fontSize: 13, color: '#94a3b8' }}>Đang tải...</div>
          ) : items.length === 0 ? (
            <div style={{ padding: 20, textAlign: 'center', fontSize: 13, color: '#94a3b8' }}>Không có thông báo</div>
          ) : (
            items.slice(0, 10).map((n) => (
              <button
                key={n.id}
                onClick={() => handleClickItem(n)}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: 8, width: '100%', textAlign: 'left',
                  padding: '10px 14px', border: 'none', cursor: 'pointer',
                  borderBottom: '1px solid #f8fafc',
                  background: n.isRead ? '#fff' : '#eff6ff',
                }}
              >
                <span style={{
                  width: 8, height: 8, borderRadius: '50%', marginTop: 5, flexShrink: 0,
                  background: n.isRead ? 'transparent' : '#2563eb',
                }} />
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: 13, color: '#374151', lineHeight: 1.4 }}>{n.message}</span>
                  <span style={{ display: 'block', fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{timeAgo(n.createdAt)}</span>
                </span>
              </button>
            ))
          )}

          {viewAllPath && (
            <button
              onClick={() => { setOpen(false); navigate(viewAllPath) }}
              style={{
                width: '100%', padding: '10px 14px', border: 'none', cursor: 'pointer',
                background: '#f8fafc', color: '#2563eb', fontSize: 13, fontWeight: 600,
              }}
            >
              Xem tất cả
            </button>
          )}
        </div>
      )}

      <AppointmentDetailModal appointment={detail} onClose={() => setDetail(null)} />
    </div>
  )
}
