/**
 * Author: TuanTD
 * 
 * Trang quản lý hàng đợi xét nghiệm dành riêng cho Kỹ thuật viên (Lab Technician)
 * Thành phần này thực hiện các nhiệm vụ chính:
 * 1. Kiểm tra quyền truy cập - chỉ cho phép tài khoản có vai trò LAB_TECHNICIAN
 * 2. Tải danh sách các phiếu xét nghiệm được phân công từ hệ thống backend
 * 3. Phân loại và lọc các phiếu xét nghiệm theo thanh Tab trạng thái (Chờ thực hiện, Đang thực hiện, Đã gửi, Đã hủy, Hoàn thành, Tất cả)
 * 4. Tìm kiếm nâng cao theo thời gian thực (tên bệnh nhân, số điện thoại, bác sĩ chỉ định, tên dịch vụ)
 * 5. Điều hướng kỹ thuật viên bắt đầu thực hiện hoặc tiếp tục cập nhật kết quả đo khám
 */

import { useEffect, useState, useCallback } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import Header from '../../components/layout/Header'
import { Form, Input, InputNumber, Tabs, Button, message, Tag, Spin, Collapse, Divider, Result } from 'antd'
import { labService } from '../../services/labService'

const { TextArea } = Input
const { Panel } = Collapse

/**
 * Bản đồ cấu hình màu sắc và nhãn hiển thị cho từng trạng thái của Đơn xét nghiệm (LabOrder)
 * Phù hợp với hệ thống Enum phía Backend
 */
const LAB_ORDER_STATUS_MAP = {
  PENDING:     { color: 'default',   label: 'Chờ thực hiện' },
  IN_PROGRESS: { color: 'processing', label: 'Đang thực hiện' },
  SUBMITTED:   { color: 'orange',    label: 'Đã gửi' },
  REJECTED:    { color: 'error',      label: 'Đã huỷ' },
  APPROVED:    { color: 'success',    label: 'Hoàn thành' },
}

/**
 * Bản đồ cấu hình màu sắc và nhãn hiển thị cho các mức độ ưu tiên của đơn xét nghiệm.
 */
const PRIORITY_MAP = {
  PRIMARY: { color: 'green', label: 'Thường' },
  WARNING: { color: 'orange', label: 'Nghiêm trọng'},
  EMERGENCY: { color: 'red', label: 'Khẩn cấp' },
}

/**
 * Định dạng CSS giúp cắt ngắn văn bản dài trên một dòng và hiển thị dấu ba chấm (...)
 * Áp dụng cho các cột hiển thị tên hoặc dịch vụ dài trên bảng để tránh vỡ khung giao diện
 */
const textEllipsisStyle = {
  display: '-webkit-box',
  WebkitLineClamp: 1,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  wordBreak: 'break-all',
}

