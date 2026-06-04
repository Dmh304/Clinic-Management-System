/**
 * Author: Tuấn - HE204215
 * 
 * Giao diện quản lý Bệnh án điện tử (EMR) cho Bác sĩ. 
 * Cho phép bác sĩ xem bệnh sử trước đó, khai thác triệu chứng hiện tại, khám lâm sàng và lưu hồ sơ bệnh án.
*/

import { useEffect, useState, useCallback } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { Form, Input, InputNumber, Tabs, Button, message, Tag, Spin, Collapse, Divider } from 'antd'
import { emrService } from '../../services/emrService'

const { TextArea } = Input
const { Panel } = Collapse

const STATUS_MAP = {
  DRAFT:       { color: 'default',    label: 'Nháp' },
  IN_PROGRESS: { color: 'processing', label: 'Đang khám' },
  COMPLETED:   { color: 'success',    label: 'Hoàn thành' },
}

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
          <span style={{ fontSize: 11, color: '#94a3b8' }}>BS: {record.doctorName ?? '—'}</span>
          <Tag color={cfg.color} style={{ margin: 0 }}>{cfg.label}</Tag>
        </div>
      </div>
      {record.chiefComplaint && (
        <div style={{ marginBottom: 4 }}>
          <span style={{ fontSize: 12, color: '#64748b', fontWeight: 500 }}>Lý do khám: </span>
          <span style={{ fontSize: 12, color: '#334155' }}>{record.chiefComplaint}</span>
        </div>
      )}
      {record.diagnosis && (
        <div style={{ marginBottom: 4 }}>
          <span style={{ fontSize: 12, color: '#64748b', fontWeight: 500 }}>Chẩn đoán: </span>
          <span style={{ fontSize: 12, color: '#334155' }}>{record.diagnosis}</span>
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

// Component chính của trang quản lý Bệnh án điện tử
export default function EMRPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user } = useSelector((s) => s.auth)
  const [form] = Form.useForm()

  const appointmentId = searchParams.get('appointmentId')
  const patientId = searchParams.get('patientId')

  const [emr, setEmr] = useState(null)
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(!!appointmentId)
  const [saving, setSaving] = useState(false)

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
        form.setFieldsValue(emrToFormValues(data))
      }
    } catch (e) {
      // no existing EMR yet — that's fine
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
      // Exclude the current appointment's EMR from history list
      setHistory(all.filter((r) => String(r.appointmentId) !== String(appointmentId)))
    } catch {
      // ignore
    }
  }, [patientId, appointmentId])

  useEffect(() => {
    setEmr(null)
    setHistory([])
    form.resetFields()
    setLoading(!!appointmentId)
  }, [appointmentId])

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

  // Hàm xử lý việc gọi API lưu trữ bệnh án điện tử
  const handleSave = async (status) => {
    try {
      let values
      if(status === 'COMPLETED'){
        values = await form.validateFields()
      }
      else{
        values = form.getFieldsValue()
      }
      setSaving(true)
      console.log('>>> Payload status: ', buildPayload(values, status).status)
      const res = await emrService.saveEMR(buildPayload(values, status))
      setEmr(res.data)
      message.success(status === 'COMPLETED' ? 'Đã hoàn thành hồ sơ bệnh án' : 'Đã lưu nháp')
        navigate('/doctor/dashboard')
    } catch (err) {
      console.log('>>> Save error: ', err)
      if (err?.errorFields) return
      message.error('Lưu thất bại, vui lòng thử lại')
    } finally {
      setSaving(false)
    }
  }

  const isCompleted = emr?.status === 'COMPLETED'

  // Render khi Bác sĩ CHƯA CHỌN bệnh nhân nào
  // Hiển thị một giao diện hướng dẫn người dùng quay lại Dashboard để chọn lịch hẹn.
  if (!appointmentId) {
    return (
      <div style={{ padding: 24 }}>
        <div style={{ marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#0f172a' }}>Hồ sơ bệnh án</h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>
            Chọn bệnh nhân từ <a onClick={() => navigate('/doctor/dashboard')} style={{ color: '#0d9488', cursor: 'pointer' }}>hàng chờ</a> để tạo hồ sơ
          </p>
        </div>
        <div style={{
          backgroundColor: '#fff', borderRadius: 12, padding: 40,
          textAlign: 'center', border: '1px dashed #cbd5e1',
        }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5" style={{ marginBottom: 12 }}>
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="12" y1="18" x2="12" y2="12" />
            <line x1="9" y1="15" x2="15" y2="15" />
          </svg>
          <div style={{ color: '#64748b', fontSize: 14 }}>Chưa chọn bệnh nhân</div>
        </div>
      </div>
    )
  }

  // Render giao diện CHÍNH của trang Hồ sơ bệnh án điện tử
  return (
    <div style={{ padding: 24 }}>
      {/* Header */}
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
        <Button onClick={() => navigate('/doctor/dashboard')} style={{ fontSize: 12 }}>
          ← Quay lại hàng chờ
        </Button>
      </div>

      <Spin spinning={loading}>
        {!loading && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 16, alignItems: 'start' }}>
          {/* ── Left: EMR form ── */}
          <div style={{ backgroundColor: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
            <Form form={form} layout="vertical" disabled={isCompleted} style={{ padding: '20px 24px' }}>
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
                ]}
              />
            </Form>

            {/* Khu vực Actions (Thao tác lưu): Chỉ hiện khi hồ sơ chưa HOÀN THÀNH */}
            {!isCompleted && !loading && (
              <div style={{
                borderTop: '1px solid #f1f5f9', padding: '14px 24px',
                display: 'flex', gap: 10, justifyContent: 'flex-end',
              }}>
                <Button onClick={() => handleSave('IN_PROGRESS')} loading={saving} style={{ fontSize: 13 }}>
                  Lưu nháp
                </Button>
                <Button
                  type="primary"
                  onClick={() => handleSave('COMPLETED')}
                  loading={saving}
                  style={{ backgroundColor: '#0d9488', borderColor: '#0d9488', fontSize: 13 }}
                >
                  Hoàn thành khám
                </Button>
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
              history.map((r) => <HistoryCard key={r.id} record={r} onClick={() => navigate(`/doctor/emr?appointmentId=${r.appointmentId}&patientId=${r.patientId}`)}/>)
            )}
          </div>
        </div>
        )}
      </Spin>
    </div>
  )
}
