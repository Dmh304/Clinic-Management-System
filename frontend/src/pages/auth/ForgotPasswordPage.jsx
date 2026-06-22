// Mạnh Hùng - HE200743
// Trang quên mật khẩu: người dùng nhập email, hệ thống luôn phản hồi cùng một thông báo
// (dù email có tồn tại hay không) để tránh dò email tồn tại trong hệ thống.
import { useState } from 'react'
import { Form, Input, Button } from 'antd'
import { MailOutlined } from '@ant-design/icons'
import { Link } from 'react-router-dom'
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

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [form] = Form.useForm()

  const onFinish = async (values) => {
    setLoading(true)
    try {
      await authService.forgotPassword(values.email)
    } finally {
      setLoading(false)
      setSubmitted(true)
    }
  }

  return (
    <div style={S.page}>
      <Header />
      <main style={S.main}>
        <div style={S.card}>
          <p style={S.cardTitle}>Quên Mật Khẩu</p>
          <p style={S.cardSub}>Nhập email của bạn để nhận hướng dẫn đặt lại mật khẩu.</p>

          {submitted ? (
            <p style={{ fontSize: 14, color: '#374151', lineHeight: 1.6 }}>
              Nếu email tồn tại trong hệ thống, hướng dẫn đặt lại mật khẩu đã được gửi đến hộp thư của bạn.
            </p>
          ) : (
            <Form form={form} onFinish={onFinish} layout="vertical" requiredMark={false} size="large">
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

              <Form.Item style={{ marginBottom: 0 }}>
                <Button type="primary" htmlType="submit" loading={loading} style={S.submitBtn}>
                  Gửi Hướng Dẫn
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
