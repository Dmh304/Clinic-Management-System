import { useEffect, useState } from 'react'
import { roomService } from '../../services/roomService'
import { serviceService } from '../../services/serviceService'
import Header from '../../components/layout/Header'
import { pageTitle } from './managerTypography'

const CATEGORY_LABELS = {
  CLINICAL_EXAM: 'Phòng Khám Tổng Hợp',
  CARE_RECOVERY: 'Chăm Sóc & Phục Hồi',
  DIAGNOSTIC_IMAGING: 'Chẩn Đoán Hình Ảnh',
  OPTICAL_WORKSHOP: 'Xưởng Gia Công Kính',
}

const CATEGORY_ORDER = ['CLINICAL_EXAM', 'CARE_RECOVERY', 'DIAGNOSTIC_IMAGING', 'OPTICAL_WORKSHOP']

const EMPTY_FORM = { id: null, name: '', category: 'CLINICAL_EXAM', serviceId: '', capacity: 1 }

export default function RoomManagementPage() {
  const [rooms, setRooms] = useState([])
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [includeInactive, setIncludeInactive] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)

  const fetchAll = async () => {
    setLoading(true)
    setError('')
    try {
      const [roomsRes, servicesRes] = await Promise.all([
        roomService.getAllRooms(includeInactive),
        serviceService.getAllServices(),
      ])
      setRooms(roomsRes.data || [])
      // ClinicService entity: field JSON thật là serviceName/isActive (không phải name/active)
      setServices((servicesRes.data || []).filter((s) => s.isActive !== false))
    } catch (err) {
      setError(err.response?.data?.message || 'Lỗi khi tải dữ liệu')
    } finally {
      setLoading(false)
    }
  }

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchAll() }, [includeInactive])

  const openCreateForm = () => {
    setForm(EMPTY_FORM)
    setShowForm(true)
    setError('')
  }

  const openEditForm = (room) => {
    setForm({
      id: room.id,
      name: room.name,
      category: room.category,
      serviceId: room.serviceId ?? '',
      capacity: room.capacity ?? 1,
    })
    setShowForm(true)
    setError('')
  }

  const handleSave = async () => {
    if (!form.name.trim()) { setError('Vui lòng nhập tên phòng'); return }
    setSaving(true)
    setError('')
    try {
      const payload = {
        name: form.name.trim(),
        category: form.category,
        serviceId: form.serviceId === '' ? null : Number(form.serviceId),
        capacity: Number(form.capacity) || 1,
      }
      if (form.id) {
        await roomService.updateRoom(form.id, payload)
      } else {
        await roomService.createRoom(payload)
      }
      setShowForm(false)
      await fetchAll()
    } catch (err) {
      setError(err.response?.data?.message || 'Lỗi khi lưu phòng — có thể trùng tên trong cùng nhóm.')
    } finally {
      setSaving(false)
    }
  }

  const handleToggleStatus = async (room) => {
    const confirmMsg = room.status === 'ACTIVE'
      ? `Ngừng sử dụng phòng "${room.name}"? Phòng sẽ ẩn khỏi danh sách phân trực.`
      : `Kích hoạt lại phòng "${room.name}"?`
    if (!window.confirm(confirmMsg)) return

    try {
      if (room.status === 'ACTIVE') {
        await roomService.deactivateRoom(room.id)
      } else {
        await roomService.reactivateRoom(room.id)
      }
      await fetchAll()
    } catch (err) {
      setError(err.response?.data?.message || 'Lỗi khi cập nhật trạng thái phòng')
    }
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>Đang tải...</div>

  return (
    <>
    <Header/>
    <div style={{ minHeight: '100vh', background: '#f8fafc', padding: '32px 16px' }}>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
          <div>
            <h1 style={pageTitle}>Quản lý phòng</h1>
            <p style={{ color: '#64748b', margin: '4px 0 0', fontSize: 14 }}>
              Danh mục phòng vật lý và ánh xạ dịch vụ — dùng làm nguồn tham chiếu cho phân trực
            </p>
          </div>
          <button
            onClick={openCreateForm}
            style={{
              background: '#2563eb', color: '#fff', border: 'none', padding: '10px 18px',
              borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap',
            }}
          >
            + Thêm phòng
          </button>
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, fontSize: 14, color: '#374151' }}>
          <input
            type="checkbox"
            checked={includeInactive}
            onChange={(e) => setIncludeInactive(e.target.checked)}
          />
          Hiển thị cả phòng đã ngừng sử dụng
        </label>

        {error && (
          <div style={{ background: '#fee2e2', color: '#dc2626', padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 14 }}>
            {error}
          </div>
        )}

        {showForm && (
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20, marginBottom: 24 }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700, color: '#1e293b' }}>
              {form.id ? 'Sửa phòng' : 'Thêm phòng mới'}
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
              <div>
                <label style={labelStyle}>Tên phòng</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Phòng Khám Tổng Hợp A"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Loại phòng</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  style={inputStyle}
                >
                  {CATEGORY_ORDER.map((c) => (
                    <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Dịch vụ gắn với (tuỳ chọn)</label>
                <select
                  value={form.serviceId}
                  onChange={(e) => setForm({ ...form, serviceId: e.target.value })}
                  style={inputStyle}
                >
                  <option value="">-- Không gắn dịch vụ cụ thể (phục vụ nhiều dịch vụ) --</option>
                  
                  <optgroup label="Khám Bệnh (EXAM)">
                    {services.filter((s) => s.serviceType === 'EXAM').map((s) => (
                      <option key={s.id} value={s.id}>{s.serviceName}</option>
                    ))}
                  </optgroup>
                  <optgroup label="Chẩn Đoán & Xét Nghiệm (DIAGNOSTIC)">
                    {services.filter((s) => s.serviceType === 'DIAGNOSTIC').map((s) => (
                      <option key={s.id} value={s.id}>{s.serviceName}</option>
                    ))}
                  </optgroup>
                  <optgroup label="Gói Chăm Sóc (CARE)">
                    {services.filter((s) => s.serviceType === 'CARE').map((s) => (
                      <option key={s.id} value={s.id}>{s.serviceName}</option>
                    ))}
                  </optgroup>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Sức chứa</label>
                <input
                  type="number"
                  min={1}
                  value={form.capacity}
                  onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                  style={inputStyle}
                />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{
                  background: '#2563eb', color: '#fff', border: 'none', padding: '9px 18px',
                  borderRadius: 8, cursor: saving ? 'not-allowed' : 'pointer', fontSize: 14, fontWeight: 600,
                }}
              >
                {saving ? 'Đang lưu...' : 'Lưu'}
              </button>
              <button
                onClick={() => setShowForm(false)}
                style={{
                  background: '#f1f5f9', color: '#475569', border: 'none', padding: '9px 18px',
                  borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 600,
                }}
              >
                Huỷ
              </button>
            </div>
          </div>
        )}

        {CATEGORY_ORDER.map((cat) => {
          const catRooms = rooms.filter((r) => r.category === cat)
          if (catRooms.length === 0) return null
          return (
            <div key={cat} style={{ marginBottom: 24 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: 10 }}>
                {CATEGORY_LABELS[cat]}
              </h3>
              <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                      {['Tên phòng', 'Dịch vụ gắn với', 'Nhân sự trực hôm nay', 'Trạng thái', 'Thao tác'].map((h) => (
                        <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {catRooms.map((room, i) => (
                      <tr key={room.id} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                        <td style={{ padding: '12px 14px', fontWeight: 600, color: '#1e293b' }}>{room.name}</td>
                        <td style={{ padding: '12px 14px', fontSize: 13, color: '#374151' }}>
                          {room.serviceName || <span style={{ color: '#94a3b8' }}>Nhiều dịch vụ (theo nhóm)</span>}
                        </td>
                        <td style={{ padding: '12px 14px', fontSize: 13, color: '#374151' }}>
                          {room.currentStaffFullName || <span style={{ color: '#94a3b8' }}>Chưa phân trực</span>}
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <span style={{
                            padding: '3px 10px', borderRadius: 999, fontSize: 12, fontWeight: 600,
                            background: room.status === 'ACTIVE' ? '#dcfce7' : '#f1f5f9',
                            color: room.status === 'ACTIVE' ? '#16a34a' : '#94a3b8',
                          }}>
                            {room.status === 'ACTIVE' ? 'Đang dùng' : 'Ngừng dùng'}
                          </span>
                        </td>
                        <td style={{ padding: '12px 14px', display: 'flex', gap: 8 }}>
                          <button onClick={() => openEditForm(room)} style={smallBtnStyle('#eff6ff', '#2563eb')}>Sửa</button>
                          <button onClick={() => handleToggleStatus(room)} style={smallBtnStyle(room.status === 'ACTIVE' ? '#fef2f2' : '#f0fdf4', room.status === 'ACTIVE' ? '#dc2626' : '#16a34a')}>
                            {room.status === 'ACTIVE' ? 'Ngừng dùng' : 'Kích hoạt lại'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )
        })}

        {rooms.length === 0 && (
          <div style={{ padding: 28, textAlign: 'center', color: '#94a3b8', fontSize: 14 }}>Chưa có phòng nào được cấu hình</div>
        )}
      </div>
    </div>
    </>
  )
}

const labelStyle = { display: 'block', fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 4 }
const inputStyle = { width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 14, boxSizing: 'border-box' }
const smallBtnStyle = (bg, color) => ({
  background: bg, color, border: 'none', padding: '6px 12px', borderRadius: 6,
  cursor: 'pointer', fontSize: 12, fontWeight: 600,
})
