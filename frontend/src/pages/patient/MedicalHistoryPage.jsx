/**
 * Author: TuanTD
 *  
 * * Màn hình: Quản lý và Xem Lịch sử / Chi tiết Hồ sơ bệnh án điện tử (EMR) dành cho Bệnh nhân
 * Tính năng chính:
 * 1. Khởi tạo (Khi không có medicalRecordId): Hiển thị danh sách bảng tất cả lịch hẹn, lịch khám quá khứ/hiện tại của bệnh nhân đó
 * 2. Xem chi tiết (Khi có medicalRecordId): Đổ dữ liệu chi tiết hồ sơ bệnh án mắt (Thị lực VA, Nhãn áp IOP, Khúc xạ SPH/CYL/AXIS...) vào form ở trạng thái chỉ đọc (disabled)
 */

// DucTKH
// Màn hình chi tiết Hồ sơ bệnh án điện tử (EMR) dành cho Bệnh nhân.
// Gồm nhiều tab: Khai thác bệnh sử, Khám lâm sàng, Chẩn đoán & Điều trị, Đơn thuốc, Đơn kính.
import { useEffect, useState, useCallback } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import Header from '../../components/layout/Header'
import { Form, Input, InputNumber, Tabs, Button, message, Tag, Spin, Collapse, Divider, Table } from 'antd'
import { emrService } from '../../services/emrService'
import { appointmentService } from '../../services/appointmentService'
import { prescriptionService } from '../../services/prescriptionService'
import { eyeglassPrescriptionService } from '../../services/eyeglassPrescriptionService'
import { PrinterOutlined } from '@ant-design/icons'

const { TextArea } = Input
const { Panel } = Collapse

/* Cấu hình màu sắc và nhãn hiển thị của trạng thái Hồ sơ bệnh án điện tử (EMR Status) */
const STATUS_MAP = {
  DRAFT:       { color: 'default',    label: 'Nháp' },
  IN_PROGRESS: { color: 'processing', label: 'Đang khám' },
  COMPLETED:   { color: 'success',    label: 'Hoàn thành' },
}

/* Cấu hình màu sắc và nhãn hiển thị cho từng trạng thái Lịch hẹn (Appointment Status) */
const APPOINTMENT_STATUS_MAP = {
  WAITING:     { color: 'orange',     label: 'Đang chờ' },
  IN_PROGRESS: { color: 'processing', label: 'Đang khám' },
  COMPLETED:   { color: 'success',    label: 'Hoàn thành' },
  CANCELLED:   { color: 'error',      label: 'Đã hủy' },
  CONFIRMED:   { color: 'purple',     label: 'Đã xác nhận' },
  PENDING:     { color: 'default',    label: 'Chờ xác nhận' },
}

/* Style cấu hình cắt chữ bằng CSS, giới hạn hiển thị văn bản dài trên 1 dòng kèm dấu 3 chấm (...) */
const textEllipsisStyle = {
  display: '-webkit-box',
  WebkitLineClamp: 1,         // Số dòng tối đa muốn hiển thị trước khi cắt (1 dòng)
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  wordBreak: 'break-all'      // Cắt từ chuẩn xác theo độ rộng cột, tránh tràn layout
};

/* Hàm tiện ích: Tính tuổi chính xác dựa trên Chuỗi ngày tháng năm sinh (YYYY-MM-DD) */
const calculateAge = (dobString) => {
  if (!dobString) return '—';
  const today = new Date();
  const birthDate = new Date(dobString);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  // Trừ đi 1 tuổi nếu chưa đến tháng sinh hoặc chưa đến ngày sinh trong tháng đó
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
};

