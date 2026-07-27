// UC-13: Trang Thông báo đầy đủ cho Lễ tân.
// Danh sách thông báo, lọc theo trạng thái đọc, đánh dấu đã đọc tất cả,
// click 1 thông báo để xem chi tiết lịch hẹn liên quan (nếu có).

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { List, Button, Segmented, Typography, message, Empty, Card } from 'antd'
import { FiCheck as CheckOutlined, FiBell as BellOutlined } from 'react-icons/fi'
import dayjs from 'dayjs'
import { notificationService } from '../../services/notificationService'
import { appointmentService } from '../../services/appointmentService'
import AppointmentDetailModal from '../../components/receptionist/AppointmentDetailModal'

export default function NotificationsPage() {
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState('ALL')
  const [detail, setDetail] = useState(null)

  const load = async () => {
    setLoading(true)
    try {
      const res = await notificationService.getAll()
      setItems(res.data ?? [])
    } catch {
      message.error('Không thể tải danh sách thông báo')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleMarkAll = async () => {
    try {
      await notificationService.markAllAsRead()
      message.success('Đã đánh dấu tất cả là đã đọc')
      load()
    } catch {
      message.error('Không thể cập nhật')
    }
  }

  const handleClick = async (n) => {
    try {
      if (!n.isRead) {
        await notificationService.markAsRead(n.id)
        setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, isRead: true } : x)))
      }

      // Buổi dịch vụ hoàn thành, sẵn sàng check-out — sang thẳng hàng đợi check-out.
      if (n.relatedEntityType === 'CARE_SESSION_CHECKOUT') {
        navigate('/receptionist/checkout-care-sessions')
        return
      }

      // Mặc định (type null hoặc "APPOINTMENT"): mở modal chi tiết lịch hẹn như cũ.
      if (n.relatedAppointmentId && (!n.relatedEntityType || n.relatedEntityType === 'APPOINTMENT')) {
        const res = await appointmentService.getById(n.relatedAppointmentId)
        setDetail(res.data)
      }
    } catch {
      message.error('Không thể mở thông báo')
    }
  }

  const filtered =
    filter === 'UNREAD' ? items.filter((n) => !n.isRead)
      : filter === 'READ' ? items.filter((n) => n.isRead)
        : items
  const unreadCount = items.filter((n) => !n.isRead).length

  return (
    <div style={{ padding: 24 }}>
      <Typography.Title level={4} style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#0f172a' }}>
        <BellOutlined style={{ marginRight: 8 }} />Thông báo
      </Typography.Title>
      <Typography.Text style={{ display: 'block', marginTop: 4, marginBottom: 16, fontSize: 13, color: '#64748b' }}>
        {unreadCount > 0 ? `${unreadCount} thông báo chưa đọc` : 'Tất cả thông báo đã đọc'}
      </Typography.Text>

      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
          <Segmented
            value={filter}
            onChange={setFilter}
            options={[
              { label: 'Tất cả', value: 'ALL' },
              { label: `Chưa đọc${unreadCount ? ` (${unreadCount})` : ''}`, value: 'UNREAD' },
              { label: 'Đã đọc', value: 'READ' },
            ]}
          />
          <Button icon={<CheckOutlined />} onClick={handleMarkAll} disabled={unreadCount === 0}>
            Đánh dấu đã đọc tất cả
          </Button>
        </div>

        <List
          loading={loading}
          dataSource={filtered}
          locale={{ emptyText: <Empty description="Không có thông báo" /> }}
          renderItem={(n) => (
            <List.Item
              onClick={() => handleClick(n)}
              style={{
                cursor: 'pointer', padding: '12px 16px', borderRadius: 8,
                background: n.isRead ? 'transparent' : '#eff6ff',
              }}
            >
              <List.Item.Meta
                avatar={
                  <span style={{
                    width: 10, height: 10, borderRadius: '50%', display: 'inline-block', marginTop: 6,
                    background: n.isRead ? '#cbd5e1' : '#2563eb',
                  }} />
                }
                title={<span style={{ fontWeight: n.isRead ? 400 : 600 }}>{n.message}</span>}
                description={dayjs(n.createdAt).format('HH:mm DD/MM/YYYY')}
              />
              {n.relatedEntityType === 'CARE_SESSION_CHECKOUT' && (
                <span style={{ fontSize: 12, color: '#2563eb' }}>Check-out ngay →</span>
              )}
              {n.relatedAppointmentId && (!n.relatedEntityType || n.relatedEntityType === 'APPOINTMENT') && (
                <span style={{ fontSize: 12, color: '#2563eb' }}>Xem lịch hẹn →</span>
              )}
            </List.Item>
          )}
        />
      </Card>

      <AppointmentDetailModal appointment={detail} onClose={() => setDetail(null)} />
    </div>
  )
}
