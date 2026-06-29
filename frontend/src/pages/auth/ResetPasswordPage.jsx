// Mạnh Hùng - HE200743
// Trang đặt lại mật khẩu: đọc token từ query string (liên kết trong email), người dùng nhập
// mật khẩu mới và xác nhận, sau đó gọi API đặt lại mật khẩu.
import { useState } from 'react'
import { Form, Input, Button, message } from 'antd'
import { LockOutlined, EyeInvisibleOutlined, EyeTwoTone } from '@ant-design/icons'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
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
    boxShadow: '0 8px 32px rgba(0,0,0,.10)', padding: '40px 36px',
  },
  cardTitle: { fontSize: 24, fontWeight: 700, color: '#111827', margin: '0 0 4px' },
  cardSub: { fontSize: 13, color: '#9ca3af', margin: '0 0 24px' },
  label: { fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 },
  submitBtn: {
    width: '100%', background: '#1d4ed8', borderColor: '#1d4ed8',
    height: 44, borderRadius: 10, fontWeight: 700, fontSize: 15,
  },
  loginRow: { textAlign: 'center', fontSize: 13, color: '#6b7280', marginTop: 16 },
}

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [form] = Form.useForm()

  const onFinish = async (values) => {
    setLoading(true)
    setErrorMsg('')
    try {
      await authService.resetPassword({
        token,
        newPassword: values.newPassword,
        confirmPassword: values.confirmPassword,
      })
      message.success('Đặt lại mật khẩu thành công! Vui lòng đăng nhập.')
      navigate('/login', { replace: true })
    } catch (err) {
      setErrorMsg(err.response?.data?.message ?? 'Đặt lại mật khẩu thất bại. Liên kết có thể đã hết hạn.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={S.page}>
      <Header />
      <main style={S.main}>
        <div style={S.card}>
          <p style={S.cardTitle}>Đặt Lại Mật Khẩu</p>
          <p style={S.cardSub}>Nhập mật khẩu mới cho tài khoản của bạn.</p>

          {!token ? (
            <p style={{ fontSize: 14, color: '#dc2626' }}>Liên kết không hợp lệ.</p>
          ) : (
            <Form form={form} onFinish={onFinish} layout="vertical" requiredMark={false} size="large">
              <Form.Item
                name="newPassword"
                label={<span style={S.label}>Mật Khẩu Mới</span>}
                rules={[
                  { required: true, message: 'Vui lòng nhập mật khẩu mới' },
                  { min: 6, message: 'Mật khẩu phải có ít nhất 6 ký tự' },
                ]}
                style={{ marginBottom: 14 }}
              >
                <Input.Password
                  prefix={<LockOutlined style={{ color: '#9ca3af' }} />}
                  placeholder="••••••••"
                  iconRender={(visible) => (visible ? <EyeTwoTone /> : <EyeInvisibleOutlined style={{ color: '#9ca3af' }} />)}
                  style={{ borderRadius: 10, height: 44 }}
                />
              </Form.Item>

              <Form.Item
                name="confirmPassword"
                label={<span style={S.label}>Xác Nhận Mật Khẩu</span>}
                dependencies={['newPassword']}
                rules={[
                  { required: true, message: 'Vui lòng xác nhận mật khẩu' },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue('newPassword') === value) return Promise.resolve()
                      return Promise.reject(new Error('Mật khẩu xác nhận không khớp'))
                    },
                  }),
                ]}
                style={{ marginBottom: 14 }}
              >
                <Input.Password
                  prefix={<LockOutlined style={{ color: '#9ca3af' }} />}
                  placeholder="••••••••"
                  iconRender={(visible) => (visible ? <EyeTwoTone /> : <EyeInvisibleOutlined style={{ color: '#9ca3af' }} />)}
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

              <Form.Item style={{ marginBottom: 0 }}>
                <Button type="primary" htmlType="submit" loading={loading} style={S.submitBtn}>
                  Đặt Lại Mật Khẩu
                </Button>
              </Form.Item>
            </Form>
          )}

          <p style={S.loginRow}>
            <Link to="/login" style={{ color: '#2563eb', fontWeight: 600 }}>Về trang đăng nhập</Link>
          </p>
        </div>
      </main>
    </div>
  )
}
