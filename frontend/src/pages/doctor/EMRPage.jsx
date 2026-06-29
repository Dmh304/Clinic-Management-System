/**
 * Author: Tuấn - HE204215
 * 
 * Giao diện quản lý Bệnh án điện tử (EMR) cho Bác sĩ
 * Cho phép bác sĩ xem bệnh sử trước đó, khai thác triệu chứng hiện tại, khám lâm sàng và lưu hồ sơ bệnh án
*/

import { useEffect, useState, useCallback } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { Form, Input, InputNumber, Tabs, Button, message, Tag, Spin, Collapse, Divider, Modal, Select } from 'antd'
import { emrService } from '../../services/emrService'
import { labService } from '../../services/labService'
import DrugPrescriptionForm from './components/DrugPrescriptionForm'
import EyeglassPrescriptionForm from './components/EyeglassPrescriptionForm'
import useConfirmAction from '../../hooks/useConfirmAction'

const { TextArea } = Input
const { Panel } = Collapse

/* Cấu hình màu sắc trạng thái của hồ sơ bệnh án */
const STATUS_MAP = {
  DRAFT:       { color: 'default',    label: 'Nháp' },
  IN_PROGRESS: { color: 'processing', label: 'Đang khám' },
  COMPLETED:   { color: 'success',    label: 'Hoàn thành' },
}

// Hàm tính tuổi của bệnh nhân dựa trên ngày sinh
const calculateAge = (dobString) => {
  if (!dobString) return '—';
  const today = new Date();
  const birthDate = new Date(dobString);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
};

const textEllipsisStyle = {
  display: '-webkit-box',
  WebkitLineClamp: 1, // Số dòng muốn hiển thị trước khi cắt (1 dòng)
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  wordBreak: 'break-all' // Giúp cắt từ chuẩn xác theo độ rộng cột
};

// Component hiển thị các trường nhập liệu dành cho khám lâm sàng Mắt (thị lực, nhãn áp, khúc xạ...)
function EyeFields({ prefix, label }) {
  return (
    <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, padding: '14px 16px', marginBottom: 12 }}>
      <div style={{ fontWeight: 600, fontSize: 13, color: '#475569', marginBottom: 10 }}>{label}</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12 }}>
        <Form.Item label="VA" name={`${prefix}Va`} style={{ marginBottom: 0 }}>
          <InputNumber style={{ width: '100%' }} placeholder="0.00" step={0.1} min={0} max={2} disabled/>
        </Form.Item>
        <Form.Item label="BCVA" name={`${prefix}Bcva`} style={{ marginBottom: 0 }}>
          <InputNumber style={{ width: '100%' }} placeholder="0.00" step={0.1} min={0} max={2} disabled/>
        </Form.Item>
        <Form.Item label="IOP (mmHg)" name={`${prefix}Iop`} style={{ marginBottom: 0 }}>
          <InputNumber style={{ width: '100%' }} placeholder="0.0" step={0.5} min={0} disabled/>
        </Form.Item>
        <div />
        <Form.Item label="SPH" name={`${prefix}Sph`} style={{ marginBottom: 0 }}>
          <InputNumber style={{ width: '100%' }} placeholder="0.00" step={0.25} disabled/>
        </Form.Item>
        <Form.Item label="CYL" name={`${prefix}Cyl`} style={{ marginBottom: 0 }}>
          <InputNumber style={{ width: '100%' }} placeholder="0.00" step={0.25} disabled/>
        </Form.Item>
        <Form.Item label="AXIS (°)" name={`${prefix}Axis`} style={{ marginBottom: 0 }}>
          <InputNumber style={{ width: '100%' }} placeholder="0" min={0} max={180} disabled/>
        </Form.Item>
      </div>
    </div>
  )
}