/* Sub-Component: Hiển thị các trường nhập liệu số chuyên sâu dành cho khám lâm sàng chuyên khoa Mắt */
function EyeFields({ prefix, label }) {
  return (
    <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, padding: '14px 16px', marginBottom: 12 }}>
      <div style={{ fontWeight: 600, fontSize: 13, color: '#475569', marginBottom: 10 }}>{label}</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        
        {/* VA - Thử thị lực không kính */}
        <Form.Item label="VA" name={`${prefix}Va`} style={{ marginBottom: 0 }}>
          <InputNumber style={{ width: '100%' }} placeholder="0.00" step={0.1} min={0} max={2} />
        </Form.Item>
        
        {/* BCVA - Thị lực tối đa sau khi chỉnh kính */}
        <Form.Item label="BCVA" name={`${prefix}Bcva`} style={{ marginBottom: 0 }}>
          <InputNumber style={{ width: '100%' }} placeholder="0.00" step={0.1} min={0} max={2} />
        </Form.Item>
        
        {/* IOP - Chỉ số Nhãn áp (Đơn vị tính: mmHg) */}
        <Form.Item label="IOP (mmHg)" name={`${prefix}Iop`} style={{ marginBottom: 0 }}>
          <InputNumber style={{ width: '100%' }} placeholder="0.0" step={0.5} min={0} />
        </Form.Item>
        
        {/* Ô trống giữ layout grid cân xứng */}
        <div />
        
        {/* SPH - Độ cầu (Cận thị (-) hoặc Viễn thị (+)) */}
        <Form.Item label="SPH" name={`${prefix}Sph`} style={{ marginBottom: 0 }}>
          <InputNumber style={{ width: '100%' }} placeholder="0.00" step={0.25} />
        </Form.Item>
        
        {/* CYL - Độ loạn thị */}
        <Form.Item label="CYL" name={`${prefix}Cyl`} style={{ marginBottom: 0 }}>
          <InputNumber style={{ width: '100%' }} placeholder="0.00" step={0.25} />
        </Form.Item>
        
        {/* AXIS - Trục loạn thị (Góc quay từ 0 đến 180 độ) */}
        <Form.Item label="AXIS (°)" name={`${prefix}Axis`} style={{ marginBottom: 0 }}>
          <InputNumber style={{ width: '100%' }} placeholder="0" min={0} max={180} />
        </Form.Item>
      </div>
    </div>
  )
}

