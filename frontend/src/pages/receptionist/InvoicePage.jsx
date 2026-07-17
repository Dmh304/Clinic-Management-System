/**
 * InvoicePage — Trang thu phí & phát hành hóa đơn cho Lễ tân
 * ThangNBHE201024 - HE187030
 *
 * Luồng nghiệp vụ:
 *  1. Lễ tân chọn lịch hẹn COMPLETED chưa có hóa đơn từ tab "Tạo hóa đơn"
 *  2. Nhập các khoản phí (dịch vụ, xét nghiệm, thuốc, kính...)
 *  3. Chọn phương thức thanh toán: Tiền mặt hoặc QR Code (VietQR)
 *     - Tiền mặt: lễ tân cầm tiền → tạo hóa đơn (DRAFT) và phát hành ngay (ISSUED)
 *     - QR Code: tạo hóa đơn nháp trước để có mã INV-yyyyMMdd-XXXX → sinh mã QR mang
 *       chính mã đó làm nội dung chuyển khoản → chờ ngân hàng xác nhận. Hóa đơn CHỈ
 *       chuyển sang PAID khi cổng thanh toán bắn webhook báo tiền đã vào tài khoản,
 *       lễ tân không tự xác nhận thay ngân hàng.
 *  4. Tab "Lịch sử hóa đơn": xem chi tiết, in hoặc gửi email hóa đơn
 *
 * State quản lý qua Redux (invoiceSlice):
 *  - list: danh sách hóa đơn, loading: trạng thái tải
 *
 * Tích hợp:
 *  - VietQR Image API: sinh mã QR chuyển khoản theo thông tin ngân hàng từ .env
 *  - Payment webhook (backend, UC-22): cổng thanh toán báo tiền về → tự gạch nợ;
 *    trang này polling GET /payments/invoice/{id}/status mỗi 3 giây để cập nhật UI
 *  - JavaMailSender (backend): gửi email HTML hóa đơn đến bệnh nhân
 *  - window.print(): in hóa đơn trực tiếp từ trình duyệt
 */

import { useEffect, useState, useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useLocation } from 'react-router-dom'
import {
  Table, Tag, Button, Space, Typography, Card, message,
  Modal, Form, Input, Select, InputNumber, Tabs, Divider,
  Descriptions, Popconfirm, Row, Col, Statistic, Spin, Tooltip, AutoComplete,
} from 'antd'
import {
  PlusOutlined, DeleteOutlined, ReloadOutlined,
  CheckCircleOutlined, SearchOutlined, FileTextOutlined,
  DollarOutlined, PrinterOutlined, MailOutlined, QrcodeOutlined,
} from '@ant-design/icons'
import {
  fetchAllInvoices, createInvoice, issueInvoice, cancelInvoice,
} from '../../store/slices/invoiceSlice'
import { appointmentService } from '../../services/appointmentService'
import { invoiceService } from '../../services/invoiceService'
import { paymentService } from '../../services/paymentService'
import { clinicServiceService } from '../../services/clinicServiceService'
import { medicineService } from '../../services/medicineService'

const { Title, Text } = Typography

// ─── Cấu hình ngân hàng phòng khám (ThangNBHE201024) ─────────────────────────
// Giá trị lấy từ biến môi trường .env; fallback về Vietcombank mẫu nếu chưa cấu hình
const BANK_ID      = import.meta.env.VITE_BANK_ID      || '970436'   // Vietcombank
const BANK_ACCOUNT = import.meta.env.VITE_BANK_ACCOUNT || '1234567890'
const BANK_NAME    = import.meta.env.VITE_BANK_NAME    || 'PHONG KHAM MAT'

// Chu kỳ hỏi backend xem tiền đã về chưa, tính bằng ms
const POLL_INTERVAL_MS = 3000

// Ngưỡng dừng polling nếu bệnh nhân không chuyển khoản (10 phút).
// Đây CHỈ là giới hạn phía giao diện để trình duyệt không hỏi backend vô hạn —
// không phải hạn thanh toán. Bệnh nhân chuyển tiền muộn hơn thì webhook vẫn gạch nợ
// bình thường, lễ tân mở lại hóa đơn sẽ thấy đã thanh toán.
const POLL_TIMEOUT_MS = 10 * 60 * 1000

