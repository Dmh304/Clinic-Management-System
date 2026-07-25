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
import { Button, message, Tag, Spin, Input, Result, Pagination } from 'antd'
import { eyeglassOrderService } from '../../services/eyeglassOrderService'
import useConfirmAction from '../../hooks/useConfirmAction'

const ORDER_STATUS_MAP = {
  PENDING_LAB:   { color: 'default',    label: 'Chờ xưởng cắt kính' },
  IN_PRODUCTION: { color: 'processing', label: 'Đang gia công' },
  READY:         { color: 'success',    label: 'Sẵn sàng giao' },
  DISPENSED:     { color: 'default',    label: 'Đã giao' },
  CANCELLED:     { color: 'error',      label: 'Đã hủy' },
}

const textEllipsisStyle = {
  display: '-webkit-box',
  WebkitLineClamp: 1,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  wordBreak: 'break-all',
}

export default function EyeglassOrderQueue() {
  const navigate = useNavigate()
  const { user } = useSelector((s) => s.auth)
  const { confirmAction, contextHolder } = useConfirmAction()

  const [startingId, setStartingId] = useState(null)
  const [dispensingId, setDispensingId] = useState(null)
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('PENDING_LAB')
  const [searchText, setSearchText] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 10

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

  const filteredOrders = orders.filter((o) => {
    if (activeTab !== 'ALL' && o.status !== activeTab) return false
    if (!searchText) return true
    const kw = searchText.toLowerCase()
    return (
      o.patientName?.toLowerCase().includes(kw) ||
      o.doctorName?.toLowerCase().includes(kw) ||
      o.frameName?.toLowerCase().includes(kw)
    )
  })

  useEffect(() => {
    setCurrentPage(1)
  }, [activeTab, searchText])

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

  const TABS = [
    { key: 'PENDING_LAB', label: 'Chờ xưởng cắt kính' },
    { key: 'IN_PRODUCTION', label: 'Đang gia công' },
    { key: 'READY', label: 'Sẵn sàng giao' },
    { key: 'DISPENSED', label: 'Đã giao' },
    { key: 'CANCELLED', label: 'Đã hủy' },
    { key: 'ALL', label: 'Tất cả' },
  ]

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
          <Button onClick={fetchOrders} loading={loading} size="small" style={{ fontSize: 12 }}>
            Làm mới
          </Button>
        </div>

        <div style={{ backgroundColor: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
          <div style={{ display: 'flex', borderBottom: '1px solid #f1f5f9', padding: '0 16px', gap: 4, overflowX: 'auto' }}>
            {TABS.map((tab) => {
              const count = countByStatus(tab.key)
              const isActive = activeTab === tab.key
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  style={{
                    padding: '12px 16px', border: 'none', background: 'none', cursor: 'pointer',
                    fontSize: 13, fontWeight: isActive ? 600 : 400,
                    color: isActive ? '#0d9488' : '#64748b',
                    borderBottom: isActive ? '2px solid #0d9488' : '2px solid transparent',
                    display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap', transition: 'all 0.15s',
                  }}
                >
                  {tab.label}
                  <span style={{
                    backgroundColor: isActive ? '#0d9488' : '#e2e8f0',
                    color: isActive ? '#fff' : '#64748b',
                    borderRadius: 99, padding: '1px 7px', fontSize: 11, fontWeight: 600, minWidth: 20, textAlign: 'center',
                  }}>
                    {count}
                  </span>
                </button>
              )
            })}
          </div>

          <div style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9' }}>
            <Input.Search
              placeholder="Tìm theo tên bệnh nhân, bác sĩ hoặc gọng kính..."
              allowClear
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ maxWidth: 440 }}
            />
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
                      <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 13, fontWeight: 600, color: '#475569', whiteSpace: 'nowrap' }}>
                        {h}
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
                            <Button
                              type="primary"
                              size="small"
                              loading={startingId === o.id}
                              onClick={() => handleStart(o)}
                              style={{ fontSize: 12, backgroundColor: '#0d9488', borderColor: '#0d9488', whiteSpace: 'nowrap' }}
                            >
                              Bắt đầu gia công
                            </Button>
                          )}
                          {o.status === 'IN_PRODUCTION' && (
                            <Button
                              size="small"
                              onClick={() => navigate(`/lab/eyeglass-detail?id=${o.id}`)}
                              style={{ fontSize: 12, borderColor: '#0d9488', color: '#0d9488', whiteSpace: 'nowrap' }}
                            >
                              Tiếp tục gia công
                            </Button>
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
                              <Button
                                type="primary"
                                size="small"
                                loading={dispensingId === o.id}
                                onClick={() => handleDispense(o)}
                                style={{ fontSize: 12, backgroundColor: '#16a34a', borderColor: '#16a34a', whiteSpace: 'nowrap' }}
                              >
                                Giao kính
                              </Button>
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