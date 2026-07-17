// UC-58: Manage Room Catalogue & Service Mapping
import { useEffect, useState } from 'react'
import { roomService } from '../../services/roomService'
import { serviceService } from '../../services/serviceService'

const INITIAL_FORM = { name: '', roomType: 'DOCTOR', capacity: 1, isActive: true, serviceIds: [] }

const ROOM_TYPE_LABEL = { DOCTOR: 'Bác sĩ', NURSE: 'Điều dưỡng', LAB: 'Xét nghiệm' }

export default function RoomManagementPage() {
  const [rooms, setRooms] = useState([])
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(INITIAL_FORM)
  const [editingId, setEditingId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [roomRes, serviceRes] = await Promise.all([
        roomService.getAll(),
        serviceService.getAllServices(),
      ])
      setRooms(roomRes.data || [])
      setServices(serviceRes.data || [])
    } finally {
      setLoading(false)
    }
  }

  const openCreate = () => { setForm(INITIAL_FORM); setEditingId(null); setModal(true); setError('') }
  const openEdit = (r) => {
    setForm({
      name: r.name, roomType: r.roomType, capacity: r.capacity, isActive: r.isActive,
      serviceIds: (r.services || []).map(s => s.id),
    })
    setEditingId(r.id); setModal(true); setError('')
  }

  const toggleService = (serviceId) => {
    setForm(prev => ({
      ...prev,
      serviceIds: prev.serviceIds.includes(serviceId)
        ? prev.serviceIds.filter(id => id !== serviceId)
        : [...prev.serviceIds, serviceId],
    }))
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (form.serviceIds.length === 0) return setError('Vui lòng chọn ít nhất 1 dịch vụ/loại xét nghiệm cho phòng')
    setSaving(true)
    setError('')
    try {
      if (editingId) {
        await roomService.update(editingId, form)
      } else {
        await roomService.create(form)
      }
      setModal(false)
      fetchData()
    } catch (err) {
      setError(err.response?.data?.message || 'Lỗi khi lưu')
    } finally {
      setSaving(false)
    }
  }

  const handleDeactivate = async (id) => {
    if (!window.confirm('Vô hiệu hoá phòng này? Các phân công nhân sự đang trỏ tới phòng sẽ cần được Manager xử lý lại.')) return
    try { await roomService.deactivate(id); fetchData() } catch (err) { alert(err.response?.data?.message || 'Lỗi') }
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>Đang tải...</div>

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', padding: '32px 16px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1e293b', margin: 0 }}>Danh mục phòng (UC-58)</h1>
            <p style={{ color: '#64748b', margin: '4px 0 0', fontSize: 14 }}>
              Quản lý phòng khám/phẫu thuật/chăm sóc/xét nghiệm và dịch vụ mà mỗi phòng phục vụ
            </p>
          </div>
          <button onClick={openCreate} style={{ background: '#2563eb', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
            + Thêm phòng
          </button>
        </div>

        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                {['Tên phòng', 'Loại', 'Sức chứa', 'Dịch vụ liên kết', 'Trạng thái', 'Thao tác'].map(h => (
                  <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rooms.map((r, i) => (
                <tr key={r.id} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                  <td style={{ padding: '12px 12px', fontWeight: 600, color: '#1e293b' }}>{r.name}</td>
                  <td style={{ padding: '12px 12px' }}>
                    <span style={{ background: '#eff6ff', color: '#2563eb', padding: '2px 8px', borderRadius: 8, fontSize: 12, fontWeight: 600 }}>
                      {ROOM_TYPE_LABEL[r.roomType] || r.roomType}
                    </span>
                  </td>
                  <td style={{ padding: '12px 12px', fontSize: 13 }}>{r.capacity}</td>
                  <td style={{ padding: '12px 12px', fontSize: 13, color: '#64748b' }}>
                    {(r.services || []).map(s => s.serviceName).join(', ') || '—'}
                  </td>
                  <td style={{ padding: '12px 12px' }}>
                    <span style={{ background: r.isActive ? '#dcfce7' : '#f3f4f6', color: r.isActive ? '#16a34a' : '#6b7280', padding: '2px 8px', borderRadius: 10, fontSize: 12, fontWeight: 600 }}>
                      {r.isActive ? 'Đang hoạt động' : 'Đã vô hiệu hoá'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 12px' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => openEdit(r)} style={{ background: '#eff6ff', color: '#2563eb', border: 'none', padding: '5px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>Sửa</button>
                      {r.isActive && (
                        <button onClick={() => handleDeactivate(r.id)} style={{ background: '#fee2e2', color: '#dc2626', border: 'none', padding: '5px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>Vô hiệu hoá</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {rooms.length === 0 && (
                <tr><td colSpan={6} style={{ padding: 24, textAlign: 'center', color: '#94a3b8' }}>Chưa có phòng nào</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ margin: '0 0 20px', fontSize: 20, fontWeight: 700 }}>{editingId ? 'Chỉnh sửa phòng' : 'Thêm phòng mới'}</h2>
            {error && <div style={{ background: '#fee2e2', color: '#dc2626', padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 14 }}>{error}</div>}
            <form onSubmit={handleSave}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Tên phòng *</label>
                <input type="text" value={form.name} required onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="VD: Phòng khám tổng quát A"
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 7, border: '1px solid #d1d5db', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12, marginBottom: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Loại phòng *</label>
                  <select value={form.roomType} onChange={e => setForm(p => ({ ...p, roomType: e.target.value }))} required
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 7, border: '1px solid #d1d5db', fontSize: 13, outline: 'none' }}>
                    <option value="DOCTOR">Bác sĩ (khám/phẫu thuật)</option>
                    <option value="NURSE">Điều dưỡng (chăm sóc & phục hồi)</option>
                    <option value="LAB">Xét nghiệm / chẩn đoán hình ảnh</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Sức chứa</label>
                  <input type="number" min="1" value={form.capacity} onChange={e => setForm(p => ({ ...p, capacity: Number(e.target.value) }))}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 7, border: '1px solid #d1d5db', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
                </div>
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Dịch vụ / loại xét nghiệm phòng phục vụ *</label>
                <div style={{ maxHeight: 220, overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: 8, padding: 10 }}>
                  {services.map(s => (
                    <label key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', fontSize: 13, cursor: 'pointer' }}>
                      <input type="checkbox" checked={form.serviceIds.includes(s.id)} onChange={() => toggleService(s.id)} />
                      {s.serviceName}
                    </label>
                  ))}
                  {services.length === 0 && <div style={{ color: '#94a3b8', fontSize: 13 }}>Chưa có dịch vụ nào</div>}
                </div>
              </div>
              <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="checkbox" id="isActiveRoom" checked={form.isActive} onChange={e => setForm(p => ({ ...p, isActive: e.target.checked }))} />
                <label htmlFor="isActiveRoom" style={{ fontSize: 13, fontWeight: 600 }}>Đang hoạt động</label>
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <button type="button" onClick={() => setModal(false)} style={{ flex: 1, background: '#f1f5f9', border: 'none', padding: '11px', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}>Huỷ</button>
                <button type="submit" disabled={saving} style={{ flex: 2, background: saving ? '#93c5fd' : '#2563eb', color: '#fff', border: 'none', padding: '11px', borderRadius: 8, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer' }}>
                  {saving ? 'Đang lưu...' : (editingId ? 'Cập nhật' : 'Tạo phòng')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
