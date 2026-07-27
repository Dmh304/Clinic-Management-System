/**
 * @author  ThangNB - HE201024
 * @created 2026-07-11
 * @updated 2026-07-18
 *
 * Patient portal "My Invoices" screen — UC-24 Deliver Invoice (ALT-2 patient
 * download) plus the VietQR payment flow of UC-23 (ALT-2).
 *
 * The patient can review their invoices, download the PDF, request an emailed
 * copy, pay an outstanding invoice by scanning a VietQR code, and cancel an
 * unpaid draft.
 *
 * Business rules:
 *  - BR-08 — the list is scoped server-side to the signed-in patient
 *  - BR-10 — an invoice is only shown as paid once the gateway confirms it;
 *    this screen never marks anything paid itself
 *  - BR-09 — cancelling is a soft state change, the invoice remains visible
 */
import { useEffect, useState } from 'react'
import { Modal, Spin, message, Empty } from 'antd'
import { invoiceService } from '../../services/invoiceService'
import { paymentService } from '../../services/paymentService'

// ── Cấu hình tài khoản nhận tiền của phòng khám (khớp backend payment.bank.* + .env) ──
const BANK_ID      = import.meta.env.VITE_BANK_ID      || '970436'
const BANK_ACCOUNT = import.meta.env.VITE_BANK_ACCOUNT || '1234567890'
const BANK_NAME    = import.meta.env.VITE_BANK_NAME    || 'PHONG KHAM MAT'

// Nội dung chuyển khoản bắt đầu bằng "SEVQR" (SePay + VietinBank) + chứa mã hóa đơn để
// webhook tự đối soát (UC-22)
const buildTransferContent = (code) => `SEVQR ${code}`

// Chu kỳ hỏi backend và ngưỡng dừng hỏi (SRS §2.3 ALT-2: 5 phút).
// Giữ khớp với InvoicePage.jsx của lễ tân — cùng một luồng UC-23.
const POLL_INTERVAL_MS = 3000
const POLL_TIMEOUT_MS = 5 * 60 * 1000
const buildVietQrUrl = (amount, code) =>
  `https://img.vietqr.io/image/${BANK_ID}-${BANK_ACCOUNT}-compact2.png` +
  `?amount=${Math.round(amount || 0)}` +
  `&addInfo=${encodeURIComponent(buildTransferContent(code))}` +
  `&accountName=${encodeURIComponent(BANK_NAME)}`

const INVOICE_STATUS = {
  DRAFT:     { label: 'Chưa phát hành', color: '#d97706', bg: '#fef3c7' },
  ISSUED:    { label: 'Đã phát hành', color: '#16a34a', bg: '#dcfce7' },
  CANCELLED: { label: 'Đã hủy',       color: '#dc2626', bg: '#fee2e2' },
}

const PAYMENT_STATUS = {
  UNPAID:          { label: 'Chưa thanh toán', color: '#d97706', bg: '#fef3c7' },
  PENDING_PAYMENT: { label: 'Chờ chuyển khoản', color: '#2563eb', bg: '#dbeafe' },
  PAID:            { label: 'Đã thanh toán',   color: '#16a34a', bg: '#dcfce7' },
  // Đã chuyển một phần, lũy kế chưa đủ (UC-23 E2).
  PARTIALLY_PAID:  { label: 'Đã trả một phần', color: '#d97706', bg: '#fef3c7' },
  // Dữ liệu cũ trước khi có cộng dồn từng phần — ý nghĩa như trên.
  PAYMENT_FAILED:  { label: 'Chuyển thiếu tiền', color: '#dc2626', bg: '#fee2e2' },
}

const PAYMENT_METHOD = {
  CASH:    'Tiền mặt',
  VIET_QR: 'QR Code (VietQR)',
}

const fmt = (n) =>
  n != null ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n) : '—'

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'

const StatusBadge = ({ map, value }) => {
  const cfg = map[value] || { label: value || '—', color: '#6b7280', bg: '#f3f4f6' }
  return (
    <span style={{
      display: 'inline-block', padding: '2px 10px', borderRadius: 12, fontSize: 12,
      fontWeight: 600, color: cfg.color, backgroundColor: cfg.bg,
    }}>
      {cfg.label}
    </span>
  )
}