/* Component chính quản lý màn hình Lịch sử/Chi tiết Bệnh án */
export default function MedicalHistoryPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user } = useSelector((s) => s.auth)        // Truy xuất thông tin tài khoản người dùng đăng nhập từ bộ lưu trữ Redux
  const [form] = Form.useForm()

  /* Trích xuất tham số điều hướng id bệnh án (?medicalRecordId=...) từ URL query string */
  const medicalRecordId = searchParams.get('medicalRecordId') 

    /* Khai báo state quản lí dữ liệu */
  const [emr, setEmr] = useState(null)                             // lưu dữ liệu chi tiết của hồ sơ bệnh án đang xem / chỉnh sửa 
  //const [history, setHistory] = useState([])                       // mảng lưu danh sách các lần khám trước đó của bệnh nhân
  const [loading, setLoading] = useState(!!medicalRecordId)          // trạng thái chờ tải thông tin bệnh án chi tiết
  //const [saving, setSaving] = useState(false)                      // trạng thái chờ khi bấm nút lưu
  //const [completedList, setCompletedList] = useState([])           // Danh sách các bệnh án đã hoàn thành
  const [listLoading, setListLoading] = useState(false)            // trạng thái chờ tải danh sách bệnh án đã hoàn thành
  const [searchText, setSearchText] = useState('')                 // từ khóa tìm kiếm theo bệnh án tại màn hình danh sách tổng
  const [appointmentList, setAppointmentList] = useState([])       // Danh sách TOÀN BỘ lịch hẹn của bệnh nhân (mọi trạng thái)
  const [drugPrescriptions, setDrugPrescriptions] = useState([])
  const [eyePrescriptions, setEyePrescriptions] = useState([])

  /**
   * Hàm Tiện Ích: Ánh xạ chuyển đổi cấu trúc thuộc tính từ DTO của Server (API)
   * sang cấu trúc các trường (name) tương thích hoàn toàn với Form Ant Design
   */
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

  const fetchPrescriptions = useCallback(async () => {
    const patientId = user?.patientId || user?.id;
    if (!medicalRecordId || !patientId) return;
    try {
      const [drugRes, eyeRes] = await Promise.all([
          prescriptionService.getByPatient(patientId),
          eyeglassPrescriptionService.getByPatient(patientId)
      ]);
      setDrugPrescriptions((drugRes.data || []).filter(p => String(p.medicalRecordId) === String(medicalRecordId)));
      setEyePrescriptions((eyeRes.data || []).filter(p => String(p.medicalRecordId) === String(medicalRecordId)));
    } catch (error) {
      console.log('fetch prescriptions error', error);
    }
  }, [medicalRecordId, user]);

  const handlePrint = (id, type) => {
      const printContent = document.getElementById(`print-area-${type}-${id}`);
      const originalContents = document.body.innerHTML;
      
      document.body.innerHTML = printContent.innerHTML;
      window.print();
      document.body.innerHTML = originalContents;
      window.location.reload(); // Reload to restore React state bindings
  };

    // Hàm tải dữ liệu bệnh án hiện tại của lịch hẹn (nếu đã từng lưu nháp)
  const fetchEMR = useCallback(async () => {
    if (!medicalRecordId) return
    setLoading(true)
    try {
      const res = await emrService.getById(medicalRecordId)
      const data = res.data
      if (data) {
        setEmr(data)
        form.setFieldsValue(emrToFormValues(data))     // Đổ dữ liệu đã ánh xạ vào form
      }
    } catch (e) {
      console.error('>>> EMR fetch error: ', e)
    } finally {
      setLoading(false)
    }
  }, [medicalRecordId, form])

  /*
   * Tải danh sách lịch hẹn và lịch sử khám của chính bệnh nhân đang đăng nhập,
   * sau đó thực hiện gộp kết quả hai API lại (Merge) dựa theo cặp khóa `appointmentId`
   */
  const fetchAppointments = useCallback(async () => {
    setListLoading(true)
    try {
      // Chạy song song đồng thời cả hai API để tối ưu thời gian phản hồi hệ thống
      const [apptRes, recordRes] = await Promise.all([
        appointmentService.getMyAppointments(),
        emrService.getLoggingInPatientHistory(),
      ])
      const appts = apptRes.data ?? []
      const records = recordRes.data ?? []

      // Tạo một cấu trúc Map tra cứu nhanh từ danh sách bệnh án để tăng hiệu năng gộp dữ liệu
      const recordByAppointmentId = new Map(
        records.map((r) => [String(r.appointmentId), r])
      )

      // Thực hiện ánh xạ, gộp thông tin hồ sơ bệnh án (nếu có) vào từng block lịch hẹn tương ứng
      const merged = appts.map((a) => {
        const record = recordByAppointmentId.get(String(a.id))
        return {
          id: a.id,
          appointmentId: a.id,
          medicalRecordId: record?.id ?? null,                              // Liên kết ID bệnh án nếu lịch hẹn này đã hoàn tất khám
          patientName: a.patientName ?? '—',
          patientPhone: a.patientPhone ?? '—',
          appointmentTime: a.appointmentTime ?? a.createdAt ?? null,        // Ưu tiên giờ khám thực tế
          timeSlot: a.timeSlot ?? null,
          chiefComplaint: record?.chiefComplaint ?? null,
          doctorName: a.doctorName ?? record?.doctorName ?? '—',
          serviceName: a.serviceName ?? '—',
          status: a.status ?? 'PENDING',
          diagnosis: record?.diagnosis ?? null,
        }
      })

      setAppointmentList(merged)
    } catch {
      message.error('Không thể tải lịch sử khám')
    } finally {
      setListLoading(false)
    }
  }, [])

  /* Tải danh sách lịch sử tổng quan ban đầu nếu URL không chỉ định xem chi tiết bệnh án */
  useEffect(() => {
    if (!medicalRecordId) fetchAppointments()
  }, [medicalRecordId, fetchAppointments])

  /* Dọn dẹp, reset toàn bộ dữ liệu form và cập nhật trạng thái loading mỗi khi id bệnh án thay đổi */
  useEffect(() => {
    setEmr(null)
    form.resetFields()
    setLoading(!!medicalRecordId)
  }, [medicalRecordId])

  /* Lắng nghe và kích hoạt fetch chi tiết bệnh án khi hàm fetchEMR thay đổi cấu trúc tham chiếu */
  useEffect(() => {
    fetchEMR()
    fetchPrescriptions()
    //fetchHistory()
  }, [fetchEMR, fetchPrescriptions])

  /* Logic lọc tìm kiếm tại chỗ dựa trên từ khóa bác sĩ hoặc dịch vụ đã nhập */
  const filteredList = appointmentList.filter((r) => {
    if(!searchText) return true
    const keyword = searchText.toLowerCase()
    return (
      r.doctorName?.toLowerCase().includes(keyword) ||
      r.serviceName?.toLowerCase().includes(keyword)
    )
  })

  /* ================= GIAO DIỆN DANH SÁCH LỊCH SỬ KHÁM TỔNG HỢP ================= */
  if(!medicalRecordId){
    return (
      <>
        <Header />
        <div style={{ padding: 24 }}>
          <div style={{ marginBottom: 20 }}>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#0f172a' }}>Hồ sơ bệnh án</h2>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b'}}>
              Danh sách các lần khám của bạn
            </p>
          </div>
          
          <div style={{ backgroundColor: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
            
            {/* Thanh công cụ tìm kiếm trên danh sách */}
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9' }}>
              <Input.Search
                placeholder="Tìm theo tên bác sĩ hoặc dịch vụ..."
                allowClear={true}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                style={{ maxWidth: 400 }}
              />
            </div>
            
            <Spin spinning={listLoading}>
              {filteredList.length === 0 && !listLoading ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8', fontSize: 14 }}>
                  {searchText ? 'Không tìm thấy kết quả phù hợp' : 'Bạn chưa có lịch hẹn nào'}
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: '#f8fafc' }}>
                      {['STT', 'Ngày khám', 'Giờ khám', 'Dịch vụ', 'Bác sĩ', 'Trạng thái', 'Chẩn đoán', ''].map((h) => (
                        <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 13, fontWeight: 600, color: '#475569' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredList.map((r, i) => (
                      <tr
                        key={r.id}
                        style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f0fdf9'} // Hiệu ứng hover dòng hàng
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = ''}
                      >
                        <td style={{ padding: '12px 16px', color: '#64748b', fontSize: 13 }}>{i + 1}</td>
                        <td style={{ padding: '12px 16px', fontSize: 13, color: '#475569' }}>
                          {r.appointmentTime ? new Date(r.appointmentTime).toLocaleDateString('vi-VN') : '—'}
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: 13, color: '#475569' }}>
                          {r.timeSlot ?? (r.appointmentTime
                            ? new Date(r.appointmentTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
                            : '—')}
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: 13, color: '#475569', maxWidth: 180 }}>
                          <div title={r.serviceName ?? '—'} style={textEllipsisStyle}>{r.serviceName ?? '—'}</div>
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: 12, color: '#64748b' }}>
                          {r.doctorName ?? '—'}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <Tag color={APPOINTMENT_STATUS_MAP[r.status]?.color ?? 'default'}>
                            {APPOINTMENT_STATUS_MAP[r.status]?.label ?? r.status}
                          </Tag>
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: 13, color: '#475569', maxWidth: 200 }}>
                          <div title={r.diagnosis ?? '—'} style={textEllipsisStyle}>
                            {r.diagnosis ?? '—'}
                          </div>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          {/* Chỉ hiển thị nút xem chi tiết khi ca khám đã hoàn thành và tồn tại thực thể hồ sơ bệnh án điện tử */}
                          {r.status === 'COMPLETED' && r.medicalRecordId ? (
                            <Button
                              size="small"
                              onClick={() => navigate(`/patient/history?medicalRecordId=${r.medicalRecordId}`)}
                              style={{ fontSize: 12, borderColor: '#0d9488', color: '#0d9488' }}
                            >
                              Xem HSBA
                            </Button>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Spin>
          </div>
        </div>
      </>
    )
  }

  /* ================= GIAO DIỆN CHÍNH XEM CHI TIẾT MỘT BỆNH ÁN ĐIỆN TỬ ================= */
  return (
    <>
      <Header />
      <div style={{ padding: 24 }}>

        {/* Khối tiêu đề thông tin hành chính sơ bộ của Hồ sơ bệnh án */}
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
            </div>
          </div>

          {/* Hệ thống nút hành động điều hướng quay lại */}
          <div style={{ display: 'flex', gap: 8 }}>
            <Button onClick={() => navigate('/patient/history')} style={{ fontSize: 12 }}>
              {'← Quay lại danh sách lịch khám'}
            </Button>
          </div>
        </div>

        <Spin spinning={loading}>
          {!loading && (
            <div>
              {/* Thẻ hiển thị thông tin hành chính chi tiết đầy đủ của bệnh nhân */}
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
                    <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 2 }}>Họ và tên bác sĩ</div>
                    <div style={{ fontWeight: 600, color: '#1e293b', fontSize: 14 }}>{emr?.doctorName ?? '—'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 2 }}>Số điện thoại</div>
                    <div style={{ fontWeight: 500, color: '#334155' }}>{emr?.doctorPhone ?? '—'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 2 }}>Dịch vụ khám</div>
                    <div style={{ fontWeight: 500, color: '#334155' }}>{emr?.serviceName ?? '—'}</div>
                  </div>
                </div>                
                </div>
                {/* ========================================================================= */}
                <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {/* form hiển thị chi tiết bệnh án (chỉ xem, không chỉnh sửa) */}
                  <div style={{ backgroundColor: '#fff', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                    <Form form={form} layout="vertical" disabled={true} style={{ padding: '20px 24px' }}>
                      <Tabs
                        size="small"
                        items={[
                          {
                            key: 'complaint',
                            label: 'Khai thác bệnh sử',
                            children: (
                              <div style={{ paddingTop: 12 }}>
                                <Form.Item label="Lý do khám" name="chiefComplaint">
                                  <TextArea rows={3} placeholder="Bệnh nhân đến khám vì…" style={{ borderRadius: 8 }} />
                                </Form.Item>
                                <Form.Item label="Triệu chứng" name="symptoms">
                                  <TextArea rows={4} placeholder="Mô tả chi tiết triệu chứng..." style={{ borderRadius: 8 }} />
                                </Form.Item>
                              </div>
                            ),
                          },
                          {
                          key: 'clinical',
                          label: 'Khám lâm sàng',
                          children: (
                            <div style={{ paddingTop: 12 }}>
                              {/* Đổ dữ liệu cận lâm sàng chuyên khoa mắt trái và mắt phải */}
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
                                <Form.Item label="Chẩn đoán" name="diagnosis">
                                  <TextArea rows={3} placeholder="Chẩn đoán bệnh..." style={{ borderRadius: 8 }} />
                                </Form.Item>
                                <Form.Item label="Kế hoạch điều trị" name="treatmentPlan">
                                  <TextArea rows={4} placeholder="Hướng xử lý, đơn thuốc, tái khám..." style={{ borderRadius: 8 }} />
                                </Form.Item>
                                <Form.Item label="Ghi chú thêm" name="notes">
                                  <TextArea rows={3} placeholder="Lưu ý đặc biệt..." style={{ borderRadius: 8 }} />
                                </Form.Item>
                              </div>
                            ),
                          },
                          {
                            key: 'drugs',
                            label: 'Đơn thuốc',
                            children: (
                                <div style={{ paddingTop: 12 }}>
                                    {drugPrescriptions.length === 0 ? <p>Chưa có đơn thuốc nào.</p> : (
                                        drugPrescriptions.map(p => (
                                            <div key={p.id} style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: 16, marginBottom: 16 }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                                                    <div>
                                                        <div style={{ fontWeight: 600 }}>Ngày khám: {new Date(p.createdAt).toLocaleDateString('vi-VN')}</div>
                                                        <div style={{ color: '#64748b' }}>Bác sĩ: {p.doctorName}</div>
                                                        <div style={{ color: '#64748b' }}>Trạng thái: {p.status}</div>
                                                    </div>
                                                    <Button icon={<PrinterOutlined />} onClick={() => handlePrint(p.id, 'drug')} disabled={false}>In đơn thuốc</Button>
                                                </div>
                                                
                                                <div id={`print-area-drug-${p.id}`} className="print-area">
                                                    <div className="print-header" style={{ display: 'none' }}>
                                                        <h1 style={{ textAlign: 'center', margin: 0 }}>PHÒNG KHÁM EYESCARE</h1>
                                                        <h2 style={{ textAlign: 'center', marginTop: 10 }}>ĐƠN THUỐC</h2>
                                                        <p><strong>Bệnh nhân:</strong> {p.patientName}</p>
                                                        <p><strong>Bác sĩ khám:</strong> {p.doctorName}</p>
                                                        <p><strong>Ngày kê:</strong> {new Date(p.createdAt).toLocaleDateString('vi-VN')}</p>
                                                        <hr/>
                                                    </div>
                                                    
                                                    <Table 
                                                        dataSource={p.items} 
                                                        rowKey="id" 
                                                        pagination={false} 
                                                        size="small"
                                                        columns={[
                                                            { title: 'Tên thuốc', dataIndex: 'medicineName', render: (t, r) => <b>{t} ({r.dosageForm})</b> },
                                                            { title: 'SL', render: (_, r) => r.actualQuantity != null ? r.actualQuantity : r.quantity },
                                                            { title: 'ĐVT', dataIndex: 'unit' },
                                                            { title: 'Đơn giá', dataIndex: 'unitPrice', render: val => (val || 0).toLocaleString('vi-VN') + ' đ' },
                                                            { title: 'Thành tiền', dataIndex: 'totalPrice', render: val => (val || 0).toLocaleString('vi-VN') + ' đ' },
                                                            { title: 'Cách dùng', render: (_, r) => [r.dosage, r.frequency, r.instructions].filter(v => v && v !== '-').join('. ') }
                                                        ]}
                                                    />

                                                    <div style={{ marginTop: 16, textAlign: 'right', fontSize: 16 }}>
                                                        <strong>Tổng tiền đơn thuốc: </strong>
                                                        <span style={{ color: '#1677ff', fontSize: 18 }}>{p.items?.reduce((sum, item) => sum + (item.totalPrice || 0), 0).toLocaleString('vi-VN')} VNĐ</span>
                                                    </div>
                                                    
                                                    <div className="print-footer" style={{ display: 'none', marginTop: 40, textAlign: 'right' }}>
                                                        <p><strong>Chữ ký Bác sĩ</strong></p>
                                                        <div style={{ height: 60 }}></div>
                                                        <p>{p.doctorName}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )
                          },
                          {
                            key: 'eyeglasses',
                            label: 'Đơn kính',
                            children: (
                                <div style={{ paddingTop: 12 }}>
                                    {eyePrescriptions.length === 0 ? <p>Chưa có đơn kính nào.</p> : (
                                        eyePrescriptions.map(p => (
                                            <div key={p.id} style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: 16, marginBottom: 16 }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                                                    <div>
                                                        <div style={{ fontWeight: 600 }}>Ngày khám: {new Date(p.createdAt).toLocaleDateString('vi-VN')}</div>
                                                        <div style={{ color: '#64748b' }}>Bác sĩ: {p.doctorName}</div>
                                                        <div style={{ color: '#64748b' }}>PD: {p.pd}mm | Loại tròng: {p.lensType}</div>
                                                    </div>
                                                    <Button icon={<PrinterOutlined />} onClick={() => handlePrint(p.id, 'eye')} disabled={false}>In đơn kính</Button>
                                                </div>
                                                
                                                <div id={`print-area-eye-${p.id}`} className="print-area">
                                                    <div className="print-header" style={{ display: 'none' }}>
                                                        <h1 style={{ textAlign: 'center', margin: 0 }}>PHÒNG KHÁM EYESCARE</h1>
                                                        <h2 style={{ textAlign: 'center', marginTop: 10 }}>ĐƠN KÍNH</h2>
                                                        <p><strong>Bệnh nhân:</strong> {p.patientName}</p>
                                                        <p><strong>Bác sĩ đo:</strong> {p.doctorName}</p>
                                                        <p><strong>Ngày đo:</strong> {new Date(p.createdAt).toLocaleDateString('vi-VN')}</p>
                                                        <hr/>
                                                    </div>

                                                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center', marginBottom: 20 }} border="1">
                                                        <thead>
                                                            <tr>
                                                                <th>Mắt</th>
                                                                <th>Cầu (SPH)</th>
                                                                <th>Trụ (CYL)</th>
                                                                <th>Trục (AXIS)</th>
                                                                <th>Cộng thêm (ADD)</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            <tr>
                                                                <td><strong>Phải (OD)</strong></td>
                                                                <td>{p.odSph}</td>
                                                                <td>{p.odCyl}</td>
                                                                <td>{p.odAxis}</td>
                                                                <td>{p.odAdd}</td>
                                                            </tr>
                                                            <tr>
                                                                <td><strong>Trái (OS)</strong></td>
                                                                <td>{p.osSph}</td>
                                                                <td>{p.osCyl}</td>
                                                                <td>{p.osAxis}</td>
                                                                <td>{p.osAdd}</td>
                                                            </tr>
                                                        </tbody>
                                                    </table>

                                                    <p><strong>Khoảng cách đồng tử (PD):</strong> {p.pd} mm</p>
                                                    <p><strong>Loại tròng:</strong> {p.lensType}</p>
                                                    {p.notes && <p><strong>Ghi chú:</strong> {p.notes}</p>}

                                                    <div className="print-footer" style={{ display: 'none', marginTop: 40, textAlign: 'right' }}>
                                                        <p><strong>Chữ ký Bác sĩ</strong></p>
                                                        <div style={{ height: 60 }}></div>
                                                        <p>{p.doctorName}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )
                          },
                        ]}
                      />
                    </Form>
                  </div>
                </div>
              </div>
            )}
             </Spin>
        <style>{`
            @media print {
                body * { visibility: hidden; }
                .print-area, .print-area * { visibility: visible; }
                .print-area { position: absolute; left: 0; top: 0; width: 100%; padding: 20px; }
                .print-header { display: block !important; margin-bottom: 20px; }
                .print-footer { display: block !important; }
                .ant-table-pagination { display: none !important; }
            }
        `}</style>
        </div>
      </div>
    </>
  )
}
