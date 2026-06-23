/**
 * InvoicePage — Trang thu phí & phát hành hóa đơn cho Lễ tân (UC-16)
 *
 * Gồm 2 tab:
 *  1. "Tạo hóa đơn" — liệt kê lịch hẹn COMPLETED chưa có hóa đơn
 *  2. "Lịch sử hóa đơn" — liệt kê tất cả hóa đơn đã tạo
 *
 * Thang - HE187030
 */

import { useEffect, useState, useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
  Table, Tag, Button, Space, Typography, Card, message,
  Modal, Form, Input, Select, InputNumber, Tabs, Divider,
  Descriptions, Popconfirm, Row, Col, Statistic, Spin,
} from 'antd'
import {
  PlusOutlined, DeleteOutlined, ReloadOutlined,
  CheckCircleOutlined, SearchOutlined, FileTextOutlined,
  DollarOutlined, PrinterOutlined, MailOutlined,
} from '@ant-design/icons'
import {
  fetchAllInvoices, createInvoice, issueInvoice, cancelInvoice,
} from '../../store/slices/invoiceSlice'
import { appointmentService } from '../../services/appointmentService'
import { invoiceService } from '../../services/invoiceService'

const { Title, Text } = Typography

// ─── Cấu hình ngân hàng phòng khám ───────────────────────────────────────────
const BANK_ID      = import.meta.env.VITE_BANK_ID      || '970436'   // Vietcombank
const BANK_ACCOUNT = import.meta.env.VITE_BANK_ACCOUNT || '1234567890'
const BANK_NAME    = import.meta.env.VITE_BANK_NAME    || 'PHONG KHAM MAT'

const buildVietQrUrl = (amount, description) =>
  `https://img.vietqr.io/image/${BANK_ID}-${BANK_ACCOUNT}-compact2.png` +
  `?amount=${Math.round(amount)}` +
  `&addInfo=${encodeURIComponent(description)}` +
  `&accountName=${encodeURIComponent(BANK_NAME)}`

// ─── Constants ────────────────────────────────────────────────────────────────

const PAYMENT_METHOD_OPTS = [
  { label: 'Tiền mặt', value: 'CASH' },
  { label: 'QR Code (VietQR)', value: 'VIET_QR' },
]

const ITEM_TYPE_OPTS = [
  { label: 'Dịch vụ khám', value: 'SERVICE' },
  { label: 'Xét nghiệm / Cận lâm sàng', value: 'LAB' },
  { label: 'Thuốc', value: 'MEDICINE' },
  { label: 'Kính', value: 'GLASSES' },
  { label: 'Khác', value: 'OTHER' },
]

const INVOICE_STATUS_CFG = {
  DRAFT:     { color: 'gold',  label: 'Nháp' },
  ISSUED:    { color: 'green', label: 'Đã phát hành' },
  CANCELLED: { color: 'red',   label: 'Đã hủy' },
}

const PAYMENT_STATUS_CFG = {
  UNPAID:         { color: 'orange', label: 'Chưa thanh toán' },
  PAID:           { color: 'green',  label: 'Đã thanh toán' },
  PAYMENT_FAILED: { color: 'red',    label: 'Thất bại' },
}

const fmt = (amount) =>
  amount != null
    ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount)
    : '—'

// ─── Main component ───────────────────────────────────────────────────────────

