import { useEffect, useState } from 'react'
import { serviceService } from '../../services/serviceService'

const INITIAL_FORM = {
  serviceName: '', description: '', price: '', priceLabel: '', sessionsIncluded: '', validityDays: '',
  durationMinutes: '', badge: '', thumbnailUrl: '', isActive: true, displayOrder: 0,
}

export default function ManageServicePackagesPage() {
  const [packages, setPackages] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null) // null | 'create' | 'edit'
  const [form, setForm] = useState(INITIAL_FORM)
  const [editingId, setEditingId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { fetchPackages() }, [])

  const fetchPackages = async () => {
    setLoading(true)
    try {
      const res = await serviceService.getAllServices()
      setPackages(res.data || [])
    } finally {
      setLoading(false)
    }
  }

  const openCreate = () => { setForm(INITIAL_FORM); setEditingId(null); setModal('edit'); setError('') }
  const openEdit = (pkg) => {
    setForm({ ...INITIAL_FORM, ...pkg, price: pkg.price || '', sessionsIncluded: pkg.sessionsIncluded || '', validityDays: pkg.validityDays || '' })
    setEditingId(pkg.id)
    setModal('edit')
    setError('')
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!form.serviceName || !form.sessionsIncluded) return setError('Tên và số buổi là bắt buộc')
    setSaving(true)
    setError('')
    try {
      if (editingId) {
        await serviceService.updatePackage(editingId, form)
      } else {
        await serviceService.createPackage(form)
      }
      setModal(null)
      fetchPackages()
    } catch (err) {
      setError(err.response?.data?.message || 'Lỗi khi lưu')
    } finally {
      setSaving(false)
    }
  }

  const handleToggle = async (id) => {
    try {
      await serviceService.toggleActive(id)
      fetchPackages()
    } catch (err) {
      alert(err.response?.data?.message || 'Lỗi')
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Ẩn gói dịch vụ này?')) return
    try {
      await serviceService.deletePackage(id)
      fetchPackages()
    } catch (err) {
      alert(err.response?.data?.message || 'Lỗi')
    }
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>Đang tải...</div>

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', padding: '32px 16px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1e293b', margin: 0 }}>Quản lý gói dịch vụ</h1>
            <p style={{ color: '#64748b', margin: '4px 0 0', fontSize: 14 }}>Tạo và cập nhật các gói chăm sóc mắt</p>
          </div>
          <button onClick={openCreate} style={{ background: '#2563eb', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
            + Tạo gói mới
          </button>
        </div>

        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                {['Tên gói', 'Giá', 'Số buổi', 'Hiệu lực', 'Trạng thái', 'Thao tác'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {packages.map((pkg, i) => (
                <tr key={pkg.id} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ fontWeight: 600, color: '#1e293b' }}>{pkg.serviceName}</div>
                    {pkg.description && <div style={{ fontSize: 12, color: '#64748b', marginTop: 2, maxWidth: 200 }}>{pkg.description.slice(0, 60)}...</div>}
                  </td>
                  <td style={{ padding: '12px 14px', fontWeight: 600, color: '#2563eb' }}>
                    {pkg.price ? Number(pkg.price).toLocaleString('vi-VN') + '₫' : '—'}
                  </td>
                  <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                    <span style={{ background: '#dbeafe', color: '#2563eb', padding: '2px 10px', borderRadius: 10, fontWeight: 700 }}>
                      {pkg.sessionsIncluded || '—'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 14px', fontSize: 13, color: '#64748b' }}>
                    {pkg.validityDays ? `${pkg.validityDays} ngày` : 'Không giới hạn'}
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <span style={{ background: pkg.isActive ? '#dcfce7' : '#f3f4f6', color: pkg.isActive ? '#16a34a' : '#6b7280', padding: '2px 8px', borderRadius: 10, fontSize: 12, fontWeight: 600 }}>
                      {pkg.isActive ? 'Đang bán' : 'Đã ẩn'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => openEdit(pkg)} style={{ background: '#eff6ff', color: '#2563eb', border: 'none', padding: '5px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>Sửa</button>
                      <button onClick={() => handleToggle(pkg.id)} style={{ background: pkg.isActive ? '#fef3c7' : '#dcfce7', color: pkg.isActive ? '#d97706' : '#16a34a', border: 'none', padding: '5px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                        {pkg.isActive ? 'Ẩn' : 'Hiện'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modal === 'edit' && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ margin: '0 0 20px', fontSize: 20, fontWeight: 700 }}>{editingId ? 'Cập nhật gói dịch vụ' : 'Tạo gói dịch vụ mới'}</h2>
            {error && <div style={{ background: '#fee2e2', color: '#dc2626', padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 14 }}>{error}</div>}
            <form onSubmit={handleSave}>
              {[
                { key: 'serviceName', label: 'Tên gói *', type: 'text', required: true },
                { key: 'description', label: 'Mô tả', type: 'textarea' },
                { key: 'price', label: 'Giá (VNĐ)', type: 'number' },
                { key: 'priceLabel', label: 'Nhãn giá (vd: Giá chỉ từ)', type: 'text' },
                { key: 'sessionsIncluded', label: 'Số buổi *', type: 'number', required: true, min: 1 },
                { key: 'validityDays', label: 'Hiệu lực (ngày)', type: 'number', min: 1 },
                { key: 'durationMinutes', label: 'Thời lượng (phút)', type: 'number' },
                { key: 'badge', label: 'Nhãn nổi bật (vd: Phổ biến)', type: 'text' },
                { key: 'thumbnailUrl', label: 'URL ảnh đại diện', type: 'text' },
                { key: 'displayOrder', label: 'Thứ tự hiển thị', type: 'number' },
              ].map(field => (
                <div key={field.key} style={{ marginBottom: 14 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4 }}>{field.label}</label>
                  {field.type === 'textarea' ? (
                    <textarea value={form[field.key] || ''} onChange={e => setForm(f => ({ ...f, [field.key]: e.target.value }))} rows={2}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: 7, border: '1px solid #d1d5db', fontSize: 13, outline: 'none', resize: 'vertical', boxSizing: 'border-box' }} />
                  ) : (
                    <input type={field.type} value={form[field.key] ?? ''} onChange={e => setForm(f => ({ ...f, [field.key]: e.target.value }))}
                      required={field.required} min={field.min}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: 7, border: '1px solid #d1d5db', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
                  )}
                </div>
              ))}
              <div style={{ marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="checkbox" id="isActive" checked={form.isActive} onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))} />
                <label htmlFor="isActive" style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>Hiển thị (đang bán)</label>
              </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
                <button type="button" onClick={() => setModal(null)} style={{ flex: 1, background: '#f1f5f9', border: 'none', padding: '11px', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}>Huỷ</button>
                <button type="submit" disabled={saving} style={{ flex: 2, background: saving ? '#93c5fd' : '#2563eb', color: '#fff', border: 'none', padding: '11px', borderRadius: 8, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer' }}>
                  {saving ? 'Đang lưu...' : (editingId ? 'Cập nhật' : 'Tạo gói')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
