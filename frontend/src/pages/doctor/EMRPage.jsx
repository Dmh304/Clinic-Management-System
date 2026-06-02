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

function HistoryCard({ record }) {
  const date = record.createdAt
    ? new Date(record.createdAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : '—'
  const cfg = STATUS_MAP[record.status] ?? { color: 'default', label: record.status }

  return (
    <div style={{
      border: '1px solid #e2e8f0', borderRadius: 10, padding: '14px 16px', marginBottom: 10,
      backgroundColor: '#fafafa',
    }}>
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

  const fetchEMR = useCallback(async () => {
    if (!appointmentId) return
    setLoading(true)
    try {
      const res = await emrService.getByAppointment(appointmentId)
      const data = res.data?.data
      if (data) {
        setEmr(data)
        form.setFieldsValue(emrToFormValues(data))
      }
    } catch {
      // no existing EMR yet — that's fine
    } finally {
      setLoading(false)
    }
  }, [appointmentId, form])

  const fetchHistory = useCallback(async () => {
    if (!patientId) return
    try {
      const res = await emrService.getPatientHistory(patientId)
      const all = res.data?.data ?? []
      // Exclude the current appointment's EMR from history list
      setHistory(all.filter((r) => String(r.appointmentId) !== String(appointmentId)))
    } catch {
      // ignore
    }
  }, [patientId, appointmentId])

  useEffect(() => {
    fetchEMR()
    fetchHistory()
  }, [fetchEMR, fetchHistory])

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

  const handleSave = async (status) => {
    try {
      const values = await form.validateFields()
      setSaving(true)
      const res = await emrService.saveEMR(buildPayload(values, status))
      setEmr(res.data?.data)
      message.success(status === 'COMPLETED' ? 'Đã hoàn thành hồ sơ bệnh án' : 'Đã lưu nháp')
      if (status === 'COMPLETED') navigate('/doctor/dashboard')
    } catch (err) {
      if (err?.errorFields) return // validation error, antd handles it
      message.error('Lưu thất bại, vui lòng thử lại')
    } finally {
      setSaving(false)
    }
  }

  const isCompleted = emr?.status === 'COMPLETED'

  // ── No appointment selected ──
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

            {/* Actions */}
            {!isCompleted && (
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

          {/* ── Right: Patient history ── */}
          <div style={{ backgroundColor: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', padding: '16px' }}>
            <div style={{ fontWeight: 600, fontSize: 14, color: '#1e293b', marginBottom: 12 }}>
              Lịch sử khám trước
            </div>
            {history.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px 0', color: '#94a3b8', fontSize: 13 }}>
                Chưa có lịch sử khám
              </div>
            ) : (
              history.map((r) => <HistoryCard key={r.id} record={r} />)
            )}
          </div>
        </div>
      </Spin>
    </div>
  )
}
