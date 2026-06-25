/**
 * Author: TuanTD
 * 
 * Trang nhập liệu và hiển thị kết quả đo khám/xét nghiệm mắt chuyên sâu.
 * Thành phần này bao gồm 2 phần chính:
 * 1. LabMultiImageUploader: Component con quản lý việc chọn, kiểm tra định dạng, 
 * tải ảnh kết quả lên Cloudinary và xóa ảnh đính kèm.
 * 2. LabResultEntryPage: Component chính quản lý luồng dữ liệu (Tải thông tin hành chính của bệnh nhân,
 * đồng bộ kết quả cũ/bản nháp từ Server lên Form, xử lý nghiệp vụ Lưu nháp hoặc Gửi kết quả chính thức).
 */

import { useEffect, useState, useRef } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import Header from '../../components/layout/Header'
import { Form, Input, InputNumber, Button, message, Tag, Spin, Row, Col, Divider, Card } from 'antd'
import { labService } from '../../services/labService'
import { uploadImageToCloudinary } from '../../utils/uploadImage'

const { TextArea } = Input

/* ------------------------------------------------------------------ */
/* Component Con: Tải Lên Nhiều Ảnh (LabMultiImageUploader)             */
/* ------------------------------------------------------------------ */

/**
 * Hợp phần xử lý tải lên và hiển thị danh sách hình ảnh kết quả xét nghiệm
 * props.values - Mảng chứa danh sách các đường dẫn URL ảnh hiện tại
 * props.onChange - Hàm callback đồng bộ danh sách URL ảnh ngược lại Form chính
 * props.disabled - Trạng thái vô hiệu hóa chức năng (khi ở chế độ Read-only)
 */
