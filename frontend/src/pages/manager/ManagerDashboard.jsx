// UC-49: Dashboard vận hành thời gian thực cho Quản lý (auto-refresh 60s).
import { useEffect, useState } from 'react'
import { reportService } from '../../services/reportService'

const card = {
  flex: '1 1 180px', background: '#fff', border: '1px solid #e2e8f0',
  borderRadius: 10, padding: '18px 20px', minWidth: 180,
}
const big = { fontSize: 30, fontWeight: 700, color: '#4f46e5' }
const label = { color: '#64748b', fontSize: 13, marginTop: 4 }

export default function ManagerDashboard() {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  const load = async () => {
    try {
      const res = await reportService.operationalDashboard()
      setData(res.data || {})
      setError('')
    } catch (e) {
      setError(e?.response?.data?.message || 'Không tải được dashboard')
    }
  }

  useEffect(() => {
    load()
    const t = setInterval(load, 60000) // UC-49: tự làm mới mỗi 60 giây
    return () => clearInterval(t)
  }, [])

  const queue = data?.queueLengthByDoctor || {}

  return (
    <div style={{ padding: 24 }}>
      <h2 style={{ marginBottom: 4 }}>Dashboard vận hành</h2>
      <p style={{ color: '#64748b', marginTop: 0 }}>Số liệu hôm nay · tự làm mới mỗi 60 giây</p>
      {error && <div style={{ color: '#dc2626', marginBottom: 12 }}>{error}</div>}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
        <div style={card}><div style={big}>{data?.todayTotalAppointments ?? '—'}</div><div style={label}>Lịch hẹn hôm nay</div></div>
        <div style={card}><div style={big}>{data?.todayCompletedAppointments ?? '—'}</div><div style={label}>Đã hoàn thành</div></div>
        <div style={card}><div style={big}>{data?.pendingPrescriptions ?? '—'}</div><div style={label}>Đơn thuốc chờ cấp phát</div></div>
        <div style={card}><div style={big}>{data?.outstandingInvoices ?? '—'}</div><div style={label}>Hóa đơn chưa thanh toán</div></div>
        <div style={card}><div style={big}>{data?.labOrdersInProgress ?? '—'}</div><div style={label}>Xét nghiệm đang xử lý</div></div>
      </div>

      <h3 style={{ marginTop: 28 }}>Hàng đợi theo bác sĩ</h3>
      {Object.keys(queue).length === 0 ? (
        <p style={{ color: '#64748b' }}>Chưa có bệnh nhân nào đang chờ.</p>
      ) : (
        <table style={{ borderCollapse: 'collapse', minWidth: 320 }}>
          <thead>
            <tr style={{ background: '#f8fafc' }}>
              <th style={{ textAlign: 'left', padding: 8, borderBottom: '2px solid #e2e8f0' }}>Bác sĩ</th>
              <th style={{ textAlign: 'right', padding: 8, borderBottom: '2px solid #e2e8f0' }}>Đang chờ</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(queue).map(([name, n]) => (
              <tr key={name}>
                <td style={{ padding: 8, borderBottom: '1px solid #e2e8f0' }}>{name}</td>
                <td style={{ padding: 8, borderBottom: '1px solid #e2e8f0', textAlign: 'right' }}>{n}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