// Nội dung chuyển khoản BẮT BUỘC chứa mã hóa đơn: webhook của cổng thanh toán dò
// đúng chuỗi này trong nội dung để biết tiền vào là của hóa đơn nào.
const buildTransferContent = (invoiceCode) => `Thanh toan ${invoiceCode}`

// Tạo URL mã QR VietQR theo chuẩn Napas — bệnh nhân quét bằng app ngân hàng để chuyển khoản.
// Số tài khoản luôn là tài khoản phòng khám trong .env; addInfo là mã hóa đơn để đối soát tự động.
const buildVietQrUrl = (amount, invoiceCode) =>
  `https://img.vietqr.io/image/${BANK_ID}-${BANK_ACCOUNT}-compact2.png` +
  `?amount=${Math.round(amount)}` +
  `&addInfo=${encodeURIComponent(buildTransferContent(invoiceCode))}` +
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
  UNPAID:          { color: 'orange', label: 'Chưa thanh toán' },
  // Đã sinh mã QR, đang chờ cổng thanh toán báo tiền về (ThangNBHE201024)
  PENDING_PAYMENT: { color: 'blue',   label: 'Chờ chuyển khoản' },
  PAID:            { color: 'green',  label: 'Đã thanh toán' },
  PAYMENT_FAILED:  { color: 'red',    label: 'Thất bại' },
}

const fmt = (amount) =>
  amount != null
    ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount)
    : '—'

// ─── Main component ───────────────────────────────────────────────────────────