/* Thành phần Chính */
export default function LabQueuePage() {
  const [searchParams] = useSearchParams()
  const navigate  = useNavigate()
  
  // Lấy thông tin người dùng hiện tại từ Redux Store (Global State)
  const { user }  = useSelector((s) => s.auth)

  /* --- Quản lý các State cục bộ --- */
  // startingId: Lưu ID của đơn xét nghiệm đang bấm nút "Bắt đầu khám" để hiển thị trạng thái loading riêng biệt
  const [startingId, setStartingId]  = useState(null)
  // orders: Danh sách toàn bộ đơn xét nghiệm lấy về từ API
  const [orders, setOrders]      = useState([])
  // loading: Trạng thái tải dữ liệu tổng thể của trang
  const [loading, setLoading]     = useState(true)
  // activeTab: Lưu trạng thái Tab bộ lọc hiện tại, mặc định hiển thị danh sách đơn 'PENDING' (Chờ thực hiện)
  const [activeTab, setActiveTab]  = useState('PENDING')
  // searchText: Từ khóa tìm kiếm do người dùng nhập vào ô Input
  const [searchText, setSearchText]  = useState('')

  /**
   * Khối Guard: Xác thực xem người dùng hiện tại có phải là Kỹ thuật viên xét nghiệm hay không
  */
  const isLabTech = user?.role === 'LAB_TECHNICIAN'

  /**
   * Gọi API lấy toàn bộ danh sách các đơn xét nghiệm được phân công cho kỹ thuật viên này
   * Sử dụng useCallback để ghi nhớ hàm, tránh re-render không cần thiết khi dependencies không đổi
   */
  const fetchOrders = useCallback(async () => {
    setLoading(true)
    try {
      // Thực hiện gửi request GET đến hệ thống API của dịch vụ Lab
      const res = await labService.getLabOrderQueue()
      // Cập nhật danh sách đơn xét nghiệm vào state (nếu không có dữ liệu, trả về mảng rỗng)
      setOrders(res.data ?? [])
    } catch {
      message.error('Không thể tải danh sách phiếu xét nghiệm')
    } finally {
      setLoading(false)
    }
  }, [])

  /**
   * Luồng Effect: Tự động kích hoạt gọi API lấy dữ liệu ngay khi trang được tải thành công
   * và người dùng được xác minh đúng vai trò kỹ thuật viên
   */ 
  useEffect(() => {
    if (isLabTech) fetchOrders()
  }, [isLabTech, fetchOrders])

  /**
   * Xử lý nghiệp vụ khi Kỹ thuật viên nhấn nút kích hoạt "Bắt đầu khám" một đơn chờ
   * order - Đối tượng dữ liệu đơn xét nghiệm cần thực hiện
   */
  const handleStart = async (order) => {
    setStartingId(order.id)               // Bật trạng thái loading riêng cho dòng/đơn này
    try {
      // Gọi API cập nhật trạng thái đơn sang IN_PROGRESS trên máy chủ
      await labService.startLabOrder(order.id)
      message.success('Đã bắt đầu thực hiện xét nghiệm')
      // Điều hướng người dùng sang trang nhập liệu kết quả đo khám cùng tham số ID đơn
      navigate(`/lab/result-entry?orderId=${order.id}`)
    } catch (e) {
      message.error(e?.response?.data?.message || 'Không thể bắt đầu thực hiện xét nghiệm')
    } finally {
      setStartingId(null)                 // Tắt hiệu ứng loading sau khi xử lý xong
    }
  }

  /**
   * Thực hiện lọc dữ liệu trực tiếp dựa trên danh sách gốc
   * Kết hợp cả 2 điều kiện: Lọc theo Tab trạng thái và Lọc theo từ khóa tìm kiếm
   */
  const filteredOrders = orders.filter((o) => {
    // Nếu Tab hiện tại khác 'ALL', bản ghi phải trùng khớp chính xác trạng thái (status)
    if (activeTab !== 'ALL' && o.status !== activeTab) return false
    
    // Lọc theo từ khóa tìm kiếm (nếu ô tìm kiếm trống thì mặc định hiển thị)
    if (!searchText) return true
    const kw = searchText.toLowerCase()
    
    // Tìm kiếm không phân biệt hoa thường trên 4 trường dữ liệu quan trọng
    return (
      o.patientFullName?.toLowerCase().includes(kw) ||
      o.patientPhone?.toLowerCase().includes(kw) ||
      o.serviceName?.toLowerCase().includes(kw)  ||
      o.doctorFullName?.toLowerCase().includes(kw)
    )
  })

  /**
   * Đếm số lượng bản ghi theo từng trạng thái để hiển thị số lượng (Badge) trên đầu mỗi Tab
   */
  const countByStatus = (status) =>
    status === 'ALL'
      ? orders.length
      : orders.filter((o) => o.status === status).length

  /* ====================================================================== */
  /* Giao diện chặn                                    */
  /* ====================================================================== */
  if (!isLabTech) {
    return (
      <>
        <Header />
        <div style={{ padding: 48 }}>
          <Result
            status="403"
            title="Không có quyền truy cập"
            subTitle="Trang này chỉ dành cho Kỹ thuật viên xét nghiệm."
            extra={
              <Button type="primary" onClick={() => navigate('/')}>
                Về trang chủ
              </Button>
            }
          />
        </div>
      </>
    )
  }

  /* ====================================================================== */
  /* Giao diện chính                                         */
  /* ====================================================================== */
  const TABS = [
    { key: 'PENDING',     label: 'Chờ thực hiện' },
    { key: 'IN_PROGRESS', label: 'Đang thực hiện' },
    { key: 'SUBMITTED',   label: 'Đã gửi' },
    { key: 'REJECTED',    label: 'Đã bị hủy' },
    { key: 'APPROVED',    label: 'Hoàn thành' },
    { key: 'ALL',         label: 'Tất cả' },
  ]
  
  return (
    <>
      <Header />
      <div style={{ padding: 24 }}>

        {/* --- Khối tiêu đề trang (Page Header) --- */}
        <div style={{ marginBottom: 20, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#0f172a' }}>
              Hàng đợi xét nghiệm
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>
              Danh sách phiếu xét nghiệm đang chờ thực hiện
            </p>
          </div>
          {/* Nút hỗ trợ ép buộc tải lại danh sách thủ công từ máy chủ */}
          <Button onClick={fetchOrders} loading={loading} size="small" style={{ fontSize: 12 }}>
              Làm mới
          </Button>
        </div>

        {/* --- Bảng dữ liệu tập trung (Table Card) --- */}
        <div style={{ backgroundColor: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
          
          {/* ---- Tab thanh bộ lọc trạng thái ---- */}
          <div style={{ display: 'flex', borderBottom: '1px solid #f1f5f9', padding: '0 16px', gap: 4, overflowX: 'auto' }}>
            {TABS.map((tab) => {
              const count = countByStatus(tab.key)
              const isActive = activeTab === tab.key
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  style={{
                    padding: '12px 16px',
                    border: 'none',
                    background: 'none',
                    cursor: 'pointer',
                    fontSize: 13,
                    fontWeight: isActive ? 600 : 400,
                    color: isActive ? '#0d9488' : '#64748b',
                    borderBottom: isActive ? '2px solid #0d9488' : '2px solid transparent',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    whiteSpace: 'nowrap',
                    transition: 'all 0.15s',
                  }}
                >
                  {tab.label}
                  {/* Badge số lượng đi kèm từng tab */}
                  <span style={{
                    backgroundColor: isActive ? '#0d9488' : '#e2e8f0',
                    color: isActive ? '#fff' : '#64748b',
                    borderRadius: 99,
                    padding: '1px 7px',
                    fontSize: 11,
                    fontWeight: 600,
                    minWidth: 20,
                    textAlign: 'center',
                  }}>
                    {count}
                  </span>
                </button>
              )
            })}
          </div>

          {/* ---- Thanh tìm kiếm từ khóa (Search Bar) ---- */}
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9' }}>
            <Input.Search
              placeholder="Tìm theo tên bệnh nhân, SĐT, bác sĩ hoặc dịch vụ..."
              allowClear
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ maxWidth: 440 }}
            />
          </div>

          {/* ---- Khu vực hiển thị bảng dữ liệu (Data Table) ---- */}
          <Spin spinning={loading}>
            {/* Trường hợp không có dữ liệu sau khi lọc hoặc tìm kiếm */}
            {!loading && filteredOrders.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px 0', color: '#94a3b8', fontSize: 14 }}>
                {searchText
                  ? 'Không tìm thấy kết quả phù hợp'
                  : activeTab === 'PENDING'
                    ? 'Không có phiếu xét nghiệm nào đang chờ'
                    : 'Không có dữ liệu'}
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: '#f8fafc' }}>
                    {['STT', 'Ngày tạo', 'Bệnh nhân', 'SĐT', 'Bác sĩ chỉ định', 'Dịch vụ XN', 'Ưu tiên', 'Trạng thái', ''].map((h) => (
                      <th
                        key={h}
                        style={{ padding: '10px 16px', textAlign: 'left', fontSize: 13, fontWeight: 600, color: '#475569', whiteSpace: 'nowrap' }}
                      >
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
                      // Tạo hiệu ứng Hover dòng bằng Javascript thuần thay vì CSS file
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f0fdf9'}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = ''}
                    >
                      {/* Số thứ tự dòng tăng dần */}
                      <td style={{ padding: '12px 16px', color: '#64748b', fontSize: 13 }}>{i + 1}</td>

                      {/* Thời gian tạo: Hiển thị ngày/tháng và giờ riêng biệt */}
                      <td style={{ padding: '12px 16px', fontSize: 13, color: '#475569', whiteSpace: 'nowrap' }}>
                        {order.createdAt ? new Date(order.createdAt).toLocaleDateString('vi-VN') : '—'}
                        <div style={{ fontSize: 11, color: '#94a3b8' }}>
                          {order.createdAt ? new Date(order.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : ''}
                        </div>
                      </td>

                      {/* Tên bệnh nhân - bọc trong khối cắt ngắn text tránh tràn */}
                      <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 500, color: '#1e293b', maxWidth: 160 }}>
                        <div title={order.patientFullName ?? '—'} style={textEllipsisStyle}>{order.patientFullName ?? '—'}</div>
                      </td>

                      {/* Số điện thoại bệnh nhân */}
                      <td style={{ padding: '12px 16px', fontSize: 13, color: '#64748b', whiteSpace: 'nowrap' }}>
                        {order.patientPhone ?? '—'}
                      </td>

                      {/* Tên bác sĩ chỉ định */}
                      <td style={{ padding: '12px 16px', fontSize: 13, color: '#475569', maxWidth: 160 }}>
                        <div title={order.doctorFullName ?? '—'} style={textEllipsisStyle}>{order.doctorFullName ?? '—'}</div>
                      </td>

                      {/* Tên dịch vụ xét nghiệm (ví dụ: Đo khúc xạ, Đo nhãn áp...) */}
                      {/* <td style={{ padding: '12px 16px', fontSize: 13, color: '#475569', maxWidth: 200 }}>
                        <div title={order.serviceName ?? '—'} style={textEllipsisStyle}>{order.serviceName ?? '—'}</div>
                      </td> */}

                      {/* Khối nhãn biểu thị Mức độ ưu tiên (Tag) */}
                      <td style={{ padding: '12px 16px' }}>
                        <Tag color={PRIORITY_MAP[order.priority]?.color ?? 'default'}>
                          {PRIORITY_MAP[order.priority]?.label ?? order.priority ?? '—'}
                        </Tag>
                      </td>

                      {/* Khối nhãn biểu thị Trạng thái hiện tại của đơn */}
                      <td style={{ padding: '12px 16px' }}>
                        <Tag color={LAB_ORDER_STATUS_MAP[order.status]?.color ?? 'default'}>
                          {LAB_ORDER_STATUS_MAP[order.status]?.label ?? order.status}
                        </Tag>
                      </td>

                      {/* Khối hành động linh hoạt theo từng trạng thái của đơn */}
                      <td style={{ padding: '12px 16px' }}>
                        {/* Trạng thái PENDING: Cho phép bấm để kích hoạt làm việc */}
                        {order.status === 'PENDING' && (
                          <Button
                            type="primary"
                            size="small"
                            loading={startingId === order.id}
                            onClick={() => handleStart(order)}
                            style={{
                              fontSize: 12,
                              backgroundColor: '#0d9488',
                              borderColor: '#0d9488',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            Bắt đầu khám
                          </Button>
                        )}
                        
                        {/* Trạng thái IN_PROGRESS: Đang dở dang, cho phép tiếp tục điền kết quả */}
                        {order.status === 'IN_PROGRESS' && (
                          <Button
                            size="small"
                            onClick={() => navigate(`/lab/result-entry?orderId=${order.id}`)}
                            style={{ fontSize: 12, borderColor: '#0d9488', color: '#0d9488', whiteSpace: 'nowrap' }}
                          >
                            Tiếp tục nhập
                          </Button>
                        )}
                        
                        {/* Trạng thái SUBMITTED: Đã chuyển đi chờ duyệt, chỉ cho phép xem thông tin dạng Read-only */}
                        {order.status === 'SUBMITTED' && (
                          <Button
                            size="small"
                            onClick={() => navigate(`/lab/result-entry?orderId=${order.id}&readonly=true`)}
                            style={{ fontSize: 12, borderColor: '#d97706', color: '#d97706' }}
                          >
                            Xem kết quả
                          </Button>
                        )}
                        
                        {/* Trạng thái APPROVED: Đã hoàn tất phê duyệt, xem thông tin ở chế độ Read-only */}
                        {order.status === 'APPROVED' && (
                          <Button
                            size="small"
                            onClick={() => navigate(`/lab/result-entry?orderId=${order.id}&readonly=true`)}
                            style={{ fontSize: 12, borderColor: '#0d9488', color: '#0d9488' }}
                          >
                            Xem kết quả
                          </Button>
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
    </>
  )
}