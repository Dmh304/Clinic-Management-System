import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { appointmentService } from '../../services/appointmentService'
import { Input, Button, Modal, Tabs, message, Empty } from 'antd'

const STATUS_INFO = {
  PENDING: { label: 'Chờ xác nhận', color: '#d97706', bg: '#fef3c7' },
  CONFIRMED: { label: 'Đã xác nhận', color: '#2563eb', bg: '#dbeafe' },
  WAITING: { label: 'Đang chờ khám', color: '#7c3aed', bg: '#ede9fe' },
  IN_PROGRESS: { label: 'Đang khám', color: '#ea580c', bg: '#ffedd5' },
  COMPLETED: { label: 'Đã hoàn thành', color: '#16a34a', bg: '#dcfce7' },
  CANCELLED: { label: 'Đã huỷ', color: '#dc2626', bg: '#fee2e2' },
}

export default function MyAppointmentsPage() {
  const [searchParams] = useSearchParams()
  const highlightId = searchParams.get('highlight')

  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  const [cancelling, setCancelling] = useState(null)
  const [reschedulingId, setReschedulingId] = useState(null)
  const [newTime, setNewTime] = useState('')
  const [rescheduling, setRescheduling] = useState(false)

  // Search & Filter state
  const [searchText, setSearchText] = useState('')
  const [activeTab, setActiveTab] = useState('UPCOMING')

  // Cancel Modal state
  const [cancelModalOpen, setCancelModalOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [selectedCancelId, setSelectedCancelId] = useState(null)

  useEffect(() => {
    appointmentService.getMyAppointments()
      .then(res => setAppointments(res.data || []))
      .catch(() => {
        message.error('Không thể tải danh sách lịch hẹn')
      })
      .finally(() => setLoading(false))
  }, [])

  const openCancelModal = (id) => {
    setSelectedCancelId(id)
    setCancelReason('')
    setCancelModalOpen(true)
  }

  const handleConfirmCancel = async () => {
    if (!cancelReason.trim()) {
      message.error('Vui lòng nhập lý do hủy lịch hẹn')
      return
    }
    setCancelling(selectedCancelId)
    try {
      await appointmentService.cancelAppointment(selectedCancelId, cancelReason)
      setAppointments(prev => prev.map(a => a.id === selectedCancelId ? { ...a, status: 'CANCELLED' } : a))
      message.success('Đã huỷ lịch hẹn thành công')
      setCancelModalOpen(false)
    } catch (err) {
      message.error(err.response?.data?.message || 'Không thể huỷ lịch hẹn')
    } finally {
      setCancelling(null)
    }
  }

  const openReschedule = (id) => {
    setReschedulingId(id)
    setNewTime('')
  }

  const handleReschedule = async () => {
    if (!newTime) {
      message.error('Vui lòng chọn thời gian mới')
      return
    }
    setRescheduling(true)
    try {
      const res = await appointmentService.rescheduleAppointment(reschedulingId, newTime)
      const updated = res.data.data
      setAppointments(prev => prev.map(a => a.id === reschedulingId ? updated : a))
      message.success('Đổi lịch hẹn thành công')
      setReschedulingId(null)
    } catch (err) {
      message.error(err.response?.data?.message || 'Không thể đổi giờ lịch hẹn')
    } finally {
      setRescheduling(false)
    }
  }

  const formatDT = (dt) => {
    if (!dt) return ''
    const d = new Date(dt)
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')} - ${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`
  }

  // Filter & Search logic
  const filtered = appointments.filter(a => {
    const matchesKeyword = searchText.trim() === '' || 
      (a.doctorName && a.doctorName.toLowerCase().includes(searchText.toLowerCase())) ||
      (a.serviceName && a.serviceName.toLowerCase().includes(searchText.toLowerCase()))

    if (!matchesKeyword) return false

    if (activeTab === 'ALL') return true
    if (activeTab === 'UPCOMING') {
      return a.status === 'PENDING' || a.status === 'CONFIRMED' || a.status === 'WAITING' || a.status === 'IN_PROGRESS'
    }
    if (activeTab === 'COMPLETED') return a.status === 'COMPLETED'
    if (activeTab === 'CANCELLED') return a.status === 'CANCELLED'

    return true
  })

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>Đang tải...</div>

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', padding: '32px 16px' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1e293b', margin: 0 }}>Lịch hẹn của tôi</h1>
            <p style={{ color: '#64748b', margin: '4px 0 0', fontSize: 14 }}>Xem và quản lý các lịch hẹn khám</p>
          </div>
        </div>

        {/* Search and Tabs Toolbar */}
        <div style={{ backgroundColor: '#fff', borderRadius: 12, padding: '16px 20px', border: '1px solid #e2e8f0', marginBottom: 16 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#475569', minWidth: 100 }}>Tìm kiếm:</span>
            <Input.Search
              placeholder="Nhập tên bác sĩ hoặc tên dịch vụ..."
              allowClear
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ flex: 1, minWidth: 260 }}
            />
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#475569', minWidth: 100 }}>Trạng thái:</span>
            <Tabs
              activeKey={activeTab}
              onChange={setActiveTab}
              style={{ flex: 1, marginBottom: -16 }}
              items={[
                { key: 'UPCOMING', label: 'Lịch khám sắp tới' },
                { key: 'COMPLETED', label: 'Đã hoàn thành' },
                { key: 'CANCELLED', label: 'Đã huỷ' },
                { key: 'ALL', label: 'Tất cả lịch hẹn' },
              ]}
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <div style={{ background: '#fff', borderRadius: 12, padding: 48, textAlign: 'center', border: '1px solid #e2e8f0' }}>
            <Empty description={searchText ? "Không tìm thấy lịch hẹn phù hợp" : "Chưa có lịch hẹn nào"} />
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {filtered.map(a => {
              const info = STATUS_INFO[a.status] || { label: a.status, color: '#6b7280', bg: '#f3f4f6' }
              const isHighlighted = String(a.id) === String(highlightId)
              return (
                <div key={a.id} style={{
                  background: isHighlighted ? '#eff6ff' : '#fff',
                  borderRadius: 12,
                  padding: '16px 20px',
                  border: isHighlighted ? '2px solid #2563eb' : '1px solid #e2e8f0',
                  boxShadow: isHighlighted ? '0 4px 12px rgba(37,99,235,0.15)' : 'none',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 12,
                  transition: 'all 0.3s ease',
                }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontWeight: 700, color: '#1e293b', fontSize: 15 }}>{a.serviceName || 'Khám tổng quát'}</span>
                      <span style={{ background: info.bg, color: info.color, padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600 }}>{info.label}</span>
                      {isHighlighted && (
                        <span style={{ background: '#2563eb', color: '#fff', padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600 }}>
                          Vừa xác nhận
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 13, color: '#64748b' }}>
                      {formatDT(a.appointmentTime)}
                      {a.doctorName && <span> • BS: {a.doctorName}</span>}
                      {a.type === 'WALK_IN' && <span> • Vãng lai</span>}
                    </div>
                    {a.notes && <div style={{ fontSize: 12, color: '#64748b', marginTop: 4, background: '#f8fafc', padding: '6px 10px', borderRadius: 6, display: 'inline-block' }}>Ghi chú: {a.notes}</div>}
                  </div>
            {(a.status === 'PENDING' || a.status === 'CONFIRMED' || a.status === 'WAITING') && (
                <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => openReschedule(a.id)}
                        style={{ background: '#dbeafe', color: '#2563eb', border: 'none', padding: '7px 14px', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13, transition: 'background-color 0.15s' }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = '#bfdbfe'}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = '#dbeafe'}>
                        Đổi giờ
                    </button>
                    <button onClick={() => openCancelModal(a.id)} disabled={cancelling === a.id}
                        style={{ background: '#fee2e2', color: '#dc2626', border: 'none', padding: '7px 14px', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13, transition: 'background-color 0.15s' }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = '#fecaca'}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = '#fee2e2'}>
                        {cancelling === a.id ? '...' : 'Hủy'}
                    </button>
                </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Reschedule Modal */}
      {reschedulingId && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 24, width: 320 }}>
            <h3 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 700, color: '#1e293b' }}>Đổi giờ khám</h3>
            <input type="datetime-local" value={newTime} onChange={e => setNewTime(e.target.value)}
              style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid #e2e8f0', marginBottom: 16 }} />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button onClick={() => setReschedulingId(null)}
                style={{ background: '#f1f5f9', color: '#475569', border: 'none', padding: '7px 14px', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
                Hủy bỏ
              </button>
              <button onClick={handleReschedule} disabled={rescheduling}
                style={{ background: '#2563eb', color: '#fff', border: 'none', padding: '7px 14px', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
                {rescheduling ? '...' : 'Xác nhận'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Modal (Yêu cầu lý do bắt buộc) */}
      <Modal
        title={<span style={{ fontSize: 16, fontWeight: 700, color: '#1e293b' }}>Hủy lịch hẹn khám</span>}
        open={cancelModalOpen}
        onOk={handleConfirmCancel}
        confirmLoading={cancelling !== null}
        onCancel={() => setCancelModalOpen(false)}
        okText="Xác nhận hủy"
        cancelText="Hủy bỏ"
        okButtonProps={{ danger: true }}
      >
        <div style={{ padding: '8px 0' }}>
          <p style={{ fontSize: 13, color: '#475569', marginBottom: 12 }}>
            Bạn đang yêu cầu hủy lịch hẹn khám. Vui lòng nhập lý do hủy lịch hẹn bên dưới <span style={{ color: '#dc2626' }}>*</span>:
          </p>
          <Input.TextArea
            rows={4}
            placeholder="Lý do hủy (Ví dụ: Tôi có việc bận đột xuất, Thay đổi lịch trình cá nhân...)"
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            style={{ borderRadius: 8 }}
          />
        </div>
      </Modal>
    </div>
  )
}
