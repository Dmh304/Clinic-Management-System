import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Form, Select, DatePicker, Button, Card, Typography, Space,
  Result, Descriptions, Input, Tag, message, Modal,
} from 'antd'
import { ThunderboltOutlined, CheckCircleOutlined, UserAddOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { patientService } from '../../services/patientService'
import { doctorService } from '../../services/doctorService'
import { clinicServiceService } from '../../services/clinicServiceService'
import { appointmentService } from '../../services/appointmentService'

const { Title, Text } = Typography

export default function WalkInAppointmentPage() {
  const [form] = Form.useForm()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(false)
  const [createdAppointment, setCreatedAppointment] = useState(null)

  const [patients, setPatients] = useState([])
  const [patientSearch, setPatientSearch] = useState('')
  const [patientLoading, setPatientLoading] = useState(false)

  const [newPatientModal, setNewPatientModal] = useState(false)
  const [newPatientForm] = Form.useForm()
  const [newPatientLoading, setNewPatientLoading] = useState(false)

  const [doctors, setDoctors] = useState([])
  const [services, setServices] = useState([])

  useEffect(() => {
    doctorService.getAllDoctors().then((r) => setDoctors(r.data)).catch(() => { })
    clinicServiceService.getServicesByType('CLINICAL').then((r) => setServices(r.data)).catch(() => { })
  }, [])

  const handlePatientSearch = async (value) => {
    setPatientSearch(value)
    if (!value || value.length < 2) {
      setPatients([])
      return
    }
    setPatientLoading(true)
    try {
      const res = await patientService.searchPatients(value)
      setPatients(res.data)
    } catch {
      setPatients([])
    } finally {
      setPatientLoading(false)
    }
  }

  const onFinish = async (values) => {
    if (!values.appointmentTime) {
      message.error('Vui lòng chọn thời gian khám')
      return
    }

    if (values.appointmentTime.isBefore(dayjs())) {
      message.error('Không thể tạo lịch khám trong quá khứ')
      return
    }

    if (!values.doctorId) {
      message.error('Vui lòng chọn bác sĩ')
      return
    }

    setLoading(true)
    try {
      const payload = {
        patientId: values.patientId,
        doctorId: values.doctorId,
        serviceId: values.serviceId ?? null,
        appointmentTime: values.appointmentTime.format('YYYY-MM-DDTHH:mm:ss'),
        notes: values.notes ?? null,
      }
      const res = await appointmentService.createWalkInAppointment(payload)
      setCreatedAppointment(res.data)
    } catch (err) {
      message.error(err.response?.data?.message || 'Tạo lịch vãng lai thất bại')
    } finally {
      setLoading(false)
    }
  }

  const newPatientDob = Form.useWatch('dateOfBirth', newPatientForm)
  const isChildPatient = newPatientDob
    ? dayjs().diff(newPatientDob, 'year') < 14
    : false

  const handleOpenNewPatientModal = () => {
    const isPhone = /^[0-9]{6,11}$/.test(patientSearch)
    newPatientForm.setFieldsValue(
      isPhone ? { phone: patientSearch, fullName: undefined } : { fullName: patientSearch, phone: undefined }
    )
    setNewPatientModal(true)
  }

  const handleCreateNewPatient = async (values) => {
    setNewPatientLoading(true)
    try {
      const payload = {
        ...values,
        dateOfBirth: values.dateOfBirth ? values.dateOfBirth.format('YYYY-MM-DD') : null,
      }
      const res = await patientService.createWalkInPatient(payload)
      const created = res.data
      setPatients([created])
      form.setFieldValue('patientId', created.id)
      setNewPatientModal(false)
      newPatientForm.resetFields()
      message.success(
        `Đã tạo hồ sơ bệnh nhân: ${created.fullName}. Tài khoản đăng nhập: ${created.email} / Password@123`,
        6
      )
    } catch (err) {
      message.error(err.response?.data?.message || 'Tạo bệnh nhân thất bại')
    } finally {
      setNewPatientLoading(false)
    }
  }

  const handleCreateAnother = () => {
    form.resetFields()
    setCreatedAppointment(null)
    setPatients([])
    setPatientSearch('')
  }

  if (createdAppointment) {
    return (
      <div style={{ padding: 24, maxWidth: 600, margin: '0 auto' }}>
        <Result
          status="success"
          icon={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
          title="Tạo lịch vãng lai thành công!"
          subTitle={`Bệnh nhân đã vào hàng đợi`}
          extra={[
            <Button type="primary" key="another" onClick={handleCreateAnother}>
              Tạo lịch khác
            </Button>,
            <Button key="appointments" onClick={() => navigate('/receptionist/appointments')}>
              Về danh sách lịch hẹn
            </Button>,
          ]}
        >
          <Descriptions bordered size="small" column={1}>
            <Descriptions.Item label="Bệnh nhân">{createdAppointment.patientName}</Descriptions.Item>
            <Descriptions.Item label="Số điện thoại">{createdAppointment.patientPhone}</Descriptions.Item>
            {createdAppointment.doctorName && (
              <Descriptions.Item label="Bác sĩ">{createdAppointment.doctorName}</Descriptions.Item>
            )}
            {createdAppointment.serviceName && (
              <Descriptions.Item label="Dịch vụ">{createdAppointment.serviceName}</Descriptions.Item>
            )}
            <Descriptions.Item label="Giờ khám">{createdAppointment.timeSlot}</Descriptions.Item>
            <Descriptions.Item label="Số thứ tự">
              <Tag color="blue">#{createdAppointment.queueNumber}</Tag>
            </Descriptions.Item>
          </Descriptions>
        </Result>
      </div>
    )
  }

  return (
    <div style={{ padding: 24, maxWidth: 600, margin: '0 auto' }}>
      <Space align="center" style={{ marginBottom: 24 }}>
        <ThunderboltOutlined style={{ fontSize: 24, color: '#1677ff' }} />
        <div>
          <Title level={4} style={{ margin: 0 }}>
            Tạo lịch khám vãng lai
          </Title>
          <Text type="secondary">
            Bệnh nhân vãng lai sẽ được thêm vào hàng đợi ngay lập tức
          </Text>
        </div>
      </Space>

      <Card>
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          requiredMark="optional"
          initialValues={{ appointmentTime: dayjs() }}
        >
          <Form.Item
            label="Bệnh nhân"
            name="patientId"
            rules={[{ required: true, message: 'Vui lòng chọn bệnh nhân' }]}
          >
            <Select
              showSearch
              filterOption={false}
              placeholder="Tìm theo tên hoặc số điện thoại..."
              onSearch={handlePatientSearch}
              loading={patientLoading}
              notFoundContent={
                patientSearch.length < 2
                  ? 'Nhập ít nhất 2 ký tự để tìm kiếm'
                  : patientLoading
                    ? 'Đang tìm...'
                    : (
                      <div style={{ textAlign: 'center', padding: '8px 0' }}>
                        <div style={{ color: '#94a3b8', marginBottom: 8, fontSize: 13 }}>
                          Không tìm thấy bệnh nhân
                        </div>
                        <Button
                          size="small"
                          type="primary"
                          icon={<UserAddOutlined />}
                          onClick={handleOpenNewPatientModal}
                        >
                          Tạo hồ sơ mới
                        </Button>
                      </div>
                    )
              }
              options={patients.map((p) => ({
                label: (
                  <Space>
                    <span>{p.fullName}</span>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {p.phone}
                    </Text>
                    {p.dateOfBirth && (
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        NS: {dayjs(p.dateOfBirth).format('DD/MM/YYYY')}
                      </Text>
                    )}
                    {p.isChild && <Tag color="orange" style={{ fontSize: 11 }}>Trẻ em</Tag>}
                    {p.cccd && (
                      <Text type="secondary" style={{ fontSize: 11 }}>
                        CCCD: ...{p.cccd.slice(-4)}
                      </Text>
                    )}
                  </Space>
                ),
                value: p.id,
              }))}
            />
          </Form.Item>

          <Form.Item
            label="Thời gian khám"
            name="appointmentTime"
            rules={[{ required: true, message: 'Vui lòng chọn thời gian' }]}
          >
            <DatePicker
              showTime={{ format: 'HH:mm' }}
              format="DD/MM/YYYY HH:mm"
              style={{ width: '100%' }}
              placeholder="Chọn ngày và giờ"
              disabledDate={(current) => {
                return current && current < dayjs().startOf('day')
              }}
              disabledTime={(current) => {
                if (!current || !current.isSame(dayjs(), 'day')) {
                  return {}
                }

                const now = dayjs()

                return {
                  disabledHours: () =>
                    Array.from({ length: now.hour() }, (_, i) => i),

                  disabledMinutes: (selectedHour) => {
                    if (selectedHour === now.hour()) {
                      return Array.from({ length: now.minute() + 1 }, (_, i) => i)
                    }
                    return []
                  },
                }
              }}
            />
          </Form.Item>

          <Form.Item
            label="Bác sĩ"
            name="doctorId"
            rules={[{ required: true, message: 'Vui lòng chọn bác sĩ' }]}
          >
            <Select
              placeholder="Chọn bác sĩ"
              options={doctors.map((d) => ({
                label: `${d.fullName}${d.specialization ? ` — ${d.specialization}` : ''}`,
                value: d.id,
              }))}
            />
          </Form.Item>

          <Form.Item label="Dịch vụ khám" name="serviceId">
            <Select
              placeholder="Chọn dịch vụ"
              options={services.map((s) => ({
                label: s.serviceName,
                value: s.id,
              }))}
            />
          </Form.Item>

          <Form.Item label="Ghi chú" name="notes">
            <Input.TextArea placeholder="Triệu chứng, lý do khám..." rows={2} />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0 }}>
            <Space>
              <Button type="primary" htmlType="submit" loading={loading} icon={<ThunderboltOutlined />}>
                Tạo lịch & vào hàng đợi
              </Button>
              <Button onClick={() => form.resetFields()}>Xóa form</Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>

      <Modal
        title="Tạo hồ sơ bệnh nhân mới"
        open={newPatientModal}
        onCancel={() => { setNewPatientModal(false); newPatientForm.resetFields() }}
        onOk={() => newPatientForm.submit()}
        okText="Tạo hồ sơ"
        cancelText="Hủy"
        confirmLoading={newPatientLoading}
      >
        <Form
          form={newPatientForm}
          layout="vertical"
          onFinish={handleCreateNewPatient}
          style={{ marginTop: 16 }}
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
              { pattern: /^[0-9]{10,11}$/, message: 'Số điện thoại phải có 10-11 chữ số' },
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
                rules={[{ type: 'email', message: 'Email không hợp lệ' }]}
              >
                <Input placeholder="example@email.com" />
              </Form.Item>
            </>
          )}
        </Form>
      </Modal>
    </div>
  )
}
