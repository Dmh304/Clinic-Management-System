/**
 * Trang chi tiết đơn kính cần gia công dành cho Kỹ thuật viên (UC-36).
 * Toàn bộ thông số kính LUÔN readonly với Lab Technician (dùng div hiển thị,
 * không dùng Form/Input, để loại trừ khả năng vô tình cho phép sửa dữ liệu lâm sàng
 * do bác sĩ đã kê — đúng nguyên tắc BR-08 biến thể).
 * Action duy nhất tại đây: "Hoàn tất gia công" (IN_PRODUCTION -> READY).
 * Không có trạng thái COMPLETED — READY là điểm kết thúc của luồng gia công.
 */

import { useEffect, useState, useCallback } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import Header from '../../components/layout/Header'
import { Button, message, Tag, Spin, Row, Col, Divider, Card } from 'antd'
import { eyeglassPrescriptionService } from '../../services/eyeglassPrescriptionService'
import useConfirmAction from '../../hooks/useConfirmAction'

// TẠM THỜI hard-code nhãn hiển thị lensType — xem ghi chú tương tự trong Queue.jsx
const LENS_TYPE_LABEL = {
  SINGLE_VISION: 'Tròng đơn tròng',
  PROGRESSIVE: 'Tròng đa tròng',
  SPECIALTY: 'Tròng chuyên dụng',
}

const STATUS_MAP = {
  PENDING:       { color: 'default',    label: 'Chờ gia công' },
  IN_PRODUCTION: { color: 'processing', label: 'Đang gia công' },
  READY:         { color: 'success',    label: 'Sẵn sàng giao' },
  DISPENSED:     { color: 'default',    label: 'Đã giao' },
  SKIPPED:       { color: 'default',    label: 'Bệnh nhân tự cắt bên ngoài' },
}

/** Ô hiển thị 1 chỉ số kính, luôn readonly cho Lab Technician */
function ReadonlyField({ label, value, suffix }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>{label}</div>
      <div style={{
        padding: '6px 11px', borderRadius: 6, border: '1px solid #e2e8f0',
        backgroundColor: '#f8fafc', color: '#1e293b', fontSize: 14, fontWeight: 500,
      }}>
        {value ?? '—'}{value != null && suffix ? ` ${suffix}` : ''}
      </div>
    </div>
  )
}

