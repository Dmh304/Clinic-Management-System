/**
 * Trang hàng đợi gia công đơn kính dành cho Lab Technician (UC-36).
 * Thao tác trên EyeglassOrder, KHÔNG phải EyeglassPrescription.
 * Trạng thái hiển thị: PENDING_LAB -> IN_PRODUCTION -> READY.
 * Đơn READY có thể được Lab Technician giao trực tiếp cho bệnh nhân (DISPENSED)
 * — gộp bước bàn giao vào cùng màn hình Lab thay vì tách riêng cho Lễ tân.
 */

import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import Header from '../../components/layout/Header'
import { Button, message, Tag, Spin, Input, Select, Result, Pagination, Tooltip } from 'antd'
import { ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons'
import { eyeglassOrderService } from '../../services/eyeglassOrderService'
import useConfirmAction from '../../hooks/useConfirmAction'
import { isWithinClinicHours, CLINIC_HOURS_MESSAGE } from '../../utils/clinicHours'

const ORDER_STATUS_MAP = {
  PENDING_LAB:   { color: 'default',    label: 'Chờ xưởng cắt kính' },
  IN_PRODUCTION: { color: 'processing', label: 'Đang gia công' },
  READY:         { color: 'success',    label: 'Sẵn sàng giao' },
  DISPENSED:     { color: 'default',    label: 'Đã giao' },
  CANCELLED:     { color: 'error',      label: 'Đã hủy' },
}

/**
 * Cấu hình các thẻ thống kê hiển thị phía trên bảng, mỗi thẻ tương ứng một trạng thái đơn kính
 * (bao gồm cả thẻ "Tất cả" tổng hợp toàn bộ số lượng)
 */
const STAT_CARDS = [
  { key: 'ALL',           label: 'Tất cả',              color: '#6366f1' },
  { key: 'PENDING_LAB',   label: 'Chờ xưởng cắt kính',   color: '#94a3b8' },
  { key: 'IN_PRODUCTION', label: 'Đang gia công',        color: '#0d9488' },
  { key: 'READY',         label: 'Sẵn sàng giao',        color: '#10b981' },
  { key: 'DISPENSED',     label: 'Đã giao',              color: '#64748b' },
  { key: 'CANCELLED',     label: 'Đã hủy',               color: '#ef4444' },
]

const textEllipsisStyle = {
  display: '-webkit-box',
  WebkitLineClamp: 1,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  wordBreak: 'break-all',
}

/* Thẻ thống kê số lượng đơn kính theo trạng thái - chỉ hiển thị thông tin, không thể bấm để lọc */
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

export default function EyeglassOrderQueue() {
  const navigate = useNavigate()
  const { user } = useSelector((s) => s.auth)
  const { confirmAction, contextHolder } = useConfirmAction()

  const [startingId, setStartingId] = useState(null)
  const [dispensingId, setDispensingId] = useState(null)
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  // statusFilter: Trạng thái lọc hiện tại, mặc định 'PENDING_LAB' (Chờ xưởng cắt kính); có thể đổi qua dropdown
  const [statusFilter, setStatusFilter] = useState('PENDING_LAB')
  const [searchText, setSearchText] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 10
  // sortAsc: Chiều sắp xếp theo thời gian tạo đơn. true = cũ nhất trước (mặc định), false = mới nhất trước.
  // Bấm cột "Ngày tạo đơn" để đảo chiều.
  const [sortAsc, setSortAsc] = useState(true)

  const [withinHours, setWithinHours] = useState(isWithinClinicHours())

  useEffect(() =>{
    const timer = setInterval(() => setWithinHours(isWithinClinicHours()), 60_000)
    return () => clearInterval(timer)
  }, [])

  const isLabTech = user?.role === 'LAB_TECHNICIAN'

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    try {
      const res = await eyeglassOrderService.getFabricationQueue()
      setOrders(res.data?.data ?? res.data ?? [])
    } catch {
      message.error('Không thể tải danh sách đơn kính')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isLabTech) fetchOrders()
  }, [isLabTech, fetchOrders])

  const handleStart = async (order) => {
    setStartingId(order.id)
    try {
      await eyeglassOrderService.startFabrication(order.id)
      message.success('Đã bắt đầu gia công đơn kính')
      navigate(`/lab/eyeglass-detail?id=${order.id}`)
    } catch (e) {
      message.error(e?.response?.data?.message || 'Không thể bắt đầu gia công')
    } finally {
      setStartingId(null)
    }
  }

  const executeDispense = async (order) => {
    setDispensingId(order.id)
    try {
      await eyeglassOrderService.dispense(order.id)
      message.success('Đã giao kính cho bệnh nhân')
      fetchOrders()
    } catch (e) {
      message.error(e?.response?.data?.message || 'Không thể giao kính')
    } finally {
      setDispensingId(null)
    }
  }

  const handleDispense = (order) => {
    confirmAction({
      type: 'success',
      title: 'Xác nhận giao kính cho bệnh nhân?',
      description: 'Đơn kính sẽ chuyển sang trạng thái "Đã giao" và không thể hoàn tác.',
      details: [
        { label: 'Bệnh nhân', value: order?.patientName ?? '—' },
        { label: 'Gọng kính', value: order?.frameName ?? '—' },
      ],
      confirmText: 'Giao kính',
      onConfirm: () => executeDispense(order),
    })
  }

  /* ---------------------------------------------------------------- */
  /* CLIENT-SIDE FILTERING & SORTING                                    */
  /* ---------------------------------------------------------------- */
  const filteredOrders = orders
    .filter((o) => {
      if (statusFilter !== 'ALL' && o.status !== statusFilter) return false
      if (!searchText) return true
      const kw = searchText.toLowerCase()
      return (
        o.patientName?.toLowerCase().includes(kw) ||
        o.doctorName?.toLowerCase().includes(kw) ||
        o.frameName?.toLowerCase().includes(kw)
      )
    })
    /**
     * Sắp xếp theo thời gian tạo đơn (createdAt) theo chiều do người dùng chọn qua việc bấm
     * cột "Ngày tạo đơn" (mặc định cũ nhất trước). Không áp dụng sắp xếp theo mức ưu tiên.
     */
    .slice()
    .sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0
      return sortAsc ? timeA - timeB : timeB - timeA
    })

  useEffect(() => {
    setCurrentPage(1)
  }, [statusFilter, searchText, sortAsc])

  const pagedOrders = filteredOrders.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  )

  const countByStatus = (status) =>
    status === 'ALL'
      ? orders.length
      : orders.filter((o) => o.status === status).length

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

  return (
    <>
      {contextHolder}
      <Header />
      <div style={{ padding: 24 }}>
        <div style={{ marginBottom: 20, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#0f172a' }}>
              Hàng đợi Gia công Kính
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>
              Đơn đặt kính đã được Lễ tân xác nhận, chờ xưởng cắt kính xử lý
            </p>
          </div>

        </div>

        {/* --- Danh sách các thẻ thống kê số lượng đơn kính theo trạng thái --- */}
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

        <div style={{ backgroundColor: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
          {/* SEARCH + FILTER */}
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9', display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <Input.Search
              placeholder="Tìm theo tên bệnh nhân, bác sĩ hoặc gọng kính..."
              allowClear
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ flex: 1, minWidth: 200 }}
            />

            {/* Dropdown lọc theo trạng thái */}
            <Select
              value={statusFilter}
              onChange={setStatusFilter}
              style={{ width: 200, flexShrink: 0 }}
              options={[
                { label: `Tất cả (${countByStatus('ALL')})`, value: 'ALL' },
                ...Object.entries(ORDER_STATUS_MAP).map(([value, cfg]) => ({
                  label: `${cfg.label} (${countByStatus(value)})`,
                  value,
                })),
              ]}
            />
            <Button onClick={fetchOrders} loading={loading} size="small" style={{ fontSize: 12 }}>
              Làm mới
            </Button>
          </div>

          <Spin spinning={loading}>
            {!loading && filteredOrders.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px 0', color: '#94a3b8', fontSize: 14 }}>
                {searchText ? 'Không tìm thấy kết quả phù hợp' : 'Không có dữ liệu'}
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: '#f8fafc' }}>
                    {['STT', 'Ngày tạo đơn', 'Bệnh nhân', 'Bác sĩ kê đơn', 'Gọng kính', 'Tổng tiền', 'Trạng thái', 'Thao tác'].map((h) => (
                      <th
                        key={h}
                        onClick={h === 'Ngày tạo đơn' ? () => setSortAsc((v) => !v) : undefined}
                        style={{
                          padding: '10px 16px',
                          textAlign: 'left',
                          fontSize: 13,
                          fontWeight: 600,
                          color: '#475569',
                          whiteSpace: 'nowrap',
                          cursor: h === 'Ngày tạo đơn' ? 'pointer' : 'default',
                          userSelect: h === 'Ngày tạo đơn' ? 'none' : 'auto',
                        }}
                      >
                        {h === 'Ngày tạo đơn' ? (
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
                  {pagedOrders.map((o, i) => (
                    <tr
                      key={o.id}
                      style={{ borderBottom: '1px solid #f1f5f9' }}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f0fdf9'}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = ''}
                    >
                      <td style={{ padding: '12px 16px', color: '#64748b', fontSize: 13 }}>
                        {(currentPage - 1) * pageSize + i + 1}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 13, color: '#475569', whiteSpace: 'nowrap' }}>
                        {o.createdAt ? new Date(o.createdAt).toLocaleDateString('vi-VN') : '—'}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 500, color: '#1e293b', maxWidth: 160 }}>
                        <div title={o.patientName ?? '—'} style={textEllipsisStyle}>{o.patientName ?? '—'}</div>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 13, color: '#475569', maxWidth: 160 }}>
                        <div title={o.doctorName ?? '—'} style={textEllipsisStyle}>{o.doctorName ?? '—'}</div>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 13, color: '#475569', maxWidth: 160 }}>
                        <div title={o.frameName ?? '—'} style={textEllipsisStyle}>{o.frameName ?? '—'}</div>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 13, color: '#475569', whiteSpace: 'nowrap' }}>
                        {o.totalAmount != null ? `${Number(o.totalAmount).toLocaleString('vi-VN')} đ` : '—'}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <Tag color={ORDER_STATUS_MAP[o.status]?.color ?? 'default'}>
                          {ORDER_STATUS_MAP[o.status]?.label ?? o.status}
                        </Tag>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'nowrap' }}>
                          {o.status === 'PENDING_LAB' && (
                            <Tooltip title={!withinHours ? CLINIC_HOURS_MESSAGE : ''}>
                              <Button
                                type="primary"
                                size="small"
                                disabled={!withinHours}
                                loading={startingId === o.id}
                                onClick={() => handleStart(o)}
                                style={{ fontSize: 12, backgroundColor: '#0d9488', borderColor: '#0d9488', whiteSpace: 'nowrap' }}
                              >
                                Bắt đầu gia công
                              </Button>
                            </Tooltip>
                          )}
                          {o.status === 'IN_PRODUCTION' && (
                            <Tooltip title={!withinHours ? CLINIC_HOURS_MESSAGE : ''}>
                              <Button
                                size="small"
                                disabled={!withinHours}
                                onClick={() => navigate(`/lab/eyeglass-detail?id=${o.id}`)}
                                style={{ fontSize: 12, borderColor: '#0d9488', color: '#0d9488', whiteSpace: 'nowrap' }}
                              >
                                Tiếp tục gia công
                              </Button>
                            </Tooltip>
                          )}
                          {o.status === 'READY' && (
                            <>
                              <Button
                                size="small"
                                onClick={() => navigate(`/lab/eyeglass-detail?id=${o.id}&readonly=true`)}
                                style={{ fontSize: 12, borderColor: '#0d9488', color: '#0d9488', whiteSpace: 'nowrap' }}
                              >
                                Xem chi tiết
                              </Button>
                              <Tooltip title={!withinHours ? CLINIC_HOURS_MESSAGE : ''}>
                                <Button
                                  type="primary"
                                  size="small"
                                  disabled={!withinHours}
                                  loading={dispensingId === o.id}
                                  onClick={() => handleDispense(o)}
                                  style={{ fontSize: 12, backgroundColor: '#16a34a', borderColor: '#16a34a', whiteSpace: 'nowrap' }}
                                >
                                  Giao kính
                                </Button>
                              </Tooltip>
                            </>
                          )}
                          {o.status === 'DISPENSED' && (
                            <Button
                              size="small"
                              onClick={() => navigate(`/lab/eyeglass-detail?id=${o.id}&readonly=true`)}
                              style={{ fontSize: 12, borderColor: '#94a3b8', color: '#64748b' }}
                            >
                              Xem chi tiết
                            </Button>
                          )}
                          {o.status === 'CANCELLED' && (
                            <Button
                              size="small"
                              onClick={() => navigate(`/lab/eyeglass-detail?id=${o.id}&readonly=true`)}
                              style={{ fontSize: 12, borderColor: '#94a3b8', color: '#64748b' }}
                            >
                              Xem chi tiết
                            </Button>
                          )}
                        </div>
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
                  showTotal={(total) => `${total} đơn kính`}
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
