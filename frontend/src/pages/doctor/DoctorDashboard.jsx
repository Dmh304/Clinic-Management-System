/** Tuấn - HE204215
*
* Giao diện chính của Dashboard dành cho Bác sĩ.
* Bác sĩ có thể xem tổng quan số liệu trong ngày và danh sách bệnh nhân đang chờ khám (hàng đợi),
* đồng thời có thể nhận bệnh nhân để bắt đầu khám hoặc xem lại hồ sơ bệnh án.
*/
import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Table, Tag, Button, message, Tooltip } from 'antd'
import { appointmentService } from '../../services/appointmentService'

const STATUS_CONFIG = {
  WAITING:     { color: 'orange',     label: 'Đang chờ' },
  IN_PROGRESS: { color: 'processing', label: 'Đang khám' },
  COMPLETED:   { color: 'success',    label: 'Hoàn thành' },
  CANCELLED:   { color: 'error',      label: 'Đã hủy' },
  CONFIRMED:   { color: 'purple',       label: 'Đã xác nhận' },
  PENDING:     { color: 'default',    label: 'Chờ xác nhận' },
}

/* Hàm hiển thị một thẻ thống kê nhỏ trên Dashboard (ví dụ: số ca đang chờ, số ca hoàn thành,...) */
function StatCard({ label, value, color }) {
  return (
    <div style={{
      backgroundColor: '#fff',
      borderRadius: 12,
      padding: '16px 20px',
      borderTop: `3px solid ${color}`,
      boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
      minWidth: 120,
      flex: 1,
    }}>
      <div style={{ fontSize: 26, fontWeight: 700, color }}>{value ?? 0}</div>
      <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{label}</div>
    </div>
  )
}

/* Component chính của trang Dashboard Bác sĩ
 * Sử dụng các state nội bộ để quản lý:
 * - queue: mảng lưu danh sách bệnh nhân đang chờ khám.
 * - stats: đối tượng chứa các con số thống kê tổng hợp.
 * - loading: trạng thái tải dữ liệu ban đầu.
 * - actionLoading: ID của bệnh nhân đang được xử lý (để hiển thị loading spinner trên nút).
 */
