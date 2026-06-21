import { useEffect, useState } from 'react'
import { discountService } from '../../services/discountService'

const INITIAL_FORM = {
  name: '', description: '', type: 'PERCENTAGE', value: '', voucherCode: '',
  validFrom: '', validTo: '', minPurchaseAmount: '', maxUsageCount: '', isActive: true,
}

const TYPE_LABEL = { PERCENTAGE: 'Giảm %', FIXED_AMOUNT: 'Giảm tiền', VOUCHER: 'Mã voucher' }

export default function ManageDiscountCampaignsPage() {
  const [campaigns, setCampaigns] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(INITIAL_FORM)
  const [editingId, setEditingId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { fetchCampaigns() }, [])

  const fetchCampaigns = async () => {
    setLoading(true)
    try {
      const res = await discountService.getAll()
      setCampaigns(res.data.data || [])
    } finally {
      setLoading(false)
    }
  }

  const openCreate = () => { setForm(INITIAL_FORM); setEditingId(null); setModal(true); setError('') }
  const openEdit = (c) => { setForm({ ...INITIAL_FORM, ...c }); setEditingId(c.id); setModal(true); setError('') }

  const handleSave = async (e) => {
    e.preventDefault()
    if (form.type === 'VOUCHER' && !form.voucherCode) return setError('Vui lòng nhập mã voucher')
    setSaving(true)
    setError('')
    try {
      if (editingId) {
        await discountService.update(editingId, form)
      } else {
        await discountService.create(form)
      }
      setModal(false)
      fetchCampaigns()
    } catch (err) {
      setError(err.response?.data?.message || 'Lỗi khi lưu')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Vô hiệu hoá chương trình này?')) return
    try { await discountService.delete(id); fetchCampaigns() } catch (err) { alert(err.response?.data?.message || 'Lỗi') }
  }

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN') : '—'

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>Đang tải...</div>

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', padding: '32px 16px' }}>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1e293b', margin: 0 }}>Chương trình giảm giá</h1>
            <p style={{ color: '#64748b', margin: '4px 0 0', fontSize: 14 }}>Tạo và quản lý các chương trình khuyến mãi</p>
          </div>
          <button onClick={openCreate} style={{ background: '#2563eb', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
            + Tạo chương trình
          </button>
        </div>

        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                {['Tên chương trình', 'Loại', 'Giá trị', 'Hiệu lực', 'Đã dùng', 'Trạng thái', 'Thao tác'].map(h => (
                  <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c, i) => {
                const today = new Date()
                const from = new Date(c.validFrom); const to = new Date(c.validTo)
                const active = c.isActive && today >= from && today <= to
                return (
                  <tr key={c.id} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                    <td style={{ padding: '12px 12px' }}>
                      <div style={{ fontWeight: 600, color: '#1e293b' }}>{c.name}</div>
                      {c.voucherCode && <div style={{ fontSize: 12, color: '#2563eb', marginTop: 2 }}>Mã: {c.voucherCode}</div>}
                    </td>
                    <td style={{ padding: '12px 12px' }}>
                      <span style={{ background: '#eff6ff', color: '#2563eb', padding: '2px 8px', borderRadius: 8, fontSize: 12, fontWeight: 600 }}>{TYPE_LABEL[c.type]}</span>
                    </td>
                    <td style={{ padding: '12px 12px', fontWeight: 700, color: '#dc2626' }}>
                      {c.type === 'PERCENTAGE' ? `${c.value}%` : `${Number(c.value).toLocaleString('vi-VN')}₫`}
                    </td>
                    <td style={{ padding: '12px 12px', fontSize: 13, color: '#64748b' }}>
                      {fmtDate(c.validFrom)} → {fmtDate(c.validTo)}
                    </td>
                    <td style={{ padding: '12px 12px', fontSize: 13 }}>
                      {c.usedCount}{c.maxUsageCount ? `/${c.maxUsageCount}` : ''}
                    </td>
                    <td style={{ padding: '12px 12px' }}>
                      <span style={{ background: active ? '#dcfce7' : '#f3f4f6', color: active ? '#16a34a' : '#6b7280', padding: '2px 8px', borderRadius: 10, fontSize: 12, fontWeight: 600 }}>
                        {active ? 'Đang hoạt động' : 'Không hoạt động'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 12px' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => openEdit(c)} style={{ background: '#eff6ff', color: '#2563eb', border: 'none', padding: '5px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>Sửa</button>
                        <button onClick={() => handleDelete(c.id)} style={{ background: '#fee2e2', color: '#dc2626', border: 'none', padding: '5px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>Ẩn</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ margin: '0 0 20px', fontSize: 20, fontWeight: 700 }}>{editingId ? 'Chỉnh sửa' : 'Tạo chương trình giảm giá'}</h2>
            {error && <div style={{ background: '#fee2e2', color: '#dc2626', padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 14 }}>{error}</div>}
            <form onSubmit={handleSave}>
              {[
                { key: 'name', label: 'Tên chương trình *', type: 'text', required: true },
                { key: 'description', label: 'Mô tả', type: 'textarea' },
              ].map(f => (
                <div key={f.key} style={{ marginBottom: 14 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4 }}>{f.label}</label>
                  {f.type === 'textarea'
                    ? <textarea value={form[f.key] || ''} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} rows={2} style={{ width: '100%', padding: '8px 10px', borderRadius: 7, border: '1px solid #d1d5db', fontSize: 13, outline: 'none', resize: 'vertical', boxSizing: 'border-box' }} />
                    : <input type="text" value={form[f.key] || ''} required={f.required} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} style={{ width: '100%', padding: '8px 10px', borderRadius: 7, border: '1px solid #d1d5db', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
                  }
                </div>
              ))}
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Loại giảm giá *</label>
                <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))} required
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 7, border: '1px solid #d1d5db', fontSize: 13, outline: 'none' }}>
                  <option value="PERCENTAGE">Giảm theo %</option>
                  <option value="FIXED_AMOUNT">Giảm tiền cố định</option>
                  <option value="VOUCHER">Mã voucher</option>
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Giá trị giảm *</label>
                  <input type="number" value={form.value} onChange={e => setForm(p => ({ ...p, value: e.target.value }))} required min="0.01" step="0.01" placeholder={form.type === 'PERCENTAGE' ? '10 (%)' : '50000 (đ)'}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 7, border: '1px solid #d1d5db', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
                </div>
                {(form.type === 'VOUCHER') && (
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Mã voucher *</label>
                    <input type="text" value={form.voucherCode || ''} onChange={e => setForm(p => ({ ...p, voucherCode: e.target.value }))} placeholder="VD: SUMMER2025"
                      style={{ width: '100%', padding: '8px 10px', borderRadius: 7, border: '1px solid #d1d5db', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
                  </div>
                )}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Từ ngày *</label>
                  <input type="date" value={form.validFrom || ''} onChange={e => setForm(p => ({ ...p, validFrom: e.target.value }))} required
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 7, border: '1px solid #d1d5db', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Đến ngày *</label>
                  <input type="date" value={form.validTo || ''} onChange={e => setForm(p => ({ ...p, validTo: e.target.value }))} required
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 7, border: '1px solid #d1d5db', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Đơn hàng tối thiểu (đ)</label>
                  <input type="number" value={form.minPurchaseAmount || ''} onChange={e => setForm(p => ({ ...p, minPurchaseAmount: e.target.value }))} min="0"
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 7, border: '1px solid #d1d5db', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Giới hạn lượt dùng</label>
                  <input type="number" value={form.maxUsageCount || ''} onChange={e => setForm(p => ({ ...p, maxUsageCount: e.target.value }))} min="1" placeholder="Để trống = không giới hạn"
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 7, border: '1px solid #d1d5db', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
                </div>
              </div>
              <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="checkbox" id="isActiveDC" checked={form.isActive} onChange={e => setForm(p => ({ ...p, isActive: e.target.checked }))} />
                <label htmlFor="isActiveDC" style={{ fontSize: 13, fontWeight: 600 }}>Kích hoạt ngay</label>
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <button type="button" onClick={() => setModal(false)} style={{ flex: 1, background: '#f1f5f9', border: 'none', padding: '11px', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}>Huỷ</button>
                <button type="submit" disabled={saving} style={{ flex: 2, background: saving ? '#93c5fd' : '#2563eb', color: '#fff', border: 'none', padding: '11px', borderRadius: 8, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer' }}>
                  {saving ? 'Đang lưu...' : (editingId ? 'Cập nhật' : 'Tạo')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
