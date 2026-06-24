import { useEffect, useState, useRef } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import Header from '../../components/layout/Header'
import { Form, Input, InputNumber, Button, message, Tag, Spin, Row, Col, Divider, Card } from 'antd'
import { labService } from '../../services/labService'
import { uploadImageToCloudinary } from '../../utils/uploadImage'

const { TextArea } = Input

function LabMultiImageUploader({ values = [], onChange, disabled }) {
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef(null)

  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files ?? [])
    if (files.length === 0) return
    const nonImages = files.filter(f => !f.type.startsWith('image/'))
    if (nonImages.length > 0) {
      message.error('Vui lòng chọn file ảnh (JPG, PNG, WEBP ...)')
      return
    }
    setUploading(true)
    try {
      const urls = await Promise.all(files.map(uploadImageToCloudinary))
      onChange([...values, ...urls])
      message.success(`Đã tải lên ${urls.length} ảnh thành công`)
    } catch {
      message.error('Tải ảnh thất bại, vui lòng thử lại')
    } finally {
      setUploading(false)
      e.target.value = ''   // reset input để có thể chọn lại cùng file
    }
  }

  const handleRemove = (index) => {
    onChange(values.filter((_, i) => i !== index))
  }

return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 8 }}>
        Ảnh kết quả xét nghiệm
        <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 400, marginLeft: 8 }}>
          ({values.length} ảnh)
        </span>
      </div>

      {values.length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
          gap: 12, marginBottom: 12,
        }}>
          {values.map((url, index) => (
            <div key={index} style={{ position: 'relative' }}>
              <img
                src={url}
                alt={`Lab result ${index + 1}`}
                style={{
                  width: '100%', height: 140, objectFit: 'cover',
                  borderRadius: 8, border: '1px solid #e2e8f0',
                  cursor: 'zoom-in', backgroundColor: '#f8fafc',
                }}
                onClick={() => window.open(url, '_blank')}
                onError={(e) => { e.currentTarget.style.display = 'none' }}
              />
              <div style={{
                position: 'absolute', top: 6, left: 6,
                background: 'rgba(0,0,0,0.5)', color: '#fff',
                borderRadius: 4, padding: '2px 6px', fontSize: 11,
              }}>
                {index + 1}
              </div>
              {!disabled && (
                <button
                  onClick={() => handleRemove(index)}
                  style={{
                    position: 'absolute', top: 6, right: 6,
                    background: 'rgba(220,38,38,0.85)', color: '#fff',
                    border: 'none', borderRadius: 4,
                    padding: '2px 7px', cursor: 'pointer', fontSize: 12,
                  }}
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {!disabled && (
        <div
          onClick={() => !uploading && inputRef.current?.click()}
          style={{
            border: '2px dashed #e2e8f0', borderRadius: 10,
            padding: '20px 0', textAlign: 'center',
            color: '#94a3b8', cursor: uploading ? 'wait' : 'pointer',
            backgroundColor: '#f8fafc', transition: 'border-color 0.2s',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = '#0d9488' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0' }}
        >
          {uploading ? (
            <Spin size="small" tip="Đang tải lên..." />
          ) : (
            <>
              <div style={{ fontSize: 24, marginBottom: 6 }}>🖼️</div>
              <div style={{ fontSize: 13 }}>Bấm để thêm ảnh</div>
              <div style={{ fontSize: 12, color: '#cbd5e1', marginTop: 2 }}>
                Có thể chọn nhiều ảnh cùng lúc — JPG, PNG, WEBP
              </div>
            </>
          )}
        </div>
      )}

      {disabled && values.length === 0 && (
        <div style={{
          border: '1px dashed #e2e8f0', borderRadius: 10,
          padding: '20px 0', textAlign: 'center',
          color: '#cbd5e1', fontSize: 13, backgroundColor: '#f8fafc',
        }}>
          Chưa có ảnh đính kèm
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
    </div>
  )
}


export default function LabResultEntryPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [form] = Form.useForm()
  const orderId = searchParams.get('orderId')
  const readonly = searchParams.get('readonly') === 'true'
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [orderInfo, setOrderInfo] = useState(null)
  const [imageUrls, setImageUrls] = useState([])
  const [savingDraft, setSavingDraft] = useState(false)

  useEffect(() => {
    if (!orderId) {
      message.error('Thiếu mã phiếu xét nghiệm')
      navigate('/lab/queue')
      return
    }
    const loadData = async () => {
      setLoading(true)
      try {
        // Tải danh sách hàng chờ để trích xuất thông tin chung của phiếu (Họ tên, SĐT, Bác sĩ chỉ định, notes...)
        const queueRes = await labService.getLabOrderQueue()
        const queueList = queueRes.data ?? []
        const currentOrder = queueList.find((o) => String(o.id) === String(orderId))
        if (currentOrder) {
          setOrderInfo(currentOrder)
        }
        // Nếu ở trạng thái readonly hoặc đã hoàn thành/gửi kết quả, tải kết quả từ server
        if (readonly || (currentOrder && (currentOrder.status === 'SUBMITTED' || currentOrder.status === 'APPROVED' || currentOrder.status === 'IN_PROGRESS'))) {
          try {
            const resultRes = await labService.getLabResults(orderId)
            const resultData = resultRes.data
            if (resultData) {
              form.setFieldsValue({
                vaL: resultData.vaL,
                vaR: resultData.vaR,
                bcvaL: resultData.bcvaL,
                bcvaR: resultData.bcvaR,
                sphL: resultData.sphL,
                sphR: resultData.sphR,
                cylL: resultData.cylL,
                cylR: resultData.cylR,
                axisL: resultData.axisL,
                axisR: resultData.axisR,
                iopL: resultData.iopL,
                iopR: resultData.iopR,
                //imageUrl: resultData.imageUrl,
                doctorNotes: resultData.doctorNotes,
              })
              setImageUrls(resultData.imageUrls ?? []) 
            }
          } catch (err) {
            console.error('Không tìm thấy kết quả đo mắt đã lưu', err)
          }
        }
      } catch (err) {
        message.error('Không thể tải thông tin phiếu xét nghiệm')
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [orderId, readonly, form, navigate])

  const handleSubmit = async (values) => {
    setSubmitting(true)
    try {
      const payload = {
      labOrderId: Number(orderId),
      ...values,
      imageUrls: imageUrls,   // ← array URLs
      imageUrl: undefined,    // ← loại bỏ field cũ
    }
      await labService.submitResult(orderId, payload)
      message.success('Đã gửi kết quả xét nghiệm thành công!')
      navigate('/lab/queue')
    } catch (err) {
      message.error(err.response?.data?.message || 'Gửi kết quả thất bại')
    } finally {
      setSubmitting(false)
    }
  }

  const handleSaveDraft = async () => {
    setSavingDraft(true)
    try {
      const values = form.getFieldsValue()
      const payload = {
        vaL: values.vaL, vaR: values.vaR,
        bcvaL: values.bcvaL, bcvaR: values.bcvaR,
        sphL: values.sphL, sphR: values.sphR,
        cylL: values.cylL, cylR: values.cylR,
        axisL: values.axisL, axisR: values.axisR,
        iopL: values.iopL, iopR: values.iopR,
        imageUrls: imageUrls,
        doctorNotes: values.doctorNotes,
      }
      await labService.saveDraft(orderId, payload)
      message.success('Đã lưu nháp thành công!')
    } catch (err) {
      message.error(err?.response?.data?.message || 'Lưu nháp thất bại')
    } finally {
      setSavingDraft(false)
    }
  }

  const PRIORITY_MAP = {
    PRIMARY: { color: 'green', label: 'Thường' },
    WARNING: { color: 'orange', label: 'Nghiêm trọng' },
    EMERGENCY: { color: 'red', label: 'Khẩn cấp' },
  }
  if (loading) {
    return (
      <>
        <Header />
        <div style={{ padding: 48, textAlign: 'center' }}>
          <Spin size="large" tip="Đang tải dữ liệu..." />
        </div>
      </>
    )
  }
  return (
    <>
      <Header />
      <div style={{ padding: 24, backgroundColor: '#f8fafc', minHeight: 'calc(100vh - 64px)' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          {/* Header Action */}
          <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Button onClick={() => navigate('/lab/queue')} style={{ fontSize: 13 }}>
              ← Quay lại danh sách hàng đợi
            </Button>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#0f172a' }}>
              {readonly ? 'Chi tiết kết quả xét nghiệm' : 'Nhập kết quả xét nghiệm'}
            </h3>
          </div>
          {/* Patient Card */}
          {orderInfo && (
            <Card
              style={{
                borderRadius: 12,
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                marginBottom: 20,
                borderLeft: '4px solid #0d9488',
              }}
            >
              <Row gutter={[16, 16]}>
                <Col xs={24} sm={8}>
                  <div style={{ fontSize: 12, color: '#94a3b8' }}>Bệnh nhân</div>
                  <div style={{ fontWeight: 600, color: '#1e293b', fontSize: 14 }}>
                    {orderInfo.patientFullName ?? '—'}
                  </div>
                </Col>
                <Col xs={24} sm={8}>
                  <div style={{ fontSize: 12, color: '#94a3b8' }}>Số điện thoại</div>
                  <div style={{ fontWeight: 500, color: '#334155' }}>
                    {orderInfo.patientPhone ?? '—'}
                  </div>
                </Col>
                <Col xs={24} sm={8}>
                  <div style={{ fontSize: 12, color: '#94a3b8' }}>Độ ưu tiên</div>
                  <div>
                    <Tag color={PRIORITY_MAP[orderInfo.priority]?.color ?? 'default'}>
                      {PRIORITY_MAP[orderInfo.priority]?.label ?? orderInfo.priority ?? '—'}
                    </Tag>
                  </div>
                </Col>
                <Col xs={24} sm={8}>
                  <div style={{ fontSize: 12, color: '#94a3b8' }}>Bác sĩ chỉ định</div>
                  <div style={{ fontWeight: 500, color: '#334155' }}>
                    {orderInfo.doctorFullName ?? '—'}
                  </div>
                </Col>
                <Col xs={24} sm={16}>
                  <div style={{ fontSize: 12, color: '#94a3b8' }}>Chỉ định xét nghiệm</div>
                  <div style={{ fontWeight: 500, color: '#0d9488' }}>
                    {orderInfo.serviceName ?? 'Chưa xác định dịch vụ'}
                  </div>
                </Col>
                {orderInfo.notes && (
                  <Col span={24}>
                    <div style={{ padding: '8px 12px', backgroundColor: '#f0fdf4', borderRadius: 8, fontSize: 13, color: '#15803d' }}>
                      <strong>Yêu cầu bác sĩ:</strong> {orderInfo.notes}
                    </div>
                  </Col>
                )}
              </Row>
            </Card>
          )}
          {/* Form Results */}
          <Form form={form} layout="vertical" disabled={readonly} onFinish={handleSubmit}>
            <div style={{ backgroundColor: '#fff', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.05)', padding: 24, marginBottom: 20 }}>
              
              {/* Left Eye & Right Eye Grid */}
              <Row gutter={24}>
                {/* Mắt Phải (OD) */}
                <Col xs={24} md={12}>
                  <Divider orientation="left" style={{ margin: '0 0 16px 0' }}>
                    <span style={{ fontWeight: 700, color: '#0f172a' }}>Mắt Phải (OD)</span>
                  </Divider>
                  <Row gutter={12}>
                    <Col span={12}>
                      <Form.Item label="Thị lực (VA)" name="vaR" rules={[{ required: true, message: 'Nhập VA' }]}>
                        <InputNumber style={{ width: '100%' }} placeholder="0.00" step={0.1} min={0} max={2} />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item label="Thị lực tối đa (BCVA)" name="bcvaR" rules={[{ required: true, message: 'Nhập BCVA' }]}>
                        <InputNumber style={{ width: '100%' }} placeholder="0.00" step={0.1} min={0} max={2} />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item label="Độ cầu (SPH)" name="sphR">
                        <InputNumber style={{ width: '100%' }} placeholder="0.00" step={0.25} />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item label="Độ loạn (CYL)" name="cylR">
                        <InputNumber style={{ width: '100%' }} placeholder="0.00" step={0.25} />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item label="Trục loạn (AXIS)" name="axisR">
                        <InputNumber style={{ width: '100%' }} placeholder="0" min={0} max={180} />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item label="Nhãn áp (IOP)" name="iopR">
                        <InputNumber style={{ width: '100%' }} placeholder="0.0" step={0.5} min={0} />
                      </Form.Item>
                    </Col>
                  </Row>
                </Col>
                {/* Mắt Trái (OS) */}
                <Col xs={24} md={12}>
                  <Divider orientation="left" style={{ margin: '0 0 16px 0' }}>
                    <span style={{ fontWeight: 700, color: '#0f172a' }}>Mắt Trái (OS)</span>
                  </Divider>
                  <Row gutter={12}>
                    <Col span={12}>
                      <Form.Item label="Thị lực (VA)" name="vaL" rules={[{ required: true, message: 'Nhập VA' }]}>
                        <InputNumber style={{ width: '100%' }} placeholder="0.00" step={0.1} min={0} max={2} />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item label="Thị lực tối đa (BCVA)" name="bcvaL" rules={[{ required: true, message: 'Nhập BCVA' }]}>
                        <InputNumber style={{ width: '100%' }} placeholder="0.00" step={0.1} min={0} max={2} />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item label="Độ cầu (SPH)" name="sphL">
                        <InputNumber style={{ width: '100%' }} placeholder="0.00" step={0.25} />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item label="Độ loạn (CYL)" name="cylL">
                        <InputNumber style={{ width: '100%' }} placeholder="0.00" step={0.25} />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item label="Trục loạn (AXIS)" name="axisL">
                        <InputNumber style={{ width: '100%' }} placeholder="0" min={0} max={180} />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item label="Nhãn áp (IOP)" name="iopL">
                        <InputNumber style={{ width: '100%' }} placeholder="0.0" step={0.5} min={0} />
                      </Form.Item>
                    </Col>
                  </Row>
                </Col>
              </Row>
              <Divider style={{ margin: '16px 0' }} />
              {/* Image & Notes */}
              <Row gutter={16}>
                <Col span={24}>
                  <LabMultiImageUploader
                    values={imageUrls}
                    onChange={setImageUrls}
                    disabled={readonly}
                  />
                </Col>
                <Col span={24}>
                  <Form.Item label="Ghi chú kết quả xét nghiệm" name="doctorNotes">
                    <TextArea rows={4} placeholder="Nhập kết quả chẩn đoán hình ảnh, nhận xét của kỹ thuật viên..." />
                  </Form.Item>
                </Col>
              </Row>
            </div>
            {/* Actions Bar */}
            {!readonly && (
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <Button onClick={() => navigate('/lab/queue')} style={{ fontSize: 13 }}>
                  Hủy bỏ
                </Button>
                <Button
                  onClick={handleSaveDraft}
                  loading={savingDraft}
                  style={{ fontSize: 13, borderColor: '#f59e0b', color: '#f59e0b' }}
                >
                  Lưu nháp
                </Button>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={submitting}
                  style={{ backgroundColor: '#0d9488', borderColor: '#0d9488', fontSize: 13 }}
                >
                  Hoàn thành và Gửi kết quả
                </Button>
              </div>
            )}
          </Form>
        </div>
      </div>
    </>
  )
}