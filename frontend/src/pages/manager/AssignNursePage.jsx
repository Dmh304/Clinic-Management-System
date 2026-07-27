import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import {
  Card, Row, Col, Table, Tag, Progress, Avatar, Button, DatePicker, Select,
  message, Modal, Empty, Tabs, Tooltip,
} from 'antd'
import {
  ThunderboltOutlined, TeamOutlined, FileDoneOutlined, ClockCircleOutlined,
  SettingOutlined, InfoCircleOutlined, CheckCircleFilled,
} from '@ant-design/icons'
import { careSessionService } from '../../services/careSessionService'

const CAPACITY_EXCEEDED_PREFIX = 'CAPACITY_EXCEEDED: '
const OVERLAP_PREFIX = 'OVERLAP_CONFLICT: '
const MAX_SESSIONS_PER_NURSE = 12

const AVATAR_COLORS = ['#2563eb', '#0d9488', '#c026d3', '#ea580c', '#65a30d', '#dc2626', '#7c3aed']
function colorFor(id) {
  return AVATAR_COLORS[id % AVATAR_COLORS.length]
}
function initials(name) {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  return parts[parts.length - 1][0]?.toUpperCase() || '?'
}

export default function AssignNursePage() {
  const [sessions, setSessions] = useState([])
  // Toàn bộ buổi (mọi trạng thái, trừ CANCELLED) trong ngày — dùng để tính khối lượng công việc
  // thật của điều dưỡng, khác với `sessions` (chỉ BOOKED) dùng cho 2 bảng phân công.
  const [allDaySessions, setAllDaySessions] = useState([])
  const [nurses, setNurses] = useState([])
  const [loading, setLoading] = useState(true)
  const [assigning, setAssigning] = useState(null)
  const [autoAssigning, setAutoAssigning] = useState(false)
  const [selected, setSelected] = useState({}) // {sessionId: nurseId}
  const [date, setDate] = useState(dayjs().startOf('day'))
  const navigate = useNavigate()

  const dateStr = date.format('YYYY-MM-DD')

  const loadData = () => {
    setLoading(true)
    return Promise.all([
      careSessionService.getAll(dateStr),
      careSessionService.getNurses(),
    ]).then(([sessRes, nurseRes]) => {
      const all = (sessRes.data || []).filter(s => s.status !== 'CANCELLED')
      setAllDaySessions(all)
      setSessions(all.filter(s => s.status === 'BOOKED'))
      setNurses(nurseRes.data || [])
    }).finally(() => setLoading(false))
  }

  // eslint-disable-next-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps
  useEffect(() => { loadData() }, [dateStr])

  // UC-19 bước 2: tải hiện tại của từng điều dưỡng trong ngày đang xem — tính trên TOÀN BỘ
  // buổi đã phân công trong ngày (BOOKED/IN_PROGRESS/COMPLETED/CHECKED_OUT), không chỉ buổi
  // còn ở trạng thái BOOKED, để khớp với cách backend tính capacity (countByNurseOnDate).
  const workloadByNurse = useMemo(() => {
    const map = {}
    for (const s of allDaySessions) {
      if (s.nurseId) map[s.nurseId] = (map[s.nurseId] || 0) + 1
    }
    return map
  }, [allDaySessions])

  const unassignedSessions = useMemo(
    () => [...sessions.filter(s => !s.nurseId)].sort((a, b) => new Date(a.scheduledDateTime) - new Date(b.scheduledDateTime)),
    [sessions]
  )
  const assignedSessions = sessions.filter(s => s.nurseId)
  const efficiency = sessions.length > 0 ? Math.round((assignedSessions.length / sessions.length) * 100) : 100

  const soonThreshold = dayjs().add(60, 'minute')
  const hasUrgent = date.isSame(dayjs(), 'day') && unassignedSessions.some(s => dayjs(s.scheduledDateTime).isBefore(soonThreshold))

  const doAssign = async (sessionId, nurseId, override) => {
    setAssigning(sessionId)
    try {
      await careSessionService.assignNurse(sessionId, Number(nurseId), override)
      const nurse = nurses.find(n => n.id === Number(nurseId))
      setSessions(prev => prev.map(s => s.id === sessionId
        ? { ...s, nurseId: Number(nurseId), nurseName: nurse?.fullName }
        : s))
      message.success('Phân công thành công!')
      return true
    } catch (err) {
      const msg = err.response?.data?.message || 'Lỗi khi phân công'
      // UC-19 E-2: đủ sức chứa → hỏi lại Manager có muốn ghi đè (override) không, thay vì chỉ báo lỗi.
      if (msg.startsWith(CAPACITY_EXCEEDED_PREFIX)) {
        const reason = msg.slice(CAPACITY_EXCEEDED_PREFIX.length)
        return new Promise((resolve) => {
          Modal.confirm({
            title: 'Điều dưỡng đã đủ số buổi tối đa',
            content: reason,
            okText: 'Vẫn phân công',
            cancelText: 'Hủy',
            onOk: async () => resolve(await doAssign(sessionId, nurseId, true)),
            onCancel: () => resolve(false),
          })
        })
      }
      // Trùng khung giờ với buổi khác của cùng điều dưỡng → cũng hỏi lại thay vì chặn cứng,
      // để Manager biết rõ mình đang xếp trùng giờ trước khi quyết định.
      if (msg.startsWith(OVERLAP_PREFIX)) {
        const reason = msg.slice(OVERLAP_PREFIX.length)
        return new Promise((resolve) => {
          Modal.confirm({
            title: 'Điều dưỡng đang trùng khung giờ',
            content: reason,
            okText: 'Vẫn phân công',
            cancelText: 'Hủy',
            onOk: async () => resolve(await doAssign(sessionId, nurseId, true)),
            onCancel: () => resolve(false),
          })
        })
      }
      message.error(msg)
      return false
    } finally {
      setAssigning(null)
    }
  }

  const handleAssign = (sessionId) => {
    const nurseId = selected[sessionId]
    if (!nurseId) return message.warning('Vui lòng chọn điều dưỡng')
    doAssign(sessionId, nurseId, false)
  }

  const handleAutoAssign = () => {
    Modal.confirm({
      title: 'Tự động phân công',
      content: `Tự động phân công tất cả buổi chưa có điều dưỡng trong ngày ${date.format('DD/MM/YYYY')}?`,
      okText: 'Phân công ngay',
      cancelText: 'Hủy',
      onOk: async () => {
        setAutoAssigning(true)
        try {
          const res = await careSessionService.autoAssignRemaining(dateStr)
          message.success(
            `Đã tự động phân công ${res.data.assignedCount} buổi` +
            (res.data.stillUnassignedCount > 0
              ? `, còn ${res.data.stillUnassignedCount} buổi chưa phân công được (không đủ điều dưỡng).`
              : '.')
          )
          loadData()
        } catch (err) {
          message.error(err.response?.data?.message || 'Lỗi khi tự động phân công')
        } finally {
          setAutoAssigning(false)
        }
      },
    })
  }

  const formatDT = (dt) => dt ? dayjs(dt).format('HH:mm') : ''

  const nurseSelectOptions = nurses.map(n => ({
    value: n.id,
    label: `${n.fullName} (${workloadByNurse[n.id] || 0}/${MAX_SESSIONS_PER_NURSE} buổi)`,
  }))

  const renderAction = (s) => (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      <Select
        size="small"
        placeholder="Chọn điều dưỡng"
        style={{ width: 190 }}
        value={selected[s.id] || s.nurseId || undefined}
        onChange={(v) => setSelected(prev => ({ ...prev, [s.id]: v }))}
        options={nurseSelectOptions}
      />
      <Button
        type="primary"
        size="small"
        loading={assigning === s.id}
        disabled={!selected[s.id] && !s.nurseId}
        onClick={() => handleAssign(s.id)}
      >
        {s.nurseId ? 'Đổi ĐD' : 'Phân công'}
      </Button>
    </div>
  )

  const patientColumn = {
    title: 'Bệnh nhân',
    key: 'patient',
    render: (_, s) => (
      <div>
        <div style={{ fontWeight: 600, color: '#1e293b' }}>{s.patientName}</div>
        <div style={{ fontSize: 12, color: '#94a3b8' }}>{s.patientCode}</div>
      </div>
    ),
  }
  const serviceColumn = {
    title: 'Loại dịch vụ',
    key: 'service',
    render: (_, s) => <Tag color="blue">{s.serviceName} • Buổi {s.sessionNumber}</Tag>,
  }
  const timeColumn = {
    title: 'Thời gian',
    key: 'time',
    width: 110,
    render: (_, s) => (
      <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#475569' }}>
        <ClockCircleOutlined /> {formatDT(s.scheduledDateTime)}
      </span>
    ),
  }

  const pendingColumns = [
    patientColumn, serviceColumn, timeColumn,
    { title: 'Thao tác', key: 'action', render: (_, s) => renderAction(s) },
  ]
  const assignedColumns = [
    patientColumn, serviceColumn, timeColumn,
    {
      title: 'Điều dưỡng',
      key: 'nurse',
      render: (_, s) => <Tag color="green" icon={<CheckCircleFilled />}>{s.nurseName}</Tag>,
    },
    { title: 'Đổi điều dưỡng', key: 'action', render: (_, s) => renderAction(s) },
  ]

  const dateTitle = date.toDate().toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  return (
    <div style={{ padding: 24 }}>
      <div style={{ maxWidth: 1280, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16, marginBottom: 24 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#0f172a' }}>Phân công Điều dưỡng</h2>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b', textTransform: 'capitalize' }}>📅 {dateTitle}</p>
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <DatePicker
              value={date}
              onChange={(d) => d && setDate(d.startOf('day'))}
              format="DD/MM/YYYY"
              allowClear={false}
            />
            <Button
              type="primary"
              icon={<ThunderboltOutlined />}
              loading={autoAssigning}
              disabled={unassignedSessions.length === 0}
              onClick={handleAutoAssign}
              style={{ background: '#16a34a', borderColor: '#16a34a', fontWeight: 600 }}
            >
              Tự động phân công
            </Button>
          </div>
        </div>

        {nurses.length === 0 && (
          <div style={{ background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: 10, padding: '12px 16px', marginBottom: 20, fontSize: 14, color: '#92400e' }}>
            Chưa có điều dưỡng nào trong hệ thống. Hãy tạo tài khoản với role NURSE trước.
          </div>
        )}

        <Row gutter={16} style={{ marginBottom: 20 }}>
          <Col xs={24} md={8}>
            <Card styles={{ body: { padding: 20 } }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 44, height: 44, borderRadius: 10, background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#dc2626', fontSize: 18, flexShrink: 0 }}>
                  <FileDoneOutlined />
                </div>
                <div>
                  <div style={{ fontSize: 13, color: '#64748b' }}>Phiên chưa phân công</div>
                  <div style={{ fontSize: 26, fontWeight: 700, color: '#1e293b' }}>{unassignedSessions.length}</div>
                </div>
              </div>
            </Card>
          </Col>
          <Col xs={24} md={8}>
            <Card styles={{ body: { padding: 20 } }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 44, height: 44, borderRadius: 10, background: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb', fontSize: 18, flexShrink: 0 }}>
                  <TeamOutlined />
                </div>
                <div>
                  <div style={{ fontSize: 13, color: '#64748b' }}>Điều dưỡng khả dụng</div>
                  <div style={{ fontSize: 26, fontWeight: 700, color: '#1e293b' }}>{nurses.length}</div>
                </div>
              </div>
            </Card>
          </Col>
          <Col xs={24} md={8}>
            <Card styles={{ body: { padding: 20 } }}>
              <div style={{ fontSize: 13, color: '#64748b', marginBottom: 6 }}>Hiệu suất phân công</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#16a34a', marginBottom: 8 }}>{efficiency}%</div>
              <Progress percent={efficiency} showInfo={false} strokeColor="#16a34a" size="small" />
              <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
                Đã phân công {assignedSessions.length}/{sessions.length || 0} phiên
              </div>
            </Card>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} lg={16}>
            <Card
              title={
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span>Danh sách phiên chờ (Phân loại theo giờ)</span>
                  {hasUrgent && <Tag color="orange">Sắp đến hạn</Tag>}
                </div>
              }
              styles={{ body: { padding: 0 } }}
              style={{ marginBottom: 16 }}
            >
              <Tabs
                defaultActiveKey="pending"
                style={{ padding: '0 16px' }}
                items={[
                  {
                    key: 'pending',
                    label: `Chưa phân công (${unassignedSessions.length})`,
                    children: (
                      <Table
                        rowKey="id"
                        columns={pendingColumns}
                        dataSource={unassignedSessions}
                        loading={loading}
                        pagination={{ pageSize: 5, hideOnSinglePage: true }}
                        locale={{ emptyText: <Empty description="Không có phiên nào cần phân công" /> }}
                      />
                    ),
                  },
                  {
                    key: 'assigned',
                    label: `Đã phân công (${assignedSessions.length})`,
                    children: (
                      <Table
                        rowKey="id"
                        columns={assignedColumns}
                        dataSource={assignedSessions}
                        loading={loading}
                        pagination={{ pageSize: 5, hideOnSinglePage: true }}
                        locale={{ emptyText: <Empty description="Chưa có phiên nào được phân công" /> }}
                      />
                    ),
                  },
                ]}
              />
            </Card>
          </Col>

          <Col xs={24} lg={8}>
            <Card
              title="Khối lượng công việc"
              extra={
                <Tooltip title={`Mỗi điều dưỡng tối đa ${MAX_SESSIONS_PER_NURSE} buổi/ngày`}>
                  <InfoCircleOutlined style={{ color: '#94a3b8' }} />
                </Tooltip>
              }
            >
              {nurses.length === 0 ? (
                <Empty description="Chưa có điều dưỡng" />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {nurses.map(n => {
                    const load = workloadByNurse[n.id] || 0
                    const atCap = load >= MAX_SESSIONS_PER_NURSE
                    return (
                      <div key={n.id}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                          <Avatar style={{ background: colorFor(n.id) }}>{initials(n.fullName)}</Avatar>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600, color: '#1e293b', fontSize: 14 }}>ĐD. {n.fullName}</div>
                            <div style={{ fontSize: 12, color: atCap ? '#dc2626' : '#64748b' }}>{load}/{MAX_SESSIONS_PER_NURSE} phiên</div>
                          </div>
                        </div>
                        <Progress
                          percent={Math.min(100, (load / MAX_SESSIONS_PER_NURSE) * 100)}
                          showInfo={false}
                          size="small"
                          strokeColor={atCap ? '#dc2626' : '#2563eb'}
                        />
                        {atCap && <div style={{ fontSize: 12, color: '#dc2626', marginTop: 4 }}>⚠️ Đã đạt giới hạn phiên trong ngày</div>}
                      </div>
                    )
                  })}
                </div>
              )}
              <Button
                type="dashed"
                block
                icon={<SettingOutlined />}
                style={{ marginTop: 20 }}
                onClick={() => navigate('/manager/room-roster')}
              >
                Điều chỉnh danh sách trực
              </Button>
            </Card>
          </Col>
        </Row>
      </div>
    </div>
  )
}