// Component hiển thị một thẻ tóm tắt về lịch sử khám bệnh trước đó của bệnh nhân
function HistoryCard({ record, onClick }) {
  const date = record.createdAt
    ? new Date(record.createdAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : '—'
  const cfg = STATUS_MAP[record.status] ?? { color: 'default', label: record.status }

  return (
    <div 
    onClick={onClick}
    style={{
      border: '1px solid #e2e8f0', borderRadius: 10, padding: '14px 16px', marginBottom: 10,
      backgroundColor: '#fafafa',
    }}
    onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f0fdf9'}
    onMouseLeave={e => e.currentTarget.style.backgroundColor = '#fafafa'}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontWeight: 600, fontSize: 13, color: '#1e293b' }}>{date}</span>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: '#94a3b8' }}>{record.doctorName ?? '—'}</span>
          <Tag color={cfg.color} style={{ margin: 0 }}>{cfg.label}</Tag>
        </div>
      </div>
      {record.chiefComplaint && (
        <div style={{ marginBottom: 4 }}>
          <span style={{ fontSize: 12, color: '#64748b', fontWeight: 500 }}>Lý do khám: </span>
          <span style={{ fontSize: 12, color: '#334155' }}>
            <div title={record.chiefComplaint} style={{ ...textEllipsisStyle, fontSize: 12, color: '#334155' }}>
              {record.chiefComplaint}
            </div>
          </span>
        </div>
      )}
      {record.diagnosis && (
        <div style={{ marginBottom: 4 }}>
          <span style={{ fontSize: 12, color: '#64748b', fontWeight: 500 }}>Chẩn đoán: </span>
          <span style={{ fontSize: 12, color: '#334155' }}>
            <div title={record.diagnosis} style={{ ...textEllipsisStyle, fontSize: 12, color: '#334155' }}>
              {record.diagnosis}
            </div>
          </span>
        </div>
      )}
      {record.treatmentPlan && (
        <div>
          <span style={{ fontSize: 12, color: '#64748b', fontWeight: 500 }}>Điều trị: </span>
          <span style={{ fontSize: 12, color: '#334155' }}>{record.treatmentPlan}</span>
        </div>
      )}
    </div>
  )
}

/* 
*Component chính của trang quản lý Bệnh án điện tử 
* Đóng vai trò vừa là trang lập bệnh án mới, vừa là trang tra cứu danh sách bệnh án đã hoàn thành
*/
export default function EMRPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user } = useSelector((s) => s.auth)        // lấy thông tin tài khoản bác sĩ đang đăng nhập
  const [form] = Form.useForm()

  const { confirmAction, contextHolder } = useConfirmAction()

   /* Trích xuất các tham số điều hướng từ url */
  const appointmentId = searchParams.get('appointmentId')                                  // id của lịch khám
  const patientId = searchParams.get('patientId')                                          // id của bệnh nhân
  const originalAppointmentId = searchParams.get('originalAppointmentId') || null          // hỗ trợ lưu vết ca khám chính khi bác sĩ nhấn sang xem lịch sử
  const from = searchParams.get('from')                                                    // nguồn điều hướng ('list' từ danh sách tổng, trống từ dashboard) 
  
  /* Khai báo state quản lí dữ liệu */
  const [emr, setEmr] = useState(null)                             // lưu dữ liệu chi tiết của hồ sơ bệnh án đang xem / chỉnh sửa 
  const [history, setHistory] = useState([])                       // mảng lưu danh sách các lần khám trước đó của bệnh nhân
  const [loading, setLoading] = useState(!!appointmentId)          // trạng thái chờ tải thông tin bệnh án chi tiết
  const [saving, setSaving] = useState(false)                      // trạng thái chờ khi bấm nút lưu
  const [allList, setAllList] = useState([])           // Danh sách các bệnh án đã hoàn thành
  const [listLoading, setListLoading] = useState(false)            // trạng thái chờ tải danh sách bệnh án đã hoàn thành
  const [searchText, setSearchText] = useState('')                 // từ khóa tìm kiếm theo bệnh án tại màn hình danh sách tổng
  const [statusFilter, setStatusFilter] = useState('ALL')  // 'ALL' | 'DRAFT' | 'IN_PROGRESS' | 'COMPLETED'

    // ---- Lab order modal state ----
  const [labModal,       setLabModal]       = useState(false)
  const [labTechnicianId,   setLabTechnicianId]   = useState(null)
  const [labPriority,    setLabPriority]    = useState('PRIMARY')
  const [labNotes,       setLabNotes]       = useState('')
  const [labTechnicians,    setLabTechnicians]    = useState([])   // danh sách dịch vụ XN từ backend
  const [loadingLabTechs,  setLoadingLabTechs]  = useState(false)
  const [creatingOrder,  setCreatingOrder]  = useState(false)
  
// Load danh sách Lab Technician khi mở modal
const openLabModal = async () => {
  setLabModal(true)
  if (labTechnicians.length > 0) return
  setLoadingLabTechs(true)
  try {
    const res = await labService.getActiveLabTechnicians()
    setLabTechnicians(res.data ?? [])
  } catch {
    message.error('Không thể tải danh sách kỹ thuật viên')
  } finally {
    setLoadingLabTechs(false)
  }
}

