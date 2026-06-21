// Le Thi Bich Ngan - HE204710
// Trang đăng ký bệnh nhân vãng lai dành cho lễ tân.
// Cho phép lễ tân tạo hồ sơ mới cho bệnh nhân chưa có tài khoản trong hệ thống.
// Lễ tân nhập họ tên, số điện thoại, email (bắt buộc) và ngày sinh, giới tính, địa chỉ (tùy chọn).
// Sau khi đăng ký thành công, hiển thị thông tin bệnh nhân vừa tạo cùng thông tin đăng nhập mặc định.

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Form,
  Input,
  Select,
  DatePicker,
  Button,
  Card,
  Typography,
  Space,
  Result,
  Descriptions,
  Tag,
  message,
} from 'antd'
import { UserAddOutlined, CheckCircleOutlined, SearchOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { patientService } from '../../services/patientService'

const { Title, Text } = Typography

export default function WalkInRegistrationPage() {
  const [form] = Form.useForm()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [createdPatient, setCreatedPatient] = useState(null)
  const dateOfBirth = Form.useWatch('dateOfBirth', form)
  const isChildPatient = dateOfBirth ? dayjs().diff(dateOfBirth, 'year') < 14 : false

  // Tìm bệnh nhân đã có hồ sơ trước khi cho phép tạo mới, tránh tạo trùng hồ sơ
  const [searchKeyword, setSearchKeyword] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [formUnlocked, setFormUnlocked] = useState(false)

  const handleSearch = async (value) => {
    setSearchKeyword(value)
    if (!value || value.trim().length < 2) {
      setSearchResults([])
      setHasSearched(false)
      return
    }
    setSearching(true)
    try {
      const res = await patientService.searchPatients(value.trim())
      setSearchResults(res.data || [])
      setHasSearched(true)
    } catch {
      setSearchResults([])
    } finally {
      setSearching(false)
    }
  }

  // Xử lý khi lễ tân submit form đăng ký.
  // Gửi dữ liệu lên API; nếu thành công lưu thông tin bệnh nhân vừa tạo để hiển thị trang kết quả.
  // Nếu thất bại: lỗi theo từng field (phone/email trùng) hiện ngay dưới field đó,
  // lỗi hệ thống hiện dạng toast notification.
  const onFinish = async (values) => {
    setLoading(true)
    try {
      const payload = {
        ...values,
        dateOfBirth: values.dateOfBirth
          ? values.dateOfBirth.format('YYYY-MM-DD')
          : null,
      }
      const res = await patientService.createWalkInPatient(payload)
      setCreatedPatient(res.data)
    } catch (err) {
      const data = err.response?.data
      if (data?.fieldErrors) {
        // Backend trả về map lỗi theo từng field → hiển thị đúng vị trí
        form.setFields(
          Object.entries(data.fieldErrors).map(([name, msg]) => ({ name, errors: [msg] }))
        )
      } else {
        // Lỗi hệ thống không gắn với field cụ thể → hiện toast
        message.error(data?.message || 'Đăng ký thất bại, vui lòng thử lại')
      }
    } finally {
      setLoading(false)
    }
  }

  // Xóa trạng thái bệnh nhân vừa tạo và reset form để lễ tân có thể đăng ký bệnh nhân tiếp theo.
  const handleRegisterAnother = () => {
    form.resetFields()
    setCreatedPatient(null)
    setFormUnlocked(false)
    setSearchKeyword('')
    setSearchResults([])
    setHasSearched(false)
  }

  // Hiển thị trang kết quả khi đăng ký thành công với thông tin bệnh nhân và tài khoản mặc định.
  if (createdPatient) {
    return (
      <div style={{ padding: 24, maxWidth: 600, margin: '0 auto' }}>
        <Result
          status="success"
          icon={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
          title="Đăng ký bệnh nhân thành công!"
          subTitle={`Mã bệnh nhân: #${createdPatient.id} — Tài khoản đã được tạo`}
          extra={[
            <Button type="primary" key="another" onClick={handleRegisterAnother}>
              Đăng ký bệnh nhân khác
            </Button>,
            <Button key="appointments" onClick={() => navigate('/receptionist/appointments')}>
              Về lịch hẹn
            </Button>,
          ]}
        >
          <Descriptions bordered size="small" column={1}>
            <Descriptions.Item label="Họ tên">{createdPatient.fullName}</Descriptions.Item>
            <Descriptions.Item label="Số điện thoại">{createdPatient.phone}</Descriptions.Item>
            <Descriptions.Item label="Email">{createdPatient.email}</Descriptions.Item>
            {createdPatient.dateOfBirth && (
              <Descriptions.Item label="Ngày sinh">
                {dayjs(createdPatient.dateOfBirth).format('DD/MM/YYYY')}
              </Descriptions.Item>
            )}
            {createdPatient.gender && (
              <Descriptions.Item label="Giới tính">
                {createdPatient.gender === 'MALE' ? 'Nam' : createdPatient.gender === 'FEMALE' ? 'Nữ' : 'Khác'}
              </Descriptions.Item>
            )}
            {createdPatient.address && (
              <Descriptions.Item label="Địa chỉ">{createdPatient.address}</Descriptions.Item>
            )}
            {createdPatient.cccd && (
              <Descriptions.Item label="CCCD">{createdPatient.cccd}</Descriptions.Item>
            )}
            {createdPatient.isChild && (
              <Descriptions.Item label="Phụ huynh">
                {createdPatient.emergencyContactName} — {createdPatient.emergencyContactPhone}
              </Descriptions.Item>
            )}
          </Descriptions>
          <div
            style={{
              marginTop: 16,
              padding: '12px 16px',
              background: '#f0f9ff',
              border: '1px solid #bae6fd',
              borderRadius: 6,
            }}
          >
            <Text strong style={{ display: 'block', marginBottom: 4 }}>
              Thông tin đăng nhập hệ thống
            </Text>
            <Text>Email: <Text code>{createdPatient.email}</Text></Text>
            <br />
            <Text>Mật khẩu: <Text code>Password@123</Text></Text>
          </div>
        </Result>
      </div>
    )
  }

  // Hiển thị form đăng ký với các field bắt buộc (có dấu *) và tùy chọn.
  return (
    <div style={{ padding: 24, maxWidth: 600, margin: '0 auto' }}>
      <Space align="center" style={{ marginBottom: 24 }}>
        <UserAddOutlined style={{ fontSize: 24, color: '#1677ff' }} />
        <div>
          <Title level={4} style={{ margin: 0 }}>
            Đăng ký bệnh nhân vãng lai
          </Title>
          <Text type="secondary">Tạo hồ sơ cho bệnh nhân chưa có tài khoản</Text>
        </div>
      </Space>

      <Card style={{ marginBottom: 24 }}>
        <Text strong style={{ display: 'block', marginBottom: 8 }}>
          Bước 1: Kiểm tra bệnh nhân đã có hồ sơ chưa
        </Text>
        <Input
          placeholder="Tìm theo tên, số điện thoại hoặc CCCD..."
          prefix={<SearchOutlined />}
          value={searchKeyword}
          onChange={(e) => handleSearch(e.target.value)}
          allowClear
        />

        {searching && <Text type="secondary" style={{ display: 'block', marginTop: 8 }}>Đang tìm...</Text>}

        {!searching && hasSearched && searchResults.length === 0 && (
          <div style={{ marginTop: 12 }}>
            <Text type="secondary">Không tìm thấy bệnh nhân nào khớp.</Text>
          </div>
        )}

        {searchResults.length > 0 && (
          <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {searchResults.map((p) => (
              <div
                key={p.id}
                style={{
                  border: '1px solid #f0f0f0',
                  borderRadius: 8,
                  padding: '10px 14px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 8,
                }}
              >
                <div>
                  <Space>
                    <Text strong>{p.fullName}</Text>
                    <Text type="secondary">{p.phone}</Text>
                    {p.dateOfBirth && (
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        NS: {dayjs(p.dateOfBirth).format('DD/MM/YYYY')}
                      </Text>
                    )}
                    {p.isChild && <Tag color="orange">Trẻ em</Tag>}
                    {p.cccd && <Text type="secondary" style={{ fontSize: 12 }}>CCCD: ...{p.cccd.slice(-4)}</Text>}
                  </Space>
                </div>
                <Button size="small" onClick={() => navigate('/receptionist/walk-in-appointment')}>
                  Đặt lịch khám cho bệnh nhân này
                </Button>
              </div>
            ))}
          </div>
        )}

        {!formUnlocked && (
          <Button
            type="link"
            style={{ marginTop: 12, padding: 0 }}
            onClick={() => setFormUnlocked(true)}
          >
            Không tìm thấy — tạo hồ sơ bệnh nhân mới →
          </Button>
        )}
      </Card>

      {!formUnlocked ? null : (
      <Card>
        <Text strong style={{ display: 'block', marginBottom: 16 }}>
          Bước 2: Thông tin bệnh nhân mới
        </Text>
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          requiredMark
        >
          <Form.Item
            label="Họ và tên"
            name="fullName"
            rules={[
              { required: true, message: 'Vui lòng nhập họ tên' },
              {
                validator: (_, value) => {
                  if (!value) return Promise.resolve()
                  if (!/^[\p{L}]/u.test(value))
                    return Promise.reject(new Error('Họ tên phải bắt đầu bằng chữ cái'))
                  if (!/^[\p{L}\s]+$/u.test(value))
                    return Promise.reject(new Error('Họ tên không được chứa số hoặc ký tự đặc biệt'))
                  return Promise.resolve()
                },
              },
            ]}
          >
            <Input placeholder="Nguyễn Văn A" />
          </Form.Item>

          <Form.Item
            label="Số điện thoại"
            name="phone"
            rules={[
              { required: true, message: 'Vui lòng nhập số điện thoại' },
              {
                validator: (_, value) => {
                  if (!value) return Promise.resolve()
                  if (!/^\d+$/.test(value))
                    return Promise.reject(new Error('Số điện thoại chỉ được chứa chữ số, không có chữ hay ký tự đặc biệt'))
                  if (!value.startsWith('0'))
                    return Promise.reject(new Error('Số điện thoại phải bắt đầu bằng số 0'))
                  if (value.length < 10 || value.length > 11)
                    return Promise.reject(new Error('Số điện thoại phải có 10-11 chữ số'))
                  return Promise.resolve()
                },
              },
            ]}
          >
            <Input placeholder="0901234567" maxLength={11} />
          </Form.Item>

          <Form.Item
            label="Ngày sinh"
            name="dateOfBirth"
            rules={[{ required: true, message: 'Vui lòng chọn ngày sinh' }]}
          >
            <DatePicker
              format="DD/MM/YYYY"
              placeholder="Chọn ngày sinh"
              style={{ width: '100%' }}
              disabledDate={(d) => d && d.isAfter(dayjs())}
            />
          </Form.Item>

          <Form.Item label="Giới tính" name="gender">
            <Select placeholder="Chọn giới tính" allowClear>
              <Select.Option value="MALE">Nam</Select.Option>
              <Select.Option value="FEMALE">Nữ</Select.Option>
              <Select.Option value="OTHER">Khác</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item label="Địa chỉ" name="address">
            <Input.TextArea placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành" rows={2} />
          </Form.Item>

          {isChildPatient ? (
            <>
              <Form.Item
                label="Tên phụ huynh"
                name="emergencyContactName"
                rules={[{ required: true, message: 'Vui lòng nhập tên phụ huynh' }]}
              >
                <Input placeholder="Nguyễn Văn A" />
              </Form.Item>
              <Form.Item
                label="SĐT phụ huynh"
                name="emergencyContactPhone"
                rules={[
                  { required: true, message: 'Vui lòng nhập SĐT phụ huynh' },
                  { pattern: /^[0-9]{10,11}$/, message: 'Số điện thoại phải có 10-11 chữ số' },
                ]}
              >
                <Input placeholder="0901234567" maxLength={11} />
              </Form.Item>
            </>
          ) : (
            <>
              <Form.Item
                label="CCCD"
                name="cccd"
                rules={[{ pattern: /^[0-9]{12}$/, message: 'CCCD phải có đúng 12 chữ số' }]}
              >
                <Input placeholder="012345678901" maxLength={12} />
              </Form.Item>
              <Form.Item
                label="Email"
                name="email"
                rules={[
                  { type: 'email', message: 'Email không hợp lệ' },
                  {
                    validator: (_, value) => {
                      if (!value) return Promise.resolve()
                      if (!/^[a-zA-Z]/.test(value))
                        return Promise.reject(new Error('Email phải bắt đầu bằng chữ cái'))
                      return Promise.resolve()
                    },
                  },
                ]}
              >
                <Input placeholder="example@email.com" />
              </Form.Item>
            </>
          )}

          <Form.Item style={{ marginBottom: 0 }}>
            <Space>
              <Button type="primary" htmlType="submit" loading={loading}>
                Đăng ký
              </Button>
              <Button onClick={() => form.resetFields()}>Xóa form</Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
      )}
    </div>
  )
}