export default function DoctorDashboard() {
  const navigate = useNavigate()
  const [queue, setQueue] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(null)

  /* Hàm lấy dữ liệu danh sách bệnh nhân chờ khám và các con số thống kê từ server */
  const fetchData = useCallback(async () => {
    try {
      const [queueRes, dashRes] = await Promise.all([
        appointmentService.getDoctorQueue(),
        appointmentService.getDashboard(),
      ])
      setQueue(queueRes.data ?? [])
      setStats(dashRes.data ?? null)
    } catch {
      message.error('Không thể tải dữ liệu hàng chờ')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
    const timer = setInterval(fetchData, 30_000)
    return () => clearInterval(timer)
  }, [fetchData])

/** Hàm xử lý sự kiện khi Bác sĩ click nút "Bắt đầu khám"
*   Gọi API đổi trạng thái lịch hẹn sang IN_PROGRESS và chuyển hướng sang trang bệnh án (EMR) 
*/
  const handleStartExam = async (record) => {
    setActionLoading(record.id)
    try {
      await appointmentService.updateStatus(record.id, 'IN_PROGRESS')
      navigate(`/doctor/emr?appointmentId=${record.id}&patientId=${record.patientId}`)
    } catch {
      message.error('Không thể bắt đầu khám')
      setActionLoading(null)
    }
  }

  /* Hàm chuyển hướng sang trang bệnh án để xem hoặc cập nhật thông tin khám bệnh */
  const handleViewEMR = (record) => {
    navigate(`/doctor/emr?appointmentId=${record.id}&patientId=${record.patientId}`)
  }

  /* Hàng tiêu đề của bảng hiển thị các appointment */
  const columns = [
    {
      title: 'STT',
      dataIndex: 'queueNumber',
      width: 64,
      align: 'center',
      render: (text, record, index) => (
        <div style={{
          width: 34, height: 34, borderRadius: '50%',
          backgroundColor: '#ccfbf1', color: '#0d9488',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 700, fontSize: 14, margin: '0 auto',
        }}>
          {index + 1}
        </div>
      ),
    },
    {
      title: 'Bệnh nhân',
      key: 'patient',
      render: (_, r) => (
        <div>
          <div style={{ fontWeight: 600, fontSize: 13, color: '#1e293b' }}>{r.patientName}</div>
          <div style={{ fontSize: 12, color: '#64748b' }}>{r.patientPhone}</div>
        </div>
      ),
    },
    {
      title: 'Giờ khám',
      dataIndex: 'timeSlot',
      width: 90,
      render: (slot, r) => (
        <span style={{ fontSize: 13 }}>
          {slot ?? (r.appointmentTime ? new Date(r.appointmentTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '—')}
        </span>
      ),
    },
    {
      title: 'Dịch vụ',
      dataIndex: 'serviceName',
      render: (v) => <span style={{ fontSize: 12, color: '#475569' }}>{v ?? 'Khám tổng quát'}</span>,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      width: 130,
      render: (status) => {
        const cfg = STATUS_CONFIG[status] ?? { color: 'default', label: status }
        return <Tag color={cfg.color}>{cfg.label}</Tag>
      },
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 160,
      render: (_, record) => {
        if (record.status === 'WAITING') {
          return (
            <Button
              type="primary"
              size="small"
              loading={actionLoading === record.id}
              onClick={() => handleStartExam(record)}
              style={{ backgroundColor: '#0d9488', borderColor: '#0d9488', fontSize: 12 }}
            >
              Bắt đầu khám
            </Button>
          )
        }
        if (record.status === 'IN_PROGRESS') {
          return (
            <Button
              size="small"
              onClick={() => handleViewEMR(record)}
              style={{ borderColor: '#0d9488', color: '#0d9488', fontSize: 12 }}
            >
              Cập nhật HBK
            </Button>
          )
        }
        if (record.status === 'COMPLETED') {
          return (
            <Tooltip title="Xem hồ sơ bệnh án">
              <Button size="small" onClick={() => handleViewEMR(record)} style={{ fontSize: 12 }}>
                Xem HBK
              </Button>
            </Tooltip>
          )
        }
        return null
      },
    },
  ]

  return (
    <div style={{ padding: 24 }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#0f172a' }}>
          Hàng chờ hôm nay
        </h2>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>
          {new Date().toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <StatCard label="Tổng hôm nay"  value={stats?.total - stats?.pending - stats?.cancelled}      color="#6366f1" />
        <StatCard label="Đã xác nhận"   value={stats?.confirmed}  color="#ec44ef" />
        <StatCard label="Đang chờ"      value={stats?.waiting}    color="#f59e0b" />
        <StatCard label="Đang khám"     value={stats?.inProgress} color="#3b82f6" />
        <StatCard label="Hoàn thành"    value={stats?.completed}  color="#10b981" />
        <StatCard label="Đã hủy"        value={stats?.cancelled}  color="#ef4444" />
      </div>

      {/* Bảng danh sách hàng đợi */}
      <div style={{ backgroundColor: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: 600, fontSize: 14, color: '#1e293b' }}>Danh sách bệnh nhân</span>
          <Button size="small" onClick={fetchData} style={{ fontSize: 12 }}>
            Làm mới
          </Button>
        </div>
        <Table
          columns={columns}
          dataSource={queue}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 15, showSizeChanger: false, showTotal: (t) => `${t} bệnh nhân` }}
          size="middle"
          rowClassName={(r) => r.status === 'IN_PROGRESS' ? 'row-in-progress' : ''}
          style={{ margin: 0 }}
        />
      </div>

      <style>{`
        .row-in-progress td { background: #f0fdf9 !important; }
        .row-in-progress:hover td { background: #ccfbf1 !important; }
      `}</style>
    </div>
  )
}
