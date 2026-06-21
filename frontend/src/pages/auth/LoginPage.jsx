// Mạnh Hùng - HE200743
// Trang đăng nhập của hệ thống. Người dùng nhập email và mật khẩu để xác thực.
// Sau khi đăng nhập thành công, hệ thống lưu token JWT vào Redux và localStorage,
// sau đó tự động điều hướng đến dashboard tương ứng với vai trò (PATIENT, DOCTOR, v.v.).
import { useState } from 'react'
import { Form, Input, Button, Checkbox, Divider, message } from 'antd'
import { MailOutlined, LockOutlined, EyeInvisibleOutlined, EyeTwoTone, QuestionCircleOutlined } from '@ant-design/icons'
import { GoogleLogin } from '@react-oauth/google'
import { useDispatch } from 'react-redux'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { loginSuccess } from '../../store/slices/authSlice'
import authService from '../../services/authService'
import Header from '../../components/layout/Header'

const ROLE_REDIRECT = {
  PATIENT: '/patient/dashboard',
  DOCTOR: '/doctor/dashboard',
  LAB_TECHNICIAN: '/lab/queue',
  PHARMACIST: '/pharmacy/dispensing',
  MANAGER: '/manager/dashboard',
  ADMIN: '/admin/users',
}

/* ─── Inline style constants ─── */
const S = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    background: '#eef2ff',
    fontFamily: "'Segoe UI', system-ui, sans-serif",
  },
  header: {
    background: '#fff',
    boxShadow: '0 1px 4px rgba(0,0,0,.08)',
    padding: '14px 40px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logo: {
    color: '#1d4ed8',
    fontWeight: 700,
    fontSize: 20,
    letterSpacing: '-0.3px',
  },
  nav: {
    display: 'flex',
    gap: 32,
    listStyle: 'none',
    margin: 0,
    padding: 0,
  },
  navLink: {
    color: '#4b5563',
    fontSize: 14,
    textDecoration: 'none',
    cursor: 'pointer',
  },
  headerBtn: {
    background: '#1d4ed8',
    color: '#fff',
    border: 'none',
    borderRadius: 999,
    padding: '8px 22px',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  },
  main: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '48px 20px',
  },
  inner: {
    width: '100%',
    maxWidth: 960,
    display: 'flex',
    alignItems: 'center',
    gap: 56,
    flexWrap: 'wrap',
  },
  hero: {
    flex: '1 1 340px',
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
  },
  heading: {
    fontSize: 42,
    fontWeight: 800,
    color: '#1e3a8a',
    lineHeight: 1.2,
    margin: 0,
  },
  sub: {
    fontSize: 15,
    color: '#6b7280',
    maxWidth: 340,
    lineHeight: 1.6,
    margin: 0,
  },
  clinicImg: {
    borderRadius: 16,
    width: '100%',
    maxWidth: 360,
    height: 220,
    background: 'linear-gradient(135deg, #22d3ee 0%, #0d9488 50%, #1d4ed8 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  card: {
    flex: '0 0 420px',
    background: '#fff',
    borderRadius: 20,
    boxShadow: '0 8px 32px rgba(0,0,0,.10)',
    padding: '40px 36px',
  },
  cardTitle: {
    fontSize: 26,
    fontWeight: 700,
    color: '#111827',
    margin: '0 0 4px',
  },
  cardSub: {
    fontSize: 13,
    color: '#9ca3af',
    margin: '0 0 28px',
  },
  label: {
    fontSize: 13,
    fontWeight: 600,
    color: '#374151',
    display: 'block',
    marginBottom: 6,
  },
  rememberRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    margin: '4px 0 4px',
  },
  forgotLink: {
    fontSize: 13,
    color: '#2563eb',
    textDecoration: 'none',
  },
  submitBtn: {
    width: '100%',
    background: '#1d4ed8',
    borderColor: '#1d4ed8',
    height: 44,
    borderRadius: 10,
    fontWeight: 700,
    fontSize: 15,
  },
  registerRow: {
    textAlign: 'center',
    fontSize: 13,
    color: '#6b7280',
    marginTop: 4,
  },
  supportRow: {
    textAlign: 'center',
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 10,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  footer: {
    background: '#dde8ff',
    padding: '20px 40px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
  },
  footerLinks: {
    display: 'flex',
    gap: 24,
  },
  footerLink: {
    fontSize: 12,
    color: '#4b5563',
    textDecoration: 'none',
  },
}

