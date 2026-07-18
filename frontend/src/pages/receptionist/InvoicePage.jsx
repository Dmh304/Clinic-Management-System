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
  Descriptions, Popconfirm, Row, Col, Statistic, Spin, Tooltip, AutoComplete, Segmented,
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

// Chu kỳ tự tải lại danh sách ở tab "Lịch sử hóa đơn" khi còn hóa đơn chờ thanh toán.
// Dài hơn polling mã QR vì đây là tải cả danh sách, không cần realtime tới từng giây.
const HISTORY_POLL_MS = 5000

// Ngưỡng dừng polling nếu bệnh nhân không chuyển khoản (10 phút).
// Đây CHỈ là giới hạn phía giao diện để trình duyệt không hỏi backend vô hạn —
// không phải hạn thanh toán. Bệnh nhân chuyển tiền muộn hơn thì webhook vẫn gạch nợ
// bình thường, lễ tân mở lại hóa đơn sẽ thấy đã thanh toán.
const POLL_TIMEOUT_MS = 10 * 60 * 1000

// Nội dung chuyển khoản BẮT BUỘC bắt đầu bằng "SEVQR" (SePay + VietinBank mới nhận được
// biến động số dư) và chứa mã hóa đơn để webhook dò ra tiền vào là của hóa đơn nào.
const buildTransferContent = (invoiceCode) => `SEVQR ${invoiceCode}`

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

// Nhãn loại khoản phí để hiển thị trong bảng chi tiết hóa đơn
const ITEM_TYPE_LABEL = Object.fromEntries(ITEM_TYPE_OPTS.map((o) => [o.value, o.label]))

