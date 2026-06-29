// UC-13: Modal hiển thị chi tiết 1 lịch hẹn (read-only).
// Dùng chung cho trang Lịch khám (lễ tân) và chuông thông báo.

import { Modal, Descriptions, Tag } from 'antd'
import dayjs from 'dayjs'

const STATUS_CONFIG = {
  PENDING:     { color: 'gold',       label: 'Chờ xác nhận' },
  CONFIRMED:   { color: 'blue',       label: 'Đã xác nhận' },
  WAITING:     { color: 'cyan',       label: 'Chờ khám' },
  IN_PROGRESS: { color: 'processing', label: 'Đang khám' },
  COMPLETED:   { color: 'green',      label: 'Hoàn thành' },
  CANCELLED:   { color: 'red',        label: 'Đã hủy' },
}

const fmt = (dt) => (dt ? dayjs(dt).format('HH:mm DD/MM/YYYY') : '—')

const typeLabel = (type) =>
  type === 'WALK_IN' ? 'Vãng lai' : type === 'ONLINE' ? 'Đặt trước' : type || '—'

const genderLabel = (g) =>
  g === 'MALE' ? 'Nam' : g === 'FEMALE' ? 'Nữ' : g === 'OTHER' ? 'Khác' : '—'

// "Ngày sinh (tuổi)" — giúp lễ tân xác minh đúng người khi check-in
const dobWithAge = (dob) => {
  if (!dob) return '—'
  const age = dayjs().diff(dayjs(dob), 'year')
  return `${dayjs(dob).format('DD/MM/YYYY')} (${age} tuổi)`
}

export default function AppointmentDetailModal({ appointment, onClose }) {
  const a = appointment
  const cfg = a ? STATUS_CONFIG[a.status] || { color: 'default', label: a.status } : {}

  return (
    <Modal
      open={!!a}
      onCancel={onClose}
      footer={null}
      title="Chi tiết lịch hẹn"
      destroyOnHidden
    >
      {a && (
        <Descriptions column={1} bordered size="small">
          <Descriptions.Item label="Bệnh nhân">
            {a.patientName || '—'}
            {a.bookedByName && (
              <Tag color="purple" style={{ marginLeft: 8 }}>Đặt hộ</Tag>
            )}
          </Descriptions.Item>
          <Descriptions.Item label="Giới tính">{genderLabel(a.patientGender)}</Descriptions.Item>
          <Descriptions.Item label="Ngày sinh">{dobWithAge(a.patientDob)}</Descriptions.Item>
          <Descriptions.Item label="SĐT">{a.patientPhone || '—'}</Descriptions.Item>
          {a.patientEmail && (
            <Descriptions.Item label="Email">{a.patientEmail}</Descriptions.Item>
          )}
          {a.patientAddress && (
            <Descriptions.Item label="Địa chỉ">{a.patientAddress}</Descriptions.Item>
          )}
          {a.bookedByName && (
            <Descriptions.Item label="Người đặt lịch">
              {a.bookedByName}{a.bookedByPhone ? ` — ${a.bookedByPhone}` : ''}
            </Descriptions.Item>
          )}
          <Descriptions.Item label="Bác sĩ">{a.doctorName || 'Chưa phân công'}</Descriptions.Item>
          <Descriptions.Item label="Dịch vụ">{a.serviceName || '—'}</Descriptions.Item>
          <Descriptions.Item label="Thời gian khám">{fmt(a.appointmentTime)}</Descriptions.Item>
          <Descriptions.Item label="Trạng thái">
            <Tag color={cfg.color}>{cfg.label}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="STT hàng đợi">
            {a.queueNumber ? `#${a.queueNumber}` : '—'}
          </Descriptions.Item>
          <Descriptions.Item label="Loại">{typeLabel(a.type)}</Descriptions.Item>
          <Descriptions.Item label="Giờ check-in">{fmt(a.checkInTime)}</Descriptions.Item>
          <Descriptions.Item label="Triệu chứng / lý do khám">{a.notes || '—'}</Descriptions.Item>
          {a.status === 'CANCELLED' && (
            <Descriptions.Item label="Lý do hủy">
              <span style={{ color: '#dc2626' }}>{a.cancelReason || '—'}</span>
            </Descriptions.Item>
          )}
          {a.status === 'CANCELLED' && a.cancelledAt && (
            <Descriptions.Item label="Thời điểm hủy">{fmt(a.cancelledAt)}</Descriptions.Item>
          )}
        </Descriptions>
      )}
    </Modal>
  )
}
