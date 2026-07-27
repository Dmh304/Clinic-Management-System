/**
 * Trang chi tiết đơn kính cần gia công dành cho Lab Technician (UC-36).
 * Thao tác trên EyeglassOrder. Thông số lâm sàng (SPH/CYL/AXIS/PD) lấy readonly
 * từ toa kính gốc (EyeglassPrescription) — Lab Technician KHÔNG được sửa các giá trị này.
 * Action: "Hoàn tất gia công" (IN_PRODUCTION -> READY), "Giao kính" (READY -> DISPENSED).
 */

import { useEffect, useState, useCallback } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import Header from '../../components/layout/Header'
import { Button, message, Tag, Spin, Row, Col, Divider, Card } from 'antd'
import { eyeglassOrderService } from '../../services/eyeglassOrderService'
import useConfirmAction from '../../hooks/useConfirmAction'


const STATUS_MAP = {
  PENDING_CONFIRMATION: { color: 'default',    label: 'Chờ xác nhận' },
  PENDING_LAB:           { color: 'default',    label: 'Chờ xưởng cắt kính' },
  IN_PRODUCTION:          { color: 'processing', label: 'Đang gia công' },
  READY:                  { color: 'success',    label: 'Sẵn sàng giao' },
  DISPENSED:              { color: 'default',    label: 'Đã giao' },
  CANCELLED:              { color: 'error',      label: 'Đã hủy' },
}

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

