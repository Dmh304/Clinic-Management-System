import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import dayjs from 'dayjs'
import { Avatar, Button, Checkbox, Empty, Tag, message } from 'antd'
import { ArrowLeftOutlined, ClockCircleOutlined, PlayCircleFilled, CheckCircleFilled } from '@ant-design/icons'
import { careSessionService } from '../../services/careSessionService'

const AVATAR_COLORS = ['#2563eb', '#0d9488', '#c026d3', '#ea580c', '#65a30d', '#dc2626', '#7c3aed']
function colorFor(id) {
  return AVATAR_COLORS[(id || 0) % AVATAR_COLORS.length]
}
function initials(name) {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  return parts[parts.length - 1][0]?.toUpperCase() || '?'
}

function fmtElapsed(totalSeconds) {
  const s = Math.max(0, totalSeconds)
  const hh = Math.floor(s / 3600)
  const mm = Math.floor((s % 3600) / 60)
  const ss = s % 60
  const pad = (n) => n.toString().padStart(2, '0')
  return hh > 0 ? `${pad(hh)}:${pad(mm)}:${pad(ss)}` : `${pad(mm)}:${pad(ss)}`
}

function InfoRow({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 600, color: '#1e293b' }}>{value || '—'}</div>
    </div>
  )
}

function Panel({ title, children, style }) {
  return (
    <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 20, ...style }}>
      {title && <h3 style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 700, color: '#1e293b', textTransform: 'uppercase', letterSpacing: '0.03em' }}>{title}</h3>}
      {children}
    </div>
  )
}

