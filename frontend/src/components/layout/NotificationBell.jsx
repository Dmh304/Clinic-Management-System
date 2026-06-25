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

export default function NotificationBell({ viewAllPath, iconColor = '#64748b' }) {
  const navigate = useNavigate()
  const { user } = useSelector((s) => s.auth)
  const isPatient = user?.role === 'PATIENT'
  const [open, setOpen] = useState(false)
  const [unread, setUnread] = useState(0)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [detail, setDetail] = useState(null) // appointment hiển thị trong modal
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

  const toggle = () => {
    const next = !open
    setOpen(next)
    if (next) loadList()
  }

  const handleClickItem = async (n) => {
    try {
      if (!n.isRead) {
        await notificationService.markAsRead(n.id)
        setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, isRead: true } : x)))
        loadCount()
      }
      setOpen(false)
      if (n.relatedAppointmentId) {
        // Bệnh nhân điều hướng tới trang lịch hẹn của mình (không gọi API staff);
        // nhân viên mở modal chi tiết lịch hẹn.
        if (isPatient) {
          navigate(`/patient/appointments?highlight=${n.relatedAppointmentId}`)
        } else {
          const res = await appointmentService.getById(n.relatedAppointmentId)
          setDetail(res.data)
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

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 8px)', right: 0,
          width: 320, maxHeight: 420, overflowY: 'auto',
          background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12,
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 300,
        }}>
          <div style={{
            padding: '10px 14px', borderBottom: '1px solid #f1f5f9',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>Thông báo</span>
            {unread > 0 && (
              <span style={{ fontSize: 11, color: '#ef4444', fontWeight: 600 }}>{unread} chưa đọc</span>
            )}
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
