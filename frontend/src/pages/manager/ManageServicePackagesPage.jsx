import { useEffect, useRef, useState } from 'react'
import { serviceService } from '../../services/serviceService'

const INITIAL_FORM = {
  serviceName: '', description: '', price: '', priceLabel: '', sessionsIncluded: '', validityDays: '',
  durationMinutes: '', badge: '', thumbnailUrl: '', content: '', serviceType: 'CARE', isActive: true, displayOrder: '', isPopular: false,
}

export default function ManageServicePackagesPage() {
  const [packages, setPackages] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null) // null | 'create' | 'edit'
  const [form, setForm] = useState(INITIAL_FORM)
  const [editingId, setEditingId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({}) // các field bị lỗi để tô viền đỏ
  const [statusFilter, setStatusFilter] = useState('all') // all | active | hidden
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef(null)

  const fetchPackages = async () => {
    setLoading(true)
    try {
      // Lấy tất cả gói (kể cả đã ẩn) để manager có thể khôi phục gói đã ẩn
      const res = await serviceService.getAllPackages()
      setPackages(res.data || [])
    } finally {
      setLoading(false)
    }
  }

  // Tải danh sách khi mở trang (mẫu fetch-on-mount tiêu chuẩn)
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchPackages() }, [])

  const openCreate = () => { setForm(INITIAL_FORM); setEditingId(null); setModal('edit'); setError(''); setFieldErrors({}) }
  const openEdit = (pkg) => {
    setForm({ 
      ...INITIAL_FORM, 
      ...pkg, 
      price: pkg.price || '', 
      sessionsIncluded: pkg.sessionsIncluded || '', 
      validityDays: pkg.validityDays || '',
      displayOrder: pkg.displayOrder ?? '',
      isPopular: pkg.isPopular ?? false
    })
    setEditingId(pkg.id)
    setModal('edit')
    setError('')
    setFieldErrors({})
  }

  // Cập nhật form đồng thời xoá viền đỏ của field khi user bắt đầu sửa
  const handleFieldChange = (key, value) => {
    setForm(f => ({ ...f, [key]: value }))
    if (fieldErrors[key]) setFieldErrors(fe => { const next = { ...fe }; delete next[key]; return next })
  }

  // Upload ảnh đại diện (kéo-thả hoặc chọn file) -> lưu URL trả về vào form.thumbnailUrl
  const handleImageUpload = async (file) => {
    if (!file) return
    if (!file.type.startsWith('image/')) { setError('File phải là ảnh'); return }
    setUploading(true)
    setError('')
    try {
      const res = await serviceService.uploadImage(file)
      handleFieldChange('thumbnailUrl', res.data?.url || '')
    } catch (err) {
      setError(err.response?.data?.message || 'Lỗi khi tải ảnh')
    } finally {
      setUploading(false)
    }
  }

  const handleSave = async (e) => {
    e.preventDefault()
    // Validate phía client: chặn lưu khi dữ liệu sai + tô viền đỏ field lỗi (E-1)
    const errs = {}
    if (!form.serviceName) errs.serviceName = true
    if (!form.description) errs.description = true
    if (!(Number(form.price) > 0)) errs.price = true
    if (!(Number(form.durationMinutes) >= 1)) errs.durationMinutes = true
    if (!(Number(form.sessionsIncluded) >= 1)) errs.sessionsIncluded = true
    if (!form.thumbnailUrl) errs.thumbnailUrl = true
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs)
      if (errs.serviceName) return setError('Tên gói là bắt buộc')
      if (errs.description) return setError('Vui lòng nhập mô tả')
      if (errs.price) return setError('Giá phải lớn hơn 0')
      if (errs.durationMinutes) return setError('Thời lượng phải lớn hơn 0')
      if (errs.sessionsIncluded) return setError('Số buổi phải ít nhất 1')
      return setError('Vui lòng thêm ảnh đại diện')
    }
    setFieldErrors({})
    setSaving(true)
    setError('')
    const payload = {
      ...form,
      displayOrder: (form.displayOrder === '' || form.displayOrder === null || form.displayOrder === undefined) ? null : Number(form.displayOrder)
    }
    try {
      if (editingId) {
        await serviceService.updatePackage(editingId, payload)
      } else {
        await serviceService.createPackage(payload)
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

  // Lọc theo trạng thái bán
  const filtered = packages.filter(p =>
    statusFilter === 'all' ? true : statusFilter === 'active' ? p.isActive : !p.isActive
  )

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

        {/* Lọc trạng thái — để xem và khôi phục các gói đã ẩn */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center' }}>
          <span style={{ fontSize: 13, color: '#64748b' }}>Lọc:</span>
          {[['all', 'Tất cả'], ['active', 'Đang bán'], ['hidden', 'Đã ẩn']].map(([v, label]) => (
            <button key={v} onClick={() => setStatusFilter(v)}
              style={{
                border: '1px solid', borderColor: statusFilter === v ? '#2563eb' : '#e2e8f0',
                background: statusFilter === v ? '#eff6ff' : '#fff',
                color: statusFilter === v ? '#2563eb' : '#64748b',
                padding: '5px 12px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
              }}>{label}</button>
          ))}
        </div>

        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                {['Tên gói', 'Loại', 'Giá', 'Thứ tự', 'Nổi bật', 'Số buổi', 'Hiệu lực', 'Người đăng ký', 'Trạng thái', 'Thao tác'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={10} style={{ padding: 28, textAlign: 'center', color: '#94a3b8', fontSize: 14 }}>Không có gói nào</td></tr>
              )}
              {filtered.map((pkg, i) => (
                <tr key={pkg.id} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ fontWeight: 600, color: '#1e293b' }}>{pkg.serviceName}</div>
                    {pkg.description && <div style={{ fontSize: 12, color: '#64748b', marginTop: 2, maxWidth: 200 }}>{pkg.description.slice(0, 60)}...</div>}
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <span style={{
                      fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 999,
                      background: pkg.serviceType === 'CLINICAL' ? '#e0f2fe' : '#dcfce7',
                      color: pkg.serviceType === 'CLINICAL' ? '#0369a1' : '#15803d',
                    }}>
                      {pkg.serviceType === 'CLINICAL' ? 'Khám lâm sàng' : 'Chăm sóc'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 14px', fontWeight: 600, color: '#2563eb' }}>
                    {pkg.price ? Number(pkg.price).toLocaleString('vi-VN') + '₫' : '—'}
                  </td>
                  <td style={{ padding: '12px 14px', fontWeight: 600, color: '#475569' }}>
                    {pkg.displayOrder ?? '—'}
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    {pkg.isPopular ? (
                      <span style={{ background: '#fef3c7', color: '#d97706', padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 700 }}>
                        ★ Nổi bật
                      </span>
                    ) : (
                      <span style={{ color: '#94a3b8' }}>—</span>
                    )}
                  </td>
                  <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                    <span style={{ background: '#dbeafe', color: '#2563eb', padding: '2px 10px', borderRadius: 10, fontWeight: 700 }}>
                      {pkg.sessionsIncluded || '—'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 14px', fontSize: 13, color: '#64748b' }}>
                    {pkg.validityDays ? `${pkg.validityDays} ngày` : 'Không giới hạn'}
                  </td>
                  <td style={{ padding: '12px 14px', textAlign: 'center', fontSize: 13, fontWeight: 600, color: '#475569' }}>
                    {pkg.subscriberCount ?? 0}
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <span style={{ background: pkg.isActive ? '#dcfce7' : '#f3f4f6', color: pkg.isActive ? '#16a34a' : '#6b7280', padding: '2px 8px', borderRadius: 10, fontSize: 12, fontWeight: 600 }}>
                      {pkg.isActive ? 'Đang bán' : 'Đã ẩn'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => openEdit(pkg)} style={{ background: '#eff6ff', color: '#2563eb', border: 'none', padding: '5px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>Sửa</button>
                      <button onClick={() => handleToggle(pkg.id)}
                        title={pkg.isActive ? 'Ngừng bán (ẩn khỏi trang dịch vụ)' : 'Bán lại (hiện trên trang dịch vụ)'}
                        style={{ background: pkg.isActive ? '#fef3c7' : '#dcfce7', color: pkg.isActive ? '#d97706' : '#16a34a', border: 'none', padding: '5px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                        {pkg.isActive ? 'Ngừng bán' : 'Bán lại'}
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
            <h2 style={{ margin: '0 0 20px', fontSize: 20, fontWeight: 700, color: '#1e293b' }}>{editingId ? 'Cập nhật gói dịch vụ' : 'Tạo gói dịch vụ mới'}</h2>
            {error && <div style={{ background: '#fee2e2', color: '#dc2626', padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 14 }}>{error}</div>}
            <form onSubmit={handleSave}>
              {/* Loại dịch vụ: quyết định luồng khách hàng dùng (đặt lịch khám hoặc đăng ký tư vấn) */}
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Loại dịch vụ *</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {[['CLINICAL', 'Khám lâm sàng (đặt lịch hẹn)'], ['CARE', 'Gói chăm sóc (đăng ký tư vấn)']].map(([v, label]) => (
                    <button key={v} type="button" onClick={() => handleFieldChange('serviceType', v)}
                      style={{
                        flex: 1, padding: '9px 10px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                        border: `1.5px solid ${form.serviceType === v ? '#2563eb' : '#d1d5db'}`,
                        background: form.serviceType === v ? '#eff6ff' : '#fff',
                        color: form.serviceType === v ? '#2563eb' : '#64748b',
                      }}>{label}</button>
                  ))}
                </div>
              </div>
              {[
                { key: 'serviceName', label: 'Tên gói *', type: 'text', required: true },
                { key: 'description', label: 'Mô tả *', type: 'textarea', required: true },
                { key: 'price', label: 'Giá (VNĐ) *', type: 'number', required: true, min: 1 },
                { key: 'priceLabel', label: 'Nhãn giá (vd: Giá chỉ từ)', type: 'text' },
                { key: 'sessionsIncluded', label: 'Số buổi *', type: 'number', required: true, min: 1 },
                { key: 'validityDays', label: 'Hiệu lực (ngày)', type: 'number', min: 1 },
                { key: 'durationMinutes', label: 'Thời lượng (phút) *', type: 'number', required: true, min: 1 },
                { key: 'badge', label: 'Nhãn nổi bật (vd: Phổ biến)', type: 'text' },
                { key: 'content', label: 'Chi tiết liệu trình (hiển thị khi khách xem chi tiết dịch vụ)', type: 'textarea', rows: 5 },
                { key: 'displayOrder', label: 'Thứ tự hiển thị', type: 'number' },
              ].map(field => (
                <div key={field.key} style={{ marginBottom: 14 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4 }}>{field.label}</label>
                  {field.type === 'textarea' ? (
                    <textarea value={form[field.key] || ''} onChange={e => handleFieldChange(field.key, e.target.value)} rows={field.rows || 2}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: 7, border: `1px solid ${fieldErrors[field.key] ? '#ef4444' : '#d1d5db'}`, fontSize: 13, outline: 'none', resize: 'vertical', boxSizing: 'border-box' }} />
                  ) : (
                    <>
                      <input type={field.type} value={form[field.key] ?? ''} onChange={e => handleFieldChange(field.key, e.target.value)}
                        required={field.required} min={field.min}
                        style={{ width: '100%', padding: '8px 10px', borderRadius: 7, border: `1px solid ${fieldErrors[field.key] ? '#ef4444' : '#d1d5db'}`, fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
                      {field.key === 'displayOrder' && (
                        <span style={{ fontSize: 11, color: '#64748b', marginTop: 4, display: 'block' }}>
                          Để trống để tự động hiển thị ở cuối danh sách.
                        </span>
                      )}
                    </>
                  )}
                </div>
              ))}

              {/* Ảnh đại diện: kéo-thả hoặc bấm chọn, upload lên server và lưu URL */}
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Ảnh đại diện *</label>
                <div
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => { e.preventDefault(); handleImageUpload(e.dataTransfer.files?.[0]) }}
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    border: `2px dashed ${fieldErrors.thumbnailUrl ? '#ef4444' : '#cbd5e1'}`,
                    borderRadius: 10, padding: 16, textAlign: 'center', cursor: 'pointer', background: '#f8fafc',
                  }}>
                  {uploading ? (
                    <div style={{ color: '#2563eb', fontSize: 13, fontWeight: 600 }}>Đang tải ảnh...</div>
                  ) : form.thumbnailUrl ? (
                    <img src={form.thumbnailUrl} alt="Ảnh đại diện" style={{ maxHeight: 120, maxWidth: '100%', borderRadius: 8 }} />
                  ) : (
                    <div style={{ color: '#94a3b8', fontSize: 13 }}>Kéo &amp; thả ảnh vào đây, hoặc bấm để chọn</div>
                  )}
                  <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }}
                    onChange={e => handleImageUpload(e.target.files?.[0])} />
                </div>
                {form.thumbnailUrl && !uploading && (
                  <button type="button" onClick={() => handleFieldChange('thumbnailUrl', '')}
                    style={{ marginTop: 6, background: 'none', border: 'none', color: '#ef4444', fontSize: 12, cursor: 'pointer', padding: 0 }}>
                    Xoá ảnh
                  </button>
                )}
              </div>

              <div style={{ marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="checkbox" id="isPopular" checked={form.isPopular || false} onChange={e => setForm(f => ({ ...f, isPopular: e.target.checked }))} />
                <label htmlFor="isPopular" style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>Đánh dấu là gói dịch vụ Nổi bật/Phổ biến (luôn đẩy lên đầu trang)</label>
              </div>
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
