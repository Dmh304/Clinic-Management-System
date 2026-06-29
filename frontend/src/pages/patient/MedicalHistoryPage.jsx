import { useEffect, useState, useCallback } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import Header from '../../components/layout/Header'
import { Form, Input, InputNumber, Tabs, Button, message, Tag, Spin, Collapse, Divider, Table } from 'antd'
import { emrService } from '../../services/emrService'
import { appointmentService } from '../../services/appointmentService'

const { TextArea } = Input
const { Panel } = Collapse

/* Cấu hình màu sắc trạng thái của hồ sơ bệnh án */
const STATUS_MAP = {
  DRAFT:       { color: 'default',    label: 'Nháp' },
  IN_PROGRESS: { color: 'processing', label: 'Đang khám' },
  COMPLETED:   { color: 'success',    label: 'Hoàn thành' },
}

/* Cấu hình màu sắc và nhãn hiển thị cho từng trạng thái lịch hẹn */
const APPOINTMENT_STATUS_MAP = {
  WAITING:     { color: 'orange',     label: 'Đang chờ' },
  IN_PROGRESS: { color: 'processing', label: 'Đang khám' },
  COMPLETED:   { color: 'success',    label: 'Hoàn thành' },
  CANCELLED:   { color: 'error',      label: 'Đã hủy' },
  CONFIRMED:   { color: 'purple',       label: 'Đã xác nhận' },
  PENDING:     { color: 'default',    label: 'Chờ xác nhận' },
}

const textEllipsisStyle = {
  display: '-webkit-box',
  WebkitLineClamp: 1, // Số dòng muốn hiển thị trước khi cắt (ở đây là 1 dòng)
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  wordBreak: 'break-all' // Giúp cắt từ chuẩn xác theo độ rộng cột
};

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

// Component hiển thị các trường nhập liệu dành cho khám lâm sàng Mắt (thị lực, nhãn áp, khúc xạ...)
function EyeFields({ prefix, label }) {
  return (
    <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, padding: '14px 16px', marginBottom: 12 }}>
      <div style={{ fontWeight: 600, fontSize: 13, color: '#475569', marginBottom: 10 }}>{label}</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12 }}>
        <Form.Item label="VA" name={`${prefix}Va`} style={{ marginBottom: 0 }}>
          <InputNumber style={{ width: '100%' }} placeholder="0.00" step={0.1} min={0} max={2} />
        </Form.Item>
        <Form.Item label="BCVA" name={`${prefix}Bcva`} style={{ marginBottom: 0 }}>
          <InputNumber style={{ width: '100%' }} placeholder="0.00" step={0.1} min={0} max={2} />
        </Form.Item>
        <Form.Item label="IOP (mmHg)" name={`${prefix}Iop`} style={{ marginBottom: 0 }}>
          <InputNumber style={{ width: '100%' }} placeholder="0.0" step={0.5} min={0} />
        </Form.Item>
        <div />
        <Form.Item label="SPH" name={`${prefix}Sph`} style={{ marginBottom: 0 }}>
          <InputNumber style={{ width: '100%' }} placeholder="0.00" step={0.25} />
        </Form.Item>
        <Form.Item label="CYL" name={`${prefix}Cyl`} style={{ marginBottom: 0 }}>
          <InputNumber style={{ width: '100%' }} placeholder="0.00" step={0.25} />
        </Form.Item>
        <Form.Item label="AXIS (°)" name={`${prefix}Axis`} style={{ marginBottom: 0 }}>
          <InputNumber style={{ width: '100%' }} placeholder="0" min={0} max={180} />
        </Form.Item>
      </div>
    </div>
  )
}


