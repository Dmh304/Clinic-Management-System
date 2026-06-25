// Trang lễ tân: danh sách bệnh nhân vừa đăng ký dịch vụ online (chưa thanh toán),
// đang chờ được liên hệ tư vấn. Lễ tân đánh dấu "Đã liên hệ" sau khi gọi điện tư vấn
// để tránh liên hệ trùng và để bệnh nhân thấy trạng thái cập nhật trong "Dịch vụ của tôi".
import { useEffect, useState } from 'react'
import { Table, Tag, Button, Input, message, Typography, Space, Modal } from 'antd'
import { SearchOutlined, PhoneOutlined, MailOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons'
import { serviceService } from '../../services/serviceService'

const { Title, Text } = Typography

const STATUS_TAG = {
  PENDING: { color: 'gold', label: 'Chờ liên hệ tư vấn' },
  CONFIRMED: { color: 'green', label: 'Đã liên hệ tư vấn' },
  COMPLETED: { color: 'default', label: 'Hoàn tất' },
  CANCELLED: { color: 'red', label: 'Đã huỷ' },
}

export default function ServiceRegistrationsPage() {
  const [registrations, setRegistrations] = useState([])
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('PENDING')

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
    </div>
  )
}