/**
   * Logic tạo lab order thực sự — được gọi sau khi user xác nhận trong dialog
   */
  const executeCreateLabOrder = async () => {
    setCreatingOrder(true)
    try {
      await labService.createLabOrder({
        medicalRecordId:  emr?.id,
        labTechnicianId:  labTechnicianId,
        priority:         labPriority,
        notes:            labNotes,
      })
      message.success('Đã tạo phiếu chỉ định xét nghiệm thành công!')
      setLabModal(false)
      setLabTechnicianId(null)
      setLabPriority('NORMAL')
      setLabNotes('')
    } catch (e) {
      message.error(e?.response?.data?.message || 'Tạo phiếu xét nghiệm thất bại')
    } finally {
      setCreatingOrder(false)
    }
  }


  /**
   * Tạo lab order: kiểm tra đầu vào → mở dialog xác nhận → gọi API nếu đồng ý
   */
  const handleCreateLabOrder = () => {
    if (!labTechnicianId) {
      message.warning('Vui lòng chọn kỹ thuật viên')
      return
    }

    const selectedTech = labTechnicians.find((lt) => lt.id === labTechnicianId)
    const PRIORITY_LABEL = { PRIMARY: '🟢 Thường', WARNING: '🟠 Nghiêm trọng', EMERGENCY: '🔴 Khẩn cấp' }

    confirmAction({
      type: 'warning',
      title: 'Xác nhận tạo phiếu chỉ định xét nghiệm',
      description: 'Phiếu sẽ được gửi đến kỹ thuật viên ngay sau khi xác nhận.',
      details: [
        { label: 'Bệnh nhân',      value: emr?.patientName ?? '—' },
        { label: 'Kỹ thuật viên',  value: selectedTech?.fullName ?? '—' },
        { label: 'Mức độ ưu tiên', value: PRIORITY_LABEL[labPriority] ?? labPriority },
        ...(labNotes ? [{ label: 'Ghi chú', value: labNotes }] : []),
      ],
      confirmText: 'Tạo phiếu',
      onConfirm: executeCreateLabOrder,
    })
  }


  // Hàm tiện ích: chuyển đổi object dữ liệu thô từ server (API trả về)
  // sang định dạng object có cấu trúc tương thích với tên các trường (name) khai báo trong Form của Ant Design.
  const emrToFormValues = (data) => ({
    chiefComplaint: data.chiefComplaint,
    symptoms:       data.symptoms,
    diagnosis:      data.diagnosis,
    treatmentPlan:  data.treatmentPlan,
    notes:          data.notes,
    lVa:   data.vaL,   rVa:   data.vaR,
    lBcva: data.bcvaL, rBcva: data.bcvaR,
    lIop:  data.iopL,  rIop:  data.iopR,
    lSph:  data.sphL,  rSph:  data.sphR,
    lCyl:  data.cylL,  rCyl:  data.cylR,
    lAxis: data.axisL, rAxis: data.axisR,
  })

  // Hàm tải dữ liệu bệnh án hiện tại của lịch hẹn (nếu đã từng lưu nháp)
  const fetchEMR = useCallback(async () => {
    if (!appointmentId) return
    setLoading(true)
    try {
      const res = await emrService.getByAppointment(appointmentId)
      const data = res.data
      console.log('>>> EMR data: ', data)
      if (data) {
        setEmr(data)
        form.setFieldsValue(emrToFormValues(data))     // đổ dữ liệu vào các trường nhập liệu
      }
    } catch (e) {
        console.log('>>> EMR fetch error: ', e)
    } finally {
      setLoading(false)
    }
  }, [appointmentId, form])

  // Hàm tải danh sách các lần khám trước đây của bệnh nhân (bỏ qua lịch hẹn hiện tại)
  const fetchHistory = useCallback(async () => {
    if (!patientId) return
    try {
      const res = await emrService.getPatientHistory(patientId)
      const all = res.data ?? []
      
      // Loại trừ các ca khám hiện tại ra khỏi danh sách lịch sử bệnh án
      setHistory(all.filter((r) => String(r.appointmentId) !== String(appointmentId)))
    } catch {
      // bỏ qua lỗi âm thầm để không ảnh hưởng luồng khám chính
    }
  }, [patientId, appointmentId])

  /* Gọi API tải danh sách toàn bộ các bệnh án đã hoàn thành */
  const fetchAllList = useCallback(async () => {
    setListLoading(true)
    try{
      const res = await emrService.getAllList()
      setAllList(res.data ?? [])
    } catch {
      message.error('Không thể tải danh sách bệnh án')
    } finally {
      setListLoading(false)
    }
  }, [])

  /* Hook khởi chạy: tải danh sách tổng nếu url không có appointmentId */
  useEffect(() => {
    if(!appointmentId) fetchAllList()
  }, [appointmentId, fetchAllList])

  /* Reset toàn bộ form và state khi id lịch hẹn thay đổi */
  useEffect(() => {
    setEmr(null)
    setHistory([])
    form.resetFields()
    setLoading(!!appointmentId)
  }, [appointmentId])

  /* Kéo dữ liệu bệnh án hiện tại và bệnh sử liên quan */
  useEffect(() => {
    fetchEMR()
    fetchHistory()
  }, [fetchEMR, fetchHistory])

  // Hàm chuẩn bị và đóng gói dữ liệu form để gửi lên API (lưu nháp hoặc hoàn thành)
  const buildPayload = (values, status) => ({
    appointmentId: Number(appointmentId),
    doctorId: user?.doctorId ?? user?.id,
    chiefComplaint: values.chiefComplaint,
    symptoms:       values.symptoms,
    diagnosis:      values.diagnosis,
    treatmentPlan:  values.treatmentPlan,
    notes:          values.notes,
    vaL:   values.lVa,   vaR:   values.rVa,
    bcvaL: values.lBcva, bcvaR: values.rBcva,
    iopL:  values.lIop,  iopR:  values.rIop,
    sphL:  values.lSph,  sphR:  values.rSph,
    cylL:  values.lCyl,  cylR:  values.rCyl,
    axisL: values.lAxis, axisR: values.rAxis,
    status,
  })

  /**
   * Logic lưu EMR thực sự — được gọi sau khi user xác nhận hoặc từ auto-save
   */
  const executeSave = async (status) => {
    try {
      let values
      if (status === 'COMPLETED') {
        values = await form.validateFields()
      } else {
        values = form.getFieldsValue()
      }
      setSaving(true)
      console.log('>>> Payload status: ', buildPayload(values, status).status)
      const res = await emrService.saveEMR(buildPayload(values, status))
      setEmr(res.data)
      message.success(status === 'COMPLETED' ? 'Đã hoàn thành hồ sơ bệnh án' : 'Đã lưu nháp')
      if (status === 'COMPLETED') {
        navigate('/doctor/dashboard')
      }
      return res.data
    } catch (err) {
      console.log('>>> Save error: ', err)
      if (err?.errorFields) return null
      message.error('Lưu thất bại, vui lòng thử lại')
      return null
    } finally {
      setSaving(false)
    }
  }

  /**
   * Lưu nháp: mở dialog xác nhận → gọi executeSave('IN_PROGRESS') nếu đồng ý
   */
  const handleSaveDraft = () => {
    const values = form.getFieldsValue()
    confirmAction({
      type: 'info',
      title: 'Lưu nháp hồ sơ bệnh án',
      description: 'Thông tin hiện tại sẽ được lưu tạm. Hồ sơ chưa được hoàn tất.',
      details: [
        { label: 'Bệnh nhân',  value: emr?.patientName ?? '—' },
        ...(values.chiefComplaint ? [{ label: 'Lý do khám', value: values.chiefComplaint }] : []),
      ],
      confirmText: 'Lưu nháp',
      onConfirm: () => executeSave('IN_PROGRESS'),
    })
  }

  /**
   * Hoàn thành khám: validate form → mở dialog xác nhận → gọi executeSave('COMPLETED') nếu đồng ý
   * Hồ sơ sẽ bị khóa sau khi hoàn thành nên dùng type 'danger' để nhấn mạnh
   */
  const handleComplete = async () => {
    // Validate trước để báo lỗi ngay, không cần mở dialog rồi mới biết thiếu trường
    try {
      await form.validateFields()
    } catch {
      return // Form còn lỗi, dừng lại để user sửa
    }

    const values = form.getFieldsValue()
    confirmAction({
      type: 'success',
      title: 'Hoàn thành hồ sơ bệnh án',
      description: 'Sau khi hoàn thành, hồ sơ sẽ bị khóa và không thể chỉnh sửa thêm.',
      details: [
        { label: 'Bệnh nhân',   value: emr?.patientName ?? '—' },
        { label: 'Lý do khám',  value: values.chiefComplaint ?? '—' },
        { label: 'Chẩn đoán',   value: values.diagnosis ?? '—' },
      ],
      confirmText: 'Hoàn thành & Khóa hồ sơ',
      onConfirm: () => executeSave('COMPLETED'),
    })
  }

  /**
   * Hàm dùng nội bộ cho auto-save từ DrugPrescriptionForm / EyeglassPrescriptionForm
   * Không cần dialog xác nhận vì đây là auto-save ngầm
   */
  const handleAutoSave = () => executeSave('IN_PROGRESS')


  /* Lọc danh sách theo từ khóa tìm kiếm và tab trạng thái */
  const filteredList = allList.filter((r) => {
    const matchStatus = statusFilter === 'ALL' || r.status === statusFilter
    if (!matchStatus) return false
    if (!searchText) return true
    const keyword = searchText.toLowerCase()
    return (
      r.patientName?.toLowerCase().includes(keyword) ||
      r.patientPhone?.includes(keyword)
    )
  })

  /* Biến cờ kiểm tra xem hồ sơ này đã được chốt hoàn thành chưa */
  //const isCompleted = emr?.status === 'COMPLETED'

    /* Đếm số lượng theo từng trạng thái để hiển thị trên tab */
  const countByStatus = (status) =>
    status === 'ALL'
      ? allList.length
      : allList.filter((r) => r.status === status).length

    /*
   * isReadOnly: readonly nếu thoả 1 trong 2 điều kiện:
   * 1. Hồ sơ đã COMPLETED (đã khoá, không ai chỉnh sửa được)
   * 2. Hồ sơ thuộc bác sĩ khác (không phải bác sĩ đang đăng nhập)
   */
  const currentDoctorId = user?.doctorId ?? user?.id
  const isOwner = emr?.doctorId != null && emr.doctorId === currentDoctorId
  const isReadOnly = !!emr && (emr.status === 'COMPLETED' || !isOwner)

  // Render khi Bác sĩ CHƯA CHỌN bệnh nhân nào
  if (!appointmentId) {
    return (
      <div style={{ padding: 24 }}>
        {/* REQUIRED: contextHolder phải được mount để dialog hoạt động */}
        {contextHolder}
        <div style={{ marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#0f172a' }}>Hồ sơ bệnh án</h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b'}}>
            Danh sách các hồ sơ bệnh án đã hoàn thành
          </p>
        </div>
        <div style={{ backgroundColor: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
        
        {/* Thanh tìm kiếm */}
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9' }}>
         <Input.Search
            placeholder="Tìm theo tên bệnh nhân hoặc số điện thoại..."
            allowClear={true}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ maxWidth: 400 }}
          />
        </div>
                  {/* Tabs filter theo trạng thái */}
          <div style={{ padding: '0 16px', borderBottom: '1px solid #f1f5f9', display: 'flex', gap: 4 }}>
            {[
              { key: 'ALL',        label: 'Tất cả' },
              { key: 'DRAFT',      label: 'Nháp' },
              { key: 'IN_PROGRESS',label: 'Đang khám' },
              { key: 'COMPLETED',  label: 'Hoàn thành' },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setStatusFilter(tab.key)}
                style={{
                  padding: '10px 14px',
                  border: 'none',
                  borderBottom: statusFilter === tab.key ? '2px solid #0d9488' : '2px solid transparent',
                  background: 'none',
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: statusFilter === tab.key ? 600 : 400,
                  color: statusFilter === tab.key ? '#0d9488' : '#64748b',
                  transition: 'all 0.15s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                {tab.label}
                <span style={{
                  backgroundColor: statusFilter === tab.key ? '#0d9488' : '#e2e8f0',
                  color: statusFilter === tab.key ? '#fff' : '#64748b',
                  borderRadius: 10,
                  padding: '1px 7px',
                  fontSize: 11,
                  fontWeight: 600,
                }}>
                  {countByStatus(tab.key)}
                </span>
              </button>
            ))}
          </div>
        <Spin spinning={listLoading}>
          {filteredList.length === 0 && !listLoading ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8', fontSize: 14 }}>
              {searchText ? 'Không tìm thấy kết quả phù hợp' : 'Chưa có hồ sơ bệnh án'}
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: '#f8fafc' }}>
                  {['STT', 'Bệnh nhân', 'Ngày khám', 'Lý do khám', 'Chẩn đoán', 'Bác sĩ', ''].map((h) => (
                    <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 13, fontWeight: 600, color: '#475569' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredList.map((r, i) => (
                  <tr
                    key={r.id}
                    style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f0fdf9'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = ''}
                  >
                    <td style={{ padding: '12px 16px', color: '#64748b', fontSize: 13 }}>{i + 1}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: 600, fontSize: 13, color: '#1e293b' }}>{r.patientName}</div>
                      <div style={{ fontSize: 12, color: '#64748b' }}>{r.patientPhone}</div>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: '#475569' }}>
                      {r.createdAt ? new Date(r.createdAt).toLocaleDateString('vi-VN') : '—'}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: '#475569', maxWidth: 200 }}>
                      <div 
                            title={r.chiefComplaint ?? '—'} 
                            style={{
                              display: '-webkit-box',
                              WebkitLineClamp: 1,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              wordBreak: 'break-all'
                            }}
                      >
                      {r.chiefComplaint ?? '—'}
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: '#475569', maxWidth: 200 }}>
                      <div 
                          title={r.diagnosis ?? '—'} 
                          style={{
                            display: '-webkit-box',
                            WebkitLineClamp: 1,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            wordBreak: 'break-all'
                          }}
                      >
                      {r.diagnosis ?? '—'}
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 12, color: '#64748b' }}>
                      {r.doctorName ?? '—'}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <Button
                        size="small"
                        onClick={() => navigate(`/doctor/emr?appointmentId=${r.appointmentId}&patientId=${r.patientId}&from=list`)}
                        style={{ fontSize: 12, borderColor: '#0d9488', color: '#0d9488' }}
                      >
                        Xem chi tiết
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Spin>
      </div>
      </div>
    )
  }

  // Render giao diện CHÍNH của trang Hồ sơ bệnh án điện tử
  return (
    <div style={{ padding: 24 }}>
      {/* REQUIRED: contextHolder phải được mount để dialog hoạt động */}
      {contextHolder}

      {/* khối header thông tin bệnh nhân đang tiếp đón */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#0f172a' }}>
            Hồ sơ bệnh án
            {emr?.patientName && <span style={{ fontWeight: 400, color: '#64748b', fontSize: 15, marginLeft: 8 }}>— {emr.patientName}</span>}
          </h2>
          <div style={{ marginTop: 4, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            {emr?.patientPhone && <span style={{ fontSize: 12, color: '#64748b' }}>{emr.patientPhone}</span>}
            {emr?.status && (
              <Tag color={STATUS_MAP[emr.status]?.color ?? 'default'}>
                {STATUS_MAP[emr.status]?.label ?? emr.status}
              </Tag>
            )}
            {/* Nhãn cảnh báo readonly khi xem hồ sơ của bác sĩ khác */}
            {!!emr && !isOwner && emr.status !== 'COMPLETED' && (
              <Tag color="orange">Chỉ xem — hồ sơ của bác sĩ khác</Tag>
            )}
          </div>
        </div>

        {/* Hệ thống nút điều hướng */}
        <div style={{ display: 'flex', gap: 8 }}>
        {originalAppointmentId && (
          <Button type="primary" onClick={() => navigate(`/doctor/emr?appointmentId=${originalAppointmentId}&patientId=${patientId}`)} style={{ backgroundColor: '#0d9488', borderColor: '#0d9488', fontSize: 12}}
        >
          ← Quay lại bệnh án hiện tại
        </Button>
        )}
        <Button onClick={() => from === 'list' ? navigate('/doctor/emr') : navigate('/doctor/dashboard')} style={{ fontSize: 12 }}>
          {from === 'list' ? '← Quay lại danh sách bệnh án' : '← Quay lại hàng chờ'}
        </Button>
        </div>
      </div>

      <Spin spinning={loading}>
        {!loading && (
          <div>
          {/* ================= THẺ THÔNG TIN CHI TIẾT BỆNH NHÂN ================= */}
      <div style={{ 
        backgroundColor: '#fff', 
        borderRadius: 12, 
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)', 
        padding: '16px 24px', 
        marginBottom: 16,
        borderLeft: '4px solid #0d9488'
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
          <div>
            <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 2 }}>Họ và tên</div>
            <div style={{ fontWeight: 600, color: '#1e293b', fontSize: 14 }}>{emr?.patientName ?? '—'}</div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 2 }}>Ngày sinh / Tuổi</div>
            <div style={{ fontWeight: 500, color: '#334155' }}>
              {emr?.patientDob ? new Date(emr.patientDob).toLocaleDateString('vi-VN') : '—'} 
              {emr?.patientDob && ` (${calculateAge(emr.patientDob)} tuổi)`}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 2 }}>Giới tính</div>
            <div style={{ fontWeight: 500, color: '#334155' }}>{emr?.patientGender === 'FEMALE' ? 'Nữ' : 
     emr?.patientGender === 'MALE' ? 'Nam' : (emr?.patientGender ?? '—')}</div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 2 }}>Số điện thoại</div>
            <div style={{ fontWeight: 500, color: '#334155' }}>{emr?.patientPhone ?? '—'}</div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 2 }}>Địa chỉ thường trú</div>
            <div style={{ fontWeight: 500, color: '#334155' }}>{emr?.patientAddress ?? '—'}</div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 2 }}>Dịch vụ khám</div>
            <div style={{ fontWeight: 500, color: '#334155' }}>{emr?.serviceName ?? '—'}</div>
          </div>
        </div>
      </div>
      {/* ========================================================================= */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 16, alignItems: 'start' }}>
          
          {/* form nhập liệu bệnh án hiện tại */}
          <div style={{ backgroundColor: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
            <Form form={form} layout="vertical" disabled={isReadOnly} style={{ padding: '20px 24px' }}>
              <Tabs
                size="small"
                items={[
                  {
                    key: 'complaint',
                    label: 'Khai thác bệnh sử',
                    children: (
                      <div style={{ paddingTop: 12 }}>
                        <Form.Item label="Lý do khám" name="chiefComplaint" rules={[{ required: true, message: 'Nhập lý do khám' }]}>
                          <TextArea rows={3} placeholder="Bệnh nhân đến khám vì…" />
                        </Form.Item>
                        <Form.Item label="Triệu chứng" name="symptoms">
                          <TextArea rows={4} placeholder="Mô tả chi tiết triệu chứng..." />
                        </Form.Item>
                      </div>
                    ),
                  },
                  {
                    key: 'clinical',
                    label: 'Khám lâm sàng',
                    children: (
                      <div style={{ paddingTop: 12 }}>
                        <EyeFields prefix="l" label="Mắt trái (OS)" />
                        <EyeFields prefix="r" label="Mắt phải (OD)" />
                      {/* Ảnh xét nghiệm từ Lab Result (nếu có) */}
                      {emr?.labImageUrls?.length > 0 && (
                        <div style={{ marginTop: 16 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 8 }}>
                            Ảnh kết quả đo mắt chuyên sâu ({emr.labImageUrls.length} ảnh)
                          </div>
                          <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                            gap: 10,
                          }}>
                            {emr.labImageUrls.map((url, i) => (
                              <img
                                key={i}
                                src={url}
                                alt={`Ảnh ${i + 1}`}
                                style={{
                                  width: '100%', height: 120, objectFit: 'cover',
                                  borderRadius: 8, border: '1px solid #e2e8f0',
                                  cursor: 'zoom-in', backgroundColor: '#f8fafc',
                                }}
                                onClick={() => window.open(url, '_blank')}
                                onError={(e) => { e.currentTarget.style.display = 'none' }}
                              />
                            ))}
                          </div>
                          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
                            Bấm vào ảnh để xem toàn màn hình
                          </div>
                        </div>
                      )}
                      </div>
                    ),
                  },
                  {
                    key: 'diagnosis',
                    label: 'Chẩn đoán & Điều trị',
                    children: (
                      <div style={{ paddingTop: 12 }}>
                        <Form.Item label="Chẩn đoán" name="diagnosis" rules={[{ required: true, message: 'Nhập chẩn đoán' }]}>
                          <TextArea rows={3} placeholder="Chẩn đoán bệnh..." />
                        </Form.Item>
                        <Form.Item label="Kế hoạch điều trị" name="treatmentPlan">
                          <TextArea rows={4} placeholder="Hướng xử lý, đơn thuốc, tái khám..." />
                        </Form.Item>
                        <Form.Item label="Ghi chú thêm" name="notes">
                          <TextArea rows={3} placeholder="Lưu ý đặc biệt..." />
                        </Form.Item>
                      </div>
                    ),
                  },
                  {
                    key: 'drug_prescription',
                    label: 'Kê đơn thuốc',
                    children: (
                      <DrugPrescriptionForm emr={emr} isReadOnly={isReadOnly} onAutoSaveEMR={handleAutoSave} />
                    ),
                  },
                  {
                    key: 'eyeglass_prescription',
                    label: 'Kê đơn kính',
                    children: (
                      <EyeglassPrescriptionForm emr={emr} isReadOnly={isReadOnly} onAutoSaveEMR={handleAutoSave} />
                    ),
                  },
                ]}
              />
            </Form>

            {/* Khu vực Actions: Chỉ hiện khi hồ sơ chưa HOÀN THÀNH */}
            {!isReadOnly && !loading && (
              <div style={{
                borderTop: '1px solid #f1f5f9', padding: '14px 24px',
                display: 'flex', gap: 10, justifyContent: 'space-between', alignItems: 'center',
              }}>
                {/* Nút chỉ định XN — chỉ hiện khi EMR đang IN_PROGRESS */}
                {emr?.status === 'IN_PROGRESS' ? (
                  <Button
                    onClick={openLabModal}
                    style={{ fontSize: 13, borderColor: '#7c3aed', color: '#7c3aed' }}
                  >
                    Yêu cầu đo mắt chuyên sâu
                  </Button>
                ) : (
                  <div />
                )}

                <div style={{ display: 'flex', gap: 10 }}>
                  <Button onClick={handleSaveDraft} loading={saving} style={{ fontSize: 13 }}>
                    Lưu nháp
                  </Button>
                  <Button
                    type="primary"
                    onClick={handleComplete}
                    loading={saving}
                    style={{ backgroundColor: '#0d9488', borderColor: '#0d9488', fontSize: 13 }}
                  >
                    Hoàn thành khám
                  </Button>
                </div>
             </div>
            )}
          </div>

          {/* Cột phải: Danh sách lịch sử các lần khám bệnh trước đây */}
          <div style={{ backgroundColor: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', padding: '16px' }}>
            <div style={{ fontWeight: 600, fontSize: 14, color: '#1e293b', marginBottom: 12 }}>
              Lịch sử khám trước
            </div>
            {history.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px 0', color: '#94a3b8', fontSize: 13 }}>
                Chưa có lịch sử khám
              </div>
            ) : (
              history.map((r) => (
              <HistoryCard 
              key={r.id} 
              record={r} 
              onClick={() => navigate(
                `/doctor/emr?appointmentId=${r.appointmentId}&patientId=${r.patientId}` +
                (from !== 'list' ? `&originalAppointmentId=${appointmentId}` : '') +
                `&from=${from ?? 'dashboard'}`
              )}
              />
            ))
            )}
            </div>
          </div>
        </div>
        )}
      </Spin>

      {/* Modal tạo Lab Order */}
      <Modal
        open={labModal}
        onCancel={() => setLabModal(false)}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 18 }}>🔬</span>
            <span style={{ fontWeight: 700, fontSize: 16, color: '#0f172a' }}>
              Yêu cầu đo mắt chuyên sâu
            </span>
          </div>
        }
        footer={null}
        width={520}
        destroyOnClose
      >
        <div style={{ padding: '8px 0' }}>
          <p style={{ fontSize: 13, color: '#475569', marginBottom: 20 }}>
            Tạo phiếu chỉ định xét nghiệm cho kỹ thuật viên. Sau khi kỹ thuật viên
            hoàn thành và nộp kết quả, bạn sẽ nhận được thông báo để duyệt.
          </p>

          {/* Chọn kỹ thuật viên */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>
              Kỹ thuật viên <span style={{ color: '#ef4444' }}>*</span>
            </div>
            <Select
              value={labTechnicianId}
              onChange={setLabTechnicianId}
              style={{ width: '100%' }}
              placeholder="Chọn kỹ thuật viên..."
              loading={loadingLabTechs}
              showSearch
              optionFilterProp="label"
              options={(labTechnicians ?? []).map((lt) => ({
                value: lt.id,
                label: lt.fullName,
              }))}
            />
          </div>

          {/* Mức độ ưu tiên */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>
              Mức độ ưu tiên
            </div>
            <Select
              value={labPriority}
              onChange={setLabPriority}
              style={{ width: '100%' }}
              options={[
                { value: 'PRIMARY',    label: '🟢 Thường' },
                { value: 'WARNING',   label: '🟠 Nghiêm trọng' },
                { value: 'EMERGENCY', label: '🔴 Khẩn cấp' },
              ]}
            />
          </div>

          {/* Ghi chú */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>
              Ghi chú cho kỹ thuật viên
            </div>
            <TextArea
              rows={3}
              value={labNotes}
              onChange={(e) => setLabNotes(e.target.value)}
              placeholder="Lưu ý đặc biệt cần kỹ thuật viên chú ý..."
              maxLength={300}
              showCount
            />
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <Button onClick={() => setLabModal(false)} style={{ fontSize: 13 }}>Hủy bỏ</Button>
            <Button
              type="primary"
              loading={creatingOrder}
              onClick={handleCreateLabOrder}
              style={{ fontSize: 13, backgroundColor: '#7c3aed', borderColor: '#7c3aed' }}
            >
              Tạo phiếu chỉ định
            </Button>
          </div>
        </div>
      </Modal>

    </div>  
  )
}