export default function MedicalHistoryPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user } = useSelector((s) => s.auth)        // lấy thông tin tài khoản bệnh nhân đang đăng nhập
  const [form] = Form.useForm()

     /* Trích xuất các tham số điều hướng từ url */
  const medicalRecordId = searchParams.get('medicalRecordId')                                  // id của lịch khám

    /* Khai báo state quản lí dữ liệu */
  const [emr, setEmr] = useState(null)                             // lưu dữ liệu chi tiết của hồ sơ bệnh án đang xem / chỉnh sửa 
  //const [history, setHistory] = useState([])                       // mảng lưu danh sách các lần khám trước đó của bệnh nhân
  const [loading, setLoading] = useState(!!medicalRecordId)          // trạng thái chờ tải thông tin bệnh án chi tiết
  //const [saving, setSaving] = useState(false)                      // trạng thái chờ khi bấm nút lưu
  //const [completedList, setCompletedList] = useState([])           // Danh sách các bệnh án đã hoàn thành
  const [listLoading, setListLoading] = useState(false)            // trạng thái chờ tải danh sách bệnh án đã hoàn thành
  const [searchText, setSearchText] = useState('')                 // từ khóa tìm kiếm theo bệnh án tại màn hình danh sách tổng
  const [appointmentList, setAppointmentList] = useState([])       // Danh sách TOÀN BỘ lịch hẹn của bệnh nhân (mọi trạng thái)

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

    /* Biến cờ kiểm tra xem hồ sơ này đã được chốt hoàn thành chưa */
  //const isCompleted = emr?.status === 'COMPLETED'  // tạm thời thêm vào để code không bị lỗi

 // Hàm tải danh sách các lần khám trước đây của bệnh nhân (bỏ qua lịch hẹn hiện tại)
  // const fetchHistory = useCallback(async () => {
  //   try {
  //     const res = await emrService.getLoggingInPatientHistory()
  //     const all = res.data ?? []
      
  //     // Loại trừ các ca khám hiện tại ra khỏi danh sách lịch sử bệnh án
  //     setHistory(all.filter((r) => String(r.appointmentId) !== String(appointmentId)))
  //   } catch {
  //     // bỏ qua lỗi âm thầm để không ảnh hưởng luồng khám chính
  //   }
  // }, [appointmentId])

    // Hàm tải dữ liệu bệnh án hiện tại của lịch hẹn (nếu đã từng lưu nháp)
  const fetchEMR = useCallback(async () => {
    if (!medicalRecordId) return
    setLoading(true)
    try {
      const res = await emrService.getById(medicalRecordId)
      const data = res.data
      //console.log('>>> EMR data: ', data)
      if (data) {
        setEmr(data)
        form.setFieldsValue(emrToFormValues(data))     // đổ dữ liệu vào các trường nhập liệu
      }
    } catch (e) {
      // no existing EMR yet — that's fine
      console.log('>>> EMR fetch error: ', e)
    } finally {
      setLoading(false)
    }
  }, [medicalRecordId, form])

   /* Gọi API tải danh sách toàn bộ các bệnh án đã hoàn thành */
  // const fetchCompletedList = useCallback(async () => {
  //   setListLoading(true)
  //   try{
  //     const res = await emrService.getLoggingInPatientHistory()
  //     setCompletedList(res.data ?? [])
  //   } catch {
  //     message.error('Không thể tải danh sách bệnh án')
  //   } finally {
  //     setListLoading(false)
  //   }
  // }, [])

  const fetchAppointments = useCallback(async () => {
    setListLoading(true)
    try {
      const [apptRes, recordRes] = await Promise.all([
        appointmentService.getMyAppointments(),
        emrService.getLoggingInPatientHistory(),
      ])
      const appts = apptRes.data ?? []
      const records = recordRes.data ?? []

      const recordByAppointmentId = new Map(
        records.map((r) => [String(r.appointmentId), r])
      )

      const merged = appts
        .filter((a) => a.status === 'COMPLETED')
        .map((a) => {
        const record = recordByAppointmentId.get(String(a.id))
        return {
          id: a.id,
          appointmentId: a.id,
          medicalRecordId: record?.id ?? null,
          patientName: a.patientName ?? '—',
          patientPhone: a.patientPhone ?? '—',
          appointmentTime: a.appointmentTime ?? a.createdAt ?? null,   // dùng ngày giờ khám thực tế, không phải ngày tạo record
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

  /* Hook khởi chạy: tải danh sách tổng nếu url không có appointmentId */
  useEffect(() => {
    if (!medicalRecordId) fetchAppointments()
  }, [medicalRecordId, fetchAppointments])

    /* Reset toàn bộ form và state khi id lịch hẹn thay đổi */
  useEffect(() => {
    setEmr(null)
    //setHistory([])
    form.resetFields()
    setLoading(!!medicalRecordId)
  }, [medicalRecordId])

    /* Kéo dữ liệu bệnh án hiện tại và bệnh sử liên quan */
  useEffect(() => {
    fetchEMR()
    //fetchHistory()
  }, [fetchEMR])

    /* Xử lí bộ lọc tìm kiếm tại chỗ trên danh sách các bệnh án đã hoàn thành */
  const filteredList = appointmentList.filter((r) => {
    if(!searchText) return true
    const keyword = searchText.toLowerCase()
    return (
      r.doctorName?.toLowerCase().includes(keyword) ||
      r.serviceName?.includes(keyword)
    )
  })

  const columns = [
    {
      title: 'STT',
      key: 'stt',
      width: 60,
      render: (_, __, index) => <span style={{ color: '#64748b', fontSize: 13 }}>{index + 1}</span>,
    },
    {
      title: 'Ngày khám',
      dataIndex: 'appointmentTime',
      key: 'appointmentTime',
      render: (time) => (
        <span style={{ fontSize: 13, color: '#334155' }}>
          {time ? new Date(time).toLocaleDateString('vi-VN') : '—'}
        </span>
      ),
    },
    {
      title: 'Giờ khám',
      key: 'timeSlot',
      render: (_, r) => (
        <span style={{ fontSize: 13, color: '#334155' }}>
          {r.timeSlot ?? (r.appointmentTime
            ? new Date(r.appointmentTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
            : '—')}
        </span>
      ),
    },
    {
      title: 'Dịch vụ',
      dataIndex: 'serviceName',
      key: 'serviceName',
      render: (name) => (
        <span style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>
          {name ?? '—'}
        </span>
      ),
    },
    {
      title: 'Bác sĩ',
      dataIndex: 'doctorName',
      key: 'doctorName',
      render: (name) => (
        <span style={{ fontSize: 13, color: '#475569' }}>
          {name ?? '—'}
        </span>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const mapped = APPOINTMENT_STATUS_MAP[status] ?? { color: 'default', label: status }
        return (
          <Tag color={mapped.color} style={{ borderRadius: 6, fontWeight: 500 }}>
            {mapped.label}
          </Tag>
        )
      },
    },
    {
      title: 'Chẩn đoán',
      dataIndex: 'diagnosis',
      key: 'diagnosis',
      render: (diag) => (
        <span style={{ fontSize: 13, color: '#475569' }} title={diag ?? '—'}>
          {diag ? (diag.length > 40 ? diag.substring(0, 40) + '...' : diag) : '—'}
        </span>
      ),
    },
    {
      title: 'Hành động',
      key: 'action',
      render: (_, r) => {
        if (r.status === 'COMPLETED' && r.medicalRecordId) {
          return (
            <Button
              type="primary"
              size="small"
              onClick={() => navigate(`/patient/history?medicalRecordId=${r.medicalRecordId}`)}
              style={{
                fontSize: 12,
                backgroundColor: '#0d9488',
                borderColor: '#0d9488',
                borderRadius: 6,
                fontWeight: 500,
              }}
            >
              Xem HSBA
            </Button>
          )
        }
        return null
      },
    },
  ]

  if (!medicalRecordId) {
    return (
      <>
        <Header />
        <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', padding: '32px 24px' }}>
          <div style={{ maxWidth: 1000, margin: '0 auto' }}>
            <div style={{ marginBottom: 24 }}>
              <h2 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#1e293b' }}>Hồ sơ bệnh án</h2>
              <p style={{ margin: '4px 0 0', fontSize: 14, color: '#64748b' }}>
                Danh sách các lần khám và bệnh án điện tử của bạn
              </p>
            </div>
            <div style={{ backgroundColor: '#fff', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #e2e8f0', overflow: 'hidden', padding: 20 }}>
              {/* Thanh tìm kiếm */}
              <div style={{ marginBottom: 16 }}>
                <Input.Search
                  placeholder="Tìm theo tên bác sĩ hoặc dịch vụ..."
                  allowClear={true}
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  style={{ maxWidth: 400 }}
                />
              </div>
              <Table
                columns={columns}
                dataSource={filteredList}
                rowKey="id"
                loading={listLoading}
                pagination={{ pageSize: 8, showSizeChanger: false }}
                locale={{ emptyText: searchText ? 'Không tìm thấy kết quả phù hợp' : 'Bạn chưa có lịch hẹn nào' }}
              />
            </div>
          </div>
        </div>
      </>
    )
  }

  // Render giao diện CHÍNH của trang Hồ sơ bệnh án điện tử
  return (
    <>
      <Header />
      <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', padding: '32px 24px' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          {/* khối header thông tin bệnh nhân đang tiếp đón */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#1e293b' }}>
                Chi tiết Hồ sơ bệnh án
                {emr?.patientName && <span style={{ fontWeight: 400, color: '#64748b', fontSize: 15, marginLeft: 8 }}>— {emr.patientName}</span>}
              </h2>
              <div style={{ marginTop: 4, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                {emr?.patientPhone && <span style={{ fontSize: 12, color: '#64748b' }}>{emr.patientPhone}</span>}
                {emr?.status && (
                  <Tag color={STATUS_MAP[emr.status]?.color ?? 'default'} style={{ borderRadius: 6 }}>
                    {STATUS_MAP[emr.status]?.label ?? emr.status}
                  </Tag>
                )}
              </div>
            </div>

            {/* Hệ thống nút điều hướng */}
            <div style={{ display: 'flex', gap: 8 }}>
              <Button onClick={() => navigate('/patient/history')} style={{ fontSize: 13, borderRadius: 8 }}>
                {'← Quay lại danh sách'}
              </Button>
            </div>
          </div>

          <Spin spinning={loading}>
            {!loading && (
              <div>
                {/* ================= THẺ THÔNG TIN CHI TIẾT BỆNH NHÂN (MỚI THÊM) ================= */}
                <div style={{
                  backgroundColor: '#fff',
                  borderRadius: 12,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                  border: '1px solid #e2e8f0',
                  padding: '20px 24px',
                  marginBottom: 16,
                  borderLeft: '4px solid #0d9488' // Tạo điểm nhấn màu Teal đồng bộ với nút của bạn
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
                    <div style={{ gridColumn: '1 / -1' }}>
                      <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 2 }}>Địa chỉ thường trú</div>
                      <div style={{ fontWeight: 500, color: '#334155' }}>{emr?.patientAddress ?? '—'}</div>
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
                                <EyeFields prefix="l" label="Mắt trái (OS)" />
                                <EyeFields prefix="r" label="Mắt phải (OD)" />
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
                        ]}
                      />
                    </Form>
                  </div>
                </div>
              </div>
            )}
          </Spin>
        </div>
      </div>
    </>
  )
}