export default function DeliverCareSessionPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [nurseNotes, setNurseNotes] = useState('')
  const [isIncident, setIsIncident] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')
  const [now, setNow] = useState(dayjs())

  useEffect(() => {
    careSessionService.getById(id)
      .then(res => setSession(res.data))
      .catch(err => setError(err.response?.data?.message || 'Không tìm thấy buổi khám'))
      .finally(() => setLoading(false))
  }, [id])

  // Đồng hồ đếm thời gian thực hiện — chỉ chạy khi buổi đang IN_PROGRESS
  useEffect(() => {
    if (session?.status !== 'IN_PROGRESS') return
    const timer = setInterval(() => setNow(dayjs()), 1000)
    return () => clearInterval(timer)
  }, [session?.status])

  const elapsedSeconds = session?.status === 'IN_PROGRESS' && session?.startedAt
    ? now.diff(dayjs(session.startedAt), 'second')
    : null

  const handleStart = async () => {
    setProcessing(true)
    setError('')
    try {
      const res = await careSessionService.start(id)
      setSession(res.data)
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể bắt đầu buổi khám')
    } finally {
      setProcessing(false)
    }
  }

  const handleComplete = async () => {
    if (!nurseNotes.trim()) {
      setError('Vui lòng nhập ghi chú sau khi hoàn thành')
      return
    }
    setProcessing(true)
    setError('')
    try {
      await careSessionService.complete(id, nurseNotes, isIncident)
      message.success('Hoàn thành buổi khám thành công!')
      navigate('/nurse/queue')
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể hoàn thành')
    } finally {
      setProcessing(false)
    }
  }

  const formatDT = (dt) => dt ? dayjs(dt).format('HH:mm [ngày] DD/MM/YYYY') : ''
  const age = session?.patientDob ? dayjs().diff(dayjs(session.patientDob), 'year') : null
  const genderLabel = session?.patientGender === 'MALE' ? 'Nam' : session?.patientGender === 'FEMALE' ? 'Nữ' : '—'

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>Đang tải...</div>

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', padding: '32px 16px' }}>
      <div style={{ maxWidth: 1080, margin: '0 auto' }}>
        <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate('/nurse/queue')} style={{ marginBottom: 12, paddingLeft: 0, color: '#2563eb' }}>
          Quay lại hàng đợi
        </Button>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1e293b', margin: '0 0 20px' }}>Thực hiện buổi chăm sóc</h1>

        {error && <div style={{ background: '#fee2e2', color: '#dc2626', padding: '12px 16px', borderRadius: 8, marginBottom: 16 }}>{error}</div>}

        {!session ? (
          <Panel><Empty description="Không tìm thấy buổi khám" /></Panel>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 20, alignItems: 'start' }}>
            {/* Cột trái — nhận diện bệnh nhân */}
            <Panel title="Nhận diện bệnh nhân">
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: 16 }}>
                <Avatar size={64} style={{ background: colorFor(session.patientId), fontSize: 22, marginBottom: 10 }}>
                  {initials(session.patientName)}
                </Avatar>
                <div style={{ fontWeight: 700, color: '#1e293b', fontSize: 16 }}>{session.patientName}</div>
                <div style={{ fontSize: 12, color: '#94a3b8' }}>ID: {session.patientCode}</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <InfoRow label="Ngày sinh" value={session.patientDob ? `${dayjs(session.patientDob).format('DD/MM/YYYY')} (${age} tuổi)` : null} />
                <InfoRow label="Giới tính" value={genderLabel} />
                <InfoRow label="Số điện thoại" value={session.patientPhone} />
                <InfoRow label="Check-in" value={session.checkedIn ? '✓ Đã check-in' : '✗ Chưa check-in'} />
              </div>
            </Panel>

            {/* Cột phải — đồng hồ + ghi chú + hành động */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ background: session.status === 'IN_PROGRESS' ? '#1d4ed8' : '#94a3b8', borderRadius: 12, padding: '18px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#fff' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  <ClockCircleOutlined /> Đồng hồ buổi chăm sóc
                </div>
                <div style={{ fontSize: 30, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                  {elapsedSeconds != null ? fmtElapsed(elapsedSeconds) : session.status === 'BOOKED' ? '--:--' : session.durationMinutes != null ? fmtElapsed(session.durationMinutes * 60) : '--:--'}
                </div>
              </div>

              {session.status === 'BOOKED' && !session.checkedIn && (
                <div style={{ padding: '10px 14px', background: '#fee2e2', borderRadius: 8, fontSize: 13, color: '#dc2626' }}>
                  Bệnh nhân chưa check-in tại quầy lễ tân — chưa thể bắt đầu buổi khám này.
                </div>
              )}

              <Panel title="Ghi chú buổi chăm sóc">
                {session.notes && (
                  <div style={{ marginBottom: 12, padding: '10px 12px', background: '#fffbeb', borderRadius: 8, fontSize: 13, color: '#92400e' }}>
                    <strong>Ghi chú của bệnh nhân lúc đặt:</strong> {session.notes}
                  </div>
                )}
                <textarea
                  value={nurseNotes}
                  onChange={e => setNurseNotes(e.target.value)}
                  rows={6}
                  placeholder="Nhập kết quả thực hiện, tình trạng bệnh nhân, lưu ý cho buổi sau..."
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14, outline: 'none', resize: 'vertical', boxSizing: 'border-box' }}
                />

                {session.status === 'IN_PROGRESS' && (
                  <Checkbox checked={isIncident} onChange={e => setIsIncident(e.target.checked)} style={{ marginTop: 12, fontSize: 13, color: '#b45309' }}>
                    ⚠️ Đánh dấu có sự cố/phản ứng bất thường trong buổi khám (báo Clinic Manager xem xét)
                  </Checkbox>
                )}

                <div style={{ display: 'flex', gap: 12, marginTop: 18 }}>
                  {session.status === 'BOOKED' && (
                    <Button
                      type="primary" size="large" block icon={<PlayCircleFilled />}
                      loading={processing} disabled={!session.checkedIn}
                      onClick={handleStart}
                    >
                      {!session.checkedIn ? 'Chờ check-in' : 'Bắt đầu khám'}
                    </Button>
                  )}
                  {session.status === 'IN_PROGRESS' && (
                    <Button
                      type="primary" size="large" block icon={<CheckCircleFilled />}
                      loading={processing}
                      style={{ background: '#16a34a', borderColor: '#16a34a' }}
                      onClick={handleComplete}
                    >
                      Hoàn thành buổi khám
                    </Button>
                  )}
                  {!['BOOKED', 'IN_PROGRESS'].includes(session.status) && (
                    <Tag color="green" style={{ fontSize: 13, padding: '6px 12px' }}>Buổi khám đã kết thúc</Tag>
                  )}
                </div>
              </Panel>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <Panel title="Thông tin buổi chăm sóc">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <InfoRow label="Dịch vụ" value={session.serviceName} />
                    <InfoRow label="Buổi số" value={`${session.sessionNumber}/${session.totalSessions}`} />
                    <InfoRow label="Lịch hẹn" value={formatDT(session.scheduledDateTime)} />
                  </div>
                </Panel>
                <Panel title="Trạng thái">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <InfoRow label="Trạng thái buổi khám" value={session.status === 'BOOKED' ? 'Chờ khám' : session.status === 'IN_PROGRESS' ? 'Đang thực hiện' : session.status === 'COMPLETED' ? 'Hoàn thành' : session.status} />
                    <InfoRow label="Thời gian bắt đầu" value={session.startedAt ? dayjs(session.startedAt).format('HH:mm') : '—'} />
                    <InfoRow label="Phòng" value={session.roomName} />
                  </div>
                </Panel>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
