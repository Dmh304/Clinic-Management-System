// UC-56 - Configure System and Data
// Trang Admin cấu hình hệ thống: Clinic Info, Notification Templates, Roles & Permissions
// (read-only — hệ thống hiện dùng RBAC tĩnh qua hasRole() trong code, không cấu hình động ở UC này).
// Không quản lý Service catalogue/Medicine catalogue — thuộc phạm vi của Clinic Manager.
import { useEffect, useState } from 'react'
import {
  Tabs, Card, Form, Input, Button, Table, Tag, Modal, Select, Popconfirm, Typography, message,
} from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import systemConfigService from '../../services/systemConfigService'

const { TextArea } = Input

function ClinicInfoTab() {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  const fetchData = () => {
    setLoading(true)
    systemConfigService.getClinicInfo()
      .then((res) => form.setFieldsValue(res.data))
      .catch(() => message.error('Không tải được thông tin phòng khám'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    queueMicrotask(() => fetchData())
  }, [])

  const handleSave = (values) => {
    setSaving(true)
    systemConfigService.updateClinicInfo(values)
      .then(() => message.success('Cập nhật thông tin phòng khám thành công'))
      .catch((err) => message.error(err.response?.data?.message || 'Cập nhật thất bại'))
      .finally(() => setSaving(false))
  }

  return (
    <Card loading={loading}>
      <Form form={form} layout="vertical" onFinish={handleSave} style={{ maxWidth: 480 }}>
        <Form.Item label="Tên phòng khám" name="clinicName" rules={[{ required: true, message: 'Bắt buộc' }]}>
          <Input />
        </Form.Item>
        <Form.Item label="Số điện thoại" name="clinicPhone" rules={[{ required: true, message: 'Bắt buộc' }]}>
          <Input />
        </Form.Item>
        <Form.Item label="Địa chỉ" name="clinicAddress" rules={[{ required: true, message: 'Bắt buộc' }]}>
          <Input />
        </Form.Item>
        <Form.Item label="Giờ làm việc" name="clinicHours" rules={[{ required: true, message: 'Bắt buộc' }]}>
          <Input placeholder="VD: 08:00 - 17:00" />
        </Form.Item>
        <Button type="primary" htmlType="submit" loading={saving}>Save</Button>
      </Form>
    </Card>
  )
}

function NotificationTemplatesTab() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const [modal, setModal] = useState(null) // { mode: 'create' | 'edit', record? }
  const [form] = Form.useForm()
  const [saving, setSaving] = useState(false)

  const fetchData = () => {
    setLoading(true)
    systemConfigService.getNotificationTemplates()
      .then((res) => setData(res.data || []))
      .catch(() => message.error('Không tải được danh sách template'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    queueMicrotask(() => fetchData())
  }, [])

  const openCreate = () => {
    form.resetFields()
    setModal({ mode: 'create' })
  }

  const openEdit = (record) => {
    form.setFieldsValue(record)
    setModal({ mode: 'edit', record })
  }

  const handleSubmit = (values) => {
    setSaving(true)
    const request = modal.mode === 'create'
      ? systemConfigService.createNotificationTemplate(values)
      : systemConfigService.updateNotificationTemplate(modal.record.id, values)

    request
      .then(() => {
        message.success(modal.mode === 'create' ? 'Tạo template thành công' : 'Cập nhật template thành công')
        setModal(null)
        fetchData()
      })
      .catch((err) => message.error(err.response?.data?.message || 'Lưu template thất bại'))
      .finally(() => setSaving(false))
  }

  const handleDeactivate = (id) => {
    systemConfigService.deactivateNotificationTemplate(id)
      .then(() => {
        message.success('Đã vô hiệu hoá template')
        fetchData()
      })
      .catch((err) => message.error(err.response?.data?.message || 'Vô hiệu hoá thất bại'))
  }

  const columns = [
    { title: 'Template key', dataIndex: 'templateKey', key: 'templateKey' },
    { title: 'Channel', dataIndex: 'channel', key: 'channel', render: (v) => <Tag>{v}</Tag> },
    { title: 'Subject', dataIndex: 'subject', key: 'subject' },
    {
      title: 'Trạng thái',
      dataIndex: 'active',
      key: 'active',
      render: (v) => (v ? <Tag color="green">Active</Tag> : <Tag color="default">Inactive</Tag>),
    },
    {
      title: 'Cập nhật',
      key: 'updatedAt',
      render: (_, r) => (r.updatedAt ? dayjs(r.updatedAt).format('DD/MM/YYYY HH:mm') : '—'),
    },
    {
      title: '',
      key: 'actions',
      render: (_, r) => (
        <>
          <Button size="small" onClick={() => openEdit(r)} style={{ marginRight: 8 }}>Sửa</Button>
          {r.active && (
            <Popconfirm title="Vô hiệu hoá template này?" onConfirm={() => handleDeactivate(r.id)}>
              <Button size="small" danger>Deactivate</Button>
            </Popconfirm>
          )}
        </>
      ),
    },
  ]

  return (
    <Card>
      <Button type="primary" icon={<PlusOutlined />} onClick={openCreate} style={{ marginBottom: 16 }}>
        Tạo template
      </Button>
      <Table rowKey="id" columns={columns} dataSource={data} loading={loading} />

      <Modal
        title={modal?.mode === 'create' ? 'Tạo template' : 'Sửa template'}
        open={!!modal}
        onCancel={() => setModal(null)}
        onOk={() => form.submit()}
        confirmLoading={saving}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item label="Template key" name="templateKey" rules={[{ required: true, message: 'Bắt buộc' }]}>
            <Input disabled={modal?.mode === 'edit'} placeholder="VD: WELCOME_EMAIL" />
          </Form.Item>
          <Form.Item label="Channel" name="channel" rules={[{ required: true, message: 'Bắt buộc' }]}>
            <Select disabled={modal?.mode === 'edit'} options={[
              { value: 'EMAIL', label: 'EMAIL' },
              { value: 'SMS', label: 'SMS' },
              { value: 'IN_APP', label: 'IN_APP' },
            ]} />
          </Form.Item>
          <Form.Item label="Subject" name="subject">
            <Input />
          </Form.Item>
          <Form.Item label="Body" name="body" rules={[{ required: true, message: 'Bắt buộc' }]}>
            <TextArea rows={6} />
          </Form.Item>
          <Form.Item label="Variables hint" name="variablesHint">
            <Input placeholder="VD: {{fullName}}, {{appointmentDate}}" />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  )
}

function RolesPermissionsTab() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)

  const fetchData = () => {
    setLoading(true)
    systemConfigService.getRolesPermissions()
      .then((res) => setData(res.data || []))
      .catch(() => message.error('Không tải được danh sách role/quyền'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    queueMicrotask(() => fetchData())
  }, [])

  const columns = [
    { title: 'Role', dataIndex: 'role', key: 'role', width: 180, render: (v) => <Tag color="blue">{v}</Tag> },
    {
      title: 'Quyền',
      dataIndex: 'permissions',
      key: 'permissions',
      render: (permissions) => (
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          {(permissions || []).map((p) => <li key={p}>{p}</li>)}
        </ul>
      ),
    },
  ]

  return (
    <Card>
      <Typography.Paragraph type="secondary">
        Permissions are managed in code for this release.
      </Typography.Paragraph>
      <Table rowKey="role" columns={columns} dataSource={data} loading={loading} pagination={false} />
    </Card>
  )
}

export default function SystemConfigPage() {
  return (
    <div style={{ padding: 24 }}>
      <Typography.Title level={4} style={{ marginBottom: 16 }}>
        Cấu hình hệ thống
      </Typography.Title>
      <Tabs
        items={[
          { key: 'clinic-info', label: 'Thông tin phòng khám', children: <ClinicInfoTab /> },
          { key: 'notification-templates', label: 'Mẫu thông báo', children: <NotificationTemplatesTab /> },
          { key: 'roles-permissions', label: 'Vai trò & Quyền hạn', children: <RolesPermissionsTab /> },
        ]}
      />
    </div>
  )
}
