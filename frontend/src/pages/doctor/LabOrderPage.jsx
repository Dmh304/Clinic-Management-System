/**
 * Author: TuanTD
 * 
 * Giao diện làm việc chính của bác sĩ đối với danh sách đơn xét nghiệm đã tạo
 */


import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import Header from '../../components/layout/Header'
import { Button, Input, Tag, Spin, Result, Modal, Row, Col, Card, message } from 'antd'
import { labService } from '../../services/labService'

const { TextArea } = Input

/* ================================================================== */
/* CONFIGURATIONS & MAPPINGS (Cấu hình hằng số và Ánh xạ dữ liệu)    */
/* ================================================================== */

/**
 * Ánh xạ trạng thái phiếu xét nghiệm (Lab Order Status)
 * Khớp chính xác với cấu hình Enum ở hệ thống Backend
 * Dùng để hiển thị Tag màu và Label tiếng Việt tương ứng trên giao diện
 */
const LAB_ORDER_STATUS_MAP = {
  PENDING:     { color: 'default',    label: 'Chờ thực hiện' }, // KTV chưa tiếp nhận/thực hiện
  IN_PROGRESS: { color: 'processing', label: 'Đang thực hiện' }, // KTV đang tiến hành đo khám
  SUBMITTED:   { color: 'orange',     label: 'Chờ duyệt' },     // KTV đã nộp kết quả, chờ Bác sĩ duyệt
  APPROVED:    { color: 'success',    label: 'Đã duyệt' },      // Bác sĩ đã chấp nhận kết quả
  REJECTED:    { color: 'error',      label: 'Đã từ chối' },    // Bác sĩ từ chối kết quả, yêu cầu làm lại
}

/**
 * Ánh xạ mức độ ưu tiên của ca xét nghiệm (Priority Level)
 */
const PRIORITY_MAP = {
  PRIMARY:   { color: 'green',  label: 'Thường' },
  WARNING:   { color: 'orange', label: 'Nghiêm trọng' },
  EMERGENCY: { color: 'red',    label: 'Khẩn cấp' },
}

/**
 * Danh sách các Tab trạng thái hiển thị trên thanh Bộ lọc (Filter Tabs)
 */
const TABS = [
  { key: 'SUBMITTED',   label: 'Chờ duyệt' }, // Đặt lên đầu vì đây là luồng xử lý chính của Bác sĩ
  { key: 'PENDING',     label: 'Chờ thực hiện' },
  { key: 'IN_PROGRESS', label: 'Đang thực hiện' },
  { key: 'APPROVED',    label: 'Đã duyệt' },
  { key: 'REJECTED',    label: 'Từ chối' },
  { key: 'ALL',         label: 'Tất cả' },
]

/**
 * CSS Inline dùng để rút gọn văn bản dài quá 1 dòng (Tránh vỡ Layout bảng)
 * Tự động thêm dấu ba chấm (...) ở cuối văn bản
 */
const textEllipsisStyle = {
  display: '-webkit-box',
  WebkitLineClamp: 1,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  wordBreak: 'break-all',
}

/* ================================================================== */
/* SUB-COMPONENT: EyeResultRow (Hàng hiển thị chỉ số mắt)          */
/* ================================================================== */

/**
 * Component phụ hiển thị một hàng so sánh chỉ số khúc xạ giữa 2 mắt (Phải - Trái)
 * @param {string} label - Tên chỉ số (Ví dụ: Thị lực, Nhãn áp, Độ cầu...)
 * @param {number|string} valueR - Giá trị đo được ở Mắt Phải (Oculus Dexter - OD)
 * @param {number|string} valueL - Giá trị đo được ở Mắt Trái (Oculus Sinister - OS)
 * @param {string} unit - Đơn vị đo đi kèm nếu có (Ví dụ: mmHg, °)
 */
