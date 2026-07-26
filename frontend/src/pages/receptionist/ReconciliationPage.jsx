/**
 * @author  ThangNB - HE201024
 * @created 2026-07-26
 * @updated 2026-07-26
 *
 * Bank-transfer reconciliation screen for the Receptionist — the follow-up to
 * UC-23 ALT-2 when a transfer goes wrong.
 *
 * Every incoming transfer is journalled, including the ones that could not be
 * attributed. This screen surfaces the ones a human still has to resolve, and
 * lets staff record a refund once the money has actually been sent back.
 *
 * ECMS never moves money itself (same principle as payroll in UC-54): the
 * refund is a bank transfer or cash hand-back done outside the system, and what
 * is recorded here is the audit trail — amount, who confirmed, when, and how.
 */
import { useEffect, useState } from 'react'
import { Table, Tag, Button, Modal, Form, InputNumber, Input, message, Tooltip } from 'antd'
import { paymentService } from '../../services/paymentService'

const vnd = (v) => (v == null ? '—' : `${Number(v).toLocaleString('vi-VN')}₫`)
const dt = (iso) => (iso ? new Date(iso).toLocaleString('vi-VN', {
  day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
}) : '—')

/**
 * How each reconciliation outcome is presented, and what the staff member is
 * expected to do about it. Wording is deliberately concrete — "chuyển thừa" is
 * actionable, "MATCHED" is not.
 */
const STATUS = {
  OVERPAID:        { color: 'orange', label: 'Chuyển thừa',        hint: 'Hóa đơn đã thu đủ, phần thừa phải hoàn lại bệnh nhân' },
  AMOUNT_MISMATCH: { color: 'red',    label: 'Chuyển thiếu',       hint: 'Chưa đủ tiền: bệnh nhân chuyển bù đủ tổng, hoặc hoàn lại rồi thu cách khác' },
  DUPLICATE:       { color: 'purple', label: 'Trả trùng',          hint: 'Hóa đơn đã thanh toán trước đó — toàn bộ khoản này phải hoàn lại' },
  UNMATCHED:       { color: 'default',label: 'Không khớp hóa đơn', hint: 'Không dò được mã hóa đơn, hoặc hóa đơn đã bị hủy — cần xác minh chủ khoản tiền' },
}

/** Refund state badge. REQUIRED is what the count in the header is based on. */
const REFUND = {
  REQUIRED: { color: 'red',     label: 'Cần hoàn tiền' },
  DONE:     { color: 'green',   label: 'Đã hoàn tiền' },
  NONE:     { color: 'default', label: '—' },
}

/**
 * Renders the reconciliation worklist and the refund-confirmation dialog.
 * @returns {JSX.Element} the reconciliation screen
 */
