// UC-57 - Manage System Audit Log
// Trang Admin xem audit log của hệ thống: filter (actor, action, khoảng thời gian, entity id),
// xem chi tiết before/after của một bản ghi, export CSV theo đúng filter đang áp dụng.
import { useEffect, useState } from 'react'
import {
  Table, Card, Space, Input, InputNumber, DatePicker, Button, Modal, Typography, message,
} from 'antd'
import { ReloadOutlined, DownloadOutlined, EyeOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import auditLogService from '../../services/auditLogService'

const { RangePicker } = DatePicker

const DEFAULT_FILTERS = {
  actorId: null,
  action: '',
  entityType: '',
  entityId: '',
  dateFrom: null,
  dateTo: null,
}

export default function AuditLogPage() {
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 })
  const [detail, setDetail] = useState(null)

  const buildParams = (page = pagination.current, pageSize = pagination.pageSize) => ({
    actorId: filters.actorId || undefined,
    action: filters.action || undefined,
    entityType: filters.entityType || undefined,
    entityId: filters.entityId || undefined,
    dateFrom: filters.dateFrom ? filters.dateFrom.startOf('day').toISOString() : undefined,
    dateTo: filters.dateTo ? filters.dateTo.endOf('day').toISOString() : undefined,
    page: page - 1,
    size: pageSize,
  })

  const fetchData = (page = pagination.current, pageSize = pagination.pageSize) => {
    setLoading(true)
    auditLogService.search(buildParams(page, pageSize))
      .then((res) => {
        const result = res.data
        setData(result.content || [])
        setPagination({ current: page, pageSize, total: result.totalElements || 0 })
      })
      .catch(() => message.error('Không tải được audit log'))
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

  const handleViewDetail = (record) => {
    auditLogService.getById(record.id)
      .then((res) => setDetail(res.data))
      .catch(() => message.error('Không tải được chi tiết audit log'))
  }

  const handleExport = () => {
    setExporting(true)
    auditLogService.exportCsv(buildParams(1, pagination.total || pagination.pageSize))
      .then((blob) => {
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = 'audit_log.csv'
        document.body.appendChild(link)
        link.click()
        link.remove()
        window.URL.revokeObjectURL(url)
      })
      .catch(() => message.error('Export CSV thất bại'))
      .finally(() => setExporting(false))
  }

  const formatJson = (value) => {
    if (!value) return '—'
    try {
      return JSON.stringify(JSON.parse(value), null, 2)
    } catch {
      return value
    }
  }

  const columns = [
    {
      title: 'Thời gian',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 170,
      render: (v) => (v ? dayjs(v).format('DD/MM/YYYY HH:mm:ss') : '—'),
    },
    {
      title: 'Actor',
      key: 'actor',
      render: (_, r) => r.actorName || r.actorEmail || (r.actorId ? `#${r.actorId}` : 'Hệ thống'),
    },
    {
      title: 'Action',
      dataIndex: 'action',
      key: 'action',
    },
    {
      title: 'Entity type',
      dataIndex: 'entityType',
      key: 'entityType',
    },
    {
      title: 'Entity ID',
      dataIndex: 'entityId',
      key: 'entityId',
    },
    {
      title: 'IP',
      dataIndex: 'ipAddress',
      key: 'ipAddress',
    },
    {
      title: '',
      key: 'view',
      width: 60,
      render: (_, r) => (
        <Button size="small" icon={<EyeOutlined />} onClick={() => handleViewDetail(r)} />
      ),
    },
  ]

  return (
    <div style={{ padding: 24 }}>
      <Typography.Title level={4} style={{ marginBottom: 16 }}>
        Audit Log hệ thống
      </Typography.Title>

      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <InputNumber
            placeholder="Actor (User ID)"
            value={filters.actorId}
            onChange={(v) => setFilters((f) => ({ ...f, actorId: v }))}
            style={{ width: 150 }}
          />
          <Input
            placeholder="Action"
            value={filters.action}
            onChange={(e) => setFilters((f) => ({ ...f, action: e.target.value }))}
            style={{ width: 150 }}
          />
          <Input
            placeholder="Entity type"
            value={filters.entityType}
            onChange={(e) => setFilters((f) => ({ ...f, entityType: e.target.value }))}
            style={{ width: 150 }}
          />
          <Input
            placeholder="Entity ID"
            value={filters.entityId}
            onChange={(e) => setFilters((f) => ({ ...f, entityId: e.target.value }))}
            style={{ width: 150 }}
          />
          <RangePicker
            value={[filters.dateFrom, filters.dateTo]}
            onChange={(range) => setFilters((f) => ({
              ...f,
              dateFrom: range ? range[0] : null,
              dateTo: range ? range[1] : null,
            }))}
          />
          <Button type="primary" onClick={handleSearch}>Tìm kiếm</Button>
          <Button icon={<ReloadOutlined />} onClick={handleReset}>Đặt lại</Button>
          <Button icon={<DownloadOutlined />} loading={exporting} onClick={handleExport}>
            Export CSV
          </Button>
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
          onRow={(record) => ({ onClick: () => handleViewDetail(record) })}
          locale={{ emptyText: 'Không có audit log nào' }}
        />
      </Card>

      <Modal
        title="Chi tiết audit log"
        open={!!detail}
        onCancel={() => setDetail(null)}
        footer={null}
        width={800}
      >
        {detail && (
          <div>
            <p><strong>Thời gian:</strong> {dayjs(detail.createdAt).format('DD/MM/YYYY HH:mm:ss')}</p>
            <p><strong>Actor:</strong> {detail.actorName || detail.actorEmail || (detail.actorId ? `#${detail.actorId}` : 'Hệ thống')}</p>
            <p><strong>Action:</strong> {detail.action}</p>
            <p><strong>Entity:</strong> {detail.entityType} #{detail.entityId}</p>
            <p><strong>IP:</strong> {detail.ipAddress || '—'}</p>
            <div style={{ display: 'flex', gap: 16, marginTop: 16 }}>
              <div style={{ flex: 1 }}>
                <Typography.Text strong>Before (old_value)</Typography.Text>
                <pre style={{
                  background: '#fff1f0', padding: 12, borderRadius: 4,
                  maxHeight: 320, overflow: 'auto', fontSize: 12,
                }}>{formatJson(detail.oldValue)}</pre>
              </div>
              <div style={{ flex: 1 }}>
                <Typography.Text strong>After (new_value)</Typography.Text>
                <pre style={{
                  background: '#f6ffed', padding: 12, borderRadius: 4,
                  maxHeight: 320, overflow: 'auto', fontSize: 12,
                }}>{formatJson(detail.newValue)}</pre>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
