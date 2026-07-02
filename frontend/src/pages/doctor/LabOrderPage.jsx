/**
 * Author: TuanTD
 * 
 * Giao diện làm việc chính của bác sĩ đối với danh sách đơn xét nghiệm đã tạo
 */


import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import Header from '../../components/layout/Header'
import { Button, Input, Tag, Spin, Result, Modal, Row, Col, Card, message, Pagination } from 'antd'
import { labService } from '../../services/labService'
import useConfirmAction from '../../hooks/useConfirmAction'

const { TextArea } = Input

/* ================================================================== */
/* CONFIGURATIONS & MAPPINGS (Cấu hình hằng số và Ánh xạ dữ liệu)    */
/* ================================================================== */

/**
 * Ánh xạ trạng thái phiếu xét nghiệm (Lab Order Status)
 */
const LAB_ORDER_STATUS_MAP = {
  PENDING:     { color: 'default',    label: 'Chờ thực hiện' },
  IN_PROGRESS: { color: 'processing', label: 'Đang thực hiện' },
  SUBMITTED:   { color: 'orange',     label: 'Chờ duyệt' },
  APPROVED:    { color: 'success',    label: 'Đã duyệt' },
  REJECTED:    { color: 'error',      label: 'Đã từ chối' },
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
 * Danh sách các Tab trạng thái hiển thị trên thanh Bộ lọc
 */
const TABS = [
  { key: 'SUBMITTED',   label: 'Chờ duyệt' },
  { key: 'PENDING',     label: 'Chờ thực hiện' },
  { key: 'IN_PROGRESS', label: 'Đang thực hiện' },
  { key: 'APPROVED',    label: 'Đã duyệt' },
  { key: 'REJECTED',    label: 'Từ chối' },
  { key: 'ALL',         label: 'Tất cả' },
]

const textEllipsisStyle = {
  display: '-webkit-box',
  WebkitLineClamp: 1,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  wordBreak: 'break-all',
}

/* ================================================================== */
/* SUB-COMPONENT: EyeResultRow                                         */
/* ================================================================== */
function EyeResultRow({ label, valueR, valueL, unit = '' }) {
  const fmt = (v) => (v !== null && v !== undefined ? `${v}${unit}` : '—')
  
  return (
    <div style={{
      display: 'grid', 
      gridTemplateColumns: '1fr 1fr 1fr',
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
/* MAIN COMPONENT: LabOrderPage                                        */
/* ================================================================== */
export default function LabOrderPage() {
  const navigate = useNavigate()
  const { user } = useSelector((s) => s.auth)

  // Hook hiển thị dialog xác nhận trước các hành động quan trọng
  const { confirmAction, contextHolder } = useConfirmAction()

  /* ---------------------------------------------------------------- */
  /* REACT STATES                                                      */
  /* ---------------------------------------------------------------- */
  const [orders, setOrders]         = useState([])
  const [loading, setLoading]       = useState(true)
  const [activeTab, setActiveTab]   = useState('SUBMITTED')
  const [searchText, setSearchText] = useState('')

  const [reviewModal, setReviewModal]   = useState(false)
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [resultDetail, setResultDetail]   = useState(null)
  const [loadingResult, setLoadingResult] = useState(false)
  const [approving, setApproving]         = useState(false)

  const [retestModal, setRetestModal]         = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')
  const [retesting, setRetesting]             = useState(false)

  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 10
  /* ---------------------------------------------------------------- */
  /* ROLE GUARD                                                        */
  /* ---------------------------------------------------------------- */
  const isDoctor = user?.role === 'DOCTOR'

  /* ---------------------------------------------------------------- */
  /* API ACTIONS                                                       */
  /* ---------------------------------------------------------------- */
  const fetchOrders = useCallback(async () => {
    setLoading(true)
    try {
      const res = await labService.getLabOrdersForDoctor()
      setOrders(res.data ?? [])
    } catch {
      message.error('Không thể tải danh sách phiếu xét nghiệm')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isDoctor) fetchOrders()
  }, [isDoctor, fetchOrders])

  const openReview = async (order) => {
    setSelectedOrder(order)
    setResultDetail(null)
    setReviewModal(true)

    if (['SUBMITTED', 'APPROVED', 'REJECTED'].includes(order.status)) {
      setLoadingResult(true)
      try {
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
   * Logic duyệt kết quả thực sự — được gọi sau khi user xác nhận trong dialog
   */
  const executeApprove = async () => {
    if (!selectedOrder) return
    setApproving(true)
    try {
      await labService.approveLabResult(selectedOrder.id)
      message.success('Đã duyệt kết quả xét nghiệm!')
      setReviewModal(false)
      await fetchOrders()
    } catch (e) {
      message.error(e?.response?.data?.message || 'Duyệt kết quả thất bại')
    } finally {
      setApproving(false)
    }
  }

  /**
   * Duyệt kết quả: mở dialog xác nhận → gọi executeApprove nếu đồng ý
   */
  const handleApprove = () => {
    confirmAction({
      type: 'success',
      title: 'Xác nhận duyệt kết quả xét nghiệm',
      description: 'Kết quả sẽ được chấp thuận và đồng bộ vào hồ sơ bệnh án (EMR).',
      details: [
        { label: 'Bệnh nhân',   value: selectedOrder?.patientFullName ?? '—' },
        { label: 'Độ ưu tiên',  value: PRIORITY_MAP[selectedOrder?.priority]?.label ?? selectedOrder?.priority ?? '—' },
        { label: 'Số ảnh KQ',   value: `${resultDetail?.imageUrls?.length ?? 0} ảnh` },
      ],
      confirmText: 'Duyệt kết quả',
      onConfirm: executeApprove,
    })
  }

  /**
   * Logic gửi yêu cầu làm lại thực sự — được gọi sau khi user xác nhận trong dialog
   */
  const executeRetest = async () => {
    setRetesting(true)
    try {
      await labService.requestRetest(selectedOrder.id, { rejectionReason })
      message.success('Đã yêu cầu làm lại — phiếu mới sẽ được tạo tự động!')
      setRetestModal(false)
      setReviewModal(false)
      setRejectionReason('')
      fetchOrders()
    } catch (e) {
      message.error(e?.response?.data?.message || 'Yêu cầu làm lại thất bại')
    } finally {
      setRetesting(false)
    }
  }

  /**
   * Yêu cầu làm lại: kiểm tra lý do → mở dialog xác nhận → gọi executeRetest nếu đồng ý
   */
  const handleRetest = () => {
    if (!rejectionReason.trim()) {
      message.warning('Vui lòng nhập lý do yêu cầu làm lại')
      return
    }
    confirmAction({
      type: 'danger',
      title: 'Xác nhận từ chối & yêu cầu làm lại',
      description: 'Phiếu hiện tại sẽ bị đánh dấu REJECTED. Hệ thống tự động tạo phiếu mới để thực hiện lại.',
      details: [
        { label: 'Bệnh nhân',   value: selectedOrder?.patientFullName ?? '—' },
        { label: 'Lý do từ chối', value: rejectionReason },
      ],
      confirmText: 'Xác nhận từ chối',
      onConfirm: executeRetest,
    })
  }

  /* ---------------------------------------------------------------- */
  /* CLIENT-SIDE FILTERING                                             */
  /* ---------------------------------------------------------------- */
  const filteredOrders = orders.filter((o) => {
    if (activeTab !== 'ALL' && o.status !== activeTab) return false
    if (!searchText) return true
    const kw = searchText.toLowerCase()
    return (
      o.patientFullName?.toLowerCase().includes(kw) ||
      o.patientPhone?.toLowerCase().includes(kw)    ||
      o.serviceName?.toLowerCase().includes(kw)
    )
  })

  useEffect(() => {
    setCurrentPage(1)
  }, [activeTab, searchText])

  const pagedOrders = filteredOrders.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  const countByStatus = (status) =>
    status === 'ALL' ? orders.length : orders.filter((o) => o.status === status).length

  /* ================================================================== */
  /* UI RENDER - 403                                                     */
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
  /* UI RENDER - MAIN                                                    */
  /* ================================================================== */
  return (
    <>
      {/* REQUIRED: contextHolder phải được mount để dialog hoạt động */}
      {contextHolder}
      <Header />
      
      <div style={{ padding: 24 }}>

        <div style={{ marginBottom: 20, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#0f172a' }}>
              Phiếu chỉ định xét nghiệm
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>
              Danh sách phiếu xét nghiệm bạn đã tạo — duyệt kết quả tại tab "Chờ duyệt"
            </p>
          </div>
          <Button onClick={fetchOrders} loading={loading} size="small" style={{ fontSize: 12 }}>
            Làm mới
          </Button>
        </div>

        <div style={{ backgroundColor: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', overflow: 'hidden' }}>

          {/* TABS */}
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

          {/* SEARCH */}
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9' }}>
            <Input.Search
              placeholder="Tìm theo tên bệnh nhân, SĐT hoặc dịch vụ..."
              allowClear 
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ maxWidth: 440 }}
            />
          </div>

          {/* TABLE */}
          <Spin spinning={loading}>
            {!loading && filteredOrders.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px 0', color: '#94a3b8', fontSize: 14 }}>
                {searchText ? 'Không tìm thấy kết quả phù hợp'
                  : activeTab === 'SUBMITTED' ? 'Không có kết quả nào đang chờ duyệt'
                  : 'Không có dữ liệu'}
              </div>
            ) : (
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
                  {pagedOrders.map((order, i) => (
                    <tr
                      key={order.id}
                      style={{ borderBottom: '1px solid #f1f5f9' }}
                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f0f9ff' }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '' }}
                    >
                      <td style={{ padding: '12px 16px', color: '#64748b', fontSize: 13 }}>
                        {(currentPage - 1) * pageSize + i + 1}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 13, color: '#475569', whiteSpace: 'nowrap' }}>
                        {order.createdAt ? new Date(order.createdAt).toLocaleDateString('vi-VN') : '—'}
                        <div style={{ fontSize: 11, color: '#94a3b8' }}>
                          {order.createdAt ? new Date(order.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : ''}
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 500, color: '#1e293b', maxWidth: 160 }}>
                        <div title={order.patientFullName ?? '—'} style={textEllipsisStyle}>{order.patientFullName ?? '—'}</div>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 13, color: '#64748b', whiteSpace: 'nowrap' }}>
                        {order.patientPhone ?? '—'}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <Tag color={PRIORITY_MAP[order.priority]?.color ?? 'default'}>
                          {PRIORITY_MAP[order.priority]?.label ?? order.priority ?? '—'}
                        </Tag>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <Tag color={LAB_ORDER_STATUS_MAP[order.status]?.color ?? 'default'}>
                          {LAB_ORDER_STATUS_MAP[order.status]?.label ?? order.status}
                        </Tag>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        {order.status === 'SUBMITTED' && (
                          <Button
                            type="primary" size="small"
                            onClick={() => openReview(order)}
                            style={{ fontSize: 12, backgroundColor: '#2563eb', borderColor: '#2563eb', whiteSpace: 'nowrap' }}
                          >
                            Xem & Duyệt
                          </Button>
                        )}
                        {(order.status === 'APPROVED' || order.status === 'REJECTED') && (
                          <Button
                            size="small" onClick={() => openReview(order)}
                            style={{ fontSize: 12, borderColor: '#64748b', color: '#64748b' }}
                          >
                            Xem kết quả
                          </Button>
                        )}
                        {(order.status === 'PENDING' || order.status === 'IN_PROGRESS') && (
                          <span style={{ fontSize: 12, color: '#94a3b8' }}>Chờ kỹ thuật viên</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {filteredOrders.length > pageSize && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '14px 16px' }}>
                <Pagination
                  current={currentPage}
                  pageSize={pageSize}
                  total={filteredOrders.length}
                  onChange={setCurrentPage}
                  showTotal={(total) => `${total} phiếu`}
                  size="small"
                />
              </div>
            )}
          </Spin>
        </div>
      </div>

      {/* ================================================================ */}
      {/* MODAL XEM CHI TIẾT KẾT QUẢ VÀ DUYỆT / TỪ CHỐI                 */}
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
        footer={null}
        width={780}
        destroyOnClose
      >
        {selectedOrder && (
          <div>
            {/* Thông tin hành chính bệnh nhân */}
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
                {selectedOrder.notes && (
                  <Col span={24}>
                    <div style={{ padding: '8px 12px', backgroundColor: '#eff6ff', borderRadius: 8, fontSize: 13, color: '#1d4ed8' }}>
                      <strong>Ghi chú chỉ định:</strong> {selectedOrder.notes}
                    </div>
                  </Col>
                )}
              </Row>
            </Card>

            {/* Kết quả đo khúc xạ */}
            <Spin spinning={loadingResult}>
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

              {resultDetail && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{
                    display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8,
                    padding: '8px 0', borderBottom: '2px solid #e2e8f0',
                    fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4,
                  }}>
                    <div>Chỉ số</div>
                    <div style={{ textAlign: 'center', color: '#0f172a' }}>Mắt Phải (OD)</div>
                    <div style={{ textAlign: 'center', color: '#0f172a' }}>Mắt Trái (OS)</div>
                  </div>
                  
                  <EyeResultRow label="Thị lực (VA)"           valueR={resultDetail.vaR}   valueL={resultDetail.vaL}   />
                  <EyeResultRow label="Thị lực tối đa (BCVA)" valueR={resultDetail.bcvaR} valueL={resultDetail.bcvaL} />
                  <EyeResultRow label="Nhãn áp (IOP)"         valueR={resultDetail.iopR}  valueL={resultDetail.iopL}  unit=" mmHg" />
                  <EyeResultRow label="Độ cầu (SPH)"          valueR={resultDetail.sphR}  valueL={resultDetail.sphL}  />
                  <EyeResultRow label="Độ loạn (CYL)"         valueR={resultDetail.cylR}  valueL={resultDetail.cylL}  />
                  <EyeResultRow label="Trục loạn (AXIS)"      valueR={resultDetail.axisR} valueL={resultDetail.axisL} unit="°" />

                  {resultDetail.imageUrls?.length > 0 && (
                    <div style={{ marginTop: 16 }}>
                      <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600, marginBottom: 8 }}>
                        Ảnh kết quả xét nghiệm ({resultDetail.imageUrls.length} ảnh)
                      </div>
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

                  {resultDetail.doctorNotes && (
                    <div style={{ marginTop: 14, padding: '10px 14px', backgroundColor: '#f0fdf4', borderRadius: 8, border: '1px solid #bbf7d0' }}>
                      <div style={{ fontSize: 12, color: '#15803d', fontWeight: 600, marginBottom: 4 }}>Nhận xét của kỹ thuật viên</div>
                      <div style={{ fontSize: 13, color: '#166534' }}>{resultDetail.doctorNotes}</div>
                    </div>
                  )}
                </div>
              )}
            </Spin>

            {/* Nhóm nút hành động — chỉ hiển thị khi phiếu đang chờ duyệt */}
            {selectedOrder.status === 'SUBMITTED' && (
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', paddingTop: 16, borderTop: '1px solid #f1f5f9' }}>
                <Button
                  danger
                  onClick={() => { setRetestModal(true); setRejectionReason('') }}
                  style={{ fontSize: 13 }}
                >
                  Yêu cầu làm lại
                </Button>
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
      {/* MODAL YÊU CẦU LÀM LẠI XÉT NGHIỆM                               */}
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

          <p style={{ fontSize: 13, color: '#475569', marginBottom: 16 }}>
            Phiếu hiện tại sẽ bị đánh dấu <strong>REJECTED</strong>. Hệ thống tự động tạo phiếu mới
            với cùng thông tin (bác sĩ, kỹ thuật viên, dịch vụ, mức ưu tiên) để thực hiện lại.
          </p>

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
              showCount
            />
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <Button onClick={() => setRetestModal(false)} style={{ fontSize: 13 }}>Hủy bỏ</Button>
            <Button
              danger 
              type="primary" 
              loading={retesting} 
              onClick={handleRetest}
              disabled={!rejectionReason.trim()}
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
