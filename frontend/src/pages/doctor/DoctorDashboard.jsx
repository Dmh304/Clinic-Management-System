/** Tuấn - HE204215
*
* Giao diện chính của Dashboard dành cho Bác sĩ.
* Bác sĩ có thể xem tổng quan số liệu trong ngày và danh sách bệnh nhân đang chờ khám (hàng đợi),
* đồng thời có thể nhận bệnh nhân để bắt đầu khám hoặc xem lại hồ sơ bệnh án.
*/
import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Table, Tag, Select, Button, Space, Typography, Card,
  message, Modal, Form, Statistic, Row, Col, Input, Tooltip, DatePicker
} from 'antd'
import {
  ReloadOutlined, CheckCircleOutlined, LoginOutlined,
  CloseCircleOutlined, ExclamationCircleOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import 'dayjs/locale/vi'
dayjs.locale('vi')

import { appointmentService } from '../../services/appointmentService'

/* Cấu hình màu sắc và nhãn hiển thị cho từng trạng thái lịch hẹn */
const STATUS_CONFIG = {
  WAITING:     { color: 'orange',     label: 'Đang chờ' },
  IN_PROGRESS: { color: 'processing', label: 'Đang khám' },
  COMPLETED:   { color: 'success',    label: 'Hoàn thành' },
  CANCELLED:   { color: 'error',      label: 'Đã hủy' },
  CONFIRMED:   { color: 'purple',     label: 'Đã xác nhận' },
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
 * - filterStatus: Trạng thái lọc được chọn (mặc định hiển thị tất cả)
 * - searchText: Từ khóa tìm kiếm được bác sĩ nhập (tên hoặc số điện thoại bệnh nhân)
 * - selectedDate: Ngày được chọn để hiển thị danh sách lịch hẹn (mặc định là hôm nay)
 */
export default function DoctorDashboard() {
  const navigate = useNavigate()
  const [queue, setQueue] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(null)
  const [filterStatus, setFilterStatus] = useState('ALL')
  const [searchText, setSearchText] = useState('')
  const [selectedDate, setSelectedDate] = useState(dayjs())

  /* Hàm lấy dữ liệu danh sách bệnh nhân chờ khám và các con số thống kê từ server
   * Truyền ngày đã chọn lên server để lọc đúng danh sách theo ngày
   */
  const fetchData = useCallback(async () => {
    try {
      const dateParam = selectedDate ? selectedDate.format('YYYY-MM-DD') : undefined
      const [queueRes, dashRes] = await Promise.all([
        appointmentService.getDoctorQueue(dateParam),
        appointmentService.getDashboard(dateParam),
      ])
      setQueue(queueRes.data ?? [])
      setStats(dashRes.data ?? null)
    } catch {
      message.error('Không thể tải dữ liệu hàng chờ')
    } finally {
      setLoading(false)
    }
  }, [selectedDate])

  /* 
   * Hook vòng đời xử lý tải dữ liệu khi vừa vào trang hoặc khi selectedDate thay đổi.
   * Cơ chế tự động làm mới mỗi 30 giây chỉ hoạt động khi đang xem ngày hôm nay.
   */
  useEffect(() => {
    fetchData()

    const isToday = selectedDate && selectedDate.isSame(dayjs(), 'day')
    if (!isToday) return

    // Cơ chế Real-time kéo dữ liệu mới để bác sĩ cập nhật hàng đợi liên tục (chỉ khi xem hôm nay)
    const timer = setInterval(fetchData, 30_000)
    return () => clearInterval(timer)                    // Hủy bỏ bộ đếm thời gian khi component bị unmount khỏi DOM
  }, [fetchData, selectedDate])

  /* Xử lý lọc danh sách: Kết hợp giữa việc chọn bộ lọc trạng thái và tìm kiếm bằng từ khóa  */
  const filteredQueue = queue
    .filter((r) => filterStatus === 'ALL' || r.status === filterStatus)
    .filter((r) => {
      if (!searchText) return true
      const keyword = searchText.toLowerCase()
      return (
        r.patientName?.toLowerCase().includes(keyword) ||
        r.patientPhone?.includes(keyword)
      )
    })

  /** Hàm xử lý sự kiện khi Bác sĩ click nút "Bắt đầu khám"
   *  Gọi API đổi trạng thái lịch hẹn sang IN_PROGRESS và chuyển hướng sang trang bệnh án (EMR)
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

  /**
   * Hàm xử lý sự kiện "Dừng khám" — dành cho lịch hẹn đang ở trạng thái IN_PROGRESS.
   * Hiện hộp thoại xác nhận trước khi thực hiện để tránh bấm nhầm.
   * Khi xác nhận: Gọi API abandonExam để chuyển Appointment → CANCELLED, Medical Record → DRAFT.
   */
  const handleAbandonExam = (record) => {
    Modal.confirm({
      title: 'Xác nhận dừng khám',
      icon: <ExclamationCircleOutlined style={{ color: '#f59e0b' }} />,
      content: (
        <div>
          <p style={{ margin: '8px 0 4px' }}>
            Bạn có chắc muốn dừng ca khám của bệnh nhân <strong>{record.patientName}</strong>?
          </p>
          <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>
            Lịch hẹn sẽ bị <strong>Hủy</strong> và Hồ sơ bệnh án sẽ được đưa về trạng thái <strong>Nháp</strong>.
          </p>
        </div>
      ),
      okText: 'Dừng khám',
      okButtonProps: { danger: true },
      cancelText: 'Quay lại',
      onOk: async () => {
        setActionLoading(record.id)
        try {
          await appointmentService.abandonExam(record.id)
          message.success(`Đã dừng khám cho bệnh nhân ${record.patientName}`)
          await fetchData()
        } catch {
          message.error('Không thể dừng khám. Vui lòng thử lại.')
        } finally {
          setActionLoading(null)
        }
      },
    })
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
      width: 200,
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
            <Space size={6}>
              <Button
                size="small"
                onClick={() => handleViewEMR(record)}
                style={{ borderColor: '#0d9488', color: '#0d9488', fontSize: 12 }}
              >
                Cập nhật HSBA
              </Button>
              <Tooltip>
                <Button
                  size="small"
                  danger
                  loading={actionLoading === record.id}
                  onClick={() => handleAbandonExam(record)}
                  style={{ fontSize: 12 }}
                >
                  Dừng khám
                </Button>
              </Tooltip>
            </Space>
          )
        }
        if (record.status === 'COMPLETED') {
          return (
            <Tooltip title="Xem hồ sơ bệnh án">
              <Button size="small" onClick={() => handleViewEMR(record)} style={{ fontSize: 12 }}>
                Xem HSBA
              </Button>
            </Tooltip>
          )
        }
        return null
      },
    },
  ]

  /* Hàm helper viết hoa chữ cái đầu tiên */
  const capitalizeWords = (str) => {
    if (!str) return '';
   // Tách chuỗi thành phần chữ (thứ) và phần ngày tháng dựa vào dấu phẩy
    const parts = str.split(', ');
    if (parts.length > 0) {
      // Viết hoa chữ cái đầu của từng từ trong phần "thứ..."
      parts[0] = parts[0]
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    }
    return parts.join(', ');
  };

  /* Kiểm tra ngày đang xem có phải hôm nay không để hiển thị tiêu đề phù hợp */
  const isToday = selectedDate && selectedDate.isSame(dayjs(), 'day')
  const dateLabel = isToday
    ? `Hôm nay — ${selectedDate.format('DD/MM/YYYY')}`
    : capitalizeWords(selectedDate?.format('dddd, DD/MM/YYYY') ?? '')

  /* Label cho thẻ "Tổng" thay đổi theo ngày đang xem */
  const totalLabel = isToday ? 'Tổng hôm nay' : `Tổng ngày ${selectedDate?.format('DD/MM') ?? ''}`

  return (
    <div style={{ padding: 24 }}>
      {/* Header */}
      <div style={{ marginBottom: 20, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#0f172a' }}>
            Hàng chờ khám
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>
            {dateLabel}
          </p>
        </div>

        {/* DatePicker để bác sĩ chọn ngày xem lịch */}
        <DatePicker
          value={selectedDate}
          onChange={(date) => {
            setSelectedDate(date)
            setLoading(true)
          }}
          format="DD/MM/YYYY"
          allowClear={false}
          style={{ width: 160 }}
          placeholder="Chọn ngày"
        />
      </div>

      {/* Danh sách các thẻ thống kê số lượng ca khám theo trạng thái — cập nhật theo ngày đang xem */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <StatCard label={totalLabel}       value={stats?.total}      color="#6366f1" />
        <StatCard label="Chờ xác nhận"    value={stats?.pending}    color="#94a3b8" />
        <StatCard label="Đã xác nhận"     value={stats?.confirmed}  color="#ec44ef" />
        <StatCard label="Đang chờ"        value={stats?.waiting}    color="#f59e0b" />
        <StatCard label="Đang khám"       value={stats?.inProgress} color="#3b82f6" />
        <StatCard label="Hoàn thành"      value={stats?.completed}  color="#10b981" />
        <StatCard label="Đã hủy"          value={stats?.cancelled}  color="#ef4444" />
      </div>

      {/* Bảng danh sách hàng đợi */}
      <div style={{ backgroundColor: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <span style={{ fontWeight: 600, fontSize: 14, color: '#1e293b' }}>Danh sách bệnh nhân</span>

          {/* Thanh tìm kiếm theo tên hoặc số điện thoại bệnh nhân */}
          <Input.Search
            placeholder="Tìm kiếm theo tên hoặc số điện thoại"
            allowClear={true}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ flex: 1 }}
          />

          {/* Hộp chọn select để lọc danh sách lịch khám theo trạng thái — hiển thị đầy đủ tất cả trạng thái */}
          <Select
            value={filterStatus}
            onChange={setFilterStatus}
            style={{ width: 180 }}
            options={[
              { label: 'Tất cả trạng thái', value: 'ALL' },
              ...Object.entries(STATUS_CONFIG).map(([v, c]) => ({ label: c.label, value: v })),
            ]}
          />

          {/* Nút làm mới dữ liệu */}
          <Button size="small" onClick={fetchData} style={{ fontSize: 12 }}>
            Làm mới
          </Button>
        </div>

        {/* Bảng hiển thị danh sách hàng đợi */}
        <Table
          columns={columns}
          dataSource={filteredQueue}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 15, showSizeChanger: false, showTotal: (t) => `${t} bệnh nhân` }}
          size="middle"
          rowClassName={(r) => r.status === 'IN_PROGRESS' ? 'row-in-progress' : ''}
          style={{ margin: 0 }}
        />
      </div>

      {/* Tùy biến style CSS nội bộ để làm nổi bật dòng "Đang khám" */}
      <style>{`
        .row-in-progress td { background: #f0fdf9 !important; }
        .row-in-progress:hover td { background: #ccfbf1 !important; }
      `}</style>
    </div>
  )
}
