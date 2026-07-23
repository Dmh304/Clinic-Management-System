import { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import userService from '../services/userService'

const s = {
  page: { fontFamily: 'system-ui, -apple-system, sans-serif', minHeight: '70vh', backgroundColor: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: '40px 36px', maxWidth: 440, textAlign: 'center' },
  icon: { fontSize: 48, marginBottom: 16 },
  title: { fontSize: 20, fontWeight: 700, color: '#111827', margin: '0 0 10px' },
  desc: { fontSize: 14, color: '#64748b', lineHeight: 1.6, marginBottom: 24 },
  link: { color: '#1d4ed8', fontSize: 14, fontWeight: 600, textDecoration: 'none' },
}

export default function UnsubscribePage() {
  const [searchParams] = useSearchParams()
  const uid = searchParams.get('uid')
  const token = searchParams.get('token')
  const [status, setStatus] = useState('loading') // loading | success | error

  useEffect(() => {
    if (!uid || !token) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStatus('error')
      return
    }
    userService.unsubscribe(uid, token)
      .then(() => setStatus('success'))
      .catch(() => setStatus('error'))
  }, [uid, token])

  return (
    <div style={s.page}>
      <div style={s.card}>
        {status === 'loading' && (
          <>
            <div style={s.icon}>⏳</div>
            <div style={s.title}>Đang xử lý...</div>
          </>
        )}
        {status === 'success' && (
          <>
            <div style={s.icon}>✅</div>
            <div style={s.title}>Đã hủy đăng ký thành công</div>
            <p style={s.desc}>Bạn sẽ không còn nhận email thông báo khuyến mãi từ Nhãn Khoa Ánh Sao nữa. Các email giao dịch (xác nhận đặt lịch, đăng ký dịch vụ...) vẫn được gửi bình thường.</p>
          </>
        )}
        {status === 'error' && (
          <>
            <div style={s.icon}>😕</div>
            <div style={s.title}>Liên kết không hợp lệ</div>
            <p style={s.desc}>Liên kết hủy đăng ký này không hợp lệ hoặc đã được sử dụng. Nếu vẫn muốn ngừng nhận email khuyến mãi, vui lòng liên hệ phòng khám.</p>
          </>
        )}
        <Link to="/" style={s.link}>← Quay lại trang chủ</Link>
      </div>
    </div>
  )
}