export default function EyeglassOrderDetail() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { confirmAction, contextHolder } = useConfirmAction()

  const id = searchParams.get('id')
  const readonly = searchParams.get('readonly') === 'true'

  const [loading, setLoading] = useState(true)
  const [completing, setCompleting] = useState(false)
  const [dispensing, setDispensing] = useState(false)
  const [order, setOrder] = useState(null)

  const loadData = useCallback(async () => {
    if (!id) {
      message.error('Thiếu mã đơn kính')
      navigate('/lab/eyeglass-queue')
      return
    }
    setLoading(true)
    try {
      const res = await eyeglassOrderService.getById(id)
      setOrder(res.data?.data ?? res.data)
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
      await eyeglassOrderService.completeFabrication(id)
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
      description: 'Đơn kính sẽ chuyển sang trạng thái "Sẵn sàng giao" để Lễ tân bàn giao cho bệnh nhân.',
      details: [
        { label: 'Bệnh nhân', value: order?.patientName ?? '—' },
        { label: 'Gọng kính', value: order?.frameName ?? '—' },
      ],
      confirmText: 'Hoàn tất gia công',
      onConfirm: executeComplete,
    })
  }

  const executeDispense = async () => {
    setDispensing(true)
    try {
      await eyeglassOrderService.dispense(id)
      message.success('Đã giao kính cho bệnh nhân')
      navigate('/lab/eyeglass-queue')
    } catch (e) {
      message.error(e?.response?.data?.message || 'Không thể giao kính')
    } finally {
      setDispensing(false)
    }
  }

  const handleDispense = () => {
    confirmAction({
      type: 'success',
      title: 'Xác nhận giao kính cho bệnh nhân?',
      description: 'Đơn kính sẽ chuyển sang trạng thái "Đã giao" và không thể hoàn tác.',
      details: [
        { label: 'Bệnh nhân', value: order?.patientName ?? '—' },
        { label: 'Gọng kính', value: order?.frameName ?? '—' },
      ],
      confirmText: 'Giao kính',
      onConfirm: executeDispense,
    })
  }

  if (loading || !order) {
    return (
      <>
        <Header />
        <div style={{ padding: 48, textAlign: 'center' }}>
          <Spin size="large" tip="Đang tải chi tiết đơn kính..." />
        </div>
      </>
    )
  }

  const { status, patientName, doctorName, frameName, totalAmount, coatings } = order

  return (
    <>
      {contextHolder}
      <Header />
      <div style={{ padding: 24, backgroundColor: '#f8fafc', minHeight: '100%' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>

          <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Button onClick={() => navigate('/lab/eyeglass-queue')} style={{ fontSize: 13 }}>
              ← Quay lại hàng đợi
            </Button>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#0f172a' }}>
              Chi tiết Đơn đặt kính
            </h3>
          </div>

          <Card style={{ borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.05)', marginBottom: 20, borderLeft: '4px solid #0d9488' }}>
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={6}>
                <div style={{ fontSize: 12, color: '#94a3b8' }}>Bệnh nhân</div>
                <div style={{ fontWeight: 600, color: '#1e293b', fontSize: 14 }}>{patientName ?? '—'}</div>
              </Col>
              <Col xs={24} sm={6}>
                <div style={{ fontSize: 12, color: '#94a3b8' }}>Bác sĩ kê đơn</div>
                <div style={{ fontWeight: 500, color: '#334155' }}>{doctorName ?? '—'}</div>
              </Col>
              <Col xs={24} sm={6}>
                <div style={{ fontSize: 12, color: '#94a3b8' }}>Gọng kính / Tổng tiền</div>
                <div style={{ fontWeight: 500, color: '#334155' }}>
                  {frameName ?? '—'} — {totalAmount != null ? `${Number(totalAmount).toLocaleString('vi-VN')} đ` : '—'}
                </div>
              </Col>
              <Col xs={24} sm={6}>
                <div style={{ fontSize: 12, color: '#94a3b8' }}>Trạng thái</div>
                <Tag color={STATUS_MAP[status]?.color ?? 'default'}>
                  {STATUS_MAP[status]?.label ?? status}
                </Tag>
              </Col>
            </Row>
            {coatings?.length > 0 && (
              <div style={{ marginTop: 12, fontSize: 13, color: '#475569' }}>
                <strong>Phủ tròng:</strong> {coatings.join(', ')}
              </div>
            )}
            {status === 'CANCELLED' && order.cancelReason && (
              <div style={{ marginTop: 12, fontSize: 13, color: '#ef4444' }}>
                <strong>Lý do hủy:</strong> {order.cancelReason}
              </div>
            )}
          </Card>

          <div style={{ backgroundColor: '#fff', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.05)', padding: 24, marginBottom: 20 }}>
            <div style={{ marginBottom: 16, fontSize: 13, color: '#94a3b8' }}>
              Thông số lâm sàng dưới đây lấy từ toa kính gốc của bác sĩ — chỉ để tham khảo khi gia công.
            </div>
            <Row gutter={24}>
              <Col xs={24} md={12}>
                <Divider orientation="left" style={{ margin: '0 0 16px 0' }}>
                  <span style={{ fontWeight: 700, color: '#0f172a' }}>Mắt Phải (OD)</span>
                </Divider>
                <Row gutter={12}>
                  <Col span={12}><ReadonlyField label="Độ cầu (SPH)" value={order.odSph} /></Col>
                  <Col span={12}><ReadonlyField label="Độ loạn (CYL)" value={order.odCyl} /></Col>
                  <Col span={12}><ReadonlyField label="Trục loạn (AXIS)" value={order.odAxis} /></Col>
                  <Col span={12}><ReadonlyField label="Độ cận phụ (ADD)" value={order.odAdd} /></Col>
                </Row>
              </Col>
              <Col xs={24} md={12}>
                <Divider orientation="left" style={{ margin: '0 0 16px 0' }}>
                  <span style={{ fontWeight: 700, color: '#0f172a' }}>Mắt Trái (OS)</span>
                </Divider>
                <Row gutter={12}>
                  <Col span={12}><ReadonlyField label="Độ cầu (SPH)" value={order.osSph} /></Col>
                  <Col span={12}><ReadonlyField label="Độ loạn (CYL)" value={order.osCyl} /></Col>
                  <Col span={12}><ReadonlyField label="Trục loạn (AXIS)" value={order.osAxis} /></Col>
                  <Col span={12}><ReadonlyField label="Độ cận phụ (ADD)" value={order.osAdd} /></Col>
                </Row>
              </Col>
            </Row>

            <Divider style={{ margin: '8px 0 16px' }} />

            <Row gutter={16}>
              <Col xs={24} sm={8}><ReadonlyField label="Khoảng cách đồng tử (PD)" value={order.pd} suffix="mm" /></Col>
              <Col xs={24} sm={8}><ReadonlyField label="Loại tròng kính" value={order.lensTypeName} /></Col>
              <Col xs={24} sm={8}><ReadonlyField label="Gọng kính" value={order.frameName} /></Col>
            </Row>

            {order.prescriptionNotes && (
              <div style={{ marginTop: 8, padding: '8px 12px', backgroundColor: '#f0fdf4', borderRadius: 8, fontSize: 13, color: '#15803d' }}>
                <strong>Ghi chú của bác sĩ:</strong> {order.prescriptionNotes}
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
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                type="primary"
                loading={dispensing}
                onClick={handleDispense}
                style={{ backgroundColor: '#16a34a', borderColor: '#16a34a', fontSize: 13 }}
              >
                Giao kính
              </Button>
            </div>
          )}

          {readonly && status === 'READY' && (
            <div style={{ textAlign: 'right' }}>
              <Tag color="success" style={{ fontSize: 13, padding: '6px 14px' }}>
                Đơn kính đã sẵn sàng — chờ bàn giao cho bệnh nhân
              </Tag>
            </div>
          )}
        </div>
      </div>
    </>
  )
}