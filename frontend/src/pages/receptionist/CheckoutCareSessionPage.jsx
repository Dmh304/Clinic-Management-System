import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { careSessionService } from '../../services/careSessionService'

export default function CheckoutCareSessionPage() {
  const navigate = useNavigate()
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [checkingOut, setCheckingOut] = useState(null)
  const [filterDate, setFilterDate] = useState('')
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState(null)
  const [toast, setToast] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)

  const fetchCompleted = async () => {
    setLoading(true)
    try {
      const res = await careSessionService.getAll()
      const completed = (res.data || []).filter(s => s.status === 'COMPLETED')
      setSessions(completed)
      setLastUpdated(new Date())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchCompleted() }, [])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 4000)
    return () => clearTimeout(t)
  }, [toast])

  // UC-21: gói dịch vụ (cả nhiều buổi lẫn "vãng lai" 1 buổi) chưa có hóa đơn nào — nghĩa là
  // đây là lần check-out ĐẦU TIÊN của gói, cần thu tiền. Check-out xong thì chuyển sang trang
  // thanh toán. Các buổi sau của cùng gói (đã có hóa đơn) chỉ check-out, không thu thêm.
  const needsPayment = (s) => !s.subscriptionInvoiced

  const handleCheckout = async (session) => {
    const { id, patientName, subscriptionId } = session
    if (!window.confirm('Xác nhận check-out và trừ buổi khỏi gói?')) return
    setCheckingOut(id)
    try {
      await careSessionService.checkout(id)
      setSessions(prev => prev.filter(s => s.id !== id))
      if (selectedId === id) setSelectedId(null)
      if (needsPayment(session)) {
        navigate('/receptionist/invoice', { state: { subscriptionId } })
      } else {
        setToast(`Check-out thành công: ${patientName}`)
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Check-out thất bại')
    } finally {
      setCheckingOut(null)
    }
  }

  const formatTime = (dt) => {
    if (!dt) return ''
    const d = new Date(dt)
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
  }

  const formatDT = (dt) => {
    if (!dt) return ''
    const d = new Date(dt)
    return `${formatTime(dt)} - ${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`
  }

  const filtered = useMemo(() => sessions.filter(s => {
    const matchSearch = !search || s.patientName.toLowerCase().includes(search.toLowerCase()) || s.patientCode?.includes(search)
    const matchDate = !filterDate || (s.scheduledDateTime && s.scheduledDateTime.startsWith(filterDate))
    return matchSearch && matchDate
  }), [sessions, search, filterDate])

  const selected = filtered.find(s => s.id === selectedId) || filtered[0] || null

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>Đang tải...</div>

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', padding: '32px 16px' }}>
      <div style={{ maxWidth: 1280, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1e293b', margin: 0 }}>Check-out dịch vụ</h1>
            <p style={{ color: '#64748b', margin: '4px 0 0', fontSize: 14 }}>Xác nhận check-out các phiên chăm sóc đã hoàn thành</p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <input type="text" placeholder="Tìm bệnh nhân..." value={search} onChange={e => setSearch(e.target.value)}
              style={{ width: 220, padding: '8px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14, outline: 'none' }} />
            <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14, outline: 'none' }} />
            <button onClick={fetchCompleted} style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', padding: '8px 14px', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
              Làm mới
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(280px, 1fr)', gap: 20, alignItems: 'start' }}>
          {/* Left: queue list */}
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderBottom: '1px solid #f1f5f9' }}>
              <span style={{ fontWeight: 700, color: '#1e293b', fontSize: 15 }}>Hàng chờ check-out dịch vụ ({filtered.length})</span>
              {lastUpdated && (
                <span style={{ fontSize: 12, color: '#94a3b8' }}>Cập nhật lúc {formatTime(lastUpdated)}</span>
              )}
            </div>

            {filtered.length === 0 ? (
              <div style={{ padding: 48, textAlign: 'center' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
                <p style={{ color: '#64748b', margin: 0 }}>Không có phiên nào chờ check-out</p>
              </div>
            ) : (
              <div>
                {filtered.map(s => {
                  const isPackage = s.totalSessions > 1
                  const mustPay = needsPayment(s)
                  const isSelected = selected?.id === s.id
                  return (
                    <div key={s.id} onClick={() => setSelectedId(s.id)}
                      style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12,
                        padding: '14px 20px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer',
                        background: isSelected ? '#f0fdf4' : '#fff',
                        borderLeft: isSelected ? '3px solid #16a34a' : '3px solid transparent',
                      }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <span style={{ fontWeight: 700, color: '#1e293b' }}>{s.patientName}</span>
                          <span style={{ fontSize: 12, color: '#94a3b8' }}>BN: {s.patientCode}</span>
                        </div>
                        <div style={{ fontSize: 13, color: '#64748b' }}>
                          {s.serviceName} • {formatTime(s.completedAt || s.scheduledDateTime)}
                        </div>
                        <span style={{
                          display: 'inline-block', marginTop: 6, fontSize: 11, fontWeight: 700, letterSpacing: 0.3,
                          padding: '2px 8px', borderRadius: 999,
                          color: isPackage ? '#1d4ed8' : '#b45309',
                          background: isPackage ? '#dbeafe' : '#fef3c7',
                        }}>
                          {isPackage ? 'GÓI LIỆU TRÌNH' : 'VÃNG LAI'}
                        </span>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleCheckout(s) }}
                        disabled={checkingOut === s.id}
                        style={{
                          flexShrink: 0,
                          background: checkingOut === s.id ? '#93c5fd' : (mustPay ? '#16a34a' : '#2563eb'),
                          color: '#fff', border: 'none',
                          padding: '8px 16px', borderRadius: 8, cursor: checkingOut === s.id ? 'not-allowed' : 'pointer',
                          fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap',
                        }}>
                        {checkingOut === s.id ? 'Đang xử lý...' : (mustPay ? 'Check-out & Thanh toán' : 'Xác nhận Check-out')}
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Right: detail panel */}
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 20, position: 'sticky', top: 20 }}>
            {!selected ? (
              <p style={{ color: '#94a3b8', fontSize: 14, margin: 0 }}>Chọn một phiên ở danh sách bên trái để xem chi tiết</p>
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                  <div>
                    <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 2 }}>Chi tiết phiên</div>
                    <div style={{ fontWeight: 700, fontSize: 17, color: '#1e293b' }}>{selected.patientName}</div>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#16a34a', background: '#dcfce7', padding: '3px 10px', borderRadius: 999 }}>
                    COMPLETED
                  </span>
                </div>

                {selected.nurseNotes && (
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '12px 14px', marginBottom: 16, fontSize: 13, color: '#475569', fontStyle: 'italic' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', fontStyle: 'normal', marginBottom: 4 }}>GHI CHÚ ĐIỀU DƯỠNG</div>
                    "{selected.nurseNotes}"
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20, fontSize: 14 }}>
                  <Row label="Dịch vụ" value={selected.serviceName} />
                  <Row label="Buổi" value={`${selected.sessionNumber}/${selected.totalSessions}`} />
                  <Row label="Giờ hoàn thành" value={formatDT(selected.completedAt || selected.scheduledDateTime)} />
                  {selected.nurseName && <Row label="Điều dưỡng" value={selected.nurseName} />}
                  <Row label="Còn lại sau check-out" value={`${selected.remainingSessions - 1} buổi`} />
                </div>

                <button onClick={() => handleCheckout(selected)} disabled={checkingOut === selected.id}
                  style={{
                    width: '100%',
                    background: checkingOut === selected.id ? '#86efac' : '#16a34a', color: '#fff', border: 'none',
                    padding: '12px', borderRadius: 10, cursor: checkingOut === selected.id ? 'not-allowed' : 'pointer',
                    fontWeight: 700, fontSize: 15,
                  }}>
                  {checkingOut === selected.id ? 'Đang xử lý...' : (needsPayment(selected) ? 'Check-out & Thanh toán' : 'Xác nhận Check-out')}
                </button>

                <div style={{ marginTop: 14, fontSize: 12, color: '#92400e', background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: 8, padding: '8px 12px' }}>
                  {needsPayment(selected)
                    ? 'Gói dịch vụ này chưa thanh toán — sau khi check-out sẽ chuyển sang trang Thu phí & Hóa đơn.'
                    : 'Check-out sẽ trừ 1 buổi khỏi gói dịch vụ của bệnh nhân.'}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, background: '#16a34a', color: '#fff',
          padding: '12px 20px', borderRadius: 10, fontSize: 14, fontWeight: 600,
          boxShadow: '0 8px 20px rgba(0,0,0,0.15)',
        }}>
          ✓ {toast}
        </div>
      )}
    </div>
  )
}

function Row({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
      <span style={{ color: '#64748b' }}>{label}</span>
      <span style={{ color: '#1e293b', fontWeight: 600, textAlign: 'right' }}>{value}</span>
    </div>
  )
}
