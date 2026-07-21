/**
 * Trang hàng đợi gia công kính dành cho Kỹ thuật viên (Lab Technician) — UC-36
 * Hiển thị các đơn kính mà bệnh nhân đã đồng ý cắt tại phòng khám (PENDING/IN_PRODUCTION/READY).
 * Đơn có status = SKIPPED (bệnh nhân tự cắt bên ngoài) sẽ không xuất hiện ở đây
 * vì API getFabricationQueue() đã lọc sẵn ở backend.
 */

import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import Header from '../../components/layout/Header'
import { Button, message, Tag, Spin, Input, Result, Pagination } from 'antd'
import { eyeglassPrescriptionService } from '../../services/eyeglassPrescriptionService'

// TẠM THỜI hard-code nhãn hiển thị lensType (enum thật trong DB: SINGLE_VISION / PROGRESSIVE / SPECIALTY)
// Sửa lại chỗ này nếu sau này đổi giá trị enum trong entity/database
const LENS_TYPE_LABEL = {
  SINGLE_VISION: 'Tròng đơn tròng',
  PROGRESSIVE: 'Tròng đa tròng',
  SPECIALTY: 'Tròng chuyên dụng',
}

const PRESCRIPTION_STATUS_MAP = {
  PENDING:       { color: 'default',    label: 'Chờ gia công' },
  IN_PRODUCTION: { color: 'processing', label: 'Đang gia công' },
  READY:         { color: 'success',    label: 'Sẵn sàng giao' },
}

const textEllipsisStyle = {
  display: '-webkit-box',
  WebkitLineClamp: 1,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  wordBreak: 'break-all',
}

export default function EyeglassPrescriptionQueue() {
  const navigate = useNavigate()
  const { user } = useSelector((s) => s.auth)

  const [startingId, setStartingId] = useState(null)
  const [prescriptions, setPrescriptions] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('PENDING')
  const [searchText, setSearchText] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 10

  const isLabTech = user?.role === 'LAB_TECHNICIAN'

  const fetchPrescriptions = useCallback(async () => {
    setLoading(true)
    try {
      const res = await eyeglassPrescriptionService.getFabricationQueue()
      setPrescriptions(res.data ?? [])
    } catch {
      message.error('Không thể tải danh sách đơn kính')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isLabTech) fetchPrescriptions()
  }, [isLabTech, fetchPrescriptions])

  const handleStart = async (prescription) => {
    setStartingId(prescription.id)
    try {
      await eyeglassPrescriptionService.startFabrication(prescription.id)
      message.success('Đã bắt đầu gia công đơn kính')
      navigate(`/lab/eyeglass-detail?id=${prescription.id}`)
    } catch (e) {
      message.error(e?.response?.data?.message || 'Không thể bắt đầu gia công')
    } finally {
      setStartingId(null)
    }
  }

  const filteredPrescriptions = prescriptions.filter((p) => {
    if (activeTab !== 'ALL' && p.status !== activeTab) return false
    if (!searchText) return true
    const kw = searchText.toLowerCase()
    return (
      p.patientName?.toLowerCase().includes(kw) ||
      p.doctorName?.toLowerCase().includes(kw)
    )
  })

  useEffect(() => {
    setCurrentPage(1)
  }, [activeTab, searchText])

  const pagedPrescriptions = filteredPrescriptions.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  )

  const countByStatus = (status) =>
    status === 'ALL'
      ? prescriptions.length
      : prescriptions.filter((p) => p.status === status).length

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
    { key: 'PENDING', label: 'Chờ gia công' },
    { key: 'IN_PRODUCTION', label: 'Đang gia công' },
    { key: 'READY', label: 'Sẵn sàng giao' },
    { key: 'ALL', label: 'Tất cả' },
  ]

  return (
    <>
      <Header />
      <div style={{ padding: 24 }}>
        <div style={{ marginBottom: 20, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#0f172a' }}>
              Hàng đợi Gia công Kính
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>
              Đơn kính bệnh nhân đồng ý cắt tại phòng khám
            </p>
          </div>
          <Button onClick={fetchPrescriptions} loading={loading} size="small" style={{ fontSize: 12 }}>
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
              placeholder="Tìm theo tên bệnh nhân hoặc bác sĩ..."
              allowClear
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ maxWidth: 440 }}
            />
          </div>

          <Spin spinning={loading}>
            {!loading && filteredPrescriptions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px 0', color: '#94a3b8', fontSize: 14 }}>
                {searchText ? 'Không tìm thấy kết quả phù hợp' : 'Không có dữ liệu'}
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: '#f8fafc' }}>
                    {['STT', 'Ngày kê đơn', 'Bệnh nhân', 'Bác sĩ kê đơn', 'Loại tròng', 'Trạng thái', 'Thao tác'].map((h) => (
                      <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 13, fontWeight: 600, color: '#475569', whiteSpace: 'nowrap' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pagedPrescriptions.map((p, i) => (
                    <tr
                      key={p.id}
                      style={{ borderBottom: '1px solid #f1f5f9' }}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f0fdf9'}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = ''}
                    >
                      <td style={{ padding: '12px 16px', color: '#64748b', fontSize: 13 }}>
                        {(currentPage - 1) * pageSize + i + 1}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 13, color: '#475569', whiteSpace: 'nowrap' }}>
                        {p.createdAt ? new Date(p.createdAt).toLocaleDateString('vi-VN') : '—'}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 500, color: '#1e293b', maxWidth: 160 }}>
                        <div title={p.patientName ?? '—'} style={textEllipsisStyle}>{p.patientName ?? '—'}</div>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 13, color: '#475569', maxWidth: 160 }}>
                        <div title={p.doctorName ?? '—'} style={textEllipsisStyle}>{p.doctorName ?? '—'}</div>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 13, color: '#475569' }}>
                        {LENS_TYPE_LABEL[p.lensType] ?? p.lensType ?? '—'}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <Tag color={PRESCRIPTION_STATUS_MAP[p.status]?.color ?? 'default'}>
                          {PRESCRIPTION_STATUS_MAP[p.status]?.label ?? p.status}
                        </Tag>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        {p.status === 'PENDING' && (
                          <Button
                            type="primary"
                            size="small"
                            loading={startingId === p.id}
                            onClick={() => handleStart(p)}
                            style={{ fontSize: 12, backgroundColor: '#0d9488', borderColor: '#0d9488', whiteSpace: 'nowrap' }}
                          >
                            Bắt đầu gia công
                          </Button>
                        )}
                        {p.status === 'IN_PRODUCTION' && (
                          <Button
                            size="small"
                            onClick={() => navigate(`/lab/eyeglass-detail?id=${p.id}`)}
                            style={{ fontSize: 12, borderColor: '#0d9488', color: '#0d9488', whiteSpace: 'nowrap' }}
                          >
                            Tiếp tục gia công
                          </Button>
                        )}
                        {p.status === 'READY' && (
                          <Button
                            size="small"
                            onClick={() => navigate(`/lab/eyeglass-detail?id=${p.id}&readonly=true`)}
                            style={{ fontSize: 12, borderColor: '#0d9488', color: '#0d9488' }}
                          >
                            Xem chi tiết
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {filteredPrescriptions.length > pageSize && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '14px 16px' }}>
                <Pagination
                  current={currentPage}
                  pageSize={pageSize}
                  total={filteredPrescriptions.length}
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