const INVOICE_STATUS_CFG = {
  DRAFT:     { color: 'gold',  label: 'Chưa phát hành' },
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
  const [activeTab, setActiveTab]             = useState('pending')
  // Tách lịch sử hóa đơn: 'unpaid' = chưa thanh toán, 'paid' = đã thanh toán
  const [historyFilter, setHistoryFilter]     = useState('unpaid')

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
  // Đang tải gợi ý khoản phí (dịch vụ khám + thuốc bác sĩ đã kê) khi mở modal thu phí
  const [suggestLoading, setSuggestLoading] = useState(false)
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
            // Delay một chút để đảm bảo state đã được cập nhật, rồi mở modal kèm gợi ý
            // khoản phí (dịch vụ khám + thuốc bác sĩ đã kê) như khi bấm nút thu phí.
            setTimeout(() => {
              if (!isMounted) return
              const basePrefill = targetAppt.serviceName
                ? [{ itemType: 'SERVICE', description: targetAppt.serviceName, quantity: 1, unitPrice: targetAppt.servicePrice ?? 0 }]
                : [{ itemType: 'SERVICE', description: '', quantity: 1, unitPrice: 0 }]
              setItems(basePrefill)
              form.setFieldsValue({ paymentMethod: 'CASH', paymentReference: '', notes: '' })
              setCreateModal({ open: true, appointment: targetAppt })

              setSuggestLoading(true)
              invoiceService.getSuggestedItems(targetAppt.id)
                .then((res) => {
                  const suggested = (res.data ?? []).map((it) => ({
                    itemType: it.itemType,
                    description: it.description,
                    quantity: it.quantity ?? 1,
                    unitPrice: Number(it.unitPrice) || 0,
                  }))
                  if (isMounted && suggested.length) setItems(suggested)
                })
                .catch(() => {})
                .finally(() => { if (isMounted) setSuggestLoading(false) })
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

  // Tách lịch sử thành 2 phần: đã thanh toán (PAID) và chưa thanh toán (còn lại).
  // Hóa đơn ĐÃ HỦY bị loại khỏi cả hai — coi như đã bỏ đi, không còn cần xử lý.
  const paidInvoices   = filteredInvoices.filter((i) => i.paymentStatus === 'PAID' && i.status !== 'CANCELLED')
  const unpaidInvoices = filteredInvoices.filter((i) => i.paymentStatus !== 'PAID' && i.status !== 'CANCELLED')
  const shownInvoices  = historyFilter === 'paid' ? paidInvoices : unpaidInvoices

  // Còn hóa đơn nào đang chờ tiền về không? Chỉ những hóa đơn này mới có thể tự đổi
  // trạng thái khi cổng thanh toán báo về, nên chỉ polling khi thực sự có việc để chờ.
  const hasPendingPayment = invoices.some(
    (inv) => inv.status !== 'CANCELLED'
      && (inv.paymentStatus === 'UNPAID' || inv.paymentStatus === 'PENDING_PAYMENT')
  )

  // Tự cập nhật tab "Lịch sử hóa đơn": khi đang mở tab này và còn hóa đơn chưa thanh toán,
  // định kỳ tải lại danh sách để hóa đơn tự chuyển sang "Đã thanh toán" ngay khi webhook
  // của cổng gạch nợ — lễ tân không cần bấm "Làm mới". Dừng ngay khi rời tab hoặc không
  // còn hóa đơn nào chờ, tránh gọi API vô ích.
  useEffect(() => {
    if (activeTab !== 'history' || !hasPendingPayment) return
    const timer = setInterval(() => dispatch(fetchAllInvoices()), HISTORY_POLL_MS)
    return () => clearInterval(timer)
  }, [activeTab, hasPendingPayment, dispatch])

  // ─── Modal helpers ────────────────────────────────────────────────────────────

  // Mở modal thu phí: hiện ngay dịch vụ khám đã đặt cho đỡ chờ, rồi gọi API gợi ý để đổ
  // thêm thuốc bác sĩ đã kê (UC-27). Lỗi API thì giữ nguyên prefill cơ bản.
  const handleOpenCreate = async (appt) => {
    const basePrefill = appt.serviceName
      ? [{ itemType: 'SERVICE', description: appt.serviceName, quantity: 1, unitPrice: appt.servicePrice ?? 0 }]
      : [{ itemType: 'SERVICE', description: '', quantity: 1, unitPrice: 0 }]
    setItems(basePrefill)
    setDiscount(0)
    form.setFieldsValue({ paymentMethod: 'CASH', paymentReference: '', notes: '' })
    setCreateModal({ open: true, appointment: appt })

    setSuggestLoading(true)
    try {
      const res = await invoiceService.getSuggestedItems(appt.id)
      const suggested = (res.data ?? []).map((it) => ({
        itemType: it.itemType,
        description: it.description,
        quantity: it.quantity ?? 1,
        unitPrice: Number(it.unitPrice) || 0,
      }))
      // Gợi ý đã bao gồm dịch vụ khám, nên thay thế hẳn prefill cơ bản
      if (suggested.length) setItems(suggested)
    } catch {
      // Không lấy được gợi ý → giữ prefill cơ bản, lễ tân tự thêm thuốc bằng "+ Thêm khoản phí"
    } finally {
      setSuggestLoading(false)
    }
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

  const addItem    = (itemType = 'OTHER') => setItems((p) => [...p, { itemType, description: '', quantity: 1, unitPrice: 0 }])
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

  // Khôi phục hóa đơn gốc: đổ lại đầy đủ khoản phí auto-đổ (dịch vụ khám + xét nghiệm +
  // thuốc đã kê), ghi đè mọi chỉnh sửa hiện tại. Dùng khi lễ tân lỡ sửa/xóa muốn về nguyên bản.
  const handleRestoreOriginal = async () => {
    const appt = createModal.appointment
    if (!appt?.id) return
    setSuggestLoading(true)
    try {
      const res = await invoiceService.getSuggestedItems(appt.id)
      const suggested = (res.data ?? []).map((it) => ({
        itemType: it.itemType,
        description: it.description,
        quantity: it.quantity ?? 1,
        unitPrice: Number(it.unitPrice) || 0,
      }))
      if (suggested.length) {
        setItems(suggested)
        message.success('Đã khôi phục hóa đơn gốc')
      } else {
        message.info('Không có khoản phí gốc để khôi phục')
      }
    } catch {
      message.error('Không khôi phục được hóa đơn gốc')
    } finally {
      setSuggestLoading(false)
    }
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

  // Luồng TIỀN MẶT: tạo hóa đơn ở trạng thái "Chờ nhận tiền" (chưa phát hành), KHÔNG đánh dấu
  // đã thanh toán ngay. Bệnh nhân xem được và có thể yêu cầu hủy trước khi trả tiền. Lễ tân
  // bấm "Đã nhận tiền" (bảng lịch sử) để chốt khi thực nhận đủ tiền mặt.
  const handleSubmit = async () => {
    const values = await validateInvoiceForm()
    if (!values) return

    setSubmitting(true)
    try {
      const created = await dispatch(createInvoice(buildInvoicePayload(values))).unwrap()
      message.success(`Đã tạo hóa đơn ${created.invoiceCode} — chờ nhận tiền mặt.`)
      // Thông báo/gửi email cho bệnh nhân biết có hóa đơn cần thanh toán
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
      // Tự gửi email kèm mã QR + thông tin chuyển khoản cho bệnh nhân (nếu có email).
      // Lỗi SMTP chỉ cảnh báo, không làm hỏng luồng tạo hóa đơn.
      await sendInvoiceEmailQuietly(created.id)
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

  // Lễ tân xác nhận đã nhận đủ tiền mặt → phát hành hóa đơn (Chờ nhận tiền → Đã thanh toán)
  const handleConfirmCash = async (id) => {
    try {
      await dispatch(issueInvoice({ id, paymentMethod: 'CASH', paymentReference: null })).unwrap()
      message.success('Đã xác nhận nhận tiền — hóa đơn đã thanh toán')
      dispatch(fetchAllInvoices())
      void refreshAppointments()
      await sendInvoiceEmailQuietly(id)   // gửi biên nhận cho bệnh nhân
    } catch (err) {
      message.error(typeof err === 'string' ? err : 'Không thể xác nhận')
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
      // HĐ chưa thanh toán → email chứa mã QR để bệnh nhân trả; đã thanh toán → biên nhận
      message.success(inv.paymentStatus !== 'PAID'
        ? `Đã gửi mã QR thanh toán đến ${inv.patientEmail}`
        : `Đã gửi hóa đơn đến ${inv.patientEmail}`)
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
      render: (s, record) => {
        // Hóa đơn tiền mặt chưa thu → "Chờ nhận tiền" (thay vì "Chưa thanh toán")
        if (s === 'UNPAID' && record.paymentMethod === 'CASH') {
          return <Tag color="gold">Chờ nhận tiền</Tag>
        }
        const c = PAYMENT_STATUS_CFG[s] || {}
        return <Tag color={c.color}>{c.label}</Tag>
      },
    },
    {
      title: 'Ngày tạo', dataIndex: 'createdAt', key: 'createdAt', width: 145,
      // Mặc định xếp hóa đơn mới nhất lên đầu; lễ tân bấm để đảo chiều
      sorter: (a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0),
      defaultSortOrder: 'descend',
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
          {/* Hóa đơn tiền mặt chờ thu → nút xác nhận đã nhận đủ tiền để chốt PAID */}
          {record.status === 'DRAFT' && record.paymentMethod === 'CASH' && record.paymentStatus !== 'PAID' && (
            <Popconfirm title="Xác nhận đã nhận đủ tiền mặt?" onConfirm={() => handleConfirmCash(record.id)}
              okText="Đã nhận" cancelText="Chưa">
              <Button size="small" type="primary" style={{ backgroundColor: '#10b981', borderColor: '#10b981' }}>
                Đã nhận tiền
              </Button>
            </Popconfirm>
          )}
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
        activeKey={activeTab}
        onChange={setActiveTab}
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
                  {hasPendingPayment && (
                    <Tooltip title={`Tự tải lại mỗi ${HISTORY_POLL_MS / 1000} giây khi còn hóa đơn chờ thanh toán`}>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        <Spin size="small" style={{ marginRight: 6 }} />
                        Đang chờ thanh toán, tự cập nhật...
                      </Text>
                    </Tooltip>
                  )}
                </Space>

                <Segmented
                  value={historyFilter}
                  onChange={setHistoryFilter}
                  style={{ marginBottom: 16 }}
                  options={[
                    { label: `Chưa thanh toán (${unpaidInvoices.length})`, value: 'unpaid' },
                    { label: `Đã thanh toán (${paidInvoices.length})`, value: 'paid' },
                  ]}
                />

                <Table
                  columns={invoiceColumns}
                  dataSource={shownInvoices}
                  rowKey="id"
                  loading={invoiceLoading}
                  pagination={{ pageSize: 10, showSizeChanger: false }}
                  locale={{ emptyText: historyFilter === 'paid'
                    ? 'Chưa có hóa đơn đã thanh toán'
                    : 'Không có hóa đơn chưa thanh toán' }}
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
                Lập hóa đơn (chờ nhận tiền)
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
                      <Tooltip title="Đổ lại đầy đủ khoản phí gốc: dịch vụ khám + xét nghiệm + thuốc đã kê">
                        <Tag
                          icon={<ReloadOutlined />}
                          color="purple"
                          onClick={handleRestoreOriginal}
                          style={{ cursor: 'pointer', userSelect: 'none', marginInlineEnd: 0 }}
                        >
                          Khôi phục hóa đơn gốc
                        </Tag>
                      </Tooltip>
                    </Space>
                  )
                  : '—'}
              </Descriptions.Item>
            </Descriptions>

            <Divider style={{ margin: '12px 0' }}>Các khoản phí</Divider>

            {suggestLoading && (
              <div style={{ marginBottom: 8 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  <Spin size="small" style={{ marginRight: 6 }} />
                  Đang lấy dịch vụ khám và thuốc bác sĩ đã kê...
                </Text>
              </div>
            )}

            {/* Khoản phí nhóm theo từng loại (Dịch vụ khám / Xét nghiệm / Thuốc / Kính / Khác) */}
            <div style={{ marginBottom: 12 }}>
              {ITEM_TYPE_OPTS.map(({ value: type, label }) => {
                const rows = items
                  .map((it, idx) => ({ it, idx }))
                  .filter((x) => x.it.itemType === type)
                const catalog = catalogForType(type)
                const placeholder =
                  type === 'MEDICINE' ? 'Nhập hoặc chọn thuốc...' :
                  type === 'LAB'      ? 'Nhập hoặc chọn xét nghiệm / cận lâm sàng...' :
                  type === 'SERVICE'  ? 'Nhập hoặc chọn dịch vụ khám...' :
                  type === 'GLASSES'  ? 'Loại kính, thông số...' : 'Mô tả khoản phí...'
                const notFound =
                  type === 'MEDICINE' ? 'Không tìm thấy thuốc' :
                  type === 'LAB'      ? 'Không tìm thấy xét nghiệm' : 'Không tìm thấy dịch vụ'
                const addLabel =
                  type === 'SERVICE'  ? 'dịch vụ khám' :
                  type === 'LAB'      ? 'xét nghiệm' :
                  type === 'MEDICINE' ? 'thuốc' :
                  type === 'GLASSES'  ? 'kính' : 'khoản khác'

                return (
                  <div key={type} style={{ marginBottom: 14 }}>
                    {/* Tiêu đề nhóm */}
                    <div style={{
                      fontWeight: 700, fontSize: 13, color: '#4f46e5', marginBottom: 6,
                      paddingLeft: 8, borderLeft: '3px solid #6366f1',
                    }}>
                      {label}
                    </div>

                    {/* Header cột — chỉ hiện khi nhóm có dòng */}
                    {rows.length > 0 && (
                      <Row gutter={8} wrap={false} style={{ fontSize: 11, color: '#94a3b8', marginBottom: 4 }}>
                        <Col flex="auto" style={{ minWidth: 0 }}>Mô tả</Col>
                        <Col flex="60px" style={{ textAlign: 'right' }}>SL</Col>
                        <Col flex="110px" style={{ textAlign: 'right' }}>Đơn giá (đ)</Col>
                        <Col flex="110px" style={{ textAlign: 'right' }}>Thành tiền</Col>
                        <Col flex="32px" />
                      </Row>
                    )}

                    {rows.map(({ it: item, idx }) => (
                      <Row key={idx} gutter={8} wrap={false} style={{ marginBottom: 6 }} align="middle">
                        <Col flex="auto" style={{ minWidth: 0 }}>
                          {catalog ? (
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
                          ) : (
                            <Input
                              size="small"
                              value={item.description}
                              onChange={(e) => updateItem(idx, 'description', e.target.value)}
                              status={!item.description?.trim() ? 'error' : ''}
                              placeholder={placeholder}
                            />
                          )}
                        </Col>
                        <Col flex="60px">
                          <InputNumber
                            size="small" min={1}
                            value={item.quantity}
                            onChange={(v) => updateItem(idx, 'quantity', v)}
                            style={{ width: '100%' }}
                          />
                        </Col>
                        <Col flex="110px">
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
                        <Col flex="110px" style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <Text>{fmt(calcSubtotal(item))}</Text>
                        </Col>
                        <Col flex="32px" style={{ textAlign: 'center' }}>
                          <Button
                            size="small" type="text" danger
                            icon={<DeleteOutlined />}
                            onClick={() => removeItem(idx)}
                          />
                        </Col>
                      </Row>
                    ))}

                    <Button size="small" type="dashed" icon={<PlusOutlined />}
                      onClick={() => addItem(type)} style={{ marginTop: 2 }}>
                      Thêm {addLabel}
                    </Button>
                  </div>
                )
              })}
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
            {/* Chỉ in hóa đơn khi đã thanh toán — hóa đơn chưa phát hành không có gì để in */}
            {detailModal.invoice?.paymentStatus === 'PAID' && (
              <Button
                icon={<PrinterOutlined />}
                loading={printLoading}
                onClick={() => handlePrint(detailModal.invoice)}
              >
                In hóa đơn (PDF)
              </Button>
            )}
            <Button
              icon={<MailOutlined />}
              loading={emailSending}
              onClick={() => handleSendEmail(detailModal.invoice)}
              disabled={!detailModal.invoice?.patientEmail}
              title={detailModal.invoice?.patientEmail || 'Bệnh nhân chưa có email'}
            >
              {detailModal.invoice?.paymentStatus !== 'PAID' ? 'Gửi mã QR qua email' : 'Gửi email'}
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

            {detailModal.invoice.items?.length > 0 ? (
              <Table
                size="small"
                style={{ marginBottom: 16 }}
                dataSource={detailModal.invoice.items}
                rowKey={(_, i) => i}
                pagination={false}
                columns={[
                  {
                    title: 'Loại', dataIndex: 'itemType', width: 100,
                    render: (t) => ITEM_TYPE_LABEL[t] || t || '—',
                  },
                  { title: 'Mô tả', dataIndex: 'description', render: (d) => d || '—' },
                  { title: 'SL', dataIndex: 'quantity', width: 55, align: 'right' },
                  {
                    title: 'Đơn giá', dataIndex: 'unitPrice', width: 120, align: 'right',
                    render: (v) => fmt(v),
                  },
                  {
                    title: 'Thành tiền', dataIndex: 'subtotal', width: 130, align: 'right',
                    render: (v, r) => <Text strong>{fmt(v ?? (r.quantity ?? 1) * (r.unitPrice ?? 0))}</Text>,
                  },
                ]}
                summary={(rows) => {
                  const total = rows.reduce((s, r) => {
                    const sub = r.subtotal != null ? Number(r.subtotal)
                      : (r.quantity ?? 1) * (r.unitPrice ?? 0)
                    return s + sub
                  }, 0)
                  return (
                    <Table.Summary.Row>
                      <Table.Summary.Cell index={0} colSpan={4} align="right">
                        <Text strong>Cộng khoản phí</Text>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={1} align="right">
                        <Text strong style={{ color: '#10b981' }}>{fmt(total)}</Text>
                      </Table.Summary.Cell>
                    </Table.Summary.Row>
                  )
                }}
              />
            ) : (
              <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
                Không có chi tiết khoản phí
              </Text>
            )}

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

            {/* Hóa đơn chưa thanh toán → hiện mã QR để bệnh nhân quét trả tiền */}
            {detailModal.invoice.paymentStatus !== 'PAID'
              && detailModal.invoice.status !== 'CANCELLED' && (
              <div style={{
                marginTop: 16, padding: 16, display: 'flex', gap: 20, alignItems: 'center',
                flexWrap: 'wrap', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8,
              }}>
                <img
                  src={buildVietQrUrl(detailModal.invoice.totalAmount, detailModal.invoice.invoiceCode)}
                  alt="VietQR"
                  style={{ width: 220, height: 220, borderRadius: 8, boxShadow: '0 2px 8px #0001', flexShrink: 0 }}
                />
                <div style={{ flex: 1, minWidth: 200 }}>
                  <Text strong style={{ display: 'block', marginBottom: 10, color: '#15803d', fontSize: 14 }}>
                    Quét mã để thanh toán
                  </Text>
                  <div style={{ fontSize: 13, color: '#374151', lineHeight: 2 }}>
                    <div><Text type="secondary">Ngân hàng:</Text> <Text strong>{BANK_NAME}</Text></div>
                    <div><Text type="secondary">STK:</Text> <Text strong copyable>{BANK_ACCOUNT}</Text></div>
                    <div><Text type="secondary">Số tiền:</Text> <Text strong style={{ color: '#10b981' }}>{fmt(detailModal.invoice.totalAmount)}</Text></div>
                    <div>
                      <Text type="secondary">Nội dung:</Text>{' '}
                      <Text strong copyable>{buildTransferContent(detailModal.invoice.invoiceCode)}</Text>
                    </div>
                  </div>
                  <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 8 }}>
                    Giữ nguyên nội dung chuyển khoản để hệ thống tự xác nhận thanh toán.
                  </Text>
                </div>
              </div>
            )}
          </>
        )}
      </Modal>
    </div>
  )
}