export default function ReconciliationPage() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [refundTarget, setRefundTarget] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [form] = Form.useForm()

  /** Loads the worklist. */
  const load = async () => {
    setLoading(true)
    try {
      const res = await paymentService.getReconciliation()
      setRows(res.data || [])
    } catch (e) {
      message.error(e?.response?.data?.message || 'Không tải được danh sách đối soát')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [])

  /**
   * Opens the refund dialog, prefilling the amount that is actually owed:
   * for an overpayment only the excess, otherwise the whole transfer.
   *
   * @param {Object} row the transaction being refunded
   */
  const openRefund = (row) => {
    const suggested = row.status === 'OVERPAID' ? row.overpaidAmount : row.amount
    setRefundTarget(row)
    form.setFieldsValue({ refundAmount: suggested, note: '' })
  }

  /**
   * Submits the refund confirmation.
   *
   * Validate: the amount is capped at what the bank reported (max on the input,
   * re-checked server-side), and the note is mandatory so the refund stays
   * defensible in the audit trail.
   */
  const submitRefund = async () => {
    let values
    try { values = await form.validateFields() } catch { return }
    setSubmitting(true)
    try {
      await paymentService.confirmRefund(refundTarget.id, values)
      message.success('Đã ghi nhận hoàn tiền')
      setRefundTarget(null)
      await load()
    } catch (e) {
      message.error(e?.response?.data?.message || 'Không ghi nhận được hoàn tiền')
    } finally {
      setSubmitting(false)
    }
  }

  const needRefund = rows.filter((r) => r.refundStatus === 'REQUIRED').length

  const columns = [
    {
      title: 'Thời điểm', dataIndex: 'receivedAt', width: 150,
      render: (v, r) => (
        <Tooltip title={`Mã giao dịch cổng: ${r.gatewayTxnId || '—'}`}>
          <span>{dt(v)}</span>
        </Tooltip>
      ),
    },
    {
      title: 'Tình trạng', dataIndex: 'status', width: 170,
      render: (v) => {
        const s = STATUS[v] || { color: 'default', label: v, hint: '' }
        return <Tooltip title={s.hint}><Tag color={s.color}>{s.label}</Tag></Tooltip>
      },
    },
    {
      title: 'Bệnh nhân', dataIndex: 'patientName', width: 180,
      render: (v, r) => v
        ? <div>{v}<div style={{ fontSize: 12, color: '#64748b' }}>{r.patientPhone || ''}</div></div>
        : <span style={{ color: '#94a3b8' }}>Chưa xác định</span>,
    },
    {
      title: 'Hóa đơn', dataIndex: 'matchedInvoiceCode', width: 160,
      render: (v, r) => v
        ? <div><code>{v}</code><div style={{ fontSize: 12, color: '#64748b' }}>Tổng {vnd(r.invoiceTotal)}</div></div>
        : <span style={{ color: '#94a3b8' }}>—</span>,
    },
    {
      title: 'Đã nhận', dataIndex: 'amount', align: 'right', width: 130,
      render: (v) => <strong>{vnd(v)}</strong>,
    },
    {
      title: 'Cần hoàn', dataIndex: 'overpaidAmount', align: 'right', width: 130,
      // Only an overpayment has a partial figure; for the other cases the whole
      // transfer is owed back, so show that instead of a blank cell.
      render: (v, r) => {
        if (r.refundStatus !== 'REQUIRED') return <span style={{ color: '#94a3b8' }}>—</span>
        return <strong style={{ color: '#dc2626' }}>{vnd(v != null ? v : r.amount)}</strong>
      },
    },
    {
      title: 'Nội dung CK', dataIndex: 'content', ellipsis: true,
      render: (v, r) => (
        <Tooltip title={r.note}>
          <span style={{ fontSize: 12 }}>{v || '—'}</span>
        </Tooltip>
      ),
    },
    {
      title: 'Hoàn tiền', dataIndex: 'refundStatus', width: 150,
      render: (v, r) => {
        const s = REFUND[v] || REFUND.NONE
        if (v === 'DONE') {
          return (
            <Tooltip title={`${vnd(r.refundAmount)} · ${dt(r.refundedAt)} · ${r.refundNote || ''}`}>
              <Tag color={s.color}>{s.label}</Tag>
            </Tooltip>
          )
        }
        return <Tag color={s.color}>{s.label}</Tag>
      },
    },
    {
      title: '', width: 130,
      render: (_, r) => r.refundStatus === 'DONE' ? null : (
        <Button size="small" danger onClick={() => openRefund(r)}>
          Ghi nhận hoàn tiền
        </Button>
      ),
    },
  ]

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, marginBottom: 4 }}>
        <h2 style={{ margin: 0 }}>Đối soát giao dịch chuyển khoản</h2>
        {needRefund > 0 && (
          <Tag color="red">{needRefund} khoản cần hoàn tiền</Tag>
        )}
      </div>
      <p style={{ color: '#64748b', marginTop: 0, maxWidth: '80ch' }}>
        Các giao dịch chuyển khoản chưa khớp sạch, hoặc còn nợ tiền bệnh nhân. Việc chuyển tiền
        lại cho bệnh nhân thực hiện ngoài hệ thống (chuyển khoản hoặc trả tiền mặt tại quầy);
        màn hình này ghi nhận lại để có dấu vết đối soát.
      </p>

      <div style={{ marginBottom: 12 }}>
        <Button onClick={load} loading={loading}>Làm mới</Button>
      </div>

      <Table
        rowKey="id" columns={columns} dataSource={rows} loading={loading}
        size="small" scroll={{ x: 1200 }} pagination={{ pageSize: 20 }}
        locale={{ emptyText: 'Không có giao dịch nào cần xử lý' }}
      />

      <Modal
        open={!!refundTarget}
        title={`Ghi nhận hoàn tiền — ${refundTarget?.matchedInvoiceCode || refundTarget?.gatewayTxnId || ''}`}
        onCancel={() => setRefundTarget(null)}
        onOk={submitRefund}
        confirmLoading={submitting}
        okText="Xác nhận đã hoàn tiền"
        cancelText="Hủy"
        destroyOnClose
      >
        <p style={{ color: '#64748b', fontSize: 13 }}>
          Chỉ xác nhận sau khi đã thực sự chuyển tiền lại cho bệnh nhân. Đã nhận từ ngân hàng:{' '}
          <strong>{vnd(refundTarget?.amount)}</strong>
          {refundTarget?.status === 'OVERPAID' && (
            <> · phần chuyển thừa: <strong>{vnd(refundTarget?.overpaidAmount)}</strong></>
          )}
        </p>
        <Form form={form} layout="vertical">
          <Form.Item
            name="refundAmount" label="Số tiền đã hoàn"
            rules={[{ required: true, message: 'Vui lòng nhập số tiền đã hoàn' }]}
          >
            {/* max chặn ngay ở client cho phản hồi nhanh; backend vẫn kiểm tra lại */}
            <InputNumber
              style={{ width: '100%' }} min={1} max={refundTarget?.amount}
              formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
              parser={(v) => v.replace(/\./g, '')}
            />
          </Form.Item>
          <Form.Item
            name="note" label="Cách hoàn tiền"
            rules={[{ required: true, message: 'Vui lòng ghi rõ cách hoàn tiền' }]}
          >
            <Input.TextArea rows={3}
              placeholder="VD: Chuyển khoản lại STK 0123456789 — mã GD MBVCB.123456, hoặc: Trả tiền mặt tại quầy" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
