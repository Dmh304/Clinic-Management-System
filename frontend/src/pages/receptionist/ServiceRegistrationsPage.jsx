// Trang lễ tân: danh sách bệnh nhân vừa đăng ký dịch vụ online (chưa thanh toán),
// đang chờ được liên hệ tư vấn. Lễ tân đánh dấu "Đã liên hệ" sau khi gọi điện tư vấn
// để tránh liên hệ trùng và để bệnh nhân thấy trạng thái cập nhật trong "Dịch vụ của tôi".
import { useEffect, useState } from 'react'
import { Table, Tag, Button, Input, message, Typography, Space, Modal, DatePicker, Form, Select } from 'antd'
import { SearchOutlined, PhoneOutlined, MailOutlined, CheckCircleOutlined, CloseCircleOutlined, CalendarOutlined, PlusOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { serviceService } from '../../services/serviceService'
import { patientService } from '../../services/patientService'
import { clinicServiceService } from '../../services/clinicServiceService'
import { CLINIC_HOURS, validateClinicTime } from '../../constants/clinicInfo'

const { Title, Text } = Typography

const STATUS_TAG = {
  PENDING: { color: 'gold', label: 'Chờ liên hệ tư vấn' },
  CONFIRMED: { color: 'green', label: 'Đã liên hệ tư vấn' },
  COMPLETED: { color: 'default', label: 'Hoàn tất' },
  CANCELLED: { color: 'red', label: 'Đã huỷ' },
}

// Chặn chọn ngày quá khứ trên DatePicker
const disabledClinicDate = (current) => current && current < dayjs().startOf('day')

// Chặn chọn giờ ngoài giờ làm việc phòng khám (07:30–17:00) và giờ đã qua nếu là hôm nay.
const disabledClinicTime = (current) => {
  const isToday = current && current.isSame(dayjs(), 'day')
  return {
    disabledHours: () => {
      const hours = []
      for (let h = 0; h < 24; h++) {
        if (h < CLINIC_HOURS.openHour || h > CLINIC_HOURS.closeHour) hours.push(h)
      }
      if (isToday) {
        for (let h = 0; h < dayjs().hour(); h++) if (!hours.includes(h)) hours.push(h)
      }
      return hours
    },
    disabledMinutes: (selectedHour) => {
      const mins = []
      if (selectedHour === CLINIC_HOURS.openHour) for (let m = 0; m < CLINIC_HOURS.openMinute; m++) mins.push(m)
      if (selectedHour === CLINIC_HOURS.closeHour) for (let m = CLINIC_HOURS.closeMinute + 1; m < 60; m++) mins.push(m)
      if (isToday && selectedHour === dayjs().hour()) for (let m = 0; m <= dayjs().minute(); m++) if (!mins.includes(m)) mins.push(m)
      return mins
    },
  }
}

// Rule dùng chung cho các ô chọn thời gian buổi dịch vụ — chặn quá khứ & ngoài giờ làm việc
const clinicTimeRule = {
  validator: (_, value) => {
    const err = validateClinicTime(value, dayjs)
    return err ? Promise.reject(new Error(err)) : Promise.resolve()
  },
}

export default function ServiceRegistrationsPage() {
  const [registrations, setRegistrations] = useState([])
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('PENDING')

  // Modal đặt buổi đến phòng khám
  const [scheduleModal, setScheduleModal] = useState({ open: false, reg: null })
  const [scheduling, setScheduling] = useState(false)
  const [scheduleForm] = Form.useForm()

  // Modal đăng ký dịch vụ cho khách đến trực tiếp quầy (walk-in)
  const [counterModal, setCounterModal] = useState(false)
  const [counterLoading, setCounterLoading] = useState(false)
  const [counterForm] = Form.useForm()
  const [carePackages, setCarePackages] = useState([])
  const [patientOptions, setPatientOptions] = useState([])
  const [patientSearching, setPatientSearching] = useState(false)

  const fetchRegistrations = async () => {
    setLoading(true)
    try {
      const res = await serviceService.getAllRegistrations()
      setRegistrations(res.data || [])
    } catch {
      message.error('Không thể tải danh sách đăng ký dịch vụ')
    } finally {
      setLoading(false)
    }
  }

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchRegistrations() }, [])

  const handleMarkContacted = async (reg) => {
    setUpdatingId(reg.id)
    try {
      await serviceService.updateRegistrationStatus(reg.id, 'CONFIRMED')
      message.success(`Đã đánh dấu liên hệ tư vấn cho ${reg.patientName}`)
      fetchRegistrations()
    } catch (err) {
      message.error(err?.response?.data?.message || 'Cập nhật trạng thái thất bại')
    } finally {
      setUpdatingId(null)
    }
  }

  // Huỷ đăng ký: khi không liên lạc được hoặc khách hàng không còn muốn đăng ký dịch vụ
  const handleCancel = (reg) => {
    Modal.confirm({
      title: 'Huỷ đăng ký dịch vụ này?',
      content: `Bệnh nhân: ${reg.patientName} — Dịch vụ: ${reg.serviceName}. Dùng khi không liên lạc được hoặc khách hàng không muốn tiếp tục.`,
      okText: 'Huỷ đăng ký',
      okButtonProps: { danger: true },
      cancelText: 'Đóng',
      onOk: async () => {
        setUpdatingId(reg.id)
        try {
          await serviceService.updateRegistrationStatus(reg.id, 'CANCELLED')
          message.success(`Đã huỷ đăng ký của ${reg.patientName}`)
          fetchRegistrations()
        } catch (err) {
          message.error(err?.response?.data?.message || 'Huỷ đăng ký thất bại')
        } finally {
          setUpdatingId(null)
        }
      },
    })
  }

  // Mở modal đặt buổi đến phòng khám cho đăng ký đã đồng ý
  const openScheduleModal = (reg) => {
    scheduleForm.resetFields()
    setScheduleModal({ open: true, reg })
  }

  const handleSchedule = async () => {
    const reg = scheduleModal.reg
    if (!reg) return
    let values
    try {
      values = await scheduleForm.validateFields()
    } catch {
      return
    }
    setScheduling(true)
    try {
      await serviceService.scheduleClinicVisit(reg.id, {
        scheduledDateTime: values.scheduledDateTime.format('YYYY-MM-DDTHH:mm:ss'),
        notes: values.notes || null,
      })
      message.success(`Đã đặt buổi đến phòng khám cho ${reg.patientName}`)
      setScheduleModal({ open: false, reg: null })
      fetchRegistrations()
    } catch (err) {
      message.error(err?.response?.data?.message || 'Đặt buổi thất bại')
    } finally {
      setScheduling(false)
    }
  }

  // ── Đăng ký dịch vụ tại quầy (walk-in) ────────────────────────────
  const openCounterModal = () => {
    counterForm.resetFields()
    setPatientOptions([])
    setCounterModal(true)
    // Nạp danh sách gói CARE để lễ tân chọn
    if (carePackages.length === 0) {
      clinicServiceService.getServicesByType('CARE')
        .then((res) => setCarePackages(res.data || []))
        .catch(() => setCarePackages([]))
    }
  }

  const handlePatientSearch = async (value) => {
    if (!value || value.trim().length < 2) {
      setPatientOptions([])
      return
    }
    setPatientSearching(true)
    try {
      const res = await patientService.searchPatients(value.trim())
      setPatientOptions(res.data || [])
    } catch {
      setPatientOptions([])
    } finally {
      setPatientSearching(false)
    }
  }

  const handleCounterRegister = async () => {
    let values
    try {
      values = await counterForm.validateFields()
    } catch {
      return
    }
    setCounterLoading(true)
    try {
      await serviceService.registerAtCounter({
        patientId: values.patientId,
        serviceId: values.serviceId,
        scheduledDateTime: values.scheduledDateTime.format('YYYY-MM-DDTHH:mm:ss'),
        notes: values.notes || null,
      })
      message.success('Đã đăng ký dịch vụ và đặt buổi đầu tiên cho khách')
      setCounterModal(false)
      counterForm.resetFields()
      fetchRegistrations()
    } catch (err) {
      message.error(err?.response?.data?.message || 'Đăng ký dịch vụ tại quầy thất bại')
    } finally {
      setCounterLoading(false)
    }
  }

  const kw = search.trim().toLowerCase()
  const filtered = registrations.filter(r => {
    if (statusFilter !== 'all' && r.status !== statusFilter) return false
    if (!kw) return true
    return [r.patientName, r.serviceName, r.patientPhone].filter(Boolean).some(v => v.toLowerCase().includes(kw))
  })

  const columns = [
    {
      title: 'Bệnh nhân',
      key: 'patient',
      render: (_, r) => (
        <div>
          <div style={{ fontWeight: 600 }}>{r.patientName}</div>
          {r.patientPhone && (
            <div style={{ fontSize: 12, color: '#64748b', display: 'flex', alignItems: 'center', gap: 4 }}>
              <PhoneOutlined /> {r.patientPhone}
            </div>
          )}
          {r.patientEmail && (
            <div style={{ fontSize: 12, color: '#64748b', display: 'flex', alignItems: 'center', gap: 4 }}>
              <MailOutlined /> {r.patientEmail}
            </div>
          )}
        </div>
      ),
    },
    { title: 'Dịch vụ đăng ký', dataIndex: 'serviceName', key: 'serviceName' },
    { title: 'Ngày đăng ký', dataIndex: 'registrationDate', key: 'registrationDate' },
    {
      title: 'Trạng thái',
      key: 'status',
      render: (_, r) => {
        const s = STATUS_TAG[r.status] || { color: 'default', label: r.status }
        return <Tag color={s.color}>{s.label}</Tag>
      },
    },
    { title: 'Ghi chú', dataIndex: 'notes', key: 'notes', render: (v) => v || '—' },
    {
      title: 'Thao tác',
      key: 'action',
      render: (_, r) => (
        (r.status === 'PENDING' || r.status === 'CONFIRMED') ? (
          <Space size={6}>
            {r.status === 'PENDING' && (
              <Button
                size="small"
                type="primary"
                icon={<CheckCircleOutlined />}
                loading={updatingId === r.id}
                onClick={() => handleMarkContacted(r)}
              >
                Đã liên hệ
              </Button>
            )}
            {r.status === 'CONFIRMED' && (
              <Button
                size="small"
                type="primary"
                icon={<CalendarOutlined />}
                onClick={() => openScheduleModal(r)}
              >
                Đặt buổi đến khám
              </Button>
            )}
            <Button
              size="small"
              danger
              icon={<CloseCircleOutlined />}
              loading={updatingId === r.id}
              onClick={() => handleCancel(r)}
            >
              Huỷ
            </Button>
          </Space>
        ) : <Text type="secondary" style={{ fontSize: 12 }}>—</Text>
      ),
    },
  ]

  const pendingCount = registrations.filter(r => r.status === 'PENDING').length

  return (
    <div style={{ padding: 28 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <Title level={3} style={{ margin: 0 }}>Đăng ký dịch vụ</Title>
          <Text type="secondary">
            Bệnh nhân đăng ký gói dịch vụ online (chưa thanh toán) — cần liên hệ tư vấn.
            {pendingCount > 0 && <strong style={{ color: '#d97706' }}> {pendingCount} chờ liên hệ.</strong>}
          </Text>
        </div>
        <Space>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCounterModal}>
            Đăng ký dịch vụ tại quầy
          </Button>
          <Input
            placeholder="Tìm theo tên, SĐT, dịch vụ..."
            prefix={<SearchOutlined />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: 240 }}
            allowClear
          />
          <Space.Compact>
            {[['PENDING', 'Chờ liên hệ'], ['CONFIRMED', 'Đã liên hệ'], ['all', 'Tất cả']].map(([v, label]) => (
              <Button key={v} type={statusFilter === v ? 'primary' : 'default'} onClick={() => setStatusFilter(v)}>
                {label}
              </Button>
            ))}
          </Space.Compact>
        </Space>
      </div>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={filtered}
        loading={loading}
        pagination={{ pageSize: 10 }}
      />

      <Modal
        title="Đặt buổi đến phòng khám"
        open={scheduleModal.open}
        onOk={handleSchedule}
        onCancel={() => setScheduleModal({ open: false, reg: null })}
        okText="Xác nhận đặt buổi"
        cancelText="Đóng"
        confirmLoading={scheduling}
        destroyOnHidden
      >
        {scheduleModal.reg && (
          <div style={{ marginBottom: 16 }}>
            <p style={{ margin: '0 0 4px' }}>
              <strong>Bệnh nhân:</strong> {scheduleModal.reg.patientName}
            </p>
            <p style={{ margin: 0 }}>
              <strong>Gói dịch vụ:</strong> {scheduleModal.reg.serviceName}
            </p>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Hệ thống sẽ tạo gói cho bệnh nhân và đặt buổi đầu tiên vào thời gian bạn chọn.
            </Text>
          </div>
        )}
        <Form form={scheduleForm} layout="vertical">
          <Form.Item
            label={`Thời gian đến phòng khám (giờ làm việc ${CLINIC_HOURS.openLabel}–${CLINIC_HOURS.closeLabel})`}
            name="scheduledDateTime"
            rules={[{ required: true, message: 'Vui lòng chọn ngày giờ' }, clinicTimeRule]}
          >
            <DatePicker
              showTime={{ format: 'HH:mm', minuteStep: 5 }}
              format="DD/MM/YYYY HH:mm"
              style={{ width: '100%' }}
              placeholder="Chọn ngày và giờ"
              disabledDate={disabledClinicDate}
              disabledTime={disabledClinicTime}
              showNow={false}
            />
          </Form.Item>
          <Form.Item label="Ghi chú" name="notes">
            <Input.TextArea rows={2} placeholder="Ghi chú cho buổi khám (không bắt buộc)" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal đăng ký dịch vụ cho khách đến trực tiếp quầy */}
      <Modal
        title="Đăng ký dịch vụ tại quầy"
        open={counterModal}
        onOk={handleCounterRegister}
        onCancel={() => { setCounterModal(false); counterForm.resetFields() }}
        okText="Đăng ký & đặt buổi"
        cancelText="Đóng"
        confirmLoading={counterLoading}
        destroyOnHidden
      >
        <Text type="secondary" style={{ display: 'block', marginBottom: 16, fontSize: 13 }}>
          Dành cho khách đến trực tiếp phòng khám đăng ký gói dịch vụ. Hệ thống tạo gói và
          đặt luôn buổi đầu tiên vào thời gian đã chọn.
        </Text>
        <Form form={counterForm} layout="vertical">
          <Form.Item
            label="Bệnh nhân"
            name="patientId"
            rules={[{ required: true, message: 'Vui lòng chọn bệnh nhân' }]}
            extra="Chưa có hồ sơ? Dùng chức năng 'Đăng ký bệnh nhân vãng lai' để tạo trước."
          >
            <Select
              showSearch
              filterOption={false}
              placeholder="Tìm theo tên hoặc số điện thoại..."
              onSearch={handlePatientSearch}
              loading={patientSearching}
              notFoundContent={patientSearching ? 'Đang tìm...' : 'Nhập ít nhất 2 ký tự để tìm'}
              options={patientOptions.map((p) => ({
                label: `${p.fullName}${p.phone ? ' — ' + p.phone : ''}`,
                value: p.id,
              }))}
            />
          </Form.Item>
          <Form.Item
            label="Gói dịch vụ"
            name="serviceId"
            rules={[{ required: true, message: 'Vui lòng chọn gói dịch vụ' }]}
          >
            <Select
              placeholder="Chọn gói dịch vụ"
              options={carePackages.map((s) => ({
                label: `${s.serviceName}${s.sessionsIncluded ? ` (${s.sessionsIncluded} buổi)` : ''}`,
                value: s.id,
              }))}
            />
          </Form.Item>
          <Form.Item
            label={`Thời gian buổi đầu tiên (giờ làm việc ${CLINIC_HOURS.openLabel}–${CLINIC_HOURS.closeLabel})`}
            name="scheduledDateTime"
            rules={[{ required: true, message: 'Vui lòng chọn ngày giờ' }, clinicTimeRule]}
          >
            <DatePicker
              showTime={{ format: 'HH:mm', minuteStep: 5 }}
              format="DD/MM/YYYY HH:mm"
              style={{ width: '100%' }}
              placeholder="Chọn ngày và giờ"
              disabledDate={disabledClinicDate}
              disabledTime={disabledClinicTime}
              showNow={false}
            />
          </Form.Item>
          <Form.Item label="Ghi chú" name="notes">
            <Input.TextArea rows={2} placeholder="Ghi chú (không bắt buộc)" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
