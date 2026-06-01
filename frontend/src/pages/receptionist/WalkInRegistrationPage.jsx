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
} from 'antd'
import { UserAddOutlined, CheckCircleOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { patientService } from '../../services/patientService'

const { Title, Text } = Typography

export default function WalkInRegistrationPage() {
  const [form] = Form.useForm()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [createdPatient, setCreatedPatient] = useState(null)

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
      const msg = err.response?.data?.message || 'Đăng ký thất bại, vui lòng thử lại'
      form.setFields([{ name: 'phone', errors: [msg] }])
    } finally {
      setLoading(false)
    }
  }

  const handleRegisterAnother = () => {
    form.resetFields()
    setCreatedPatient(null)
  }

  if (createdPatient) {
    return (
      <div style={{ padding: 24, maxWidth: 600, margin: '0 auto' }}>
        <Result
          status="success"
          icon={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
          title="Đăng ký bệnh nhân thành công!"
          subTitle={`Mã bệnh nhân: #${createdPatient.id}`}
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
            {createdPatient.email && (
              <Descriptions.Item label="Email">{createdPatient.email}</Descriptions.Item>
            )}
            {createdPatient.dateOfBirth && (
              <Descriptions.Item label="Ngày sinh">
                {dayjs(createdPatient.dateOfBirth).format('DD/MM/YYYY')}
              </Descriptions.Item>
            )}
            {createdPatient.gender && (
              <Descriptions.Item label="Giới tính">{createdPatient.gender}</Descriptions.Item>
            )}
            {createdPatient.address && (
              <Descriptions.Item label="Địa chỉ">{createdPatient.address}</Descriptions.Item>
            )}
          </Descriptions>
        </Result>
      </div>
    )
  }

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

      <Card>
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          requiredMark="optional"
        >
          <Form.Item
            label="Họ và tên"
            name="fullName"
            rules={[{ required: true, message: 'Vui lòng nhập họ tên' }]}
          >
            <Input placeholder="Nguyễn Văn A" />
          </Form.Item>

          <Form.Item
            label="Số điện thoại"
            name="phone"
            rules={[
              { required: true, message: 'Vui lòng nhập số điện thoại' },
              {
                pattern: /^[0-9]{10,11}$/,
                message: 'Số điện thoại phải có 10-11 chữ số',
              },
            ]}
          >
            <Input placeholder="0901234567" maxLength={11} />
          </Form.Item>

          <Form.Item
            label="Email"
            name="email"
            rules={[{ type: 'email', message: 'Email không hợp lệ' }]}
          >
            <Input placeholder="example@email.com" />
          </Form.Item>

          <Form.Item label="Ngày sinh" name="dateOfBirth">
            <DatePicker
              format="DD/MM/YYYY"
              placeholder="Chọn ngày sinh"
              style={{ width: '100%' }}
              disabledDate={(d) => d && d.isAfter(dayjs())}
            />
          </Form.Item>

          <Form.Item label="Giới tính" name="gender">
            <Select placeholder="Chọn giới tính" allowClear>
              <Select.Option value="Nam">Nam</Select.Option>
              <Select.Option value="Nữ">Nữ</Select.Option>
              <Select.Option value="Khác">Khác</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item label="Địa chỉ" name="address">
            <Input.TextArea placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành" rows={2} />
          </Form.Item>

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
    </div>
  )
}