const TAB_ALL      = 'ALL'
const TAB_UNPAID   = 'UNPAID'   // lọc theo trạng thái thanh toán, không phải status hóa đơn
const TAB_ISSUED   = 'ISSUED'

/**
 * Renders the patient's invoice list, detail modal and QR payment modal.
 * @returns {JSX.Element} the invoices screen
 */
export default function MyInvoicesPage() {
  const [invoices, setInvoices]     = useState([])
  const [loading, setLoading]       = useState(true)
  const [activeTab, setActiveTab]   = useState(TAB_ALL)
  const [detail, setDetail]         = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [pdfLoading, setPdfLoading] = useState(null)
  const [emailSending, setEmailSending] = useState(null)
  // Hóa đơn đang thanh toán bằng QR (mở modal QR + polling trạng thái)
  const [payModal, setPayModal] = useState(null)
  // Hết thời gian chờ polling → dừng hỏi backend, đổi sang nút bấm tay
  const [pollTimedOut, setPollTimedOut] = useState(false)
  const [checkingNow, setCheckingNow] = useState(false)
  // Tiến độ thanh toán từng phần trả về từ /payments/status (paidAmount, remainingAmount)
  const [payProgress, setPayProgress] = useState(null)

  /** Reloads the patient's own invoices (BR-08: scoped server-side). */
  const reloadInvoices = () =>
    invoiceService.getMy()
      .then(res => setInvoices(res.data || []))
      .catch(() => message.error('Không thể tải danh sách hóa đơn'))

  useEffect(() => {
    reloadInvoices().finally(() => setLoading(false))
  }, [])

  // While the QR modal is open, poll the backend every 3 seconds to see
  // whether the gateway has reported the transfer (UC-23 ALT-2 step 4).
  // On success the modal closes itself and the list refreshes.
  //
  // Tự dừng sau POLL_TIMEOUT_MS (SRS §2.3 ALT-2) để không hỏi vô hạn khi bệnh nhân bỏ
  // đi. Hết giờ chỉ DỪNG HỎI: hóa đơn vẫn PENDING_PAYMENT và webhook vẫn gạch nợ nếu
  // tiền về muộn.
  //
  // Validate: BR-10 — this only *reads* `paid`, which the backend sets solely
  // from a confirmed full payment. Transient network errors are swallowed so
  // one failed poll does not abort the loop.
  useEffect(() => {
    if (!payModal || pollTimedOut) return
    let cancelled = false
    const deadline = Date.now() + POLL_TIMEOUT_MS
    const check = async () => {
      if (Date.now() > deadline) {
        if (!cancelled) setPollTimedOut(true)
        return
      }
      try {
        const res = await paymentService.getStatus(payModal.id)
        if (cancelled) return
        setPayProgress(res?.data ?? null)
        if (!res?.data?.paid) return
        message.success(`Đã thanh toán hóa đơn ${payModal.invoiceCode}`)
        setPayModal(null)
        void reloadInvoices()
      } catch { /* lỗi mạng tạm thời: vòng sau thử lại */ }
    }
    const timer = setInterval(check, POLL_INTERVAL_MS)
    return () => { cancelled = true; clearInterval(timer) }
  }, [payModal, pollTimedOut])

  /**
   * Bấm "Kiểm tra lại" sau khi hết thời gian chờ tự động.
   *
   * Validate: BR-10 — vẫn chỉ ĐỌC trạng thái do cổng thanh toán xác nhận, không phải
   * cách để bệnh nhân tự đánh dấu hóa đơn đã trả.
   */
  const handleCheckPaymentNow = async () => {
    if (!payModal) return
    setCheckingNow(true)
    try {
      const res = await paymentService.getStatus(payModal.id)
      if (res?.data?.paid) {
        message.success(`Đã thanh toán hóa đơn ${payModal.invoiceCode}`)
        setPayModal(null)
        void reloadInvoices()
      } else {
        message.info('Chưa nhận được tiền. Nếu bạn vừa chuyển khoản, vui lòng đợi thêm và thử lại.')
      }
    } catch {
      message.error('Không kiểm tra được trạng thái thanh toán')
    } finally {
      setCheckingNow(false)
    }
  }

  /**
   * Cancels an unpaid draft invoice at the patient's request.
   *
   * @param {Object} inv the invoice to cancel
   *
   * Validate: confirmation is required first; the backend then enforces that
   * only a DRAFT invoice may be cancelled, and BR-09 keeps the row as
   * CANCELLED rather than deleting it.
   */
  const handleRequestCancel = (inv) => {
    Modal.confirm({
      title: 'Yêu cầu hủy hóa đơn',
      content: `Bạn có chắc muốn hủy hóa đơn ${inv.invoiceCode} (${fmt(inv.totalAmount)})?`,
      okText: 'Xác nhận hủy',
      okButtonProps: { danger: true },
      cancelText: 'Không',
      onOk: async () => {
        try {
          await invoiceService.cancel(inv.id)
          message.success('Đã hủy hóa đơn')
          await reloadInvoices()
        } catch (err) {
          const serverMsg = err?.response?.data?.message
          message.error(serverMsg || 'Không thể hủy hóa đơn')
        }
      },
    })
  }

  // Bệnh nhân không thấy hóa đơn ĐÃ HỦY — đó là hóa đơn lễ tân bỏ đi, không liên quan.
  const visibleInvoices = invoices.filter(i => i.status !== 'CANCELLED')

  const filtered = visibleInvoices.filter(inv => {
    if (activeTab === TAB_ALL) return true
    if (activeTab === TAB_UNPAID) return inv.paymentStatus !== 'PAID'
    return inv.status === activeTab
  })

  const totalPaid = visibleInvoices
    .filter(i => i.paymentStatus === 'PAID')
    .reduce((s, i) => s + (i.totalAmount ?? 0), 0)

  /**
   * Opens the detail modal, loading the invoice with its charge lines.
   * @param {Object} inv the invoice row that was clicked
   */
  const handleOpenDetail = async (inv) => {
    setDetailLoading(true)
    setDetail({ ...inv, items: [] })
    try {
      const res = await invoiceService.getById(inv.id)
      setDetail(res.data ?? inv)
    } catch {
      message.error('Không thể tải chi tiết hóa đơn')
    } finally {
      setDetailLoading(false)
    }
  }

  /**
   * Downloads the invoice PDF (UC-24 ALT-2 "Patient downloads from Portal").
   * @param {Object} inv the invoice to download
   */
  const handleDownloadPdf = async (inv) => {
    setPdfLoading(inv.id)
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
    } catch {
      message.error('Không thể tải PDF hóa đơn')
    } finally {
      setPdfLoading(null)
    }
  }

  // Gửi vào chính email của bệnh nhân (backend gửi tới patient.email gắn với
  // hóa đơn — cũng là email tài khoản đang đăng nhập).
  /**
   * Requests the billing email for an invoice (UC-24).
   *
   * The backend chooses the document from the payment state: a paid invoice
   * arrives as a receipt with the PDF attached, an unpaid one as a payment
   * reminder with the transfer details.
   *
   * @param {Object} inv the invoice to send
   *
   * Validate: the backend rejects the request when the patient has no email
   * on file; delivery itself completes asynchronously, so success here means
   * "queued", not "delivered" (UC-24 E1 covers the failure path).
   */
  const handleSendEmail = async (inv) => {
    setEmailSending(inv.id)
    try {
      await invoiceService.sendEmail(inv.id)
      message.success(inv.paymentStatus === 'PAID'
        ? 'Đã gửi hóa đơn (kèm PDF) vào email của bạn'
        : 'Đã gửi thông tin thanh toán vào email của bạn')
    } catch (err) {
      const isTimeout = err?.code === 'ECONNABORTED' || err?.message?.includes('timeout')
      const serverMsg = err?.response?.data?.message
      message.error(
        serverMsg || (isTimeout ? 'Hết thời gian chờ — máy chủ email không phản hồi' : 'Không thể gửi email, vui lòng thử lại')
      )
    } finally {
      setEmailSending(null)
    }
  }

  const tabs = [
    { key: TAB_ALL,    label: 'Tất cả',        count: visibleInvoices.length },
    { key: TAB_UNPAID, label: 'Chưa thanh toán', count: visibleInvoices.filter(i => i.paymentStatus !== 'PAID').length },
    { key: TAB_ISSUED, label: 'Đã phát hành',  count: visibleInvoices.filter(i => i.status === 'ISSUED').length },
  ]

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', paddingBottom: 48 }}>

      {/* ── Header ── */}
      <div style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', padding: '32px 24px 24px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <h1 style={{ color: '#fff', fontSize: 24, fontWeight: 700, margin: 0 }}>Hóa đơn của tôi</h1>
          <p style={{ color: 'rgba(255,255,255,0.8)', margin: '6px 0 0', fontSize: 14 }}>
            Xem lại lịch sử thanh toán và tải hóa đơn
          </p>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 24px' }}>

        {/* ── Stats ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, margin: '24px 0' }}>
          {[
            { label: 'Tổng hóa đơn',     value: visibleInvoices.length, unit: 'hóa đơn', color: '#6366f1' },
            { label: 'Đã thanh toán',     value: visibleInvoices.filter(i => i.paymentStatus === 'PAID').length, unit: 'hóa đơn', color: '#16a34a' },
            { label: 'Tổng tiền đã trả',  value: fmt(totalPaid), unit: null, color: '#0ea5e9' },
          ].map(s => (
            <div key={s.label} style={{
              background: '#fff', borderRadius: 12, padding: '16px 20px',
              boxShadow: '0 1px 4px rgba(0,0,0,0.07)', borderLeft: `4px solid ${s.color}`,
            }}>
              <p style={{ margin: 0, fontSize: 12, color: '#64748b', fontWeight: 500 }}>{s.label}</p>
              <p style={{ margin: '6px 0 0', fontSize: 22, fontWeight: 700, color: s.color }}>
                {s.value}{s.unit ? <span style={{ fontSize: 13, fontWeight: 400, color: '#94a3b8', marginLeft: 4 }}>{s.unit}</span> : null}
              </p>
            </div>
          ))}
        </div>

        {/* ── Tabs ── */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {tabs.map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key)} style={{
              padding: '7px 16px', borderRadius: 20, fontSize: 13, fontWeight: 600,
              cursor: 'pointer', border: 'none', transition: 'all 0.15s',
              background: activeTab === t.key ? '#6366f1' : '#fff',
              color: activeTab === t.key ? '#fff' : '#64748b',
              boxShadow: activeTab === t.key ? '0 2px 8px rgba(99,102,241,0.3)' : '0 1px 3px rgba(0,0,0,0.08)',
            }}>
              {t.label}
              <span style={{
                marginLeft: 6, padding: '1px 7px', borderRadius: 10, fontSize: 11,
                background: activeTab === t.key ? 'rgba(255,255,255,0.3)' : '#f1f5f9',
                color: activeTab === t.key ? '#fff' : '#6b7280',
              }}>{t.count}</span>
            </button>
          ))}
        </div>

        {/* ── List ── */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div>
        ) : filtered.length === 0 ? (
          <div style={{ background: '#fff', borderRadius: 12, padding: 48, textAlign: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
            <Empty description="Chưa có hóa đơn nào" />
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {filtered.map(inv => (
              <div key={inv.id} style={{
                background: '#fff', borderRadius: 12, padding: '18px 20px',
                boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
                borderLeft: `4px solid ${(INVOICE_STATUS[inv.status] || {}).color || '#e2e8f0'}`,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>

                  {/* Left: info */}
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 700, fontSize: 15, color: '#6366f1' }}>{inv.invoiceCode}</span>
                      <StatusBadge map={INVOICE_STATUS} value={inv.status} />
                      {inv.paymentStatus === 'UNPAID' && inv.paymentMethod === 'CASH'
                        ? <StatusBadge map={{ CASH_PENDING: { label: 'Chờ nhận tiền', color: '#d97706', bg: '#fef3c7' } }} value="CASH_PENDING" />
                        : <StatusBadge map={PAYMENT_STATUS} value={inv.paymentStatus} />}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '6px 24px', marginTop: 10 }}>
                      <InfoItem label="Ngày" value={fmtDate(inv.createdAt)} />
                      <InfoItem label="Giờ khám" value={inv.timeSlot || '—'} />
                      <InfoItem label="Bác sĩ" value={inv.doctorName || '—'} />
                      <InfoItem label="Dịch vụ" value={inv.serviceName || '—'} />
                      <InfoItem label="Thanh toán" value={PAYMENT_METHOD[inv.paymentMethod] || inv.paymentMethod || '—'} />
                    </div>
                  </div>

                  {/* Right: amount + actions */}
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <p style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#0f172a' }}>{fmt(inv.totalAmount)}</p>
                    {inv.paidAt && (
                      <p style={{ margin: '2px 0 0', fontSize: 11, color: '#94a3b8' }}>
                        Đã thanh toán {fmtDate(inv.paidAt)}
                      </p>
                    )}
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 10, flexWrap: 'wrap' }}>
                      {inv.paymentStatus !== 'PAID' && inv.status !== 'CANCELLED' && (
                        <ActionBtn onClick={() => { setPollTimedOut(false); setPayProgress(null); setPayModal(inv) }} color="#10b981">
                          Thanh toán QR
                        </ActionBtn>
                      )}
                      {inv.paymentStatus !== 'PAID' && inv.status !== 'CANCELLED' && (
                        <ActionBtn onClick={() => handleRequestCancel(inv)} color="#dc2626">
                          Yêu cầu hủy
                        </ActionBtn>
                      )}
                      <ActionBtn onClick={() => handleOpenDetail(inv)} color="#6366f1">
                        Chi tiết
                      </ActionBtn>
                      {inv.status === 'ISSUED' && (
                        <ActionBtn
                          onClick={() => handleDownloadPdf(inv)}
                          loading={pdfLoading === inv.id}
                          color="#0ea5e9"
                        >
                          Tải PDF
                        </ActionBtn>
                      )}
                      {inv.status === 'ISSUED' && (
                        <ActionBtn
                          onClick={() => handleSendEmail(inv)}
                          loading={emailSending === inv.id}
                          color="#16a34a"
                        >
                          Gửi hóa đơn PDF vào email
                        </ActionBtn>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Detail Modal ── */}
      <Modal
        open={!!detail}
        onCancel={() => setDetail(null)}
        footer={detail && detail.status === 'ISSUED' ? (
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button
              onClick={() => handleSendEmail(detail)}
              disabled={emailSending === detail?.id}
              style={{
                padding: '8px 20px', borderRadius: 8, border: '1px solid #16a34a', cursor: 'pointer',
                background: '#fff', color: '#16a34a', fontWeight: 600, fontSize: 13,
              }}>
              {emailSending === detail?.id ? 'Đang gửi...' : 'Gửi hóa đơn PDF vào email'}
            </button>
            <button
              onClick={() => handleDownloadPdf(detail)}
              disabled={pdfLoading === detail?.id}
              style={{
                padding: '8px 20px', borderRadius: 8, border: 'none', cursor: 'pointer',
                background: '#0ea5e9', color: '#fff', fontWeight: 600, fontSize: 13,
              }}>
              {pdfLoading === detail?.id ? 'Đang tải...' : 'Tải PDF'}
            </button>
          </div>
        ) : null}
        title={
          <span style={{ fontSize: 16, fontWeight: 700, color: '#1e293b' }}>
            Chi tiết hóa đơn {detail?.invoiceCode}
          </span>
        }
        width={620}
      >
        {detailLoading ? (
          <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
        ) : detail && (
          <div>
            {/* Header info */}
            <div style={{
              background: '#f8fafc', borderRadius: 8, padding: '14px 16px',
              display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 24px', marginBottom: 20,
            }}>
              <InfoItem label="Ngày tạo"    value={fmtDate(detail.createdAt)} />
              <InfoItem label="Giờ khám"    value={detail.timeSlot || '—'} />
              <InfoItem label="Bác sĩ"      value={detail.doctorName || '—'} />
              <InfoItem label="Dịch vụ"     value={detail.serviceName || '—'} />
              <InfoItem label="Thanh toán"  value={PAYMENT_METHOD[detail.paymentMethod] || detail.paymentMethod || '—'} />
              <InfoItem label="Trạng thái"  value={<StatusBadge map={INVOICE_STATUS} value={detail.status} />} />
            </div>

            {/* Items table */}
            {detail.items && detail.items.length > 0 ? (
              <div>
                <p style={{ fontWeight: 600, fontSize: 13, color: '#374151', marginBottom: 8 }}>Chi tiết khoản phí</p>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: '#f1f5f9' }}>
                      {['Mô tả', 'SL', 'Đơn giá', 'Thành tiền'].map(h => (
                        <th key={h} style={{ padding: '8px 10px', textAlign: h === 'Mô tả' ? 'left' : 'right', color: '#475569', fontWeight: 600 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {detail.items.map((item, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '8px 10px', color: '#1e293b' }}>
                          <span style={{ fontSize: 11, color: '#94a3b8', marginRight: 6 }}>
                            {item.itemType === 'SERVICE' ? 'DV' : item.itemType === 'LAB' ? 'XN' : item.itemType === 'MEDICINE' ? 'TH' : item.itemType === 'GLASSES' ? 'KN' : 'KH'}
                          </span>
                          {item.description}
                        </td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', color: '#374151' }}>{item.quantity}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', color: '#374151' }}>{fmt(item.unitPrice)}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 600, color: '#1e293b' }}>{fmt(item.subtotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    {detail.discountAmount > 0 && (
                      <>
                        <tr>
                          <td colSpan={3} style={{ padding: '6px 10px', color: '#64748b', textAlign: 'right' }}>Tạm tính</td>
                          <td style={{ padding: '6px 10px', color: '#374151', textAlign: 'right' }}>{fmt(detail.subTotal)}</td>
                        </tr>
                        <tr>
                          <td colSpan={3} style={{ padding: '6px 10px', color: '#dc2626', textAlign: 'right' }}>Giảm giá</td>
                          <td style={{ padding: '6px 10px', color: '#dc2626', textAlign: 'right' }}>−{fmt(detail.discountAmount)}</td>
                        </tr>
                      </>
                    )}
                    <tr style={{ background: '#f8fafc' }}>
                      <td colSpan={3} style={{ padding: '10px 10px', fontWeight: 700, color: '#374151', textAlign: 'right' }}>Tổng cộng</td>
                      <td style={{ padding: '10px 10px', fontWeight: 700, fontSize: 16, color: '#6366f1', textAlign: 'right' }}>{fmt(detail.totalAmount)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: 24, color: '#94a3b8', fontSize: 13 }}>
                Không có chi tiết khoản phí
              </div>
            )}

            {detail.notes && (
              <div style={{ marginTop: 16, padding: '10px 14px', background: '#fefce8', borderRadius: 8, fontSize: 13, color: '#92400e' }}>
                <strong>Ghi chú:</strong> {detail.notes}
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* ── Modal thanh toán QR (UC-22) ── */}
      <Modal
        open={!!payModal}
        onCancel={() => setPayModal(null)}
        footer={null}
        title={
          <span style={{ fontSize: 16, fontWeight: 700, color: '#1e293b' }}>
            Thanh toán hóa đơn {payModal?.invoiceCode}
          </span>
        }
        width={640}
      >
        {payModal && (
          <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            {/* Trái: mã QR */}
            <img
              src={buildVietQrUrl(payModal.totalAmount, payModal.invoiceCode)}
              alt="VietQR"
              style={{ width: 260, height: 260, borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', flexShrink: 0 }}
            />

            {/* Phải: thông tin chuyển khoản + trạng thái chờ */}
            <div style={{ flex: 1, minWidth: 220 }}>
              <div style={{
                fontSize: 13, color: '#374151',
                background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '12px 14px', lineHeight: 1.9,
              }}>
                <div><span style={{ color: '#64748b' }}>Ngân hàng (mã):</span> <strong>{BANK_ID}</strong></div>
                <div><span style={{ color: '#64748b' }}>Số tài khoản:</span> <strong>{BANK_ACCOUNT}</strong></div>
                <div><span style={{ color: '#64748b' }}>Chủ tài khoản:</span> <strong>{BANK_NAME}</strong></div>
                <div><span style={{ color: '#64748b' }}>Số tiền:</span> <strong style={{ color: '#10b981' }}>{fmt(payModal.totalAmount)}</strong></div>
                <div><span style={{ color: '#64748b' }}>Nội dung:</span> <strong>{buildTransferContent(payModal.invoiceCode)}</strong></div>
              </div>

              {/* UC-23 E2: thiếu dòng này bệnh nhân dễ chuyển lại nguyên tổng lần nữa
                  rồi phải đòi hoàn. */}
              {payProgress?.paidAmount > 0 && payProgress?.remainingAmount > 0 && (
                <div style={{
                  marginTop: 10, background: '#fffbeb', border: '1px solid #fde68a',
                  borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#92400e',
                }}>
                  Đã nhận <strong>{fmt(payProgress.paidAmount)}</strong> — bạn chỉ cần chuyển thêm{' '}
                  <strong>{fmt(payProgress.remainingAmount)}</strong>, không phải chuyển lại toàn bộ.
                </div>
              )}
              {pollTimedOut ? (
                // Nói rõ hóa đơn CHƯA bị hủy để bệnh nhân không tưởng mất tiền.
                <div style={{ marginTop: 12 }}>
                  <div style={{ color: '#b45309', fontSize: 13 }}>
                    Đã dừng chờ tự động sau {POLL_TIMEOUT_MS / 60000} phút. Hóa đơn vẫn còn hiệu lực —
                    nếu bạn đã chuyển khoản, tiền về sẽ được ghi nhận bình thường.
                  </div>
                  <button onClick={handleCheckPaymentNow} disabled={checkingNow} style={{
                    marginTop: 10, padding: '7px 16px', borderRadius: 6, border: '1px solid #10b981',
                    background: '#fff', color: '#10b981', fontWeight: 600, fontSize: 13,
                    cursor: checkingNow ? 'not-allowed' : 'pointer',
                  }}>
                    {checkingNow ? 'Đang kiểm tra…' : 'Kiểm tra lại ngay'}
                  </button>
                </div>
              ) : (
                <>
                  <div style={{
                    marginTop: 12, display: 'flex', alignItems: 'center', gap: 8,
                    color: '#15803d', fontSize: 13,
                  }}>
                    <Spin size="small" />
                    Đang chờ xác nhận thanh toán...
                  </div>
                  <p style={{ marginTop: 8, fontSize: 12, color: '#94a3b8' }}>
                    Quét mã bằng app ngân hàng và giữ nguyên nội dung chuyển khoản. Hóa đơn sẽ tự
                    chuyển sang "Đã thanh toán" ngay khi tiền vào tài khoản.
                  </p>
                </>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

function InfoItem({ label, value }) {
  return (
    <div>
      <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 500 }}>{label}</span>
      <div style={{ fontSize: 13, color: '#1e293b', fontWeight: 500, marginTop: 2 }}>{value}</div>
    </div>
  )
}

function ActionBtn({ onClick, loading, color, children }) {
  return (
    <button onClick={onClick} disabled={loading} style={{
      padding: '5px 14px', borderRadius: 6, border: `1px solid ${color}`,
      background: '#fff', color: color, fontSize: 12, fontWeight: 600,
      cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1,
    }}>
      {loading ? '...' : children}
    </button>
  )
}
