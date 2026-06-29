// UC-55 - Manage User Account
// Trang Admin quản lý tài khoản NHÂN VIÊN (DOCTOR/RECEPTIONIST/LAB_TECHNICIAN/PHARMACIST/
// MANAGER/NURSE/ADMIN). Tài khoản PATIENT không tạo/sửa được qua màn hình này — patient tự
// đăng ký (UC-01) hoặc được receptionist đăng ký walk-in (UC-13).
// Luồng chuẩn: tạo tài khoản (chưa active) -> admin bấm "Kích hoạt" -> hệ thống gửi email
// chào mừng kèm mật khẩu tạm. Tài khoản đã DISABLED có thể "Xóa" khỏi danh sách (soft delete —
// ẩn đi, không xóa cứng bản ghi, xem BR-09).
import { useEffect, useState } from 'react'
import {
  Table, Card, Space, Input, Select, Button, Modal, Form, Tag, Typography, message, Popconfirm,
} from 'antd'
import {
  ReloadOutlined, PlusOutlined, EditOutlined, CheckCircleOutlined, StopOutlined,
  UnlockOutlined, KeyOutlined, DeleteOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import adminUserService from '../../services/adminUserService'

const STAFF_ROLES = ['DOCTOR', 'RECEPTIONIST', 'LAB_TECHNICIAN', 'PHARMACIST', 'MANAGER', 'NURSE', 'ADMIN']

const STATUS_OPTIONS = [
  { value: 'PENDING_VERIFICATION', label: 'Chưa kích hoạt' },
  { value: 'ACTIVE', label: 'Đang hoạt động' },
  { value: 'LOCKED', label: 'Đang bị khóa' },
  { value: 'DISABLED', label: 'Đã vô hiệu hoá' },
]

const STATUS_TAG = {
  PENDING_VERIFICATION: { color: 'gold', label: 'Chưa kích hoạt' },
  ACTIVE: { color: 'green', label: 'Đang hoạt động' },
  LOCKED: { color: 'orange', label: 'Đang bị khóa' },
  DISABLED: { color: 'red', label: 'Đã vô hiệu hoá' },
}

const DEFAULT_FILTERS = { role: undefined, status: undefined, keyword: '' }

export default function UserManagementPage() {
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 })

  const [createOpen, setCreateOpen] = useState(false)
  const [createSubmitting, setCreateSubmitting] = useState(false)
  const [createForm] = Form.useForm()

  const [editTarget, setEditTarget] = useState(null)
  const [editSubmitting, setEditSubmitting] = useState(false)
  const [editForm] = Form.useForm()

  const [actionLoadingId, setActionLoadingId] = useState(null)

  const buildParams = (page = pagination.current, pageSize = pagination.pageSize) => ({
    role: filters.role || undefined,
    status: filters.status || undefined,
    keyword: filters.keyword || undefined,
    page: page - 1,
    size: pageSize,
  })

  const fetchData = (page = pagination.current, pageSize = pagination.pageSize) => {
    setLoading(true)
    adminUserService.search(buildParams(page, pageSize))
      .then((res) => {
        const result = res.data
        setData(result.content || [])
        setPagination({ current: page, pageSize, total: result.totalElements || 0 })
      })
      .catch(() => message.error('Không tải được danh sách tài khoản'))
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

  const handleCreate = async (values) => {
    setCreateSubmitting(true)
    try {
      await adminUserService.create(values)
      message.success('Tạo tài khoản thành công. Hãy bấm "Kích hoạt" để gửi mật khẩu tạm cho nhân viên.')
      setCreateOpen(false)
      createForm.resetFields()
      fetchData(1, pagination.pageSize)
    } catch (err) {
      message.error(err.response?.data?.message ?? 'Tạo tài khoản thất bại')
    } finally {
      setCreateSubmitting(false)
    }
  }

  const openEdit = (record) => {
    setEditTarget(record)
    editForm.setFieldsValue({
      fullName: record.fullName,
      role: record.role,
      department: record.department,
    })
  }

  const handleEdit = async (values) => {
    setEditSubmitting(true)
    try {
      await adminUserService.update(editTarget.id, values)
      message.success('Cập nhật tài khoản thành công')
      setEditTarget(null)
      fetchData(pagination.current, pagination.pageSize)
    } catch (err) {
      message.error(err.response?.data?.message ?? 'Cập nhật tài khoản thất bại')
    } finally {
      setEditSubmitting(false)
    }
  }

  const handleActivate = async (record) => {
    setActionLoadingId(record.id)
    try {
      await adminUserService.activate(record.id)
      message.success('Đã kích hoạt tài khoản và gửi email mật khẩu tạm cho nhân viên')
      fetchData(pagination.current, pagination.pageSize)
    } catch (err) {
      message.error(err.response?.data?.message ?? 'Kích hoạt tài khoản thất bại')
    } finally {
      setActionLoadingId(null)
    }
  }

  const handleDeactivate = async (record) => {
    setActionLoadingId(record.id)
    try {
      await adminUserService.deactivate(record.id)
      message.success('Đã vô hiệu hoá tài khoản')
      fetchData(pagination.current, pagination.pageSize)
    } catch (err) {
      message.error(err.response?.data?.message ?? 'Vô hiệu hoá tài khoản thất bại')
    } finally {
      setActionLoadingId(null)
    }
  }

  const handleUnlock = async (record) => {
    setActionLoadingId(record.id)
    try {
      await adminUserService.unlock(record.id)
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
      await adminUserService.resetPassword(record.id)
      message.success('Đã đặt lại mật khẩu và gửi email cho nhân viên')
      fetchData(pagination.current, pagination.pageSize)
    } catch (err) {
      message.error(err.response?.data?.message ?? 'Đặt lại mật khẩu thất bại')
    } finally {
      setActionLoadingId(null)
    }
  }

  const handleDelete = async (record) => {
    setActionLoadingId(record.id)
    try {
      await adminUserService.remove(record.id)
      message.success('Đã xóa tài khoản khỏi danh sách')
      fetchData(pagination.current, pagination.pageSize)
    } catch (err) {
      message.error(err.response?.data?.message ?? 'Xóa tài khoản thất bại')
    } finally {
      setActionLoadingId(null)
    }
  }

  const columns = [
    { title: 'Họ tên', dataIndex: 'fullName', key: 'fullName' },
    { title: 'Email', dataIndex: 'email', key: 'email' },
    { title: 'Vai trò', dataIndex: 'role', key: 'role' },
    { title: 'Phòng/Bộ phận', dataIndex: 'department', key: 'department', render: (v) => v || '—' },
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
      width: 320,
      render: (_, record) => (
        <Space wrap>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(record)}>Sửa</Button>
          {record.status !== 'ACTIVE' && record.status !== 'LOCKED' && (
            <Button
              size="small" type="primary" icon={<CheckCircleOutlined />}
              loading={actionLoadingId === record.id}
              onClick={() => handleActivate(record)}
            >
              Kích hoạt
            </Button>
          )}
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
            description="Mật khẩu tạm mới sẽ được sinh và gửi qua email cho nhân viên."
            okText="Đặt lại" cancelText="Hủy"
            onConfirm={() => handleResetPassword(record)}
          >
            <Button size="small" icon={<KeyOutlined />} loading={actionLoadingId === record.id}>
              Đặt lại mật khẩu
            </Button>
          </Popconfirm>
          {record.status !== 'DISABLED' && (
            <Popconfirm
              title="Vô hiệu hoá tài khoản này?"
              description="Tài khoản sẽ không thể đăng nhập và token hiện tại sẽ bị thu hồi ngay."
              okText="Vô hiệu hoá" cancelText="Hủy" okButtonProps={{ danger: true }}
              onConfirm={() => handleDeactivate(record)}
            >
              <Button size="small" danger icon={<StopOutlined />} loading={actionLoadingId === record.id}>
                Vô hiệu hoá
              </Button>
            </Popconfirm>
          )}
          {record.status === 'DISABLED' && (
            <Popconfirm
              title="Xóa tài khoản khỏi danh sách?"
              description="Tài khoản sẽ bị ẩn khỏi danh sách quản lý (không xóa cứng dữ liệu lịch sử liên quan)."
              okText="Xóa" cancelText="Hủy" okButtonProps={{ danger: true }}
              onConfirm={() => handleDelete(record)}
            >
              <Button size="small" danger icon={<DeleteOutlined />} loading={actionLoadingId === record.id}>
                Xóa
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ]

  return (
    <div style={{ padding: 24 }}>
      <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }}>
        <Typography.Title level={4} style={{ margin: 0 }}>Quản lý tài khoản nhân viên</Typography.Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
          Thêm tài khoản mới
        </Button>
      </Space>

      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <Select
            placeholder="Vai trò"
            allowClear
            style={{ width: 180 }}
            value={filters.role}
            onChange={(v) => setFilters((f) => ({ ...f, role: v }))}
            options={STAFF_ROLES.map((r) => ({ value: r, label: r }))}
          />
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

      {/* ── Modal: thêm tài khoản mới ── */}
      <Modal
        title="Thêm tài khoản nhân viên mới"
        open={createOpen}
        onCancel={() => { setCreateOpen(false); createForm.resetFields() }}
        onOk={() => createForm.submit()}
        okText="Tạo tài khoản"
        confirmLoading={createSubmitting}
        destroyOnClose
      >
        <Form form={createForm} layout="vertical" onFinish={handleCreate}>
          <Form.Item
            name="fullName" label="Họ tên"
            rules={[{ required: true, message: 'Vui lòng nhập họ tên' }]}
          >
            <Input placeholder="Nguyễn Văn A" />
          </Form.Item>
          <Form.Item
            name="email" label="Email"
            rules={[
              { required: true, message: 'Vui lòng nhập email' },
              { type: 'email', message: 'Email không hợp lệ' },
            ]}
          >
            <Input placeholder="staff@example.com" />
          </Form.Item>
          <Form.Item
            name="role" label="Vai trò"
            rules={[{ required: true, message: 'Vui lòng chọn vai trò' }]}
          >
            <Select placeholder="Chọn vai trò" options={STAFF_ROLES.map((r) => ({ value: r, label: r }))} />
          </Form.Item>
          <Form.Item name="department" label="Phòng/Bộ phận">
            <Input placeholder="Ví dụ: Khoa Mắt, Phòng Tiếp Nhận..." />
          </Form.Item>
        </Form>
      </Modal>

      {/* ── Modal: sửa tài khoản ── */}
      <Modal
        title="Sửa tài khoản nhân viên"
        open={!!editTarget}
        onCancel={() => setEditTarget(null)}
        onOk={() => editForm.submit()}
        okText="Lưu"
        confirmLoading={editSubmitting}
        destroyOnClose
      >
        <Form form={editForm} layout="vertical" onFinish={handleEdit}>
          <Form.Item
            name="fullName" label="Họ tên"
            rules={[{ required: true, message: 'Vui lòng nhập họ tên' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="role" label="Vai trò"
            rules={[{ required: true, message: 'Vui lòng chọn vai trò' }]}
          >
            <Select options={STAFF_ROLES.map((r) => ({ value: r, label: r }))} />
          </Form.Item>
          <Form.Item name="department" label="Phòng/Bộ phận">
            <Input placeholder="Ví dụ: Khoa Mắt, Phòng Tiếp Nhận..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
