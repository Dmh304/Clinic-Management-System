// UC-55 - Manage User Account
// Trang Admin quản lý tài khoản PATIENT — phạm vi hẹp hơn nhân viên: chỉ hỗ trợ mở khóa
// tài khoản bị khóa và đặt lại mật khẩu khi patient quên mật khẩu. Không tạo/sửa/activate/
// deactivate (patient tự quản lý hồ sơ qua UC-01).
import { useEffect, useState } from 'react'
import { Table, Card, Space, Input, Select, Button, Tag, Typography, message, Popconfirm } from 'antd'
import { ReloadOutlined, UnlockOutlined, KeyOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import adminPatientService from '../../services/adminPatientService'

const STATUS_OPTIONS = [
  { value: 'ACTIVE', label: 'Đang hoạt động' },
  { value: 'LOCKED', label: 'Đang bị khóa' },
]

const STATUS_TAG = {
  PENDING_VERIFICATION: { color: 'gold', label: 'Chưa xác minh email' },
  ACTIVE: { color: 'green', label: 'Đang hoạt động' },
  LOCKED: { color: 'orange', label: 'Đang bị khóa' },
  DISABLED: { color: 'red', label: 'Đã vô hiệu hoá' },
}

const DEFAULT_FILTERS = { status: undefined, keyword: '' }

export default function PatientAccountPage() {
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 })
  const [actionLoadingId, setActionLoadingId] = useState(null)

  const buildParams = (page = pagination.current, pageSize = pagination.pageSize) => ({
    status: filters.status || undefined,
    keyword: filters.keyword || undefined,
    page: page - 1,
    size: pageSize,
  })

  const fetchData = (page = pagination.current, pageSize = pagination.pageSize) => {
    setLoading(true)
    adminPatientService.search(buildParams(page, pageSize))
      .then((res) => {
        const result = res.data
        setData(result.content || [])
        setPagination({ current: page, pageSize, total: result.totalElements || 0 })
      })
      .catch(() => message.error('Không tải được danh sách tài khoản patient'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    queueMicrotask(() => fetchData(1, pagination.pageSize))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSearch = () => fetchData(1, pagination.pageSize)

  const handleReset = () => {
    setFilters(DEFAULT_FILTERS)
    setTimeout(() => fetchData(1, pagination.pageSize), 0)
  }

  const handleTableChange = (paginationConfig) => {
    fetchData(paginationConfig.current, paginationConfig.pageSize)
  }

  const handleUnlock = async (record) => {
    setActionLoadingId(record.id)
    try {
      await adminPatientService.unlock(record.id)
      message.success('Đã mở khóa tài khoản')
      fetchData(pagination.current, pagination.pageSize)
    } catch (err) {
      message.error(err.response?.data?.message ?? 'Mở khóa tài khoản thất bại')
    } finally {
      setActionLoadingId(null)
    }
  }

  const handleResetPassword = async (record) => {
    setActionLoadingId(record.id)
    try {
      await adminPatientService.resetPassword(record.id)
      message.success('Đã đặt lại mật khẩu và gửi email cho bệnh nhân')
      fetchData(pagination.current, pagination.pageSize)
    } catch (err) {
      message.error(err.response?.data?.message ?? 'Đặt lại mật khẩu thất bại')
    } finally {
      setActionLoadingId(null)
    }
  }

  const columns = [
    { title: 'Họ tên', dataIndex: 'fullName', key: 'fullName' },
    { title: 'Email', dataIndex: 'email', key: 'email' },
    { title: 'Số điện thoại', dataIndex: 'phone', key: 'phone', render: (v) => v || '—' },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (v) => {
        const meta = STATUS_TAG[v] || { color: 'default', label: v }
        return <Tag color={meta.color}>{meta.label}</Tag>
      },
    },
    {
      title: 'Ngày tạo',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (v) => (v ? dayjs(v).format('DD/MM/YYYY HH:mm') : '—'),
    },
    {
      title: 'Hành động',
      key: 'actions',
      width: 260,
      render: (_, record) => (
        <Space wrap>
          {record.status === 'LOCKED' && (
            <Button
              size="small" icon={<UnlockOutlined />}
              loading={actionLoadingId === record.id}
              onClick={() => handleUnlock(record)}
            >
              Mở khóa
            </Button>
          )}
          <Popconfirm
            title="Đặt lại mật khẩu cho tài khoản này?"
            description="Mật khẩu tạm mới sẽ được sinh và gửi qua email cho bệnh nhân."
            okText="Đặt lại" cancelText="Hủy"
            onConfirm={() => handleResetPassword(record)}
          >
            <Button size="small" icon={<KeyOutlined />} loading={actionLoadingId === record.id}>
              Đặt lại mật khẩu
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div style={{ padding: 24 }}>
      <Typography.Title level={4} style={{ marginBottom: 16 }}>
        Quản lý tài khoản bệnh nhân
      </Typography.Title>

      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <Select
            placeholder="Trạng thái"
            allowClear
            style={{ width: 180 }}
            value={filters.status}
            onChange={(v) => setFilters((f) => ({ ...f, status: v }))}
            options={STATUS_OPTIONS}
          />
          <Input
            placeholder="Tìm theo tên hoặc email"
            value={filters.keyword}
            onChange={(e) => setFilters((f) => ({ ...f, keyword: e.target.value }))}
            style={{ width: 220 }}
            onPressEnter={handleSearch}
          />
          <Button type="primary" onClick={handleSearch}>Tìm kiếm</Button>
          <Button icon={<ReloadOutlined />} onClick={handleReset}>Đặt lại</Button>
        </Space>
      </Card>

      <Card>
        <Table
          rowKey="id"
          columns={columns}
          dataSource={data}
          loading={loading}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
          }}
          onChange={handleTableChange}
          locale={{ emptyText: 'Không có tài khoản nào' }}
        />
      </Card>
    </div>
  )
}
