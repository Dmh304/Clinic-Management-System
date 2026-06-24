import { useEffect, useState, useCallback } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import Header from '../../components/layout/Header'
import { Form, Input, InputNumber, Tabs, Button, message, Tag, Spin, Collapse, Divider, Result } from 'antd'
import { labService } from '../../services/labService'

const { TextArea } = Input
const { Panel } = Collapse

/* ------------------------------------------------------------------ */
/*  Status config                                                       */
/* ------------------------------------------------------------------ */
const LAB_ORDER_STATUS_MAP = {
  PENDING:     { color: 'default',     label: 'Chờ thực hiện' },
  IN_PROGRESS: { color: 'processing', label: 'Đang thực hiện' },
  SUBMITTED:   { color: 'orange',    label: 'Đã gửi' },
  REJECTED:   { color: 'error',      label: 'Đã huỷ' },
  APPROVED:   { color: 'success',    label: 'Hoàn thành' },
}

const PRIORITY_MAP = {
  PRIMARY: { color: 'green', label: 'Thường' },
  WARNING: { color: 'orange', label: 'Nghiêm trọng'},
  EMERGENCY: { color: 'red', label: 'Khẩn cấp' },
}

/* ------------------------------------------------------------------ */
/*  Helper                                                              */
/* ------------------------------------------------------------------ */
const textEllipsisStyle = {
  display: '-webkit-box',
  WebkitLineClamp: 1,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  wordBreak: 'break-all',
}

/* ------------------------------------------------------------------ */
/*  Component                                                           */
/* ------------------------------------------------------------------ */
export default function LabQueuePage() {
  const [searchParams] = useSearchParams()
  const navigate  = useNavigate()
  const { user }  = useSelector((s) => s.auth)   // user.roles should contain 'LAB_TECHNICIAN'
  const [startingId,  setStartingId]  = useState(null)
  const [orders,      setOrders]      = useState([])
  const [loading,     setLoading]     = useState(true)
  const [activeTab,  setActiveTab]  = useState('PENDING')   // id of order currently being started
  const [searchText,  setSearchText]  = useState('')

  /* ---------- Role guard ---------- */
  const isLabTech = user?.role === 'LAB_TECHNICIAN'

  /* ---------- Fetch PENDING lab orders assigned to this lab tech ---------- */
  const fetchOrders = useCallback(async () => {
    setLoading(true)
    try {
      // Expected: GET /api/v1/lab/orders?status=PENDING
      // Returns list of LabOrderResponse DTOs
      const res = await labService.getLabOrderQueue()
      setOrders(res.data ?? [])
    } catch {
      message.error('Không thể tải danh sách phiếu xét nghiệm')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isLabTech) fetchOrders()
  }, [isLabTech, fetchOrders])

  /* ---------- Start processing an order ---------- */
  const handleStart = async (order) => {
    setStartingId(order.id)
    try {
      await labService.startLabOrder(order.id)
      message.success('Đã bắt đầu thực hiện xét nghiệm')
      navigate(`/lab/result-entry?orderId=${order.id}`)
    } catch (e) {
      message.error(e?.response?.data?.message || 'Không thể bắt đầu thực hiện xét nghiệm')
    } finally {
      setStartingId(null)
    }
  }

/* ---------- Filter in-place ---------- */
  const filteredOrders = orders.filter((o) => {
    // 1. Lọc theo Tab trạng thái đang chọn
    if (activeTab !== 'ALL' && o.status !== activeTab) return false
    // 2. Lọc theo từ khóa tìm kiếm
    if (!searchText) return true
    const kw = searchText.toLowerCase()
    return (
      o.patientFullName?.toLowerCase().includes(kw) ||
      o.patientPhone?.toLowerCase().includes(kw) ||
      o.serviceName?.toLowerCase().includes(kw)  ||
      o.doctorFullName?.toLowerCase().includes(kw)
    )
  })

  /* ---- Đếm badge cho tab ---- */
  const countByStatus = (status) =>
    status === 'ALL'
      ? orders.length
      : orders.filter((o) => o.status === status).length

    /* ============================= ROLE GUARD ============================= */
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

   /* ============================= MAIN RENDER ============================ */
    /* ================================================================ */
  /*  Giao diện chính                                                  */
  /* ================================================================ */
  const TABS = [
    { key: 'PENDING',     label: 'Chờ thực hiện' },
    { key: 'IN_PROGRESS', label: 'Đang thực hiện' },
    { key: 'SUBMITTED',   label: 'Đã gửi' },
    { key: 'APPROVED',    label: 'Hoàn thành' },
    { key: 'ALL',         label: 'Tất cả' },
  ]
  
   return (
    <>
      <Header />
      <div style={{ padding: 24 }}>

        {/* Page title */}
        <div style={{ marginBottom: 20, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#0f172a' }}>
              Hàng đợi xét nghiệm
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>
              Danh sách phiếu xét nghiệm đang chờ thực hiện
            </p>
          </div>
          <Button onClick={fetchOrders} loading={loading} size="small" style={{ fontSize: 12 }}>
              Làm mới
          </Button>
        </div>

        {/* Table card */}
        <div style={{ backgroundColor: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
          {/* ---- Tab lọc trạng thái ---- */}
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
          {/* Search bar */}
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9' }}>
            <Input.Search
              placeholder="Tìm theo tên bệnh nhân, SĐT, bác sĩ hoặc dịch vụ..."
              allowClear
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ maxWidth: 440 }}
            />
          </div>

          <Spin spinning={loading}>
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
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f0fdf9'}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = ''}
                    >
                      <td style={{ padding: '12px 16px', color: '#64748b', fontSize: 13 }}>{i + 1}</td>

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

                      <td style={{ padding: '12px 16px', fontSize: 13, color: '#475569', maxWidth: 160 }}>
                        <div title={order.doctorFullName ?? '—'} style={textEllipsisStyle}>{order.doctorFullName ?? '—'}</div>
                      </td>

                      <td style={{ padding: '12px 16px', fontSize: 13, color: '#475569', maxWidth: 200 }}>
                        <div title={order.serviceName ?? '—'} style={textEllipsisStyle}>{order.serviceName ?? '—'}</div>
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
                        {order.status === 'IN_PROGRESS' && (
                          <Button
                            size="small"
                            onClick={() => navigate(`/lab/result-entry?orderId=${order.id}`)}
                            style={{ fontSize: 12, borderColor: '#0d9488', color: '#0d9488', whiteSpace: 'nowrap' }}
                          >
                            Tiếp tục nhập
                          </Button>
                        )}
                        {/* SUBMITTED: đã gửi, chờ bác sĩ duyệt — chỉ cho xem */}
                        {order.status === 'SUBMITTED' && (
                          <Button
                            size="small"
                            onClick={() => navigate(`/lab/result-entry?orderId=${order.id}&readonly=true`)}
                            style={{ fontSize: 12, borderColor: '#d97706', color: '#d97706' }}
                          >
                            Xem kết quả
                          </Button>
                        )}
                        {/* APPROVED: bác sĩ đã duyệt — chỉ cho xem */}
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