function LabMultiImageUploader({ values = [], onChange, disabled }) {
  // uploading: Quản lý trạng thái đợi khi đang gửi tệp tin lên máy chủ Cloudinary
  const [uploading, setUploading] = useState(false)
  // inputRef: Tham chiếu DOM tới thẻ input[type="file"] ẩn để kích hoạt sự kiện click qua button giao diện
  const inputRef = useRef(null)

  /**
   *  Kiểm tra dữ liệu tệp đầu vào, chặn file không phải ảnh và tiến hành upload bất đồng bộ hàng loạt 
   */
  const handleFileChange = async (e) => {              // e - Sự kiện thay đổi (change) của thẻ input file
    const files = Array.from(e.target.files ?? [])
    if (files.length === 0) return

    // Kiểm tra tính hợp lệ: Chỉ chấp nhận các tệp có định dạng bắt đầu bằng 'image/'
    const nonImages = files.filter(f => !f.type.startsWith('image/'))
    if (nonImages.length > 0) {
      message.error('Vui lòng chọn file ảnh (JPG, PNG, WEBP ...)')
      return
    }

    setUploading(true)
    try {
      // Thực hiện gọi hàm upload đồng thời tất cả các file ảnh lên Cloudinary qua Promise.all
      const urls = await Promise.all(files.map(uploadImageToCloudinary))
      
      // Hợp nhất mảng URL cũ và mảng URL mới tải lên thành công, cập nhật thông qua onChange
      onChange([...values, ...urls])
      message.success(`Đã tải lên ${urls.length} ảnh thành công`)
    } catch {
      message.error('Tải ảnh thất bại, vui lòng thử lại')
    } finally {
      setUploading(false)
      e.target.value = ''   // Khôi phục giá trị rỗng để người dùng có thể chọn lại chính file đó nếu muốn
    }
  }

  /**
   * Xử lý xóa một hình ảnh ra khỏi danh sách dựa trên vị trí (index)
   */
  const handleRemove = (index) => {
    onChange(values.filter((_, i) => i !== index))
  }

  return (
    <div style={{ marginBottom: 16 }}>
      {/* Tiêu đề vùng upload */}
      <div style={{ fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 8 }}>
        Ảnh kết quả xét nghiệm
        <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 400, marginLeft: 8 }}>
          ({values.length} ảnh)
        </span>
      </div>

      {/* Grid hiển thị danh sách các ảnh đã tải lên thành công */}
      {values.length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
          gap: 12, marginBottom: 12,
        }}>
          {values.map((url, index) => (
            <div key={index} style={{ position: 'relative' }}>
              {/* Thẻ hiển thị ảnh - bấm vào sẽ mở tab mới xem ảnh gốc */}
              <img
                src={url}
                alt={`Lab result ${index + 1}`}
                style={{
                  width: '100%', height: 140, objectFit: 'cover',
                  borderRadius: 8, border: '1px solid #e2e8f0',
                  cursor: 'zoom-in', backgroundColor: '#f8fafc',
                }}
                onClick={() => window.open(url, '_blank')}
                onError={(e) => { e.currentTarget.style.display = 'none' }} // Ẩn ảnh nếu lỗi đường truyền/hỏng URL
              />
              {/* Badge đánh số thứ tự hình ảnh */}
              <div style={{
                position: 'absolute', top: 6, left: 6,
                background: 'rgba(0,0,0,0.5)', color: '#fff',
                borderRadius: 4, padding: '2px 6px', fontSize: 11,
              }}>
                {index + 1}
              </div>
              {/* Nút xóa ảnh (Chỉ hiển thị khi không ở chế độ readonly) */}
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

      {/* Vùng kéo thả / Bấm kích hoạt chọn file (Ẩn đi khi ở trạng thái disabled) */}
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

      {/* Hiển thị thông báo trống khi ở trạng thái readonly và không có bức ảnh nào */}
      {disabled && values.length === 0 && (
        <div style={{
          border: '1px dashed #e2e8f0', borderRadius: 10,
          padding: '20px 0', textAlign: 'center',
          color: '#cbd5e1', fontSize: 13, backgroundColor: '#f8fafc',
        }}>
          Chua có ảnh đính kèm
        </div>
      )}

      {/* Thẻ Input File ẩn để nhận diện sự kiện chọn tệp của hệ điều hành */}
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

/* ------------------------------------------------------------------ */
/* Component Chính: Nhập Kết Quả Xét Nghiệm (LabResultEntryPage)        */
/* ------------------------------------------------------------------ */
export default function LabResultEntryPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [form] = Form.useForm()

  // Lấy các tham số cấu hình luồng làm việc trên URL Query String
  const orderId = searchParams.get('orderId')
  const readonly = searchParams.get('readonly') === 'true' // Chuyển đổi chuỗi URL sang kiểu boolean

  /* --- Quản lý các State cục bộ --- */
  const [loading, setLoading] = useState(true)               // Trạng thái tải dữ liệu ban đầu của trang
  const [submitting, setSubmitting] = useState(false)         // Đợi khi đang bấm nút "Gửi kết quả chính thức"
  const [savingDraft, setSavingDraft] = useState(false)       // Đợi khi đang bấm nút "Lưu bản nháp"
  const [orderInfo, setOrderInfo] = useState(null)           // Thông tin hành chính và chỉ định của phiếu xét nghiệm
  const [imageUrls, setImageUrls] = useState([])             // Mảng lưu trữ danh sách URL ảnh phục vụ cho upload

  /**
   * Luồng Effect: Chịu trách nhiệm khởi tạo trang
   * Kiểm tra tính hợp lệ của tham số orderId, tải dữ liệu hành chính của phiếu và lấy thông tin kết quả đo khám cũ nếu có
   */
  useEffect(() => {
    if (!orderId) {
      message.error('Thiếu mã phiếu xét nghiệm')
      navigate('/lab/queue')
      return
    }

    const loadData = async () => {
      setLoading(true)
      try {
        // Tải danh sách hàng chờ hiện tại để trích xuất thông tin chung của phiếu (Họ tên, SĐT, Bác sĩ chỉ định...)
        const queueRes = await labService.getLabOrderQueue()
        const queueList = queueRes.data ?? []
        const currentOrder = queueList.find((o) => String(o.id) === String(orderId))
        
        if (currentOrder) {
          setOrderInfo(currentOrder)
        }

        // Kiểm tra trạng thái phiếu. Nếu là Read-only hoặc đã từng được tác động (SUBMITTED, APPROVED, IN_PROGRESS)
        // thì tiến hành gọi API riêng biệt để đổ kết quả chi tiết đo mắt lên Form.
        if (readonly || (currentOrder && (currentOrder.status === 'SUBMITTED' || currentOrder.status === 'APPROVED' || currentOrder.status === 'IN_PROGRESS'))) {
          try {
            const resultRes = await labService.getLabResults(orderId)
            const resultData = resultRes.data
            if (resultData) {
              // Điền toàn bộ các chỉ số đo mắt chuyên khoa (Khúc xạ, nhãn áp...) vào các ô Input tương ứng
              form.setFieldsValue({
                vaL: resultData.vaL,          // Thị lực mắt trái
                vaR: resultData.vaR,          // Thị lực mắt phải
                bcvaL: resultData.bcvaL,      // Thị lực tối đa có kính mắt trái
                bcvaR: resultData.bcvaR,      // Thị lực tối đa có kính mắt phải
                sphL: resultData.sphL,        // Độ cầu mắt trái
                sphR: resultData.sphR,        // Độ cầu mắt phải
                cylL: resultData.cylL,        // Độ loạn mắt trái
                cylR: resultData.cylR,        // Độ loạn mắt phải
                axisL: resultData.axisL,      // Trục loạn mắt trái
                axisR: resultData.axisR,      // Trục loạn mắt phải
                iopL: resultData.iopL,        // Nhãn áp mắt trái
                iopR: resultData.iopR,        // Nhãn áp mắt phải
                doctorNotes: resultData.doctorNotes, // Ghi chú chẩn đoán/nhận xét
              })
              // Cập nhật danh sách ảnh kết quả riêng biệt cho component uploader
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

  /**
   * Xử lý gửi kết quả xét nghiệm chính thức lên Server (Chuyển trạng thái đơn sang SUBMITTED)
   */
  const handleSubmit = async (values) => {          // values - Các giá trị thu thập được từ cấu trúc Form của Ant Design
    setSubmitting(true)
    try {
      // Chuẩn hóa cấu trúc dữ liệu trước khi gửi đi
      const payload = {
        labOrderId: Number(orderId),
        ...values,
        imageUrls: imageUrls,   // Đưa mảng URL ảnh thu được từ state vào payload
        imageUrl: undefined,    // Loại bỏ trường dữ liệu đơn lẻ cũ (nếu có hệ thống cũ lưu 1 ảnh) để đồng bộ API mới
      }
      // Gửi dữ liệu cập nhật chính thức lên server
      await labService.submitResult(orderId, payload)
      message.success('Đã gửi kết quả xét nghiệm thành công!')
      navigate('/lab/queue') // Quay trở lại màn hình hàng đợi sau khi xử lý thành công
    } catch (err) {
      message.error(err.response?.data?.message || 'Gửi kết quả thất bại')
    } finally {
      setSubmitting(false)
    }
  }

  /**
   * Thu thập dữ liệu hiện tại trên Form để lưu trạng thái nháp (Chuyển trạng thái đơn sang IN_PROGRESS)
   * Giúp kỹ thuật viên giữ lại tiến trình làm việc nếu chưa đo xong hoặc cần bổ sung ảnh sau
   */
  const handleSaveDraft = async () => {
    setSavingDraft(true)
    try {
      const values = form.getFieldsValue() // Lấy dữ liệu tạm thời trên Form bất kể có thỏa mãn luật Validate hay không
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

  // Bản đồ cấu hình nhãn màu sắc phục vụ hiển thị mức độ ưu tiên của ca bệnh
  const PRIORITY_MAP = {
    PRIMARY: { color: 'green', label: 'Thường' },
    WARNING: { color: 'orange', label: 'Nghiêm trọng' },
    EMERGENCY: { color: 'red', label: 'Khẩn cấp' },
  }

  // Khung render chờ khi toàn bộ dữ liệu trang chưa được kéo về hoàn tất
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
          
          {/* --- Thanh điều hướng và tiêu đề trang --- */}
          <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Button onClick={() => navigate('/lab/queue')} style={{ fontSize: 13 }}>
              ← Quay lại danh sách hàng đợi
            </Button>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#0f172a' }}>
              {readonly ? 'Chi tiết kết quả xét nghiệm' : 'Nhập kết quả xét nghiệm'}
            </h3>
          </div>

          {/* --- Khối thông tin hành chính bệnh nhân (Patient Info Card) --- */}
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
                {/* <Col xs={24} sm={16}>
                  <div style={{ fontSize: 12, color: '#94a3b8' }}>Chỉ định xét nghiệm</div>
                  <div style={{ fontWeight: 500, color: '#0d9488' }}>
                    {orderInfo.serviceName ?? 'Chưa xác định dịch vụ'}
                  </div>
                </Col> */}
                {/* Hiển thị lưu ý lâm sàng từ bác sĩ nếu có */}
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

          {/* --- Form Nhập Kết Quả Khúc Xạ Chi Tiết --- */}
          <Form form={form} layout="vertical" disabled={readonly} onFinish={handleSubmit}>
            <div style={{ backgroundColor: '#fff', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.05)', padding: 24, marginBottom: 20 }}>
              
              {/* Layout hai cột phân chia rõ ràng: Mắt phải và Mắt trái */}
              <Row gutter={24}>
                
                {/* -------------------- Mắt Phải (Oculus Dexter - OD) -------------------- */}
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

                {/* -------------------- Mắt Trái (Oculus Sinister - OS) -------------------- */}
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
              
              {/* Khối quản lý hình ảnh kết quả đính kèm và văn bản Nhận xét */}
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

            {/* --- Thanh Thao Tác (Actions Bar - Ẩn khi ở trạng thái Read-only) --- */}
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