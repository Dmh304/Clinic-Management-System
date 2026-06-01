import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Form, Select, DatePicker, Button, Card, Typography, Space,
  Result, Descriptions, Input, Tag, message,
} from 'antd'
import { ThunderboltOutlined, CheckCircleOutlined } from '@ant-design/icons'
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

  const [doctors, setDoctors] = useState([])
  const [services, setServices] = useState([])

  useEffect(() => {
    doctorService.getAllDoctors().then((r) => setDoctors(r.data)).catch(() => {})
    clinicServiceService.getAllServices().then((r) => setServices(r.data)).catch(() => {})
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
    setLoading(true)
    try {
      const payload = {
        patientId: values.patientId,
        doctorId: values.doctorId ?? null,
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
                  : 'Không tìm thấy bệnh nhân'
              }
              options={patients.map((p) => ({
                label: (
                  <Space>
                    <span>{p.fullName}</span>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {p.phone}
                    </Text>
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
            />
          </Form.Item>

          <Form.Item label="Bác sĩ (không bắt buộc)" name="doctorId">
            <Select
              allowClear
              placeholder="Chọn bác sĩ"
              options={doctors.map((d) => ({
                label: `${d.fullName}${d.specialization ? ` — ${d.specialization}` : ''}`,
                value: d.id,
              }))}
            />
          </Form.Item>

          <Form.Item label="Dịch vụ (không bắt buộc)" name="serviceId">
            <Select
              allowClear
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
    </div>
  )
}
