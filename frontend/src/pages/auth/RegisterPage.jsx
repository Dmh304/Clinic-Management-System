// Mạnh Hùng - HE200743
// Trang đăng ký tài khoản bệnh nhân mới. Người dùng nhập họ tên, email, số điện thoại,
// mật khẩu và xác nhận mật khẩu. Sau khi đăng ký thành công, tự động đăng nhập
// và điều hướng về trang chủ.
import { useState } from 'react'
import { Form, Input, Button, Divider, message } from 'antd'
import {
  MailOutlined, LockOutlined, UserOutlined, PhoneOutlined,
  EyeInvisibleOutlined, EyeTwoTone, QuestionCircleOutlined,
} from '@ant-design/icons'
import { useDispatch } from 'react-redux'
import { useNavigate, Link } from 'react-router-dom'
import { loginSuccess } from '../../store/slices/authSlice'
import authService from '../../services/authService'
import Header from '../../components/layout/Header'

const S = {
  page: {
    minHeight: '100vh', display: 'flex', flexDirection: 'column',
    background: '#eef2ff', fontFamily: "'Segoe UI', system-ui, sans-serif",
  },
  header: {
    background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,.08)',
    padding: '14px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  },
  logo: { color: '#1d4ed8', fontWeight: 700, fontSize: 20, letterSpacing: '-0.3px' },
  main: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 20px' },
  inner: { width: '100%', maxWidth: 960, display: 'flex', alignItems: 'center', gap: 56, flexWrap: 'wrap' },
  hero: { flex: '1 1 340px', display: 'flex', flexDirection: 'column', gap: 20 },
  heading: { fontSize: 38, fontWeight: 800, color: '#1e3a8a', lineHeight: 1.2, margin: 0 },
  sub: { fontSize: 15, color: '#6b7280', maxWidth: 340, lineHeight: 1.6, margin: 0 },
  clinicImg: {
    borderRadius: 16, width: '100%', maxWidth: 360, height: 200,
    background: 'linear-gradient(135deg, #22d3ee 0%, #0d9488 50%, #1d4ed8 100%)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  card: {
    flex: '0 0 440px', background: '#fff', borderRadius: 20,
    boxShadow: '0 8px 32px rgba(0,0,0,.10)', padding: '40px 36px',
  },
  cardTitle: { fontSize: 26, fontWeight: 700, color: '#111827', margin: '0 0 4px' },
  cardSub: { fontSize: 13, color: '#9ca3af', margin: '0 0 24px' },
  label: { fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 },
  submitBtn: {
    width: '100%', background: '#1d4ed8', borderColor: '#1d4ed8',
    height: 44, borderRadius: 10, fontWeight: 700, fontSize: 15,
  },
  loginRow: { textAlign: 'center', fontSize: 13, color: '#6b7280', marginTop: 4 },
  footer: {
    background: '#dde8ff', padding: '20px 40px',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12,
  },
}

// Hiển thị một dòng lợi ích với dấu tick màu xanh, dùng trong phần giới thiệu bên trái trang đăng ký
function BenefitItem({ text }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: '#374151' }}>
      <span style={{ color: '#0d9488', fontWeight: 700, fontSize: 16 }}>✓</span>
      {text}
    </div>
  )
}

