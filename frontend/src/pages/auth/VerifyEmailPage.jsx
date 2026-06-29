// Mạnh Hùng - HE200743
// Trang xác minh email: đọc token từ query string khi người dùng nhấn liên kết trong email,
// gọi API xác minh và hiển thị kết quả (thành công/thất bại).
import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Spin } from 'antd'
import authService from '../../services/authService'
import Header from '../../components/layout/Header'

const S = {
  page: {
    minHeight: '100vh', display: 'flex', flexDirection: 'column',
    background: '#eef2ff', fontFamily: "'Segoe UI', system-ui, sans-serif",
  },
  main: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 20px' },
  card: {
    width: '100%', maxWidth: 440, background: '#fff', borderRadius: 20,
    boxShadow: '0 8px 32px rgba(0,0,0,.10)', padding: '40px 36px', textAlign: 'center',
  },
  title: { fontSize: 22, fontWeight: 700, margin: '0 0 12px' },
  message: { fontSize: 14, color: '#6b7280', lineHeight: 1.6, margin: '0 0 20px' },
  link: {
    display: 'inline-block', background: '#1d4ed8', color: '#fff', borderRadius: 10,
    padding: '10px 24px', fontWeight: 600, textDecoration: 'none',
  },
}

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const [status, setStatus] = useState(token ? 'loading' : 'error') // loading | success | error
  const [errorMsg, setErrorMsg] = useState(token ? '' : 'Liên kết xác minh không hợp lệ.')

  useEffect(() => {
    if (!token) return
    authService.verifyEmail(token)
      .then(() => setStatus('success'))
      .catch((err) => {
        setStatus('error')
        setErrorMsg(err.response?.data?.message ?? 'Xác minh email thất bại. Liên kết có thể đã hết hạn.')
      })
  }, [token])

  return (
    <div style={S.page}>
      <Header />
      <main style={S.main}>
        <div style={S.card}>
          {status === 'loading' && (
            <>
              <Spin size="large" />
              <p style={{ ...S.message, marginTop: 16 }}>Đang xác minh email của bạn...</p>
            </>
          )}
          {status === 'success' && (
            <>
              <h2 style={{ ...S.title, color: '#16a34a' }}>Xác minh thành công!</h2>
              <p style={S.message}>Tài khoản của bạn đã được kích hoạt. Bạn có thể đăng nhập ngay bây giờ.</p>
              <Link to="/login" style={S.link}>Đăng nhập</Link>
            </>
          )}
          {status === 'error' && (
            <>
              <h2 style={{ ...S.title, color: '#dc2626' }}>Xác minh thất bại</h2>
              <p style={S.message}>{errorMsg}</p>
              <Link to="/login" style={S.link}>Về trang đăng nhập</Link>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
