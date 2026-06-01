import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Table, Tag, Select, Button, Space, Typography, Card, message } from 'antd'
import { ReloadOutlined } from '@ant-design/icons'
import { fetchTodayAppointments, changeAppointmentStatus } from '../../store/slices/appointmentSlice'

const STATUS_CONFIG = {
  PENDING:     { color: 'gold',      label: 'Chờ xác nhận' },
  CONFIRMED:   { color: 'blue',      label: 'Đã xác nhận' },
  IN_PROGRESS: { color: 'processing', label: 'Đang khám' },
  COMPLETED:   { color: 'green',     label: 'Hoàn thành' },
  CANCELLED:   { color: 'red',       label: 'Đã hủy' },
}

const NEXT_STATUS = {
  PENDING:     ['CONFIRMED', 'CANCELLED'],
  CONFIRMED:   ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['COMPLETED'],
  COMPLETED:   [],
  CANCELLED:   [],
}

export default function AppointmentManagementPage() {
  const dispatch = useDispatch()
  const { list, loading, error } = useSelector((state) => state.appointment)
  const [filterStatus, setFilterStatus] = useState('ALL')

  useEffect(() => {
    dispatch(fetchTodayAppointments())
  }, [dispatch])

  useEffect(() => {
    if (error) message.error(error)
  }, [error])

  const filtered =
    filterStatus === 'ALL' ? list : list.filter((a) => a.status === filterStatus)

  const handleStatusChange = (id, status) => {
    dispatch(changeAppointmentStatus({ id, status }))
      .unwrap()
      .then(() => message.success('Cập nhật trạng thái thành công'))
      .catch((err) => message.error(err))
  }

  const columns = [
    {
      title: 'STT',
      key: 'index',
      width: 60,
      render: (_, __, i) => i + 1,
    },
    {
      title: 'Bệnh nhân',
      dataIndex: 'patientName',
      key: 'patientName',
    },
    {
      title: 'SĐT',
      dataIndex: 'patientPhone',
      key: 'patientPhone',
      width: 130,
    },
    {
      title: 'Giờ khám',
      dataIndex: 'timeSlot',
      key: 'timeSlot',
      width: 110,
    },
    {
      title: 'Bác sĩ',
      dataIndex: 'doctorName',
      key: 'doctorName',
    },
    {
      title: 'Dịch vụ',
      dataIndex: 'serviceName',
      key: 'serviceName',
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 140,
      render: (status) => {
        const cfg = STATUS_CONFIG[status] || {}
        return <Tag color={cfg.color}>{cfg.label}</Tag>
      },
    },
    {
      title: 'Hành động',
      key: 'action',
      render: (_, record) => (
        <Space>
          {(NEXT_STATUS[record.status] || []).map((s) => (
            <Button
              key={s}
              size="small"
              type={s === 'CANCELLED' ? 'default' : 'primary'}
              danger={s === 'CANCELLED'}
              onClick={() => handleStatusChange(record.id, s)}
            >
              {STATUS_CONFIG[s]?.label}
            </Button>
          ))}
        </Space>
      ),
    },
  ]

  const today = new Date().toLocaleDateString('vi-VN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div style={{ padding: 24 }}>
      <Typography.Title level={4} style={{ marginBottom: 4 }}>
        Lịch khám hôm nay
      </Typography.Title>
      <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
        {today} — {filtered.length} lịch hẹn
      </Typography.Text>

      <Card>
        <Space style={{ marginBottom: 16 }}>
          <Select
            value={filterStatus}
            onChange={setFilterStatus}
            style={{ width: 180 }}
            options={[
              { label: 'Tất cả trạng thái', value: 'ALL' },
              ...Object.entries(STATUS_CONFIG).map(([v, c]) => ({
                label: c.label,
                value: v,
              })),
            ]}
          />
          <Button
            icon={<ReloadOutlined />}
            onClick={() => dispatch(fetchTodayAppointments())}
            loading={loading}
          >
            Làm mới
          </Button>
        </Space>

        <Table
          columns={columns}
          dataSource={filtered}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10, showSizeChanger: false }}
          locale={{ emptyText: 'Không có lịch hẹn nào hôm nay' }}
        />
      </Card>
    </div>
  )
}