export default function RegisterPage() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [form] = Form.useForm()

  // Xử lý submit form đăng ký: gọi API tạo tài khoản, tự động đăng nhập và điều hướng về trang chủ
  const onFinish = async (values) => {
    setLoading(true)
    setErrorMsg('')
    try {
      const res = await authService.register({
        fullName: values.fullName,
        email: values.email,
        phone: values.phone,
        password: values.password,
      })
      const { token, userId, email, fullName, role } = res.data
      dispatch(loginSuccess({ token, userId, email, fullName, role }))
      message.success('Đăng ký thành công! Chào mừng bạn.')
      navigate('/', { replace: true })
    } catch (err) {
      if (!err.response) {
        setErrorMsg('Không thể kết nối đến máy chủ. Hãy kiểm tra backend đang chạy tại cổng 8080.')
      } else {
        const msg = err.response.data?.message ?? 'Đăng ký thất bại. Vui lòng thử lại.'
        setErrorMsg(msg)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={S.page}>
      <Header />

      {/* Main */}
      <main style={S.main}>
        <div style={S.inner}>
          {/* Left — Hero */}
          <div style={S.hero}>
            <h1 style={S.heading}>
              Chăm sóc đôi mắt<br />
              bắt đầu từ<br />
              một tài khoản.
            </h1>
            <p style={S.sub}>
              Tạo hồ sơ bệnh nhân miễn phí và trải nghiệm dịch vụ nhãn khoa
              chuyên sâu từ đội ngũ bác sĩ hàng đầu.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <BenefitItem text="Đặt lịch khám trực tuyến 24/7" />
              <BenefitItem text="Xem hồ sơ bệnh án & đơn thuốc" />
              <BenefitItem text="Nhận nhắc nhở tái khám tự động" />
              <BenefitItem text="Bảo mật dữ liệu y tế cá nhân" />
            </div>
            <div style={S.clinicImg}>
              <svg width="72" height="72" viewBox="0 0 24 24" fill="none"
                stroke="rgba(255,255,255,0.6)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </div>
          </div>

          {/* Right — Register card */}
          <div style={S.card}>
            <p style={S.cardTitle}>Tạo Tài Khoản Mới</p>
            <p style={S.cardSub}>Điền thông tin bên dưới để bắt đầu.</p>

            <Form form={form} onFinish={onFinish} layout="vertical" requiredMark={false} size="large">
              <Form.Item
                name="fullName"
                label={<span style={S.label}>Họ và Tên</span>}
                rules={[
                  { required: true, message: 'Vui lòng nhập họ tên' },
                  { pattern: /^[^\d]+$/, message: 'Họ tên không được chứa chữ số' },
                ]}
                style={{ marginBottom: 14 }}
              >
                <Input
                  prefix={<UserOutlined style={{ color: '#9ca3af' }} />}
                  placeholder="Nguyễn Văn A"
                  style={{ borderRadius: 10, height: 44 }}
                />
              </Form.Item>

              <Form.Item
                name="email"
                label={<span style={S.label}>Địa Chỉ Email</span>}
                rules={[
                  { required: true, message: 'Vui lòng nhập email' },
                  { type: 'email', message: 'Email không hợp lệ' },
                  { pattern: /^[^\d]/, message: 'Email không được bắt đầu bằng chữ số' },
                ]}
                style={{ marginBottom: 14 }}
              >
                <Input
                  prefix={<MailOutlined style={{ color: '#9ca3af' }} />}
                  placeholder="name@example.com"
                  style={{ borderRadius: 10, height: 44 }}
                />
              </Form.Item>

              <Form.Item
                name="phone"
                label={<span style={S.label}>Số Điện Thoại</span>}
                rules={[
                  { required: true, message: 'Vui lòng nhập số điện thoại' },
                  { pattern: /^[0-9]{9,11}$/, message: 'Số điện thoại không hợp lệ' },
                ]}
                style={{ marginBottom: 14 }}
              >
                <Input
                  prefix={<PhoneOutlined style={{ color: '#9ca3af' }} />}
                  placeholder="0901234567"
                  style={{ borderRadius: 10, height: 44 }}
                />
              </Form.Item>

              <Form.Item
                name="password"
                label={<span style={S.label}>Mật Khẩu</span>}
                rules={[
                  { required: true, message: 'Vui lòng nhập mật khẩu' },
                  { min: 6, message: 'Mật khẩu phải có ít nhất 6 ký tự' },
                ]}
                style={{ marginBottom: 14 }}
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

              <Form.Item
                name="confirmPassword"
                label={<span style={S.label}>Xác Nhận Mật Khẩu</span>}
                dependencies={['password']}
                rules={[
                  { required: true, message: 'Vui lòng xác nhận mật khẩu' },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue('password') === value) return Promise.resolve()
                      return Promise.reject(new Error('Mật khẩu xác nhận không khớp'))
                    },
                  }),
                ]}
                style={{ marginBottom: 14 }}
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

              {errorMsg && (
                <div style={{
                  background: '#fef2f2', border: '1px solid #fecaca',
                  borderRadius: 8, padding: '10px 14px', marginBottom: 12,
                  fontSize: 13, color: '#dc2626', lineHeight: 1.5,
                }}>
                  {errorMsg}
                </div>
              )}

              <Form.Item style={{ marginTop: 4, marginBottom: 0 }}>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={loading}
                  style={S.submitBtn}
                >
                  Tạo Tài Khoản
                </Button>
              </Form.Item>
            </Form>

            <Divider style={{ margin: '20px 0' }} />

            <p style={S.loginRow}>
              Đã có tài khoản?{' '}
              <Link to="/login" style={{ color: '#2563eb', fontWeight: 600 }}>
                Đăng nhập ngay
              </Link>
            </p>

            <p style={{ textAlign: 'center', fontSize: 12, color: '#9ca3af', marginTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
              <QuestionCircleOutlined />
              Cần hỗ trợ? Liên hệ IT Support
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer style={S.footer}>
        <div>
          <p style={{ fontWeight: 700, fontSize: 13, color: '#1f2937', margin: 0 }}>Nhãn Khoa Ánh Sao</p>
          <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>
            © 2024 Phòng Khám Nhãn Khoa Ánh Sao. Bảo lưu mọi quyền.
          </p>
        </div>
        <nav style={{ display: 'flex', gap: 24 }}>
          {['Chính Sách Bảo Mật', 'Điều Khoản Dịch Vụ', 'Liên Hệ Hỗ Trợ'].map(t => (
            <a key={t} href="#" style={{ fontSize: 12, color: '#4b5563', textDecoration: 'none' }}>{t}</a>
          ))}
        </nav>
      </footer>
    </div>
  )
}
