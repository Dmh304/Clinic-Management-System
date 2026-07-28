/**
 * Author: TuanTD
 * 
 * Trang quản lý hàng đợi xét nghiệm dành riêng cho Kỹ thuật viên (Lab Technician)
 * Thành phần này thực hiện các nhiệm vụ chính:
 * 1. Kiểm tra quyền truy cập - chỉ cho phép tài khoản có vai trò LAB_TECHNICIAN
 * 2. Tải danh sách các phiếu xét nghiệm được phân công từ hệ thống backend
 * 3. Hiển thị các thẻ thống kê số lượng phiếu xét nghiệm theo từng trạng thái
 * 4. Lọc danh sách theo trạng thái thông qua dropdown, kết hợp tìm kiếm nâng cao theo thời gian thực
 *    (tên bệnh nhân, số điện thoại, bác sĩ chỉ định, tên dịch vụ)
 * 5. Điều hướng kỹ thuật viên bắt đầu thực hiện hoặc tiếp tục cập nhật kết quả đo khám
 */

import { useEffect, useState, useCallback } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import Header from '../../components/layout/Header'
import { Input, Select, Button, message, Tag, Spin, Result, Pagination, Tooltip } from 'antd'
import { ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons'
import { labService } from '../../services/labService'
import { isWithinClinicHours, isSameDayAsToday, CLINIC_HOURS_MESSAGE } from '../../utils/clinicHours'

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
 * Thứ tự ưu tiên xử lý (số càng nhỏ càng được xếp lên trước) - dùng làm tiêu chí sort chính,
 * đảm bảo ca Khẩn cấp luôn được xếp lên đầu bất kể được tạo trước hay sau các ca khác (nguyên tắc triage)
 */
const PRIORITY_ORDER = {
  EMERGENCY: 0,
  WARNING: 1,
  PRIMARY: 2,
}

/**
 * Cấu hình các thẻ thống kê hiển thị phía trên bảng, mỗi thẻ tương ứng một trạng thái đơn xét nghiệm
 * (bao gồm cả thẻ "Tất cả" tổng hợp toàn bộ số lượng)
 */
const STAT_CARDS = [
  { key: 'ALL',         label: 'Tất cả',         color: '#6366f1' },
  { key: 'PENDING',     label: 'Chờ thực hiện',   color: '#94a3b8' },
  { key: 'IN_PROGRESS', label: 'Đang thực hiện', color: '#3b82f6' },
  { key: 'SUBMITTED',   label: 'Đã gửi',          color: '#d97706' },
  { key: 'APPROVED',    label: 'Hoàn thành',      color: '#10b981' },
  { key: 'REJECTED',    label: 'Đã huỷ',          color: '#ef4444' },
]

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

/* Thẻ thống kê số lượng đơn xét nghiệm theo trạng thái - chỉ hiển thị thông tin, không thể bấm để lọc */
function StatCard({ label, value, color }) {
  return (
    <div
      style={{
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: '16px 20px',
        borderTop: `3px solid ${color}`,
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        minWidth: 120,
        flex: 1,
      }}
    >
      <div style={{ fontSize: 26, fontWeight: 700, color }}>{value ?? 0}</div>
      <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{label}</div>
    </div>
  )
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
  // statusFilter: Trạng thái lọc hiện tại, mặc định hiển thị 'PENDING' (Chờ thực hiện) — đúng vai trò
  // hàng đợi công việc cần xử lý; người dùng có thể tự đổi sang trạng thái khác hoặc 'Tất cả' để tra cứu
  const [statusFilter, setStatusFilter]  = useState('PENDING')
  // searchText: Từ khóa tìm kiếm do người dùng nhập vào ô Input
  const [searchText, setSearchText]  = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [withinHours, setWithinHours] = useState(isWithinClinicHours())
  // sortAsc: Chiều sắp xếp theo thời gian tạo trong cùng một mức ưu tiên.
  // true = cũ nhất trước (FIFO, mặc định), false = mới nhất trước. Người dùng có thể tự bấm cột
  // "Ngày tạo" để đảo chiều; giá trị này không tự động đổi theo statusFilter đang chọn.
  const [sortAsc, setSortAsc] = useState(true)

  useEffect(() => {
    const timer = setInterval(() => setWithinHours(isWithinClinicHours()), 60_000)
    return () => clearInterval(timer)
  }, [])  

  const pageSize = 10
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
   * và người dùng được xác minh đúng vai trò kỹ thuật viên. Tự động làm mới mỗi 30 giây.
   */ 
  useEffect(() => {
    if (!isLabTech) return
    fetchOrders()

    const timer = setInterval(fetchOrders, 30_000)
    return () => clearInterval(timer)
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
   * Kết hợp cả 2 điều kiện: Lọc theo trạng thái (dropdown) và Lọc theo từ khóa tìm kiếm
   */
  const filteredOrders = orders
    .filter((o) => {
      if (statusFilter !== 'ALL' && o.status !== statusFilter) return false
      if (!searchText) return true
      const kw = searchText.toLowerCase()
      return (
        o.patientFullName?.toLowerCase().includes(kw) ||
        o.patientPhone?.toLowerCase().includes(kw) ||
        o.serviceName?.toLowerCase().includes(kw)  ||
        o.doctorFullName?.toLowerCase().includes(kw)
      )
    })
    /**
     * Sắp xếp: ưu tiên mức độ khẩn cấp (EMERGENCY > WARNING > PRIMARY) lên trước bất kể thời gian tạo,
     * đúng nguyên tắc triage lâm sàng. Trong cùng một mức ưu tiên, sắp xếp theo thời gian tạo
     * (createdAt) theo chiều do người dùng chọn qua việc bấm cột "Ngày tạo" (mặc định cũ nhất trước).
     */
    .slice()
    .sort((a, b) => {
      const prioDiff = (PRIORITY_ORDER[a.priority] ?? 99) - (PRIORITY_ORDER[b.priority] ?? 99)
      if (prioDiff !== 0) return prioDiff
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0
      return sortAsc ? timeA - timeB : timeB - timeA
    })

  useEffect(() => {
    setCurrentPage(1)
  }, [statusFilter, searchText, sortAsc])

  const pagedOrders = filteredOrders.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  /**
   * Đếm số lượng bản ghi theo từng trạng thái để hiển thị trên các thẻ thống kê
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
        {/* <Header /> */}
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
  return (
    <>
      <Header />
      <div style={{ padding: 24 }}>

        {/* --- Khối tiêu đề trang (Page Header) --- */}
        <div style={{ marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#0f172a' }}>
            Hàng đợi xét nghiệm
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>
            Danh sách phiếu xét nghiệm đang chờ thực hiện
          </p>
        </div>

        {/* --- Danh sách các thẻ thống kê số lượng đơn xét nghiệm theo trạng thái --- */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
          {STAT_CARDS.map((card) => (
            <StatCard
              key={card.key}
              label={card.label}
              value={countByStatus(card.key)}
              color={card.color}
            />
          ))}
        </div>

        {/* --- Bảng dữ liệu tập trung (Table Card) --- */}
        <div style={{ backgroundColor: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', overflow: 'hidden' }}>

          {/* ---- Thanh tìm kiếm, dropdown lọc trạng thái và nút làm mới ---- */}
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9', display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <Input.Search
              placeholder="Tìm theo tên bệnh nhân, SĐT, bác sĩ hoặc dịch vụ..."
              allowClear
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ flex: 1, minWidth: 200 }}
            />

            {/* Dropdown lọc theo trạng thái - thay thế cho thanh Tab trước đây */}
            <Select
              value={statusFilter}
              onChange={setStatusFilter}
              style={{ width: 200, flexShrink: 0 }}
              options={[
                { label: `Tất cả (${countByStatus('ALL')})`, value: 'ALL' },
                ...Object.entries(LAB_ORDER_STATUS_MAP).map(([value, cfg]) => ({
                  label: `${cfg.label} (${countByStatus(value)})`,
                  value,
                })),
              ]}
            />

            {/* Nút hỗ trợ ép buộc tải lại danh sách thủ công từ máy chủ */}
            <Button onClick={fetchOrders} loading={loading} size="small" style={{ fontSize: 12, flexShrink: 0 }}>
              Làm mới
            </Button>
          </div>

          {/* ---- Khu vực hiển thị bảng dữ liệu (Data Table) ---- */}
          <Spin spinning={loading}>
            {/* Trường hợp không có dữ liệu sau khi lọc hoặc tìm kiếm */}
            {!loading && filteredOrders.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px 0', color: '#94a3b8', fontSize: 14 }}>
                {searchText
                  ? 'Không tìm thấy kết quả phù hợp'
                  : statusFilter === 'PENDING'
                    ? 'Không có phiếu xét nghiệm nào đang chờ'
                    : 'Không có dữ liệu'}
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: '#f8fafc' }}>
                    {['STT', 'Ngày tạo', 'Bệnh nhân', 'SĐT', 'Bác sĩ chỉ định', 'Dịch vụ', 'Ưu tiên', 'Trạng thái', 'Thao tác'].map((h) => (
                      <th
                        key={h}
                        onClick={h === 'Ngày tạo' ? () => setSortAsc((v) => !v) : undefined}
                        style={{
                          padding: '10px 16px',
                          textAlign: 'left',
                          fontSize: 13,
                          fontWeight: 600,
                          color: '#475569',
                          whiteSpace: 'nowrap',
                          cursor: h === 'Ngày tạo' ? 'pointer' : 'default',
                          userSelect: h === 'Ngày tạo' ? 'none' : 'auto',
                        }}
                      >
                        {h === 'Ngày tạo' ? (
                          <Tooltip title={sortAsc ? 'Đang sắp xếp: Cũ nhất trước — bấm để đổi' : 'Đang sắp xếp: Mới nhất trước — bấm để đổi'}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                              {h}
                              {sortAsc
                                ? <ArrowUpOutlined style={{ fontSize: 11, color: '#0d9488' }} />
                                : <ArrowDownOutlined style={{ fontSize: 11, color: '#0d9488' }} />}
                            </span>
                          </Tooltip>
                        ) : h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pagedOrders.map((order, i) => (
                    <tr
                      key={order.id}
                      style={{ borderBottom: '1px solid #f1f5f9' }}
                      // Tạo hiệu ứng Hover dòng bằng Javascript thuần thay vì CSS file
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f0fdf9'}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = ''}
                    >
                      {/* Số thứ tự dòng tăng dần */}
                      <td style={{ padding: '12px 16px', color: '#64748b', fontSize: 13 }}>
                        {(currentPage - 1) * pageSize + i + 1}
                      </td>

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
                      <td style={{ padding: '12px 16px', fontSize: 13, color: '#475569', maxWidth: 200 }}>
                        <div title={order.serviceName ?? '—'} style={textEllipsisStyle}>{order.serviceName ?? '—'}</div>
                      </td>

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
                        {order.status === 'PENDING' && (() => {
                          const canOperate = withinHours && isSameDayAsToday(order.appointmentTime)
                          return (
                            <Tooltip title={!canOperate ? (!isSameDayAsToday(order.appointmentTime) ? 'Chỉ có thể thao tác với lịch hẹn của hôm nay' : CLINIC_HOURS_MESSAGE) : ''}>
                              <Button
                                type="primary"
                                size="small"
                                disabled={!canOperate}
                                loading={startingId === order.id}
                                onClick={() => handleStart(order)}
                                style={{ fontSize: 12, backgroundColor: '#0d9488', borderColor: '#0d9488', whiteSpace: 'nowrap' }}
                              >
                                Bắt đầu khám
                              </Button>
                            </Tooltip>
                          )
                        })()}
                        
                        {order.status === 'IN_PROGRESS' && (() => {
                          const canOperate = withinHours && isSameDayAsToday(order.appointmentTime)
                          return (
                            <Tooltip title={!canOperate ? (!isSameDayAsToday(order.appointmentTime) ? 'Chỉ có thể thao tác với lịch hẹn của hôm nay' : CLINIC_HOURS_MESSAGE) : ''}>
                              <Button
                                size="small"
                                disabled={!canOperate}
                                onClick={() => navigate(`/lab/result-entry?orderId=${order.id}`)}
                                style={{ fontSize: 12, borderColor: '#0d9488', color: '#0d9488', whiteSpace: 'nowrap' }}
                              >
                                Tiếp tục nhập
                              </Button>
                            </Tooltip>
                          )
                        })()}
                        
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
            {filteredOrders.length > pageSize && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '14px 16px' }}>
                <Pagination
                  current={currentPage}
                  pageSize={pageSize}
                  total={filteredOrders.length}
                  onChange={setCurrentPage}
                  showTotal={(total) => `${total} phiếu xét nghiệm`}
                  size="small"
                />
              </div>
            )}
          </Spin>
        </div>
      </div>
    </>
  )
}
