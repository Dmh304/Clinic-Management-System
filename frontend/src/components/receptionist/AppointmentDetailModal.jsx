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
          <Descriptions.Item label="Bệnh nhân">{a.patientName || '—'}</Descriptions.Item>
          <Descriptions.Item label="SĐT">{a.patientPhone || '—'}</Descriptions.Item>
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
          <Descriptions.Item label="Ghi chú">{a.notes || '—'}</Descriptions.Item>
        </Descriptions>
      )}
    </Modal>
  )
}