export default function InvoicePage() {
  const dispatch = useDispatch()
  const location = useLocation()
  const { list: invoices, loading: invoiceLoading } = useSelector((s) => s.invoice)

  const [allAppointments, setAllAppointments] = useState([])
  const [apptLoading, setApptLoading]         = useState(true)
  const [apptSearch, setApptSearch]           = useState('')
  const [invoiceSearch, setInvoiceSearch]     = useState('')

  // Modal tạo hóa đơn
  const [createModal, setCreateModal] = useState({ open: false, appointment: null })
  const [form]                        = Form.useForm()
  const [items, setItems]             = useState([])
  const [discount, setDiscount]       = useState(0)
  const [submitting, setSubmitting]   = useState(false)
  const [qrLoading, setQrLoading]     = useState(false)
  const [qrKey, setQrKey]             = useState(0)

  // ── Trạng thái luồng thanh toán QR tự động (ThangNBHE201024) ────────────────
  // pendingInvoice: hóa đơn nháp đã tạo, đang chờ bệnh nhân chuyển khoản.
  // Mã QR chỉ được sinh SAU khi có hóa đơn, vì nội dung chuyển khoản phải chứa
  // mã hóa đơn thì webhook của cổng mới biết tiền vào là của hóa đơn nào.
  const [pendingInvoice, setPendingInvoice] = useState(null)
  // Đã quá 10 phút không thấy tiền về → ngừng hỏi backend, chờ lễ tân thao tác tiếp
  const [pollTimedOut, setPollTimedOut]     = useState(false)
  const [checkingNow, setCheckingNow]       = useState(false)

  const paymentMethod = Form.useWatch('paymentMethod', form)

  // Autocomplete: dịch vụ khám / xét nghiệm (CLINICAL) và danh mục thuốc
  const [availableServices, setAvailableServices] = useState([])
  const [availableMedicines, setAvailableMedicines] = useState([])

  // Modal xem chi tiết
  const [detailModal, setDetailModal] = useState({ open: false, invoice: null })
  const [emailSending, setEmailSending] = useState(false)
  const [printLoading, setPrintLoading] = useState(false)

  // ─── Load ────────────────────────────────────────────────────────────────────

  const refreshAppointments = useCallback(async () => {
    setApptLoading(true)
    try {
      const res = await appointmentService.getAllAppointments()
      setAllAppointments(res.data ?? [])
    } catch {
      message.error('Không thể tải danh sách lịch hẹn')
    } finally {
      setApptLoading(false)
    }
  }, [])

  useEffect(() => {
    let isMounted = true

    const loadInitialData = async () => {
      dispatch(fetchAllInvoices())

      const [appointmentsResult, servicesResult, medicinesResult] = await Promise.allSettled([
        appointmentService.getAllAppointments(),
        clinicServiceService.getAllServices(),
        medicineService.getAll(),
      ])

      if (!isMounted) return

      if (appointmentsResult.status === 'fulfilled') {
        const appointments = appointmentsResult.value?.data ?? []
        setAllAppointments(appointments)

        // Nếu navigate từ AppointmentManagementPage với appointmentId, tự động mở modal
        const appointmentId = location.state?.appointmentId
        if (appointmentId) {
          const targetAppt = appointments.find((a) => a.id === appointmentId)
          if (targetAppt && targetAppt.status === 'COMPLETED') {
            // Delay một chút để đảm bảo state đã được cập nhật
            setTimeout(() => {
              if (isMounted) {
                const prefill = targetAppt.serviceName
                  ? [{ itemType: 'SERVICE', description: targetAppt.serviceName, quantity: 1, unitPrice: targetAppt.servicePrice ?? 0 }]
                  : [{ itemType: 'SERVICE', description: '', quantity: 1, unitPrice: 0 }]
                setItems(prefill)
                form.setFieldsValue({ paymentMethod: 'CASH', paymentReference: '', notes: '' })
                setCreateModal({ open: true, appointment: targetAppt })
              }
            }, 300)
          }
        }
      } else {
        message.error('Không thể tải danh sách lịch hẹn')
      }

      if (servicesResult.status === 'fulfilled') {
        setAvailableServices(servicesResult.value?.data ?? [])
      }

      if (medicinesResult.status === 'fulfilled') {
        setAvailableMedicines(medicinesResult.value?.data ?? [])
      }

      setApptLoading(false)
    }

    void loadInitialData()

    return () => {
      isMounted = false
    }
  }, [dispatch, location.state?.appointmentId, form])

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
    setDiscount(0)
    form.setFieldsValue({ paymentMethod: 'CASH', paymentReference: '', notes: '' })
    setCreateModal({ open: true, appointment: appt })
  }

  const handleCloseCreate = () => {
    setCreateModal({ open: false, appointment: null })
    form.resetFields()
    setItems([])
    setDiscount(0)
    // Dừng polling trạng thái thanh toán khi đóng modal (ThangNBHE201024).
    // Hóa đơn nháp chưa thanh toán vẫn nằm ở tab Lịch sử để lễ tân xử lý tiếp.
    setPendingInvoice(null)
    setPollTimedOut(false)
  }

  // ─── Item editing ─────────────────────────────────────────────────────────────

  const addItem    = () => setItems((p) => [...p, { itemType: 'OTHER', description: '', quantity: 1, unitPrice: 0 }])
  const removeItem = (idx) => setItems((p) => p.filter((_, i) => i !== idx))
  const updateItem = (idx, field, val) =>
    setItems((p) => p.map((it, i) => (i === idx ? { ...it, [field]: val } : it)))

  // Danh mục gợi ý theo loại khoản phí, chuẩn hoá về { name, price }:
  //  - SERVICE : mọi dịch vụ | LAB: dịch vụ CLINICAL (khám/cận lâm sàng)
  //  - MEDICINE: danh mục thuốc | GLASSES/OTHER: nhập tay (trả null)
  const catalogForType = (type) => {
    if (type === 'MEDICINE')
      return availableMedicines.map((m) => ({ name: m.name, price: Number(m.unitPrice) || 0 }))
    if (type === 'LAB')
      return availableServices
        .filter((s) => s.serviceType === 'CLINICAL')
        .map((s) => ({ name: s.serviceName, price: Number(s.price) || 0 }))
    if (type === 'SERVICE')
      return availableServices.map((s) => ({ name: s.serviceName, price: Number(s.price) || 0 }))
    return null
  }

  const handleAddServiceFromInfo = () => {
    const appt = createModal.appointment
    if (!appt?.serviceName) return
    const alreadyExists = items.some(
      (it) => it.itemType === 'SERVICE' && it.description === appt.serviceName
    )
    if (alreadyExists) {
      message.warning('Dịch vụ khám này đã có trong danh sách khoản phí')
      return
    }
    setItems((prev) => [
      ...prev,
      { itemType: 'SERVICE', description: appt.serviceName, quantity: 1, unitPrice: appt.servicePrice ?? 0 },
    ])
    message.success('Đã thêm dịch vụ khám vào khoản phí')
  }

  const calcSubtotal = (it) => (it.quantity ?? 1) * (it.unitPrice ?? 0)
  const totalAmount  = items.reduce((s, it) => s + calcSubtotal(it), 0)
  // BR-11: Tổng thanh toán = tạm tính − giảm giá (không âm)
  const grandTotal   = Math.max(0, totalAmount - (discount || 0))

  // ─── Submit ───────────────────────────────────────────────────────────────────

  // Kiểm tra hợp lệ dùng chung cho cả hai luồng tiền mặt và QR.
  // Trả về values của form nếu hợp lệ, null nếu có lỗi (đã hiện cảnh báo).
  const validateInvoiceForm = async () => {
    let values
    try { values = await form.validateFields() } catch { return null }

    if (!items.length) { message.warning('Vui lòng thêm ít nhất một khoản phí'); return null }
    if (items.some((it) => !it.description?.trim())) {
      message.warning('Vui lòng nhập mô tả cho tất cả các khoản phí')
      return null
    }
    const descs = items.map((it) => it.description.trim().toLowerCase())
    if (descs.length !== new Set(descs).size) {
      message.warning('Có khoản phí bị trùng nhau, vui lòng kiểm tra lại')
      return null
    }
    if (items.some((it) => (it.unitPrice ?? 0) <= 0)) {
      message.warning('Đơn giá phải lớn hơn 0 cho tất cả các khoản phí')
      return null
    }
    if ((discount || 0) < 0 || (discount || 0) > totalAmount) {
      message.warning('Số tiền giảm giá phải từ 0 đến tổng tạm tính')
      return null
    }
    return values
  }

  const buildInvoicePayload = (values) => ({
    appointmentId: createModal.appointment.id,
    paymentMethod: values.paymentMethod,
    paymentReference: values.paymentReference || null,
    discountAmount: discount || 0,
    notes: values.notes || null,
    items: items.map((it) => ({
      itemType: it.itemType,
      description: it.description,
      quantity: it.quantity ?? 1,
      unitPrice: it.unitPrice ?? 0,
    })),
  })

  // UC-22/UC-23 (BP-4): thu tiền xong thì gửi hóa đơn điện tử vào email bệnh nhân.
  // Lỗi gửi email (bệnh nhân chưa có email, SMTP timeout...) chỉ cảnh báo,
  // không làm hỏng luồng thu phí đã hoàn tất.
  const sendInvoiceEmailQuietly = async (invoiceId) => {
    try {
      await invoiceService.sendEmail(invoiceId)
      message.success('Đã gửi hóa đơn vào email bệnh nhân')
    } catch (err) {
      const isTimeout = err?.code === 'ECONNABORTED' || err?.message?.includes('timeout')
      const serverMsg = err?.response?.data?.message
      message.warning(
        serverMsg
          || (isTimeout ? 'Hóa đơn đã phát hành nhưng gửi email bị quá thời gian chờ' : 'Hóa đơn đã phát hành nhưng chưa gửi được email cho bệnh nhân')
      )
    }
  }

  // Luồng TIỀN MẶT: lễ tân cầm tiền trên tay nên tạo và phát hành ngay trong một bước.
  const handleSubmit = async () => {
    const values = await validateInvoiceForm()
    if (!values) return

    setSubmitting(true)
    try {
      const created = await dispatch(createInvoice(buildInvoicePayload(values))).unwrap()

      await dispatch(issueInvoice({
        id: created.id,
        paymentMethod: values.paymentMethod,
        paymentReference: values.paymentReference || null,
      })).unwrap()

      message.success(`Hóa đơn ${created.invoiceCode} đã được phát hành thành công`)
      await sendInvoiceEmailQuietly(created.id)

      handleCloseCreate()
      dispatch(fetchAllInvoices())
      void refreshAppointments()
    } catch (err) {
      message.error(typeof err === 'string' ? err : 'Có lỗi xảy ra, vui lòng thử lại')
    } finally {
      setSubmitting(false)
    }
  }

  // Luồng QR (ThangNBHE201024): KHÔNG phát hành ngay.
  // Chỉ tạo hóa đơn nháp để có mã hóa đơn, rồi sinh mã QR mang đúng mã đó làm nội dung
  // chuyển khoản. Hóa đơn chỉ chuyển sang PAID khi cổng thanh toán bắn webhook báo
  // tiền đã thực sự vào tài khoản phòng khám — lễ tân không tự xác nhận thay ngân hàng.
  const handleCreateQrInvoice = async () => {
    const values = await validateInvoiceForm()
    if (!values) return

    setSubmitting(true)
    try {
      const created = await dispatch(createInvoice(buildInvoicePayload(values))).unwrap()
      setPendingInvoice(created)
      setPollTimedOut(false)
      setQrLoading(true)
      dispatch(fetchAllInvoices())
      message.success(`Đã tạo hóa đơn ${created.invoiceCode}. Mời bệnh nhân quét mã QR.`)
    } catch (err) {
      message.error(typeof err === 'string' ? err : 'Không thể tạo hóa đơn, vui lòng thử lại')
    } finally {
      setSubmitting(false)
    }
  }

  // Xử lý chung khi phát hiện hóa đơn đã được thanh toán, dùng cho cả polling tự động
  // lẫn nút "Kiểm tra lại" thủ công.
  const onPaymentConfirmed = async (invoice) => {
    message.success(`Đã nhận thanh toán cho hóa đơn ${invoice.invoiceCode}`)
    await sendInvoiceEmailQuietly(invoice.id)
    handleCloseCreate()
    dispatch(fetchAllInvoices())
    void refreshAppointments()
  }

  // Polling: hỏi backend mỗi 3 giây xem cổng thanh toán đã báo tiền về chưa.
  // Tự dừng sau POLL_TIMEOUT_MS để không hỏi vô hạn khi bệnh nhân bỏ đi giữa chừng;
  // dọn interval khi đóng modal.
  useEffect(() => {
    if (!pendingInvoice || pollTimedOut) return

    let cancelled = false
    const deadline = Date.now() + POLL_TIMEOUT_MS

    const checkStatus = async () => {
      if (Date.now() > deadline) {
        // Hết giờ chờ: chỉ dừng polling. Hóa đơn vẫn ở PENDING_PAYMENT và webhook
        // vẫn gạch nợ nếu bệnh nhân chuyển khoản muộn — không có tiền nào bị bỏ rơi.
        if (!cancelled) setPollTimedOut(true)
        return
      }
      try {
        const res = await paymentService.getStatus(pendingInvoice.id)
        if (cancelled || !res?.data?.paid) return
        await onPaymentConfirmed(pendingInvoice)
      } catch {
        // Lỗi mạng tạm thời: bỏ qua, vòng polling kế tiếp sẽ thử lại.
      }
    }

    const timer = setInterval(checkStatus, POLL_INTERVAL_MS)
    return () => { cancelled = true; clearInterval(timer) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingInvoice, pollTimedOut, dispatch, refreshAppointments])

  // Kiểm tra thủ công sau khi đã hết giờ chờ tự động
  const handleCheckPaymentNow = async () => {
    if (!pendingInvoice) return
    setCheckingNow(true)
    try {
      const res = await paymentService.getStatus(pendingInvoice.id)
      if (res?.data?.paid) {
        await onPaymentConfirmed(pendingInvoice)
      } else {
        message.info('Ngân hàng chưa báo tiền về cho hóa đơn này')
      }
    } catch {
      message.error('Không kiểm tra được trạng thái thanh toán')
    } finally {
      setCheckingNow(false)
    }
  }

  // ─── Cancel invoice ───────────────────────────────────────────────────────────

  const handleCancelInvoice = async (id) => {
    try {
      await dispatch(cancelInvoice(id)).unwrap()
      dispatch(fetchAllInvoices())
      void refreshAppointments()
      message.success('Đã hủy hóa đơn')
    } catch (err) {
      message.error(typeof err === 'string' ? err : 'Không thể hủy hóa đơn')
    }
  }

  // ─── In hóa đơn PDF (ThangNBHE201024) ───────────────────────────────────────
  // Gọi API GET /{id}/pdf để lấy file PDF từ backend, tạo Blob URL rồi mở tab mới.
  // Trình duyệt tự hiển thị PDF viewer và cho phép người dùng in hoặc tải về.
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

  // ─── Gửi hóa đơn điện tử qua email (ThangNBHE201024) ────────────────────────
  // Gọi API POST /{id}/send-email, backend dùng JavaMailSender gửi HTML email đến bệnh nhân.
  // Kiểm tra patientEmail trước khi gọi — nếu không có email thì hiện cảnh báo.
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
    {
      title: 'Ngày khám', dataIndex: 'appointmentTime', key: 'appointmentTime', width: 120,
      render: (t) => t ? new Date(t).toLocaleDateString('vi-VN') : '—',
      sorter: (a, b) => new Date(a.appointmentTime) - new Date(b.appointmentTime),
      defaultSortOrder: 'descend',
    },
    { title: 'Giờ khám', dataIndex: 'timeSlot', key: 'timeSlot', width: 90 },
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
                    onClick={() => { void refreshAppointments(); dispatch(fetchAllInvoices()) }}
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
          <Button key="back" onClick={handleCloseCreate}>
            {pendingInvoice ? 'Đóng' : 'Hủy bỏ'}
          </Button>,
          // Luồng QR: nút tạo hóa đơn + sinh mã QR. Sau khi có mã QR thì ẩn nút đi,
          // vì việc xác nhận thanh toán do cổng ngân hàng quyết định chứ không phải lễ tân.
          paymentMethod === 'VIET_QR'
            ? (!pendingInvoice && (
              <Button
                key="qr"
                type="primary"
                icon={<QrcodeOutlined />}
                loading={submitting}
                onClick={handleCreateQrInvoice}
                style={{ backgroundColor: '#10b981', borderColor: '#10b981' }}
              >
                Tạo mã QR & chờ chuyển khoản
              </Button>
            ))
            : (
              <Button
                key="submit"
                type="primary"
                icon={<CheckCircleOutlined />}
                loading={submitting}
                onClick={handleSubmit}
                style={{ backgroundColor: '#10b981', borderColor: '#10b981' }}
              >
                Xác nhận thu tiền & Phát hành
              </Button>
            ),
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
                {createModal.appointment.serviceName
                  ? (
                    <Space size={8} align="center">
                      <Text>{createModal.appointment.serviceName}</Text>
                      <Tooltip title="Nhấn để thêm nhanh vào khoản phí">
                        <Tag
                          icon={<PlusOutlined />}
                          color="purple"
                          onClick={handleAddServiceFromInfo}
                          style={{ cursor: 'pointer', userSelect: 'none', marginInlineEnd: 0 }}
                        >
                          Thêm vào phí
                        </Tag>
                      </Tooltip>
                    </Space>
                  )
                  : '—'}
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
                    {(() => {
                      const catalog = catalogForType(item.itemType)
                      // GLASSES / OTHER: không có danh mục → nhập tay
                      if (!catalog) {
                        return (
                          <Input
                            size="small"
                            value={item.description}
                            onChange={(e) => updateItem(idx, 'description', e.target.value)}
                            status={!item.description?.trim() ? 'error' : ''}
                            placeholder={item.itemType === 'GLASSES' ? 'Loại kính, thông số...' : 'Mô tả khoản phí...'}
                          />
                        )
                      }
                      const placeholder =
                        item.itemType === 'MEDICINE' ? 'Nhập hoặc chọn thuốc...' :
                        item.itemType === 'LAB'      ? 'Nhập hoặc chọn xét nghiệm / cận lâm sàng...' :
                                                       'Nhập hoặc chọn dịch vụ khám...'
                      const notFound =
                        item.itemType === 'MEDICINE' ? 'Không tìm thấy thuốc' :
                        item.itemType === 'LAB'      ? 'Không tìm thấy xét nghiệm' :
                                                       'Không tìm thấy dịch vụ'
                      return (
                        <AutoComplete
                          size="small"
                          value={item.description}
                          onChange={(v) => updateItem(idx, 'description', v)}
                          onSelect={(v, option) => {
                            const isDup = items.some((it, i) =>
                              i !== idx && it.description?.trim().toLowerCase() === v.trim().toLowerCase()
                            )
                            if (isDup) {
                              message.warning('Khoản phí này đã có trong danh sách')
                              return
                            }
                            setItems((prev) => prev.map((it, i) =>
                              i === idx ? { ...it, description: v, unitPrice: option.price ?? 0 } : it
                            ))
                          }}
                          options={catalog
                            .filter((c) =>
                              !items.some((it, i) =>
                                i !== idx &&
                                it.description?.trim().toLowerCase() === c.name.trim().toLowerCase()
                              )
                            )
                            .map((c) => ({
                              value: c.name,
                              label: (
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {c.name}
                                  </span>
                                  <Text type="secondary" style={{ fontSize: 11, flexShrink: 0, color: '#10b981', fontWeight: 600 }}>
                                    {fmt(c.price)}
                                  </Text>
                                </div>
                              ),
                              price: c.price ?? 0,
                            }))}
                          filterOption={(input, option) =>
                            option.value.toLowerCase().includes(input.toLowerCase())
                          }
                          placeholder={placeholder}
                          style={{ width: '100%' }}
                          allowClear
                          status={!item.description?.trim() ? 'error' : ''}
                          notFoundContent={<Text type="secondary" style={{ fontSize: 12 }}>{notFound}</Text>}
                        />
                      )
                    })()}
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
                      size="small" min={1}
                      value={item.unitPrice}
                      onChange={(v) => updateItem(idx, 'unitPrice', v)}
                      formatter={(v) => v?.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                      parser={(v) => v?.replace(/,/g, '')}
                      style={{ width: '100%', borderColor: (item.unitPrice ?? 0) <= 0 ? '#ff4d4f' : undefined }}
                      status={(item.unitPrice ?? 0) <= 0 ? 'error' : ''}
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

            {/* Giảm giá (BR-11) + tổng thanh toán */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, marginBottom: 20 }}>
              <div style={{ color: '#64748b', fontSize: 14 }}>
                Tạm tính: <Text strong>{fmt(totalAmount)}</Text>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 14, color: '#64748b' }}>Giảm giá (đ):</span>
                <InputNumber
                  size="small"
                  min={0}
                  max={totalAmount}
                  value={discount}
                  onChange={(v) => setDiscount(v ?? 0)}
                  formatter={(v) => v?.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={(v) => v?.replace(/,/g, '')}
                  style={{ width: 140 }}
                  status={(discount || 0) > totalAmount ? 'error' : ''}
                />
              </div>
              <div>
                <Text style={{ fontSize: 15 }}>Tổng cộng: </Text>
                <Text strong style={{ fontSize: 22, color: '#10b981' }}>{fmt(grandTotal)}</Text>
              </div>
            </div>

            <Form form={form} layout="vertical">
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    label="Phương thức thanh toán"
                    name="paymentMethod"
                    rules={[{ required: true, message: 'Vui lòng chọn phương thức' }]}
                  >
                    {/* Đã sinh mã QR thì khóa lựa chọn: đổi phương thức lúc này sẽ
                        lệch với mã QR bệnh nhân đang quét dở. */}
                    <Select options={PAYMENT_METHOD_OPTS} disabled={!!pendingInvoice} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  {/* Luồng QR không cho nhập tay mã giao dịch: mã tham chiếu do chính
                      ngân hàng gửi về qua webhook, nhập tay sẽ sai lệch khi đối soát. */}
                  {paymentMethod !== 'VIET_QR' && (
                    <Form.Item label="Mã giao dịch ngân hàng (nếu có)" name="paymentReference">
                      <Input placeholder="Mã giao dịch ngân hàng..." />
                    </Form.Item>
                  )}
                </Col>
              </Row>

              {/* ── VietQR block (ThangNBHE201024) ──────────────────────────────
                  Mã QR chỉ hiện SAU khi hóa đơn nháp đã được tạo, vì nội dung chuyển
                  khoản phải mang mã hóa đơn thì webhook cổng thanh toán mới đối soát
                  tự động được. Trước đó chỉ hiện hướng dẫn. */}
              {paymentMethod === 'VIET_QR' && !pendingInvoice && (
                <div style={{
                  padding: '12px 16px',
                  background: '#eff6ff',
                  borderRadius: 12,
                  border: '1px solid #bfdbfe',
                  marginBottom: 16,
                  fontSize: 13,
                  color: '#1e40af',
                }}>
                  Nhấn <Text strong>“Tạo mã QR & chờ chuyển khoản”</Text> để phát sinh mã hóa đơn.
                  Mã QR sẽ mang mã hóa đơn làm nội dung chuyển khoản, giúp hệ thống tự xác nhận
                  khi tiền về tài khoản phòng khám.
                </div>
              )}

              {paymentMethod === 'VIET_QR' && pendingInvoice && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 20,
                  padding: '16px',
                  background: '#f0fdf4',
                  borderRadius: 12,
                  border: '1px solid #bbf7d0',
                  marginBottom: 16,
                }}>
                  {/* QR image */}
                  <Spin spinning={qrLoading}>
                    <img
                      key={qrKey}
                      src={buildVietQrUrl(
                        pendingInvoice.totalAmount ?? grandTotal,
                        pendingInvoice.invoiceCode
                      )}
                      alt="VietQR"
                      onLoad={() => setQrLoading(false)}
                      onError={() => setQrLoading(false)}
                      style={{ width: 300, height: 300, borderRadius: 8, boxShadow: '0 2px 8px #0001', display: 'block' }}
                    />
                  </Spin>

                  {/* Info bên phải */}
                  <div style={{ flex: 1 }}>
                    <Text strong style={{ display: 'block', marginBottom: 10, color: '#15803d', fontSize: 14 }}>
                      Quét mã để thanh toán
                    </Text>
                    <div style={{ fontSize: 13, color: '#374151', lineHeight: 2 }}>
                      <div><Text type="secondary">Ngân hàng:</Text> <Text strong>{BANK_NAME}</Text></div>
                      <div><Text type="secondary">STK:</Text> <Text strong>{BANK_ACCOUNT}</Text></div>
                      <div><Text type="secondary">Số tiền:</Text> <Text strong style={{ color: '#10b981' }}>{fmt(pendingInvoice.totalAmount ?? grandTotal)}</Text></div>
                      <div>
                        <Text type="secondary">Nội dung:</Text>{' '}
                        <Text strong copyable>{buildTransferContent(pendingInvoice.invoiceCode)}</Text>
                      </div>
                    </div>

                    {/* Trạng thái chờ: polling backend mỗi 3 giây, tự dừng sau 10 phút */}
                    {!pollTimedOut ? (
                      <>
                        <div style={{
                          marginTop: 12,
                          padding: '8px 12px',
                          background: '#fff',
                          borderRadius: 8,
                          border: '1px dashed #86efac',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                        }}>
                          <Spin size="small" />
                          <Text style={{ fontSize: 13, color: '#15803d' }}>
                            Đang chờ ngân hàng xác nhận chuyển khoản...
                          </Text>
                        </div>
                        <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 6 }}>
                          Hóa đơn sẽ tự chuyển sang “Đã thanh toán” ngay khi tiền vào tài khoản.
                          Giữ nguyên nội dung chuyển khoản để hệ thống đối soát đúng.
                        </Text>
                      </>
                    ) : (
                      <div style={{
                        marginTop: 12,
                        padding: '8px 12px',
                        background: '#fffbeb',
                        borderRadius: 8,
                        border: '1px dashed #fcd34d',
                      }}>
                        <Text style={{ fontSize: 13, color: '#b45309' }}>
                          Đã quá 10 phút chưa thấy tiền về — tạm dừng kiểm tra tự động.
                        </Text>
                        <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 4 }}>
                          Hóa đơn <Text strong>{pendingInvoice.invoiceCode}</Text> vẫn còn hiệu lực.
                          Bệnh nhân chuyển khoản muộn thì hệ thống vẫn tự gạch nợ — mở lại hóa đơn
                          ở tab “Lịch sử hóa đơn” để xem. Nếu bệnh nhân đổi sang trả tiền mặt,
                          hãy hủy hóa đơn này rồi tạo lại với phương thức Tiền mặt.
                        </Text>
                        <Button
                          size="small"
                          type="primary"
                          loading={checkingNow}
                          onClick={handleCheckPaymentNow}
                          style={{ marginTop: 8 }}
                        >
                          Kiểm tra lại ngay
                        </Button>
                      </div>
                    )}

                    <Button
                      size="small"
                      icon={<ReloadOutlined />}
                      onClick={() => { setQrLoading(true); setQrKey(k => k + 1) }}
                      style={{ marginTop: 10 }}
                    >
                      Tải lại mã QR
                    </Button>
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
              {detailModal.invoice.discountAmount > 0 && (
                <>
                  <div style={{ color: '#64748b', fontSize: 14 }}>
                    Tạm tính: {fmt(detailModal.invoice.subTotal)}
                  </div>
                  <div style={{ color: '#dc2626', fontSize: 14, marginBottom: 4 }}>
                    Giảm giá: −{fmt(detailModal.invoice.discountAmount)}
                  </div>
                </>
              )}
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