function EyeResultRow({ label, valueR, valueL, unit = '' }) {
  // Hàm định dạng hiển thị dữ liệu tránh lỗi null/undefined
  const fmt = (v) => (v !== null && v !== undefined ? `${v}${unit}` : '—')
  
  return (
    <div style={{
      display: 'grid', 
      gridTemplateColumns: '1fr 1fr 1fr', // Chia đều làm 3 cột (Tên chỉ số | Mắt Phải | Mắt Trái)
      gap: 8, 
      padding: '8px 0', 
      borderBottom: '1px solid #f1f5f9', 
      fontSize: 13,
    }}>
      <div style={{ color: '#64748b', fontWeight: 500 }}>{label}</div>
      <div style={{ textAlign: 'center', fontWeight: 600, color: '#0f172a' }}>{fmt(valueR)}</div>
      <div style={{ textAlign: 'center', fontWeight: 600, color: '#0f172a' }}>{fmt(valueL)}</div>
    </div>
  )
}

/* ================================================================== */
/* MAIN COMPONENT: LabOrderPage (Trang Quản lý Phiếu Xét Nghiệm)     */
/* ================================================================== */
export default function LabOrderPage() {
  const navigate = useNavigate()
  
  // Lấy thông tin user hiện tại từ Redux Store để kiểm tra quyền hạn (Role Guard)
  const { user } = useSelector((s) => s.auth)

  /* ---------------------------------------------------------------- */
  /* REACT STATES (Quản lý trạng thái giao diện)                     */
  /* ---------------------------------------------------------------- */
  const [orders, setOrders]         = useState([])          // Danh sách gốc tất cả phiếu XN nhận từ API
  const [loading, setLoading]       = useState(true)        // Trạng thái loading khi tải danh sách phiếu
  const [activeTab, setActiveTab]   = useState('SUBMITTED') // Tab bộ lọc đang được chọn (Mặc định: Chờ duyệt)
  const [searchText, setSearchText] = useState('')         // Từ khóa tìm kiếm (Tên BN, SĐT, Tên dịch vụ)

  /* Trạng thái liên quan đến Modal Xem chi tiết & Duyệt kết quả */
  const [reviewModal, setReviewModal]   = useState(false)   // Ẩn/Hiện modal xem & duyệt kết quả
  const [selectedOrder, setSelectedOrder] = useState(null)   // Dữ liệu phiếu xét nghiệm đang được chọn để xem
  const [resultDetail, setResultDetail]   = useState(null)   // Chi tiết kết quả đo mắt nhận về từ API
  const [loadingResult, setLoadingResult] = useState(false) // Loading khi gọi API lấy chi tiết kết quả mắt
  const [approving, setApproving]         = useState(false) // Loading trạng thái khi click nút "Duyệt kết quả"

  /* Trạng thái liên quan đến Modal Yêu cầu làm lại (Từ chối kết quả) */
  const [retestModal, setRetestModal]         = useState(false) // Ẩn/Hiện modal điền lý do từ chối
  const [rejectionReason, setRejectionReason] = useState('')    // Nội dung lý do từ chối/yêu cầu làm lại
  const [retesting, setRetesting]             = useState(false) // Loading trạng thái gửi yêu cầu làm lại lên API

  /* ---------------------------------------------------------------- */
  /* ROLE GUARD (Kiểm tra quyền truy cập)                           */
  /* ---------------------------------------------------------------- */
  const isDoctor = user?.role === 'DOCTOR' // Kiểm tra xem user đăng nhập có phải là Bác sĩ không

  /* ---------------------------------------------------------------- */
  /* API ACTIONS & BUSINESS LOGIC (Xử lý các hàm tương tác API)      */
  /* ---------------------------------------------------------------- */

  /**
   * Lấy danh sách phiếu xét nghiệm từ Backend
   * Dùng useCallback để tối ưu hiệu năng, tránh tạo lại hàm sau mỗi lần render
   */
  const fetchOrders = useCallback(async () => {
    setLoading(true)
    try {
      // Gọi API: GET /api/v1/lab/queue
      // Backend sẽ tự động dựa vào JWT Token để filter ra danh sách các phiếu thuộc về Bác sĩ này tạo
      const res = await labService.getLabOrdersForDoctor()
      setOrders(res.data ?? [])
    } catch {
      message.error('Không thể tải danh sách phiếu xét nghiệm')
    } finally {
      setLoading(false)
    }
  }, [])

  // Tự động gọi hàm lấy danh sách khi component được mount lần đầu (nếu là Doctor)
  useEffect(() => {
    if (isDoctor) fetchOrders()
  }, [isDoctor, fetchOrders])

  /**
   * Action 2: Mở modal xem thông tin và nạp chi tiết kết quả đo mắt
   * @param {Object} order - Dữ liệu sơ bộ của phiếu xét nghiệm từ dòng được click
   */
  const openReview = async (order) => {
    setSelectedOrder(order)
    setResultDetail(null) // Reset dữ liệu cũ trong modal để tránh hiện đè kết quả trước đó
    setReviewModal(true)

    // Chỉ tiến hành gọi API lấy kết quả đo mắt nếu phiếu đang ở trạng thái đã nộp hoặc đã xử lý xong
    if (['SUBMITTED', 'APPROVED', 'REJECTED'].includes(order.status)) {
      setLoadingResult(true)
      try {
        // Gọi API: GET /api/v1/lab/{id}/results
        const res = await labService.getLabResults(order.id)
        setResultDetail(res.data ?? null)
      } catch {
        message.warning('Chưa có kết quả xét nghiệm để hiển thị')
      } finally {
        setLoadingResult(false)
      }
    }
  }

  /**
   * Action 3: Duyệt kết quả xét nghiệm (Chấp thuận)
   * Gọi API chuyển trạng thái phiếu từ SUBMITTED -> APPROVED
   */
  const handleApprove = async () => {
    if (!selectedOrder) return
    setApproving(true)
    try {
      // Gọi API: PUT /api/v1/lab/{id}/approve
      await labService.approveLabResult(selectedOrder.id)
      message.success('Đã duyệt kết quả xét nghiệm!')
      setReviewModal(false) // Đóng modal xem chi tiết
      await fetchOrders()   // Tải lại danh sách mới để cập nhật trạng thái bảng dữ liệu
    } catch (e) {
      message.error(e?.response?.data?.message || 'Duyệt kết quả thất bại')
    } finally {
      setApproving(false)
    }
  }

  /**
   * Action 4: Từ chối kết quả và Yêu cầu đo khám lại
   * Gọi API chuyển trạng thái phiếu hiện tại thành REJECTED, đồng thời Backend tự động nhân bản 1 phiếu mới tinh
   */
  const handleRetest = async () => {
    if (!rejectionReason.trim()) {
      message.warning('Vui lòng nhập lý do yêu cầu làm lại')
      return
    }
    setRetesting(true)
    try {
      // Gọi API: PUT /api/v1/lab/{id}/retest
      // Gửi kèm body chứa lý do từ chối (rejectionReason) để backend lưu vết
      await labService.requestRetest(selectedOrder.id, { rejectionReason })
      message.success('Đã yêu cầu làm lại — phiếu mới sẽ được tạo tự động!')
      
      // Reset và đóng toàn bộ các modal liên quan
      setRetestModal(false)
      setReviewModal(false)
      setRejectionReason('')
      fetchOrders() // Tải lại danh sách mới
    } catch (e) {
      message.error(e?.response?.data?.message || 'Yêu cầu làm lại thất bại')
    } finally {
      setRetesting(false)
    }
  }

  /* ---------------------------------------------------------------- */
  /* CLIENT-SIDE DATA FILTERING (Bộ lọc dữ liệu tại Frontend)        */
  /* ---------------------------------------------------------------- */
  
  // Lọc danh sách `orders` dựa trên Tab đang chọn và Từ khóa tìm kiếm ở ô Search
  const filteredOrders = orders.filter((o) => {
    // 1. Lọc theo trạng thái tab (Nếu chọn 'ALL' thì bỏ qua bước này)
    if (activeTab !== 'ALL' && o.status !== activeTab) return false
    // 2. Lọc theo từ khóa tìm kiếm (Không phân biệt chữ hoa chữ thường)
    if (!searchText) return true
    const kw = searchText.toLowerCase()
    return (
      o.patientFullName?.toLowerCase().includes(kw) || // Tìm theo tên bệnh nhân
      o.patientPhone?.toLowerCase().includes(kw)    || // Tìm theo số điện thoại
      o.serviceName?.toLowerCase().includes(kw)        // Tìm theo tên dịch vụ xét nghiệm
    )
  })

  // Đếm số lượng phiếu theo từng trạng thái để hiển thị số lượng (Badge count) trên các Tab thanh ngang
  const countByStatus = (status) =>
    status === 'ALL' ? orders.length : orders.filter((o) => o.status === status).length


  /* ================================================================== */
  /* UI RENDER - TRƯỜNG HỢP: KHÔNG PHẢI BÁC SĨ (403 Forbidden)         */
  /* ================================================================== */
  if (!isDoctor) {
    return (
      <>
        <Header />
        <div style={{ padding: 48 }}>
          <Result
            status="403"
            title="Không có quyền truy cập"
            subTitle="Trang này chỉ dành cho Bác sĩ."
            extra={<Button type="primary" onClick={() => navigate('/')}>Về trang chủ</Button>}
          />
        </div>
      </>
    )
  }

  /* ================================================================== */
  /* UI RENDER - TRƯỜNG HỢP CHÍNH: GIAO DIỆN BÁC SĨ                    */
  /* ================================================================== */
  return (
    <>
      {/* Thanh điều hướng Header phía trên cùng của hệ thống */}
      <Header />
      
      <div style={{ padding: 24 }}>

        {/* Tiêu đề Trang và Mô tả chức năng */}
        <div style={{ marginBottom: 20, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#0f172a' }}>
              Phiếu chỉ định xét nghiệm
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>
              Danh sách phiếu xét nghiệm bạn đã tạo — duyệt kết quả tại tab "Chờ duyệt"
            </p>
          </div>
          {/* Nút hỗ trợ làm mới danh sách thủ công nhanh */}
          <Button onClick={fetchOrders} loading={loading} size="small" style={{ fontSize: 12 }}>
            Làm mới
          </Button>
        </div>

        {/* Vùng bọc danh sách dạng Card trắng bo tròn góc */}
        <div style={{ backgroundColor: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', overflow: 'hidden' }}>

          {/* 1. THANH TABS NGANG: Bộ lọc trạng thái phiểu */}
          <div style={{ display: 'flex', borderBottom: '1px solid #f1f5f9', padding: '0 16px', gap: 4, overflowX: 'auto' }}>
            {TABS.map((tab) => {
              const count    = countByStatus(tab.key)
              const isActive = activeTab === tab.key
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  style={{
                    padding: '12px 16px', border: 'none', background: 'none', cursor: 'pointer',
                    fontSize: 13, fontWeight: isActive ? 600 : 400,
                    color: isActive ? '#2563eb' : '#64748b',
                    borderBottom: isActive ? '2px solid #2563eb' : '2px solid transparent',
                    display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap', transition: 'all 0.15s',
                  }}
                >
                  {tab.label}
                  {/* Badge số lượng đi kèm bên cạnh nhãn Tab */}
                  <span style={{
                    backgroundColor: isActive ? '#2563eb' : '#e2e8f0',
                    color: isActive ? '#fff' : '#64748b',
                    borderRadius: 99, padding: '1px 7px', fontSize: 11,
                    fontWeight: 600, minWidth: 20, textAlign: 'center',
                  }}>
                    {count}
                  </span>
                </button>
              )
            })}
          </div>

          {/* 2. Ô TÌM KIẾM (Search Input) */}
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9' }}>
            <Input.Search
              placeholder="Tìm theo tên bệnh nhân, SĐT hoặc dịch vụ..."
              allowClear 
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ maxWidth: 440 }}
            />
          </div>

          {/* 3. BẢNG HIỂN THỊ DANH SÁCH PHIẾU XÉT NGHIỆM */}
          <Spin spinning={loading}>
            {/* Trường hợp danh sách rỗng (Không có dữ liệu phù hợp với bộ lọc) */}
            {!loading && filteredOrders.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px 0', color: '#94a3b8', fontSize: 14 }}>
                {searchText ? 'Không tìm thấy kết quả phù hợp'
                  : activeTab === 'SUBMITTED' ? 'Không có kết quả nào đang chờ duyệt'
                  : 'Không có dữ liệu'}
              </div>
            ) : (
              /* Thẻ bảng chuẩn HTML, style mượt mà tối giản */
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: '#f8fafc' }}>
                    {['STT', 'Ngày tạo', 'Bệnh nhân', 'SĐT', 'Ưu tiên', 'Trạng thái', ''].map((h) => (
                      <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 13, fontWeight: 600, color: '#475569', whiteSpace: 'nowrap' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((order, i) => (
                    <tr
                      key={order.id}
                      style={{ borderBottom: '1px solid #f1f5f9' }}
                      // Hiệu ứng Hover dòng (Highlight Row khi rê chuột qua)
                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f0f9ff' }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '' }}
                    >
                      <td style={{ padding: '12px 16px', color: '#64748b', fontSize: 13 }}>{i + 1}</td>
                      
                      {/* Cột Ngày và Giờ tạo phiếu */}
                      <td style={{ padding: '12px 16px', fontSize: 13, color: '#475569', whiteSpace: 'nowrap' }}>
                        {order.createdAt ? new Date(order.createdAt).toLocaleDateString('vi-VN') : '—'}
                        <div style={{ fontSize: 11, color: '#94a3b8' }}>
                          {order.createdAt ? new Date(order.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : ''}
                        </div>
                      </td>
                      
                      {/* Tên bệnh nhân (Áp dụng ellipsis chống tràn chữ) */}
                      <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 500, color: '#1e293b', maxWidth: 160 }}>
                        <div title={order.patientFullName ?? '—'} style={textEllipsisStyle}>{order.patientFullName ?? '—'}</div>
                      </td>
                      
                      <td style={{ padding: '12px 16px', fontSize: 13, color: '#64748b', whiteSpace: 'nowrap' }}>
                        {order.patientPhone ?? '—'}
                      </td>
                      
                      {/* Tên dịch vụ chỉ định xét nghiệm */}
                      {/* <td style={{ padding: '12px 16px', fontSize: 13, color: '#475569', maxWidth: 200 }}>
                        <div title={order.serviceName ?? '—'} style={textEllipsisStyle}>{order.serviceName ?? '—'}</div>
                      </td> */}
                      
                      {/* Tag hiển thị mức độ Ưu tiên */}
                      <td style={{ padding: '12px 16px' }}>
                        <Tag color={PRIORITY_MAP[order.priority]?.color ?? 'default'}>
                          {PRIORITY_MAP[order.priority]?.label ?? order.priority ?? '—'}
                        </Tag>
                      </td>
                      
                      {/* Tag hiển thị Trạng thái xử lý của phiếu */}
                      <td style={{ padding: '12px 16px' }}>
                        <Tag color={LAB_ORDER_STATUS_MAP[order.status]?.color ?? 'default'}>
                          {LAB_ORDER_STATUS_MAP[order.status]?.label ?? order.status}
                        </Tag>
                      </td>
                      
                      {/* Cột Hành động - Nút bấm linh hoạt theo từng trạng thái */}
                      <td style={{ padding: '12px 16px' }}>
                        {/* 1. Nếu trạng thái chờ duyệt -> Hiện nút Xem & Duyệt */}
                        {order.status === 'SUBMITTED' && (
                          <Button
                            type="primary" size="small"
                            onClick={() => openReview(order)}
                            style={{ fontSize: 12, backgroundColor: '#2563eb', borderColor: '#2563eb', whiteSpace: 'nowrap' }}
                          >
                            Xem & Duyệt
                          </Button>
                        )}
                        {/* 2. Nếu đã hoàn thành hoặc đã từ chối trước đó -> Hiện nút chỉ để Xem lại kết quả */}
                        {(order.status === 'APPROVED' || order.status === 'REJECTED') && (
                          <Button
                            size="small" onClick={() => openReview(order)}
                            style={{ fontSize: 12, borderColor: '#64748b', color: '#64748b' }}
                          >
                            Xem kết quả
                          </Button>
                        )}
                        {/* 3. Nếu đang chờ KTV đo khám -> Hiện nhãn thông báo tĩnh */}
                        {(order.status === 'PENDING' || order.status === 'IN_PROGRESS') && (
                          <span style={{ fontSize: 12, color: '#94a3b8' }}>Chờ kỹ thuật viên</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Spin>
        </div>
      </div>

      {/* ================================================================ */}
      {/* MODAL XEM CHI TIẾT KẾT QUẢ VÀ THỰC HIỆN DUYỆT / TỪ CHỐI      */}
      {/* ================================================================ */}
      <Modal
        open={reviewModal}
        onCancel={() => { setReviewModal(false); setResultDetail(null) }}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontWeight: 700, fontSize: 16, color: '#0f172a' }}>Kết quả xét nghiệm</span>
            {selectedOrder && (
              <Tag color={LAB_ORDER_STATUS_MAP[selectedOrder.status]?.color}>
                {LAB_ORDER_STATUS_MAP[selectedOrder.status]?.label}
              </Tag>
            )}
          </div>
        }
        footer={null} // Không dùng footer mặc định của Antd để tự custom khối nút bấm bên dưới
        width={780}
        destroyOnClose
      >
        {selectedOrder && (
          <div>
            {/* Khối tóm tắt Hành chính - Thông tin Bệnh nhân */}
            <Card
              size="small"
              style={{ marginBottom: 16, borderRadius: 10, borderLeft: '4px solid #2563eb', backgroundColor: '#f8fafc' }}
              bodyStyle={{ padding: '12px 16px' }}
            >
              <Row gutter={[16, 10]}>
                <Col xs={24} sm={8}>
                  <div style={{ fontSize: 11, color: '#94a3b8' }}>Bệnh nhân</div>
                  <div style={{ fontWeight: 600, color: '#1e293b', fontSize: 13 }}>{selectedOrder.patientFullName ?? '—'}</div>
                </Col>
                <Col xs={24} sm={8}>
                  <div style={{ fontSize: 11, color: '#94a3b8' }}>Số điện thoại</div>
                  <div style={{ fontWeight: 500, color: '#334155', fontSize: 13 }}>{selectedOrder.patientPhone ?? '—'}</div>
                </Col>
                {/* <Col xs={24} sm={8}>
                  <div style={{ fontSize: 11, color: '#94a3b8' }}>Dịch vụ xét nghiệm</div>
                  <div style={{ fontWeight: 500, color: '#0d9488', fontSize: 13 }}>{selectedOrder.serviceName ?? '—'}</div>
                </Col> */}
                <Col xs={24} sm={8}>
                  <div style={{ fontSize: 11, color: '#94a3b8' }}>Ưu tiên</div>
                  <Tag color={PRIORITY_MAP[selectedOrder.priority]?.color ?? 'default'} style={{ marginTop: 2 }}>
                    {PRIORITY_MAP[selectedOrder.priority]?.label ?? selectedOrder.priority}
                  </Tag>
                </Col>
                <Col xs={24} sm={16}>
                  <div style={{ fontSize: 11, color: '#94a3b8' }}>Ngày tạo phiếu</div>
                  <div style={{ fontWeight: 500, color: '#334155', fontSize: 13 }}>
                    {selectedOrder.createdAt ? new Date(selectedOrder.createdAt).toLocaleString('vi-VN') : '—'}
                  </div>
                </Col>
                {/* Hiện Ghi chú/Chỉ định lâm sàng của bác sĩ (nếu có lúc tạo phiếu) */}
                {selectedOrder.notes && (
                  <Col span={24}>
                    <div style={{ padding: '8px 12px', backgroundColor: '#eff6ff', borderRadius: 8, fontSize: 13, color: '#1d4ed8' }}>
                      <strong>Ghi chú chỉ định:</strong> {selectedOrder.notes}
                    </div>
                  </Col>
                )}
              </Row>
            </Card>

            {/* Khối dữ liệu chuyên môn: Kết quả Đo Khúc Xạ Mắt */}
            <Spin spinning={loadingResult}>
              {/* Nếu đã nộp hoặc duyệt mà không tìm thấy dữ liệu kết quả */}
              {!loadingResult && !resultDetail && (
                <div style={{
                  textAlign: 'center', padding: '32px 0', color: '#94a3b8', fontSize: 14,
                  border: '1px dashed #e2e8f0', borderRadius: 10, marginBottom: 16,
                }}>
                  {['PENDING', 'IN_PROGRESS'].includes(selectedOrder.status)
                    ? 'Kỹ thuật viên chưa nộp kết quả'
                    : 'Không tải được kết quả xét nghiệm'}
                </div>
              )}

              {/* Bảng so sánh 6 thông số thị lực cốt lõi khi có dữ liệu kết quả mắt */}
              {resultDetail && (
                <div style={{ marginBottom: 16 }}>
                  {/* Dòng tiêu đề bảng */}
                  <div style={{
                    display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8,
                    padding: '8px 0', borderBottom: '2px solid #e2e8f0',
                    fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4,
                  }}>
                    <div>Chỉ số</div>
                    <div style={{ textAlign: 'center', color: '#0f172a' }}>Mắt Phải (OD)</div>
                    <div style={{ textAlign: 'center', color: '#0f172a' }}>Mắt Trái (OS)</div>
                  </div>
                  
                  {/* Gọi Sub-component render từng hàng thông số */}
                  <EyeResultRow label="Thị lực (VA)"           valueR={resultDetail.vaR}   valueL={resultDetail.vaL}   />
                  <EyeResultRow label="Thị lực tối đa (BCVA)" valueR={resultDetail.bcvaR} valueL={resultDetail.bcvaL} />
                  <EyeResultRow label="Nhãn áp (IOP)"         valueR={resultDetail.iopR}  valueL={resultDetail.iopL}  unit=" mmHg" />
                  <EyeResultRow label="Độ cầu (SPH)"          valueR={resultDetail.sphR}  valueL={resultDetail.sphL}  />
                  <EyeResultRow label="Độ loạn (CYL)"         valueR={resultDetail.cylR}  valueL={resultDetail.cylL}  />
                  <EyeResultRow label="Trục loạn (AXIS)"      valueR={resultDetail.axisR} valueL={resultDetail.axisL} unit="°" />

                  {/* Hiển thị danh sách hình ảnh siêu âm/đo mắt đính kèm từ KTV (nếu có) */}
                  {resultDetail.imageUrls?.length > 0 && (
                    <div style={{ marginTop: 16 }}>
                      <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600, marginBottom: 8 }}>
                        Ảnh kết quả xét nghiệm ({resultDetail.imageUrls.length} ảnh)
                      </div>
                      {/* Grid danh sách ảnh dạng ô lưới nhỏ gọn */}
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                        gap: 10,
                      }}>
                        {resultDetail.imageUrls.map((url, i) => (
                          <img
                            key={i}
                            src={url}
                            alt={`Lab result ${i + 1}`}
                            style={{
                              width: '100%', height: 120, objectFit: 'cover',
                              borderRadius: 8, border: '1px solid #e2e8f0',
                              cursor: 'zoom-in', backgroundColor: '#f8fafc',
                            }}
                            // Click mở ảnh kích thước lớn ở tab trình duyệt mới để xem rõ hơn
                            onClick={() => window.open(url, '_blank')}
                            // Ẩn ảnh bị lỗi link tránh phá hỏng bố cục giao diện
                            onError={(e) => { e.currentTarget.style.display = 'none' }}
                          />
                        ))}
                      </div>
                      <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
                        Bấm vào ảnh để xem toàn màn hình
                      </div>
                    </div>
                  )}

                  {/* Nhận xét chuyên môn bằng chữ viết tay của KTV */}
                  {resultDetail.doctorNotes && (
                    <div style={{ marginTop: 14, padding: '10px 14px', backgroundColor: '#f0fdf4', borderRadius: 8, border: '1px solid #bbf7d0' }}>
                      <div style={{ fontSize: 12, color: '#15803d', fontWeight: 600, marginBottom: 4 }}>Nhận xét của kỹ thuật viên</div>
                      <div style={{ fontSize: 13, color: '#166534' }}>{resultDetail.doctorNotes}</div>
                    </div>
                  )}
                </div>
              )}
            </Spin>

            {/* Khu vực Nhóm nút điều hướng hành động - Chỉ hiển thị khi phiếu đang chờ duyệt (SUBMITTED) */}
            {selectedOrder.status === 'SUBMITTED' && (
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', paddingTop: 16, borderTop: '1px solid #f1f5f9' }}>
                {/* Nút Từ chối -> Mở tiếp Modal phụ điền lý do từ chối */}
                <Button
                  danger
                  onClick={() => { setRetestModal(true); setRejectionReason('') }}
                  style={{ fontSize: 13 }}
                >
                  Yêu cầu làm lại
                </Button>
                {/* Nút chấp nhận kết quả xét nghiệm */}
                <Button
                  type="primary" 
                  loading={approving} 
                  onClick={handleApprove}
                  style={{ fontSize: 13, backgroundColor: '#16a34a', borderColor: '#16a34a' }}
                >
                  Duyệt kết quả
                </Button>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* ================================================================ */}
      {/* MODAL YÊU CẦU LÀM LẠI XÉT NGHIỆM (ĐIỀN LÝ DO TỪ CHỐI)         */}
      {/* ================================================================ */}
      <Modal
        open={retestModal}
        onCancel={() => setRetestModal(false)}
        title={<span style={{ fontWeight: 700, color: '#dc2626' }}>Yêu cầu làm lại xét nghiệm</span>}
        footer={null}
        width={480}
        destroyOnClose
      >
        <div style={{ padding: '8px 0' }}>
          {/* Tóm tắt nhanh thông tin người bệnh sắp bị từ chối kết quả */}
          {selectedOrder && (
            <div style={{
              backgroundColor: '#fef2f2', border: '1px solid #fecaca',
              borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13,
            }}>
              <div style={{ color: '#991b1b', fontWeight: 600, marginBottom: 4 }}>Phiếu sẽ bị từ chối:</div>
              <div style={{ color: '#7f1d1d' }}>
                Bệnh nhân: <strong>{selectedOrder.patientFullName ?? '—'}</strong>
                {selectedOrder.serviceName && <> — {selectedOrder.serviceName}</>}
              </div>
            </div>
          )}

          {/* Dòng giải thích cơ chế tự động nhân bản phiếu của Hệ thống */}
          <p style={{ fontSize: 13, color: '#475569', marginBottom: 16 }}>
            Phiếu hiện tại sẽ bị đánh dấu <strong>REJECTED</strong>. Hệ thống tự động tạo phiếu mới
            với cùng thông tin (bác sĩ, kỹ thuật viên, dịch vụ, mức ưu tiên) để thực hiện lại.
          </p>

          {/* Ô nhập văn bản bắt buộc nhập Lý do từ chối */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>
              Lý do từ chối <span style={{ color: '#ef4444' }}>*</span>
            </div>
            <TextArea
              rows={4}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Ví dụ: Kết quả VA không khớp triệu chứng lâm sàng, yêu cầu đo lại với điều kiện ánh sáng chuẩn..."
              maxLength={500}
              showCount // Hiện bộ đếm ký tự chống nhập quá giới hạn của Backend (500 ký tự)
            />
          </div>

          {/* Nhóm nút xác nhận ở chân Modal B */}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <Button onClick={() => setRetestModal(false)} style={{ fontSize: 13 }}>Hủy bỏ</Button>
            <Button
              danger 
              type="primary" 
              loading={retesting} 
              onClick={handleRetest}
              style={{ fontSize: 13 }}
            >
              Xác nhận từ chối & làm lại
            </Button>
          </div>
        </div>
      </Modal>
    </>
  )
}