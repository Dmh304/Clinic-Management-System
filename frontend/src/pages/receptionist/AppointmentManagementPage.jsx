/**
 * Page: AppointmentManagementPage
 * Chức năng: Quản lý danh sách lịch khám trong ngày của phòng khám dành cho Lễ tân.
 * Cho phép thực hiện các thao tác xác nhận lịch hẹn, chỉ định bác sĩ, check-in tiếp nhận bệnh nhân và hủy lịch khám.
 * DucTKHHE204463
 */
// Le Thi Bich Ngan - HE204710
// Trang quản lý lịch hẹn hôm nay dành cho lễ tân (Reception Dashboard).
// Hiển thị thống kê lịch hẹn theo từng trạng thái và bảng danh sách lịch hẹn trong ngày.
// Lễ tân có thể: xác nhận lịch hẹn (gán bác sĩ tùy chọn), check-in bệnh nhân,
// bắt đầu khám và hủy lịch hẹn trực tiếp từ bảng.

import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
  Table, Tag, Select, Button, Space, Typography, Card,
  message, Modal, Form, Statistic, Row, Col,
} from 'antd'
import {
  ReloadOutlined, CheckCircleOutlined, LoginOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons'
import {
  fetchTodayAppointments,
  fetchDashboard,
  confirmAppointment,
  checkInAppointment,
  changeAppointmentStatus,
} from '../../store/slices/appointmentSlice'
import { doctorService } from '../../services/doctorService'

const STATUS_CONFIG = {
  PENDING:     { color: 'gold',       label: 'Chờ xác nhận' },
  CONFIRMED:   { color: 'blue',       label: 'Đã xác nhận' },
  WAITING:     { color: 'cyan',       label: 'Chờ khám' },
  IN_PROGRESS: { color: 'processing', label: 'Đang khám' },
  COMPLETED:   { color: 'green',      label: 'Hoàn thành' },
  CANCELLED:   { color: 'red',        label: 'Đã hủy' },
}

export default function AppointmentManagementPage() {
  const dispatch = useDispatch()
  const { list, loading, error, dashboard } = useSelector((s) => s.appointment)
  const [filterStatus, setFilterStatus] = useState('ALL')
  const [doctors, setDoctors] = useState([])

  // State điều khiển modal xác nhận lịch hẹn (mở/đóng, lịch hẹn đang xử lý, bác sĩ được chọn)
  const [confirmModal, setConfirmModal] = useState({ open: false, appointment: null })
  const [confirmLoading, setConfirmLoading] = useState(false)
  const [selectedDoctorId, setSelectedDoctorId] = useState(null)

  // Khi trang được mount: tải danh sách lịch hẹn hôm nay, thống kê dashboard và danh sách bác sĩ
  useEffect(() => {
    dispatch(fetchTodayAppointments())
    dispatch(fetchDashboard())
    doctorService.getAllDoctors().then((res) => setDoctors(res.data)).catch(() => {})
  }, [dispatch])

  // Hiển thị toast lỗi mỗi khi Redux state có lỗi mới
  useEffect(() => {
    if (error) message.error(error)
  }, [error])

  // Tải lại danh sách lịch hẹn và thống kê dashboard (dùng khi nhấn nút "Làm mới")
  const reload = () => {
    dispatch(fetchTodayAppointments())
    dispatch(fetchDashboard())
  }

  // Lọc danh sách lịch hẹn theo trạng thái đang chọn; 'ALL' thì hiển thị tất cả
  const filtered =
    filterStatus === 'ALL' ? list : list.filter((a) => a.status === filterStatus)

  /**
   * Mở modal xác nhận lịch hẹn và chuẩn bị thông tin bác sĩ được phân công.
   * DucTKH
   */
  const handleOpenConfirm = (appointment) => {
    setSelectedDoctorId(appointment.doctorId ?? null)
    setConfirmModal({ open: true, appointment })
  }

  /**
   * Gửi yêu cầu xác nhận lịch hẹn lên hệ thống và chọn bác sĩ phụ trách.
   * DucTKH
   */
  const handleConfirm = async () => {
    setConfirmLoading(true)
    try {
      await dispatch(confirmAppointment({
        id: confirmModal.appointment.id,
        doctorId: selectedDoctorId || null,
      })).unwrap()
      message.success('Xác nhận lịch hẹn thành công')
      setConfirmModal({ open: false, appointment: null })
      dispatch(fetchDashboard())
    } catch (err) {
      message.error(err)
    } finally {
      setConfirmLoading(false)
    }
  }

  /**
   * Thực hiện Check-in khi bệnh nhân đến phòng khám.
   * Chuyển trạng thái lịch khám sang WAITING.
   * DucTKH
   */
  const handleCheckIn = (id) => {
    dispatch(checkInAppointment(id))
      .unwrap()
      .then(() => {
        message.success('Check-in thành công')
        dispatch(fetchDashboard())
      })
      .catch((err) => message.error(err))
  }

  // Hủy lịch hẹn: chuyển trạng thái sang CANCELLED và cập nhật lại thống kê
  const handleCancel = (id) => {
    dispatch(changeAppointmentStatus({ id, status: 'CANCELLED' }))
      .unwrap()
      .then(() => {
        message.success('Đã hủy lịch hẹn')
        dispatch(fetchDashboard())
      })
      .catch((err) => message.error(err))
  }

  //cf hủy lịch
  const showCancelConfirm = (record) => {
  Modal.confirm({
    title: 'Xác nhận hủy lịch hẹn',
    content: `Bạn có chắc muốn hủy lịch hẹn của ${record.patientName || 'bệnh nhân này'} không?`,
    okText: 'Hủy lịch',
    cancelText: 'Không',
    okType: 'danger',
    onOk: () => handleCancel(record.id),
  })
}

  // Định nghĩa các cột của bảng lịch hẹn: thông tin bệnh nhân, giờ khám, STT hàng đợi,
  // bác sĩ, dịch vụ, trạng thái và các nút hành động tương ứng từng trạng thái
  const columns = [
    {
      title: 'STT',
      key: 'index',
      width: 55,
      render: (_, __, i) => i + 1,
    },
    {
      title: 'Bệnh nhân',
      dataIndex: 'patientName',
      key: 'patientName',
    },
    {
      title: 'SĐT',
      dataIndex: 'patientPhone',
      key: 'patientPhone',
      width: 125,
    },
    {
      title: 'Giờ khám',
      dataIndex: 'timeSlot',
      key: 'timeSlot',
      width: 100,
    },
    {
      title: 'STT hàng đợi',
      dataIndex: 'queueNumber',
      key: 'queueNumber',
      width: 110,
      render: (q) => q ? <Tag color="blue">#{q}</Tag> : '—',
    },
    {
      title: 'Bác sĩ',
      dataIndex: 'doctorName',
      key: 'doctorName',
      render: (name) => name || <span style={{ color: '#94a3b8' }}>Chưa phân công</span>,
    },
    {
      title: 'Dịch vụ',
      dataIndex: 'serviceName',
      key: 'serviceName',
      render: (name) => name || '—',
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 135,
      render: (status) => {
        const cfg = STATUS_CONFIG[status] || {}
        return <Tag color={cfg.color}>{cfg.label}</Tag>
      },
    },
    {
      title: 'Hành động',
      key: 'action',
      width: 220,
      render: (_, record) => (
        <Space>
          {record.status === 'PENDING' && (
            <>
              <Button
                size="small"
                type="primary"
                icon={<CheckCircleOutlined />}
                onClick={() => handleOpenConfirm(record)}
              >
                Xác nhận
              </Button>
              <Button
                size="small"
                danger
                icon={<CloseCircleOutlined />}
                onClick={() => showCancelConfirm(record)}
              >
                Hủy
              </Button>
            </>
          )}
          {record.status === 'CONFIRMED' && (
            <>
              <Button
                size="small"
                type="primary"
                icon={<LoginOutlined />}
                onClick={() => handleCheckIn(record.id)}
              >
                Check-in
              </Button>
              <Button
                size="small"
                danger
                icon={<CloseCircleOutlined />}
                onClick={() => showCancelConfirm(record)}
              >
                Hủy
              </Button>
            </>
          )}
          {record.status === 'WAITING' && (
            <Button
              size="small"
              type="primary"
              style={{ backgroundColor: '#8b5cf6', borderColor: '#8b5cf6' }}
              onClick={() => dispatch(changeAppointmentStatus({ id: record.id, status: 'IN_PROGRESS' }))
                .unwrap()
                .then(() => { message.success('Bắt đầu khám'); dispatch(fetchDashboard()) })
                .catch((err) => message.error(err))
              }
            >
              Bắt đầu khám
            </Button>
          )}
        </Space>
      ),
    },
  ]

  const today = new Date().toLocaleDateString('vi-VN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div style={{ padding: 24 }}>
      <Typography.Title level={4} style={{ marginBottom: 4 }}>
        Lịch khám hôm nay
      </Typography.Title>
      <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
        {today}
      </Typography.Text>

      {/* Dashboard stats */}
      {dashboard && (
        <Row gutter={12} style={{ marginBottom: 16 }}>
          {[
            { label: 'Tổng', value: dashboard.total, color: '#6366f1' },
            { label: 'Chờ xác nhận', value: dashboard.pending, color: '#f59e0b' },
            { label: 'Đã xác nhận', value: dashboard.confirmed, color: '#3b82f6' },
            { label: 'Chờ khám', value: dashboard.waiting, color: '#06b6d4' },
            { label: 'Đang khám', value: dashboard.inProgress, color: '#8b5cf6' },
            { label: 'Hoàn thành', value: dashboard.completed, color: '#10b981' },
            { label: 'Đã hủy', value: dashboard.cancelled, color: '#ef4444' },
          ].map(({ label, value, color }) => (
            <Col key={label} flex="1">
              <Card size="small" style={{ textAlign: 'center', borderTop: `3px solid ${color}` }}>
                <Statistic
                  title={<span style={{ fontSize: 11 }}>{label}</span>}
                  value={value}
                  styles={{ value: { fontSize: 20, color } }}
                />
              </Card>
            </Col>
          ))}
        </Row>
      )}

      <Card>
        <Space style={{ marginBottom: 16 }}>
          <Select
            value={filterStatus}
            onChange={setFilterStatus}
            style={{ width: 180 }}
            options={[
              { label: 'Tất cả trạng thái', value: 'ALL' },
              ...Object.entries(STATUS_CONFIG).map(([v, c]) => ({
                label: c.label,
                value: v,
              })),
            ]}
          />
          <Button icon={<ReloadOutlined />} onClick={reload} loading={loading}>
            Làm mới
          </Button>
        </Space>

        <Table
          columns={columns}
          dataSource={filtered}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10, showSizeChanger: false }}
          locale={{ emptyText: 'Không có lịch hẹn nào hôm nay' }}
        />
      </Card>

      {/* Confirm & assign doctor modal */}
      <Modal
        title="Xác nhận lịch hẹn"
        open={confirmModal.open}
        onOk={handleConfirm}
        onCancel={() => setConfirmModal({ open: false, appointment: null })}
        confirmLoading={confirmLoading}
        okText="Xác nhận"
        cancelText="Hủy"
      >
        {confirmModal.appointment && (
          <div style={{ marginBottom: 16 }}>
            <p style={{ margin: '0 0 4px' }}>
              <strong>Bệnh nhân:</strong> {confirmModal.appointment.patientName}
            </p>
            <p style={{ margin: '0 0 4px' }}>
              <strong>Giờ khám:</strong> {confirmModal.appointment.timeSlot}
            </p>
          </div>
        )}
        <Form layout="vertical">
          <Form.Item label="Phân công bác sĩ (không bắt buộc)">
            <Select
              allowClear
              placeholder="Chọn bác sĩ"
              value={selectedDoctorId}
              onChange={setSelectedDoctorId}
              options={doctors.map((d) => ({
                label: `${d.fullName}${d.specialization ? ` — ${d.specialization}` : ''}`,
                value: d.id,
              }))}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