export default function EyeglassPrescriptionDetail() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { confirmAction, contextHolder } = useConfirmAction()

  const id = searchParams.get('id')
  const readonly = searchParams.get('readonly') === 'true'

  const [loading, setLoading] = useState(true)
  const [completing, setCompleting] = useState(false)
  const [prescription, setPrescription] = useState(null)

  const loadData = useCallback(async () => {
    if (!id) {
      message.error('Thiếu mã đơn kính')
      navigate('/lab/eyeglass-queue')
      return
    }
    setLoading(true)
    try {
      const res = await eyeglassPrescriptionService.getById(id)
      setPrescription(res.data)
    } catch {
      message.error('Không thể tải chi tiết đơn kính')
    } finally {
      setLoading(false)
    }
  }, [id, navigate])

  useEffect(() => {
    loadData()
  }, [loadData])

  const executeComplete = async () => {
    setCompleting(true)
    try {
      await eyeglassPrescriptionService.completeFabrication(id)
      message.success('Đã hoàn tất gia công đơn kính')
      navigate('/lab/eyeglass-queue')
    } catch (e) {
      message.error(e?.response?.data?.message || 'Không thể cập nhật trạng thái')
    } finally {
      setCompleting(false)
    }
  }

  const handleComplete = () => {
    confirmAction({
      type: 'success',
      title: 'Hoàn tất gia công đơn kính?',
      description: 'Đơn kính sẽ chuyển sang trạng thái "Sẵn sàng giao" để Dược sĩ/Lễ tân bàn giao cho bệnh nhân.',
      details: [
        { label: 'Bệnh nhân', value: prescription?.patientName ?? '—' },
        { label: 'Loại tròng', value: LENS_TYPE_LABEL[prescription?.lensType] ?? prescription?.lensType ?? '—' },
      ],
      confirmText: 'Hoàn tất gia công',
      onConfirm: executeComplete,
    })
  }

  if (loading || !prescription) {
    return (
      <>
        <Header />
        <div style={{ padding: 48, textAlign: 'center' }}>
          <Spin size="large" tip="Đang tải chi tiết đơn kính..." />
        </div>
      </>
    )
  }

  const { status, patientName, doctorName } = prescription

  return (
    <>
      {contextHolder}
      <Header />
      <div style={{ padding: 24, backgroundColor: '#f8fafc', minHeight: 'calc(100vh - 64px)' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>

          <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Button onClick={() => navigate('/lab/eyeglass-queue')} style={{ fontSize: 13 }}>
              ← Quay lại hàng đợi
            </Button>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#0f172a' }}>
              Chi tiết Đơn kính
            </h3>
          </div>

          <Card style={{ borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.05)', marginBottom: 20, borderLeft: '4px solid #0d9488' }}>
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={8}>
                <div style={{ fontSize: 12, color: '#94a3b8' }}>Bệnh nhân</div>
                <div style={{ fontWeight: 600, color: '#1e293b', fontSize: 14 }}>{patientName ?? '—'}</div>
              </Col>
              <Col xs={24} sm={8}>
                <div style={{ fontSize: 12, color: '#94a3b8' }}>Bác sĩ kê đơn</div>
                <div style={{ fontWeight: 500, color: '#334155' }}>{doctorName ?? '—'}</div>
              </Col>
              <Col xs={24} sm={8}>
                <div style={{ fontSize: 12, color: '#94a3b8' }}>Trạng thái</div>
                <Tag color={STATUS_MAP[status]?.color ?? 'default'}>
                  {STATUS_MAP[status]?.label ?? status}
                </Tag>
              </Col>
            </Row>
          </Card>

          <div style={{ backgroundColor: '#fff', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.05)', padding: 24, marginBottom: 20 }}>
            <Row gutter={24}>
              <Col xs={24} md={12}>
                <Divider orientation="left" style={{ margin: '0 0 16px 0' }}>
                  <span style={{ fontWeight: 700, color: '#0f172a' }}>Mắt Phải (OD)</span>
                </Divider>
                <Row gutter={12}>
                  <Col span={12}><ReadonlyField label="Độ cầu (SPH)" value={prescription.odSph} /></Col>
                  <Col span={12}><ReadonlyField label="Độ loạn (CYL)" value={prescription.odCyl} /></Col>
                  <Col span={12}><ReadonlyField label="Trục loạn (AXIS)" value={prescription.odAxis} /></Col>
                  <Col span={12}><ReadonlyField label="Độ cận phụ (ADD)" value={prescription.odAdd} /></Col>
                </Row>
              </Col>
              <Col xs={24} md={12}>
                <Divider orientation="left" style={{ margin: '0 0 16px 0' }}>
                  <span style={{ fontWeight: 700, color: '#0f172a' }}>Mắt Trái (OS)</span>
                </Divider>
                <Row gutter={12}>
                  <Col span={12}><ReadonlyField label="Độ cầu (SPH)" value={prescription.osSph} /></Col>
                  <Col span={12}><ReadonlyField label="Độ loạn (CYL)" value={prescription.osCyl} /></Col>
                  <Col span={12}><ReadonlyField label="Trục loạn (AXIS)" value={prescription.osAxis} /></Col>
                  <Col span={12}><ReadonlyField label="Độ cận phụ (ADD)" value={prescription.osAdd} /></Col>
                </Row>
              </Col>
            </Row>

            <Divider style={{ margin: '8px 0 16px' }} />

            <Row gutter={16}>
              <Col xs={24} sm={8}><ReadonlyField label="Khoảng cách đồng tử (PD)" value={prescription.pd} suffix="mm" /></Col>
              <Col xs={24} sm={8}><ReadonlyField label="Loại tròng kính" value={LENS_TYPE_LABEL[prescription.lensType] ?? prescription.lensType} /></Col>
            </Row>

            {prescription.notes && (
              <div style={{ marginTop: 8, padding: '8px 12px', backgroundColor: '#f0fdf4', borderRadius: 8, fontSize: 13, color: '#15803d' }}>
                <strong>Ghi chú của bác sĩ:</strong> {prescription.notes}
              </div>
            )}
          </div>

          {!readonly && status === 'IN_PRODUCTION' && (
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                type="primary"
                loading={completing}
                onClick={handleComplete}
                style={{ backgroundColor: '#0d9488', borderColor: '#0d9488', fontSize: 13 }}
              >
                Hoàn tất gia công
              </Button>
            </div>
          )}

          {status === 'READY' && (
            <div style={{ textAlign: 'right' }}>
              <Tag color="success" style={{ fontSize: 13, padding: '6px 14px' }}>
                Đơn kính đã sẵn sàng — chờ Dược sĩ/Lễ tân bàn giao cho bệnh nhân
              </Tag>
            </div>
          )}
        </div>
      </div>
    </>
  )
}