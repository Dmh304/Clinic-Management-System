/**
 * Author: TuanTD
 *
 * Màn hình: Tổng hợp Kết quả Xét nghiệm dành cho Bệnh nhân
 * Tính năng chính:
 * 1. Khởi tạo (khi không có labOrderId): Hiển thị danh sách toàn bộ phiếu xét nghiệm
 *    của bệnh nhân đang đăng nhập, xuyên suốt các lần khám.
 * 2. Xem chi tiết (khi có labOrderId): Đổ dữ liệu chi tiết kết quả đo mắt
 *    (VA, BCVA, IOP, SPH/CYL/AXIS, ảnh đính kèm) vào giao diện chỉ đọc.
 *    Chỉ khả dụng khi phiếu đã ở trạng thái APPROVED (BR-08, enforced ở backend).
 */
import { useEffect, useState, useCallback } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import Header from '../../components/layout/Header'
import { Button, message, Tag, Spin, Tabs, Input, Pagination, Row, Col, Divider, Card } from 'antd'
import { labService } from '../../services/labService'
import { buildPdfDataFromLabResult, generateLabResultPdf } from '../../utils/labResultPdf'

/* Cấu hình màu sắc và nhãn hiển thị của trạng thái Lab Order */
const STATUS_MAP = {
  PENDING:     { color: 'default',    label: 'Chờ xử lý' },
  IN_PROGRESS: { color: 'processing', label: 'Đang thực hiện' },
  SUBMITTED:   { color: 'gold',       label: 'Chờ bác sĩ duyệt' },
  APPROVED:    { color: 'success',    label: 'Đã có kết quả' },
  REJECTED:    { color: 'error',      label: 'Yêu cầu làm lại' },
}

/* Cấu hình màu sắc và nhãn hiển thị của mức độ ưu tiên */
const PRIORITY_MAP = {
  PRIMARY:   { color: 'green',  label: 'Thường' },
  WARNING:   { color: 'orange', label: 'Nghiêm trọng' },
  EMERGENCY: { color: 'red',    label: 'Khẩn cấp' },
}

/* Style cắt chữ 1 dòng, tránh tràn layout — đồng bộ với MedicalHistoryPage */
const textEllipsisStyle = {
  display: '-webkit-box',
  WebkitLineClamp: 1,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  wordBreak: 'break-all',
}