export default function InvoicePage() {
  const dispatch = useDispatch()
  const { list: invoices, loading: invoiceLoading } = useSelector((s) => s.invoice)

  const [allAppointments, setAllAppointments] = useState([])
  const [apptLoading, setApptLoading]         = useState(false)
  const [apptSearch, setApptSearch]           = useState('')
  const [invoiceSearch, setInvoiceSearch]     = useState('')

  // Modal tạo hóa đơn
  const [createModal, setCreateModal] = useState({ open: false, appointment: null })
  const [form]                        = Form.useForm()
  const [items, setItems]             = useState([])
  const [submitting, setSubmitting]   = useState(false)
  const [qrLoading, setQrLoading]     = useState(false)

  const paymentMethod = Form.useWatch('paymentMethod', form)

  // Modal xem chi tiết
  const [detailModal, setDetailModal] = useState({ open: false, invoice: null })
  const [emailSending, setEmailSending] = useState(false)
  const [printLoading, setPrintLoading] = useState(false)

  // ─── Load ────────────────────────────────────────────────────────────────────

  const loadAppointments = useCallback(() => {
    setApptLoading(true)
    appointmentService.getAllAppointments()
      .then((res) => setAllAppointments(res.data ?? []))
      .catch(() => message.error('Không thể tải danh sách lịch hẹn'))
      .finally(() => setApptLoading(false))
  }, [])

  useEffect(() => {
    loadAppointments()
    dispatch(fetchAllInvoices())
  }, [dispatch, loadAppointments])

  // ─── Derived ─────────────────────────────────────────────────────────────────

  const billedIds = new Set(
    invoices.filter((i) => i.status !== 'CANCELLED').map((i) => i.appointmentId)
  )

  const completedUnbilled = allAppointments.filter(
    (a) => a.status === 'COMPLETED' && !billedIds.has(a.id)
  )

  const filteredAppts = apptSearch
    ? completedUnbilled.filter(
        (a) =>
          a.patientName?.toLowerCase().includes(apptSearch.toLowerCase()) ||
          a.patientPhone?.includes(apptSearch)
      )
    : completedUnbilled

  const filteredInvoices = invoiceSearch
    ? invoices.filter(
        (inv) =>
          inv.patientName?.toLowerCase().includes(invoiceSearch.toLowerCase()) ||
          inv.patientPhone?.includes(invoiceSearch) ||
          inv.invoiceCode?.toLowerCase().includes(invoiceSearch.toLowerCase())
      )
    : invoices

  // ─── Modal helpers ────────────────────────────────────────────────────────────

  const handleOpenCreate = (appt) => {
    const prefill = appt.serviceName
      ? [{ itemType: 'SERVICE', description: appt.serviceName, quantity: 1, unitPrice: appt.servicePrice ?? 0 }]
      : [{ itemType: 'SERVICE', description: '', quantity: 1, unitPrice: 0 }]
    setItems(prefill)
    form.setFieldsValue({ paymentMethod: 'CASH', paymentReference: '', notes: '' })
    setCreateModal({ open: true, appointment: appt })
  }

  const handleCloseCreate = () => {
    setCreateModal({ open: false, appointment: null })
    form.resetFields()
    setItems([])
  }

  // ─── Item editing ─────────────────────────────────────────────────────────────

  const addItem    = () => setItems((p) => [...p, { itemType: 'OTHER', description: '', quantity: 1, unitPrice: 0 }])
  const removeItem = (idx) => setItems((p) => p.filter((_, i) => i !== idx))
  const updateItem = (idx, field, val) =>
    setItems((p) => p.map((it, i) => (i === idx ? { ...it, [field]: val } : it)))

  const calcSubtotal = (it) => (it.quantity ?? 1) * (it.unitPrice ?? 0)
  const totalAmount  = items.reduce((s, it) => s + calcSubtotal(it), 0)

  // ─── Submit ───────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    let values
    try { values = await form.validateFields() } catch { return }

    if (!items.length) { message.warning('Vui lòng thêm ít nhất một khoản phí'); return }
    if (items.some((it) => !it.description?.trim())) {
      message.warning('Vui lòng nhập mô tả cho tất cả các khoản phí')
      return
    }

    setSubmitting(true)
    try {
      const payload = {
        appointmentId: createModal.appointment.id,
        paymentMethod: values.paymentMethod,
        paymentReference: values.paymentReference || null,
        notes: values.notes || null,
        items: items.map((it) => ({
          itemType: it.itemType,
          description: it.description,
          quantity: it.quantity ?? 1,
          unitPrice: it.unitPrice ?? 0,
        })),
      }

      const created = await dispatch(createInvoice(payload)).unwrap()

      await dispatch(issueInvoice({
        id: created.id,
        paymentMethod: values.paymentMethod,
        paymentReference: values.paymentReference || null,
      })).unwrap()

      message.success(`Hóa đơn ${created.invoiceCode} đã được phát hành thành công`)
      handleCloseCreate()
      loadAppointments()
    } catch (err) {
      message.error(typeof err === 'string' ? err : 'Có lỗi xảy ra, vui lòng thử lại')
    } finally {
      setSubmitting(false)
    }
  }

  // ─── Cancel invoice ───────────────────────────────────────────────────────────

  const handleCancelInvoice = async (id) => {
    try {
      await dispatch(cancelInvoice(id)).unwrap()
      message.success('Đã hủy hóa đơn')
    } catch (err) {
      message.error(typeof err === 'string' ? err : 'Không thể hủy hóa đơn')
    }
  }

  // ─── Print invoice (PDF) ─────────────────────────────────────────────────────

  const handlePrint = async (inv) => {
    setPrintLoading(true)
    try {
      const blob = await invoiceService.downloadPdf(inv.id)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.target = '_blank'
      a.rel = 'noopener noreferrer'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      setTimeout(() => URL.revokeObjectURL(url), 60000)
    } catch (err) {
      let errorMsg = 'Không thể tạo PDF hóa đơn'
      if (err?.response?.data instanceof Blob) {
        try {
          const text = await err.response.data.text()
          const json = JSON.parse(text)
          errorMsg = json.message || json.error || errorMsg
        } catch { /* keep default */ }
      } else if (err?.response?.data?.message) {
        errorMsg = err.response.data.message
      } else if (err?.message) {
        errorMsg = err.message
      }
      message.error(errorMsg)
    } finally {
      setPrintLoading(false)
    }
  }

  // ─── Send email ───────────────────────────────────────────────────────────────

  const handleSendEmail = async (inv) => {
    if (!inv.patientEmail) {
      message.warning('Bệnh nhân chưa có địa chỉ email trong hồ sơ')
      return
    }
    setEmailSending(true)
    try {
      await invoiceService.sendEmail(inv.id)
      message.success(`Đã gửi hóa đơn đến ${inv.patientEmail}`)
    } catch (err) {
      const isTimeout = err?.code === 'ECONNABORTED' || err?.message?.includes('timeout')
      const serverMsg = err?.response?.data?.message
      message.error(
        serverMsg || (isTimeout ? 'Hết thời gian chờ — máy chủ SMTP không phản hồi' : 'Không thể gửi email')
      )
    } finally {
      setEmailSending(false)
    }
  }

  // ─── Stats ────────────────────────────────────────────────────────────────────

  const totalRevenue = invoices
    .filter((i) => i.paymentStatus === 'PAID')
    .reduce((s, i) => s + (i.totalAmount ?? 0), 0)

  // ─── Table columns ────────────────────────────────────────────────────────────

  const apptColumns = [
    { title: 'STT', key: 'stt', width: 50, render: (_, __, i) => i + 1 },
    { title: 'Bệnh nhân', dataIndex: 'patientName', key: 'patientName' },
    { title: 'SĐT', dataIndex: 'patientPhone', key: 'patientPhone', width: 125 },
    { title: 'Giờ khám', dataIndex: 'timeSlot', key: 'timeSlot', width: 100 },
    {
      title: 'STT hàng đợi', dataIndex: 'queueNumber', key: 'queueNumber', width: 105,
      render: (q) => q ? <Tag color="blue">#{q}</Tag> : '—',
    },
    {
      title: 'Bác sĩ', dataIndex: 'doctorName', key: 'doctorName',
      render: (n) => n || <Text type="secondary">Chưa gán</Text>,
    },
    { title: 'Dịch vụ', dataIndex: 'serviceName', key: 'serviceName', render: (n) => n || '—' },
    {
      title: 'Hành động', key: 'action', width: 150,
      render: (_, record) => (
        <Button
          type="primary" size="small" icon={<DollarOutlined />}
          onClick={() => handleOpenCreate(record)}
          style={{ backgroundColor: '#10b981', borderColor: '#10b981' }}
        >
          Thu phí & HĐ
        </Button>
      ),
    },
  ]

  const invoiceColumns = [
    {
      title: 'Mã HĐ', dataIndex: 'invoiceCode', key: 'invoiceCode',
      render: (code) => <Text strong style={{ color: '#6366f1' }}>{code}</Text>,
    },
    { title: 'Bệnh nhân', dataIndex: 'patientName', key: 'patientName' },
    { title: 'SĐT', dataIndex: 'patientPhone', key: 'patientPhone', width: 125 },
    { title: 'Bác sĩ', dataIndex: 'doctorName', key: 'doctorName' },
    {
      title: 'Tổng tiền', dataIndex: 'totalAmount', key: 'totalAmount', width: 140,
      render: (v) => <Text strong>{fmt(v)}</Text>,
    },
    {
      title: 'Thanh toán', dataIndex: 'paymentMethod', key: 'paymentMethod', width: 125,
      render: (m) => m === 'CASH' ? 'Tiền mặt' : m === 'VIET_QR' ? 'QR Code' : '—',
    },
    {
      title: 'Hóa đơn', dataIndex: 'status', key: 'status', width: 130,
      render: (s) => {
        const c = INVOICE_STATUS_CFG[s] || {}
        return <Tag color={c.color}>{c.label}</Tag>
      },
    },
    {
      title: 'TT thanh toán', dataIndex: 'paymentStatus', key: 'paymentStatus', width: 140,
      render: (s) => {
        const c = PAYMENT_STATUS_CFG[s] || {}
        return <Tag color={c.color}>{c.label}</Tag>
      },
    },
    {
      title: 'Ngày tạo', dataIndex: 'createdAt', key: 'createdAt', width: 145,
      render: (d) =>
        d ? new Date(d).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' }) : '—',
    },
    {
      title: 'Hành động', key: 'action', width: 155,
      render: (_, record) => (
        <Space>
          <Button size="small" icon={<FileTextOutlined />}
            onClick={async () => {
              try {
                const res = await invoiceService.getById(record.id)
                setDetailModal({ open: true, invoice: res.data ?? record })
              } catch {
                setDetailModal({ open: true, invoice: record })
              }
            }}>
            Chi tiết
          </Button>
          {record.status === 'DRAFT' && (
            <Popconfirm title="Hủy hóa đơn này?" onConfirm={() => handleCancelInvoice(record.id)}
              okText="Hủy HĐ" cancelText="Không">
              <Button size="small" danger>Hủy</Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ]

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <div style={{ padding: 24 }}>
      <Title level={4} style={{ marginBottom: 4 }}>Thu phí & Hóa đơn</Title>
      <Text type="secondary" style={{ display: 'block', marginBottom: 20 }}>
        Quản lý thu phí khám bệnh và phát hành hóa đơn điện tử
      </Text>

      {/* Stats */}
      <Row gutter={12} style={{ marginBottom: 20 }}>
        {[
          { label: 'Chờ thu phí', value: completedUnbilled.length, color: '#f59e0b' },
          { label: 'HĐ đã phát hành', value: invoices.filter((i) => i.status === 'ISSUED').length, color: '#10b981' },
          { label: 'Tổng hóa đơn', value: invoices.length, color: '#6366f1' },
        ].map(({ label, value, color }) => (
          <Col key={label} span={6}>
            <Card size="small" style={{ textAlign: 'center', borderTop: `3px solid ${color}` }}>
              <Statistic
                title={<span style={{ fontSize: 11 }}>{label}</span>}
                value={value}
                styles={{ value: { fontSize: 20, color } }}
              />
            </Card>
          </Col>
        ))}
        <Col span={6}>
          <Card size="small" style={{ textAlign: 'center', borderTop: '3px solid #3b82f6' }}>
            <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>Doanh thu tích lũy</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#3b82f6' }}>{fmt(totalRevenue)}</div>
          </Card>
        </Col>
      </Row>

      <Tabs
        defaultActiveKey="pending"
        items={[
          {
            key: 'pending',
            label: `Tạo hóa đơn  (${completedUnbilled.length})`,
            children: (
              <Card>
                <Space style={{ marginBottom: 16 }}>
                  <Input
                    placeholder="Tìm theo tên, SĐT bệnh nhân..."
                    prefix={<SearchOutlined />}
                    value={apptSearch}
                    onChange={(e) => setApptSearch(e.target.value)}
                    style={{ width: 280 }}
                    allowClear
                  />
                  <Button icon={<ReloadOutlined />}
                    onClick={() => { loadAppointments(); dispatch(fetchAllInvoices()) }}
                    loading={apptLoading}>
                    Làm mới
                  </Button>
                </Space>
                <Table
                  columns={apptColumns}
                  dataSource={filteredAppts}
                  rowKey="id"
                  loading={apptLoading || invoiceLoading}
                  pagination={{ pageSize: 10, showSizeChanger: false }}
                  locale={{ emptyText: 'Không có lịch hẹn nào chờ thu phí' }}
                />
              </Card>
            ),
          },
          {
            key: 'history',
            label: `Lịch sử hóa đơn  (${invoices.length})`,
            children: (
              <Card>
                <Space style={{ marginBottom: 16 }}>
                  <Input
                    placeholder="Tìm theo tên, SĐT, mã hóa đơn..."
                    prefix={<SearchOutlined />}
                    value={invoiceSearch}
                    onChange={(e) => setInvoiceSearch(e.target.value)}
                    style={{ width: 300 }}
                    allowClear
                  />
                  <Button icon={<ReloadOutlined />}
                    onClick={() => dispatch(fetchAllInvoices())} loading={invoiceLoading}>
                    Làm mới
                  </Button>
                </Space>
                <Table
                  columns={invoiceColumns}
                  dataSource={filteredInvoices}
                  rowKey="id"
                  loading={invoiceLoading}
                  pagination={{ pageSize: 10, showSizeChanger: false }}
                  locale={{ emptyText: 'Chưa có hóa đơn nào' }}
                  scroll={{ x: 1200 }}
                />
              </Card>
            ),
          },
        ]}
      />

      {/* ── Modal: Tạo & thu phí hóa đơn ─────────────────────────────────────── */}
      <Modal
        title="Thu phí & Phát hành hóa đơn"
        open={createModal.open}
        onCancel={handleCloseCreate}
        width={780}
        footer={[
          <Button key="back" onClick={handleCloseCreate}>Hủy bỏ</Button>,
          <Button
            key="submit"
            type="primary"
            icon={<CheckCircleOutlined />}
            loading={submitting}
            onClick={handleSubmit}
            style={{ backgroundColor: '#10b981', borderColor: '#10b981' }}
          >
            Xác nhận thu tiền & Phát hành
          </Button>,
        ]}
        destroyOnClose
      >
        {createModal.appointment && (
          <>
            <Descriptions bordered size="small" column={2} style={{ marginBottom: 20 }}>
              <Descriptions.Item label="Bệnh nhân">
                <Text strong>{createModal.appointment.patientName}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="SĐT">
                {createModal.appointment.patientPhone || '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Bác sĩ">
                {createModal.appointment.doctorName || '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Giờ khám">
                {createModal.appointment.timeSlot || '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Dịch vụ" span={2}>
                {createModal.appointment.serviceName || '—'}
              </Descriptions.Item>
            </Descriptions>

            <Divider style={{ margin: '12px 0' }}>Các khoản phí</Divider>

            {/* Items rows */}
            <div style={{ marginBottom: 12 }}>
              <Row gutter={8} style={{ fontWeight: 600, fontSize: 12, color: '#64748b', marginBottom: 6 }}>
                <Col flex="130px">Loại</Col>
                <Col flex="auto">Mô tả dịch vụ / thuốc</Col>
                <Col flex="68px" style={{ textAlign: 'right' }}>SL</Col>
                <Col flex="115px" style={{ textAlign: 'right' }}>Đơn giá (đ)</Col>
                <Col flex="115px" style={{ textAlign: 'right' }}>Thành tiền</Col>
                <Col flex="36px" />
              </Row>

              {items.map((item, idx) => (
                <Row key={idx} gutter={8} style={{ marginBottom: 8 }} align="middle">
                  <Col flex="130px">
                    <Select
                      size="small"
                      value={item.itemType}
                      onChange={(v) => updateItem(idx, 'itemType', v)}
                      options={ITEM_TYPE_OPTS}
                      style={{ width: '100%' }}
                    />
                  </Col>
                  <Col flex="auto">
                    <Input
                      size="small"
                      value={item.description}
                      onChange={(e) => updateItem(idx, 'description', e.target.value)}
                      placeholder="Tên dịch vụ, thuốc..."
                    />
                  </Col>
                  <Col flex="68px">
                    <InputNumber
                      size="small" min={1}
                      value={item.quantity}
                      onChange={(v) => updateItem(idx, 'quantity', v)}
                      style={{ width: '100%' }}
                    />
                  </Col>
                  <Col flex="115px">
                    <InputNumber
                      size="small" min={0}
                      value={item.unitPrice}
                      onChange={(v) => updateItem(idx, 'unitPrice', v)}
                      formatter={(v) => v?.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                      parser={(v) => v?.replace(/,/g, '')}
                      style={{ width: '100%' }}
                    />
                  </Col>
                  <Col flex="115px" style={{ textAlign: 'right' }}>
                    <Text>{fmt(calcSubtotal(item))}</Text>
                  </Col>
                  <Col flex="36px" style={{ textAlign: 'center' }}>
                    <Button
                      size="small" type="text" danger
                      icon={<DeleteOutlined />}
                      onClick={() => removeItem(idx)}
                      disabled={items.length === 1}
                    />
                  </Col>
                </Row>
              ))}

              <Button size="small" icon={<PlusOutlined />} onClick={addItem} style={{ marginTop: 4 }}>
                Thêm khoản phí
              </Button>
            </div>

            <Divider style={{ margin: '12px 0' }} />

            <div style={{ textAlign: 'right', marginBottom: 20 }}>
              <Text style={{ fontSize: 15 }}>Tổng cộng: </Text>
              <Text strong style={{ fontSize: 22, color: '#10b981' }}>{fmt(totalAmount)}</Text>
            </div>

            <Form form={form} layout="vertical">
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    label="Phương thức thanh toán"
                    name="paymentMethod"
                    rules={[{ required: true, message: 'Vui lòng chọn phương thức' }]}
                  >
                    <Select options={PAYMENT_METHOD_OPTS} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="Mã tham chiếu QR (nếu có)" name="paymentReference">
                    <Input placeholder="Mã giao dịch QR..." />
                  </Form.Item>
                </Col>
              </Row>

              {/* ── VietQR block ── */}
              {paymentMethod === 'VIET_QR' && totalAmount > 0 && (
                <div style={{
                  textAlign: 'center',
                  padding: '16px',
                  background: '#f0fdf4',
                  borderRadius: 12,
                  border: '1px solid #bbf7d0',
                  marginBottom: 16,
                }}>
                  <Text strong style={{ display: 'block', marginBottom: 8, color: '#15803d' }}>
                    Quét mã để thanh toán
                  </Text>
                  <Spin spinning={qrLoading}>
                    <img
                      src={buildVietQrUrl(
                        totalAmount,
                        `Thanh toan ${createModal.appointment?.patientName ?? ''}`
                      )}
                      alt="VietQR"
                      onLoadStart={() => setQrLoading(true)}
                      onLoad={() => setQrLoading(false)}
                      onError={() => setQrLoading(false)}
                      style={{ maxWidth: 220, borderRadius: 8, boxShadow: '0 2px 8px #0001' }}
                    />
                  </Spin>
                  <div style={{ marginTop: 8, fontSize: 12, color: '#64748b' }}>
                    <div>{BANK_NAME}</div>
                    <div>STK: <Text strong>{BANK_ACCOUNT}</Text></div>
                    <div>Số tiền: <Text strong style={{ color: '#10b981' }}>{fmt(totalAmount)}</Text></div>
                  </div>
                </div>
              )}

              <Form.Item label="Ghi chú" name="notes">
                <Input.TextArea rows={2} placeholder="Ghi chú hóa đơn..." />
              </Form.Item>
            </Form>
          </>
        )}
      </Modal>

      {/* ── Modal: Xem chi tiết hóa đơn ──────────────────────────────────────── */}
      <Modal
        title={`Chi tiết hóa đơn — ${detailModal.invoice?.invoiceCode ?? ''}`}
        open={detailModal.open}
        onCancel={() => setDetailModal({ open: false, invoice: null })}
        footer={
          <Space>
            <Button
              icon={<PrinterOutlined />}
              loading={printLoading}
              onClick={() => handlePrint(detailModal.invoice)}
            >
              In hóa đơn (PDF)
            </Button>
            <Button
              icon={<MailOutlined />}
              loading={emailSending}
              onClick={() => handleSendEmail(detailModal.invoice)}
              disabled={!detailModal.invoice?.patientEmail}
              title={detailModal.invoice?.patientEmail || 'Bệnh nhân chưa có email'}
            >
              Gửi email
            </Button>
            <Button onClick={() => setDetailModal({ open: false, invoice: null })}>Đóng</Button>
          </Space>
        }
        width={640}
      >
        {detailModal.invoice && (
          <>
            <Descriptions bordered size="small" column={2} style={{ marginBottom: 16 }}>
              <Descriptions.Item label="Bệnh nhân">
                <Text strong>{detailModal.invoice.patientName}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="SĐT">{detailModal.invoice.patientPhone || '—'}</Descriptions.Item>
              <Descriptions.Item label="Bác sĩ">{detailModal.invoice.doctorName || '—'}</Descriptions.Item>
              <Descriptions.Item label="Dịch vụ">{detailModal.invoice.serviceName || '—'}</Descriptions.Item>
              <Descriptions.Item label="Trạng thái HĐ">
                {(() => { const c = INVOICE_STATUS_CFG[detailModal.invoice.status] || {}; return <Tag color={c.color}>{c.label}</Tag> })()}
              </Descriptions.Item>
              <Descriptions.Item label="Trạng thái TT">
                {(() => { const c = PAYMENT_STATUS_CFG[detailModal.invoice.paymentStatus] || {}; return <Tag color={c.color}>{c.label}</Tag> })()}
              </Descriptions.Item>
              <Descriptions.Item label="Phương thức">
                {detailModal.invoice.paymentMethod === 'CASH' ? 'Tiền mặt' : 'QR Code'}
              </Descriptions.Item>
              <Descriptions.Item label="Ngày thanh toán">
                {detailModal.invoice.paidAt
                  ? new Date(detailModal.invoice.paidAt).toLocaleString('vi-VN')
                  : '—'}
              </Descriptions.Item>
              {detailModal.invoice.notes && (
                <Descriptions.Item label="Ghi chú" span={2}>{detailModal.invoice.notes}</Descriptions.Item>
              )}
            </Descriptions>

            <Divider style={{ margin: '12px 0' }}>Chi tiết khoản phí</Divider>

            <Row gutter={12} style={{ marginBottom: 16 }}>
              {[
                { label: 'Phí khám', value: detailModal.invoice.serviceFee, bg: '#f0fdf4', color: '#16a34a' },
                { label: 'Xét nghiệm', value: detailModal.invoice.labFee, bg: '#eff6ff', color: '#2563eb' },
                { label: 'Thuốc / Kính', value: detailModal.invoice.medicineFee, bg: '#fef9c3', color: '#ca8a04' },
              ].map(({ label, value, bg, color }) => (
                <Col key={label} span={8}>
                  <Card size="small" style={{ textAlign: 'center', background: bg }}>
                    <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>{label}</div>
                    <div style={{ fontWeight: 700, color }}>{fmt(value)}</div>
                  </Card>
                </Col>
              ))}
            </Row>

            <div style={{
              textAlign: 'right', padding: '12px 16px',
              background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0',
            }}>
              <Text style={{ fontSize: 15 }}>Tổng cộng: </Text>
              <Text strong style={{ fontSize: 22, color: '#10b981' }}>
                {fmt(detailModal.invoice.totalAmount)}
              </Text>
            </div>
          </>
        )}
      </Modal>
    </div>
  )
}