// Icon mắt dùng làm hình minh họa phía bên trái trang đăng nhập
function ClinicEyeSvg() {
  return (
    <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="1.2"
      strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

export default function LoginPage() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const location = useLocation()
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [form] = Form.useForm()


  // Xử lý submit form đăng nhập: gọi API login, lưu thông tin vào Redux và điều hướng theo vai trò
  const onFinish = async (values) => {
    setLoading(true)
    setErrorMsg('')
    try {
      const res = await authService.login({ email: values.email, password: values.password })
      const { token, userId, email, fullName, role, doctorId } = res.data
      dispatch(loginSuccess({ token, userId, email, fullName, role, doctorId }))
      message.success('Đăng nhập thành công!')
      navigate(location.state?.from ?? '/', { replace: true })
    } catch (err) {
      if (!err.response) {
        // Không có phản hồi — backend chưa khởi động hoặc mạng lỗi
        setErrorMsg('Không thể kết nối đến máy chủ. Hãy kiểm tra backend đang chạy tại cổng 8080.')
      } else {
        // Backend phản hồi với lỗi (401, 400, 500...)
        const msg = err.response.data?.message ?? 'Đăng nhập thất bại. Vui lòng thử lại.'
        setErrorMsg(msg)
      }
    } finally {
      setLoading(false)
    }
  }

  // Xử lý đăng nhập bằng Google: gửi ID token nhận được lên backend để xác thực và lấy token nội bộ
  const handleGoogleSuccess = async (credentialResponse) => {
    setLoading(true)
    setErrorMsg('')
    try {
      const res = await authService.loginWithGoogle(credentialResponse.credential)
      const { token, userId, email, fullName, role, doctorId } = res.data
      dispatch(loginSuccess({ token, userId, email, fullName, role, doctorId }))
      message.success('Đăng nhập bằng Google thành công!')
      navigate(location.state?.from ?? '/', { replace: true })
    } catch (err) {
      if (!err.response) {
        setErrorMsg('Không thể kết nối đến máy chủ. Hãy kiểm tra backend đang chạy tại cổng 8080.')
      } else {
        const msg = err.response.data?.message ?? 'Đăng nhập bằng Google thất bại. Vui lòng thử lại.'
        setErrorMsg(msg)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={S.page}>
      <Header />

      {/* ── Main ── */}
      <main style={S.main}>
        <div style={S.inner}>

          {/* Left — Hero */}
          <div style={S.hero}>
            <h1 style={S.heading}>
              Quản lý sức khỏe<br />
              mắt của bạn<br />
              với sự chính xác.
            </h1>
            <p style={S.sub}>
              Truy cập hồ sơ bệnh án, đặt lịch tái khám và kết nối với đội ngũ
              nhãn khoa của bạn tại một nơi an toàn.
            </p>
            <div style={S.clinicImg}>
              <ClinicEyeSvg />
            </div>
          </div>

          {/* Right — Login card */}
          <div style={S.card}>
            <p style={S.cardTitle}>Chào Mừng Trở Lại</p>
            <p style={S.cardSub}>Vui lòng nhập thông tin đăng nhập để tiếp tục.</p>

            <Form form={form} onFinish={onFinish} layout="vertical" requiredMark={false} size="large">
              {/* Email */}
              <Form.Item
                name="email"
                label={<span style={S.label}>Địa Chỉ Email</span>}
                rules={[
                  { required: true, message: 'Vui lòng nhập email' },
                  { type: 'email', message: 'Email không hợp lệ' },
                ]}
                style={{ marginBottom: 16 }}
              >
                <Input
                  prefix={<MailOutlined style={{ color: '#9ca3af' }} />}
                  placeholder="name@example.com"
                  style={{ borderRadius: 10, height: 44 }}
                />
              </Form.Item>

              {/* Password */}
              <Form.Item
                name="password"
                label={<span style={S.label}>Mật Khẩu</span>}
                rules={[{ required: true, message: 'Vui lòng nhập mật khẩu' }]}
                style={{ marginBottom: 12 }}
              >
                <Input.Password
                  prefix={<LockOutlined style={{ color: '#9ca3af' }} />}
                  placeholder="••••••••"
                  iconRender={(visible) =>
                    visible ? <EyeTwoTone /> : <EyeInvisibleOutlined style={{ color: '#9ca3af' }} />
                  }
                  style={{ borderRadius: 10, height: 44 }}
                />
              </Form.Item>

              {/* Remember + Forgot */}
              <div style={S.rememberRow}>
                <Form.Item name="rememberMe" valuePropName="checked" noStyle>
                  <Checkbox style={{ fontSize: 13, color: '#4b5563' }}>Ghi nhớ đăng nhập</Checkbox>
                </Form.Item>
                <Link to="/forgot-password" style={S.forgotLink}>Quên mật khẩu?</Link>
              </div>

              {/* Server error message */}
              {errorMsg && (
                <div style={{
                  background: '#fef2f2', border: '1px solid #fecaca',
                  borderRadius: 8, padding: '10px 14px', marginTop: 12,
                  fontSize: 13, color: '#dc2626', lineHeight: 1.5,
                }}>
                  {errorMsg}
                </div>
              )}

              {/* Submit */}
              <Form.Item style={{ marginTop: 16, marginBottom: 0 }}>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={loading}
                  icon={!loading && <span style={{ fontSize: 16 }}>→</span>}
                  style={S.submitBtn}
                >
                  Đăng Nhập
                </Button>
              </Form.Item>
            </Form>

            <Divider style={{ margin: '20px 0', fontSize: 12, color: '#9ca3af' }}>HOẶC</Divider>

            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => setErrorMsg('Đăng nhập bằng Google thất bại. Vui lòng thử lại.')}
                text="signin_with"
                locale="vi"
                width="348"
              />
            </div>

            <Divider style={{ margin: '20px 0' }} />

            <p style={S.registerRow}>
              Bệnh nhân mới?{' '}
              <Link to="/register" style={{ color: '#2563eb', fontWeight: 600 }}>
                Tạo tài khoản
              </Link>
            </p>

            <p style={S.supportRow}>
              <QuestionCircleOutlined />
              Cần hỗ trợ đăng nhập? Liên hệ IT Support
            </p>
          </div>
        </div>
      </main>

      {/* ── Footer ── */}
      <footer style={S.footer}>
        <div>
          <p style={{ fontWeight: 700, fontSize: 13, color: '#1f2937', margin: 0 }}>Nhãn Khoa Ánh Sao</p>
          <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>
            © 2024 Phòng Khám Nhãn Khoa Ánh Sao. Bảo lưu mọi quyền.
          </p>
        </div>
        <nav style={S.footerLinks}>
          {['Chính Sách Bảo Mật', 'Điều Khoản Dịch Vụ', 'Liên Hệ Hỗ Trợ', 'Địa Điểm Phòng Khám'].map(t => (
            <a key={t} href="#" style={S.footerLink}>{t}</a>
          ))}
        </nav>
      </footer>
    </div>
  )
}