/* Sub-Component: Hiển thị cặp chỉ số đo mắt (chỉ đọc) cho một bên mắt */
function ReadonlyEyeFields({ label, va, bcva, iop, sph, cyl, axis }) {
  const fields = [
    { label: 'VA', value: va },
    { label: 'BCVA', value: bcva },
    { label: 'IOP (mmHg)', value: iop },
    { label: 'SPH', value: sph },
    { label: 'CYL', value: cyl },
    { label: 'AXIS (°)', value: axis },
  ]
  return (
    <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, padding: '14px 16px', marginBottom: 12 }}>
      <div style={{ fontWeight: 600, fontSize: 13, color: '#475569', marginBottom: 10 }}>{label}</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        {fields.map((f) => (
          <div key={f.label}>
            <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 2 }}>{f.label}</div>
            <div style={{ fontWeight: 500, color: '#1e293b' }}>{f.value ?? '—'}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* Component chính quản lý màn hình Tổng hợp Kết quả Xét nghiệm */
export default function PatientLabResults() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  /* Trích xuất tham số điều hướng id phiếu xét nghiệm (?labOrderId=...) từ URL */
  const labOrderId = searchParams.get('labOrderId')

  /* Khai báo state quản lí dữ liệu */
  const [orderList, setOrderList] = useState([])       // Danh sách toàn bộ phiếu xét nghiệm của bệnh nhân
  const [listLoading, setListLoading] = useState(false)
  const [searchText, setSearchText] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 10

  const [detail, setDetail] = useState(null)           // Dữ liệu chi tiết kết quả xét nghiệm (LabResultResponse)
  const [detailLoading, setDetailLoading] = useState(!!labOrderId)
  const [detailError, setDetailError] = useState(null)

  const [pdfLoading, setPdfLoading] = useState(false)

  const handleDownloadPdf = async () => {
    if (!detail) return
    setPdfLoading(true)
    try {
        const pdfData = buildPdfDataFromLabResult(detail)
        await generateLabResultPdf(pdfData, `ket-qua-xet-nghiem-${detail.labOrderId}`)
    } catch {
        message.error('Tạo file PDF thất bại, vui lòng thử lại')
    } finally {
        setPdfLoading(false)
    }
  }
  /* Tải danh sách toàn bộ phiếu xét nghiệm của bệnh nhân đang đăng nhập */
  const fetchOrders = useCallback(async () => {
    setListLoading(true)
    try {
      const res = await labService.getLabOrdersForPatient()
      setOrderList(res.data ?? [])
    } catch {
      message.error('Không thể tải danh sách kết quả xét nghiệm')
    } finally {
      setListLoading(false)
    }
  }, [])

  /* Tải chi tiết một kết quả xét nghiệm cụ thể (chỉ thành công khi phiếu đã APPROVED) */
  const fetchDetail = useCallback(async () => {
    if (!labOrderId) return
    setDetailLoading(true)
    setDetailError(null)
    try {
      const res = await labService.getLabResults(labOrderId)
      setDetail(res.data)
    } catch (err) {
      setDetailError(err.response?.data?.message || 'Kết quả xét nghiệm chưa sẵn sàng hoặc bạn không có quyền xem')
    } finally {
      setDetailLoading(false)
    }
  }, [labOrderId])

  useEffect(() => {
    if (!labOrderId) fetchOrders()
  }, [labOrderId, fetchOrders])

  useEffect(() => {
    if (labOrderId) fetchDetail()
  }, [labOrderId, fetchDetail])

  /* Logic lọc tìm kiếm tại chỗ theo trạng thái và từ khóa (bác sĩ / dịch vụ) */
  const filteredList = orderList.filter((o) => {
    if (statusFilter !== 'ALL' && o.status !== statusFilter) return false
    if (!searchText) return true
    const keyword = searchText.toLowerCase()
    return (
      o.doctorFullName?.toLowerCase().includes(keyword) ||
      o.serviceName?.toLowerCase().includes(keyword)
    )
  })

  useEffect(() => {
    setCurrentPage(1)
  }, [statusFilter, searchText])

  const pagedList = filteredList.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  const statusCounts = orderList.reduce((acc, o) => {
    acc[o.status] = (acc[o.status] || 0) + 1
    return acc
  }, {})

  /* ================= GIAO DIỆN DANH SÁCH TỔNG HỢP KẾT QUẢ XÉT NGHIỆM ================= */
  if (!labOrderId) {
    return (
      <>
        <Header />
        <div style={{ padding: 24 }}>
          <div style={{ marginBottom: 20 }}>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#0f172a' }}>Kết quả xét nghiệm</h2>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>
              Danh sách các phiếu xét nghiệm của bạn qua các lần khám
            </p>
          </div>

          <div style={{ backgroundColor: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
            {/* Tabs lọc theo trạng thái phiếu xét nghiệm */}
            <div style={{ padding: '0 16px', borderBottom: '1px solid #f1f5f9' }}>
              <Tabs
                activeKey={statusFilter}
                onChange={setStatusFilter}
                items={[
                  { key: 'ALL', label: `Tất cả (${orderList.length})` },
                  ...Object.entries(STATUS_MAP).map(([key, cfg]) => ({
                    key,
                    label: `${cfg.label} (${statusCounts[key] || 0})`,
                  })),
                ]}
              />
            </div>

            {/* Thanh công cụ tìm kiếm */}
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9' }}>
              <Input.Search
                placeholder="Tìm theo tên bác sĩ hoặc dịch vụ..."
                allowClear
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                style={{ maxWidth: 400 }}
              />
            </div>

            <Spin spinning={listLoading}>
              {filteredList.length === 0 && !listLoading ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8', fontSize: 14 }}>
                  {searchText ? 'Không tìm thấy kết quả phù hợp' : 'Bạn chưa có phiếu xét nghiệm nào'}
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: '#f8fafc' }}>
                      {['STT', 'Ngày chỉ định', 'Dịch vụ', 'Bác sĩ chỉ định', 'Kỹ thuật viên', 'Độ ưu tiên', 'Trạng thái', ''].map((h) => (
                        <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 13, fontWeight: 600, color: '#475569' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {pagedList.map((o, i) => (
                      <tr
                        key={o.id}
                        style={{ borderBottom: '1px solid #f1f5f9' }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f0fdf9'}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = ''}
                      >
                        <td style={{ padding: '12px 16px', color: '#64748b', fontSize: 13 }}>
                          {(currentPage - 1) * pageSize + i + 1}
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: 13, color: '#475569' }}>
                          {o.createdAt ? new Date(o.createdAt).toLocaleDateString('vi-VN') : '—'}
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: 13, color: '#475569', maxWidth: 180 }}>
                          <div title={o.serviceName ?? '—'} style={textEllipsisStyle}>{o.serviceName ?? '—'}</div>
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: 12, color: '#64748b' }}>
                          {o.doctorFullName ?? '—'}
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: 12, color: '#64748b' }}>
                          {o.labTechnicianFullName ?? '—'}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <Tag color={PRIORITY_MAP[o.priority]?.color ?? 'default'}>
                            {PRIORITY_MAP[o.priority]?.label ?? o.priority ?? '—'}
                          </Tag>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <Tag color={STATUS_MAP[o.status]?.color ?? 'default'}>
                            {STATUS_MAP[o.status]?.label ?? o.status}
                          </Tag>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          {/* Chỉ cho phép xem chi tiết khi bác sĩ đã duyệt kết quả (BR-08) */}
                          {o.status === 'APPROVED' ? (
                            <Button
                              size="small"
                              onClick={() => navigate(`/patient/lab-results?labOrderId=${o.id}`)}
                              style={{ fontSize: 12, borderColor: '#0d9488', color: '#0d9488' }}
                            >
                              Xem kết quả
                            </Button>
                          ) : (
                            <span style={{ fontSize: 12, color: '#cbd5e1' }}>—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {filteredList.length > pageSize && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '14px 16px' }}>
                  <Pagination
                    current={currentPage}
                    pageSize={pageSize}
                    total={filteredList.length}
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

  /* ================= GIAO DIỆN CHI TIẾT MỘT KẾT QUẢ XÉT NGHIỆM ================= */
  return (
    <>
      <Header />
      <div style={{ padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#0f172a' }}>
              Kết quả xét nghiệm
              {detail?.patientFullName && <span style={{ fontWeight: 400, color: '#64748b', fontSize: 15, marginLeft: 8 }}>— {detail.patientFullName}</span>}
            </h2>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button
                onClick={handleDownloadPdf}
                loading={pdfLoading}
                style={{ fontSize: 12, borderColor: '#0d9488', color: '#0d9488' }}
            >
                Tải PDF
            </Button>
            <Button onClick={() => navigate('/patient/lab-results')} style={{ fontSize: 12 }}>
                {'← Quay lại danh sách'}
            </Button>
            </div>
        </div>

        <Spin spinning={detailLoading}>
          {!detailLoading && detailError && (
            <div style={{ backgroundColor: '#fff', borderRadius: 12, padding: 40, textAlign: 'center', color: '#94a3b8' }}>
              {detailError}
            </div>
          )}

          {!detailLoading && !detailError && detail && (
            <div>
              {/* Thẻ thông tin hành chính của phiếu xét nghiệm */}
              <Card
                style={{
                  borderRadius: 12,
                  boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                  marginBottom: 16,
                  borderLeft: '4px solid #0d9488',
                }}
              >
                <Row gutter={[16, 16]}>
                  <Col xs={24} sm={8}>
                    <div style={{ fontSize: 12, color: '#94a3b8' }}>Bác sĩ chỉ định</div>
                    <div style={{ fontWeight: 600, color: '#1e293b' }}>{detail.doctorFullName ?? '—'}</div>
                  </Col>
                  <Col xs={24} sm={8}>
                    <div style={{ fontSize: 12, color: '#94a3b8' }}>Kỹ thuật viên thực hiện</div>
                    <div style={{ fontWeight: 500, color: '#334155' }}>{detail.labTechnicianFullName ?? '—'}</div>
                  </Col>
                  <Col xs={24} sm={8}>
                    <div style={{ fontSize: 12, color: '#94a3b8' }}>Ngày bác sĩ duyệt</div>
                    <div style={{ fontWeight: 500, color: '#334155' }}>
                      {detail.reviewedAt ? new Date(detail.reviewedAt).toLocaleDateString('vi-VN') : '—'}
                    </div>
                  </Col>
                </Row>
              </Card>

              {/* Thẻ hiển thị chỉ số đo mắt hai bên */}
              <div style={{ backgroundColor: '#fff', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #e2e8f0', padding: '20px 24px', marginBottom: 16 }}>
                <Row gutter={24}>
                  <Col xs={24} md={12}>
                    <Divider orientation="left" style={{ margin: '0 0 16px 0' }}>
                      <span style={{ fontWeight: 700, color: '#0f172a' }}>Mắt Phải (OD)</span>
                    </Divider>
                    <ReadonlyEyeFields
                      label="Chỉ số mắt phải"
                      va={detail.vaR} bcva={detail.bcvaR} iop={detail.iopR}
                      sph={detail.sphR} cyl={detail.cylR} axis={detail.axisR}
                    />
                  </Col>
                  <Col xs={24} md={12}>
                    <Divider orientation="left" style={{ margin: '0 0 16px 0' }}>
                      <span style={{ fontWeight: 700, color: '#0f172a' }}>Mắt Trái (OS)</span>
                    </Divider>
                    <ReadonlyEyeFields
                      label="Chỉ số mắt trái"
                      va={detail.vaL} bcva={detail.bcvaL} iop={detail.iopL}
                      sph={detail.sphL} cyl={detail.cylL} axis={detail.axisL}
                    />
                  </Col>
                </Row>

                <Divider style={{ margin: '16px 0' }} />

                {/* Ảnh kết quả đính kèm */}
                {detail.imageUrls?.length > 0 ? (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 8 }}>
                      Ảnh kết quả đo mắt ({detail.imageUrls.length} ảnh)
                    </div>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                      gap: 10,
                    }}>
                      {detail.imageUrls.map((url, i) => (
                        <img
                          key={i}
                          src={url}
                          alt={`Ảnh ${i + 1}`}
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
                ) : (
                  <div style={{ color: '#94a3b8', fontSize: 13, marginBottom: 16 }}>Chưa có ảnh đính kèm</div>
                )}

                {/* Ghi chú của bác sĩ/kỹ thuật viên */}
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 }}>Ghi chú kết quả</div>
                  <div style={{ padding: '10px 14px', backgroundColor: '#f8fafc', borderRadius: 8, fontSize: 13, color: '#334155', minHeight: 40 }}>
                    {detail.doctorNotes || 'Không có ghi chú'}
                  </div>
                </div>
              </div>
            </div>
          )}
        </Spin>
      </div>
    </>
  )
}