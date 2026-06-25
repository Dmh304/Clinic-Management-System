import { useEffect, useState } from 'react'
import axiosClient from '../../api/axiosClient'

const STATUS_INFO = {
  PENDING: { label: 'Chờ xác nhận', color: '#d97706', bg: '#fef3c7' },
  CONFIRMED: { label: 'Đã xác nhận', color: '#2563eb', bg: '#dbeafe' },
  WAITING: { label: 'Đang chờ khám', color: '#7c3aed', bg: '#ede9fe' },
  IN_PROGRESS: { label: 'Đang khám', color: '#ea580c', bg: '#ffedd5' },
  COMPLETED: { label: 'Đã hoàn thành', color: '#16a34a', bg: '#dcfce7' },
  CANCELLED: { label: 'Đã huỷ', color: '#dc2626', bg: '#fee2e2' },
}

export default function MyAppointmentsPage() {
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  const [cancelling, setCancelling] = useState(null)

  useEffect(() => {
    axiosClient.get('/v1/appointments').then(res => setAppointments(res.data.data || [])).finally(() => setLoading(false))
  }, [])

  const handleCancel = async (id) => {
    if (!window.confirm('Huỷ lịch hẹn này?')) return
    setCancelling(id)
    try {
      await axiosClient.patch(`/v1/appointments/${id}/status`, null, { params: { status: 'CANCELLED' } })
      setAppointments(prev => prev.map(a => a.id === id ? { ...a, status: 'CANCELLED' } : a))
    } catch (err) {
      alert(err.response?.data?.message || 'Không thể huỷ lịch hẹn')
    } finally {
      setCancelling(null)
    }
  }

  const formatDT = (dt) => {
    if (!dt) return ''
    const d = new Date(dt)
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')} - ${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>Đang tải...</div>

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', padding: '32px 16px' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1e293b', margin: 0 }}>Lịch hẹn của tôi</h1>
          <p style={{ color: '#64748b', margin: '4px 0 0', fontSize: 14 }}>Xem và quản lý các lịch hẹn khám</p>
        </div>

        {appointments.length === 0 ? (
          <div style={{ background: '#fff', borderRadius: 12, padding: 48, textAlign: 'center', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📅</div>
            <p style={{ color: '#64748b', marginBottom: 24 }}>Chưa có lịch hẹn nào</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {appointments.map(a => {
              const info = STATUS_INFO[a.status] || { label: a.status, color: '#6b7280', bg: '#f3f4f6' }
              return (
                <div key={a.id} style={{ background: '#fff', borderRadius: 12, padding: '16px 20px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontWeight: 700, color: '#1e293b' }}>{a.serviceName || 'Khám tổng quát'}</span>
                      <span style={{ background: info.bg, color: info.color, padding: '2px 8px', borderRadius: 10, fontSize: 12, fontWeight: 600 }}>{info.label}</span>
                    </div>
                    <div style={{ fontSize: 13, color: '#64748b' }}>
                      {formatDT(a.appointmentTime)}
                      {a.doctorName && <span> • BS: {a.doctorName}</span>}
                      {a.type === 'WALK_IN' && <span> • Vãng lai</span>}
                    </div>
                    {a.notes && <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>Ghi chú: {a.notes}</div>}
                  </div>
                  {(a.status === 'PENDING' || a.status === 'CONFIRMED') && (
                    <button onClick={() => handleCancel(a.id)} disabled={cancelling === a.id}
                      style={{ background: '#fee2e2', color: '#dc2626', border: 'none', padding: '7px 14px', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
                      {cancelling === a.id ? '...' : 'Huỷ'}
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
