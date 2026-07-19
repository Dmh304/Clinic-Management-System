// UC-54: Quản lý duyệt bảng lương.
import { useEffect, useState } from 'react'
import { payrollService } from '../../services/payrollService'

const th = { textAlign: 'left', padding: 8, borderBottom: '2px solid #e2e8f0', background: '#f8fafc', fontSize: 13 }
const td = { padding: 6, borderBottom: '1px solid #e2e8f0', fontSize: 13 }
const vnd = (v) => (v == null ? '0' : Number(v).toLocaleString('vi-VN'))
const numInput = { width: 100, textAlign: 'right' }

export default function PayrollPage() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [periods, setPeriods] = useState([])
  const [period, setPeriod] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const loadPeriods = async () => {
    try {
      const res = await payrollService.listPeriods()
      setPeriods(res.data || [])
    } catch { /* ignore */ }
  }
  useEffect(() => { loadPeriods() }, [])

  const openPeriod = async (id) => {
    setLoading(true); setError('')
    try {
      const res = await payrollService.getPeriod(id)
      setPeriod(res.data)
    } catch (e) { setError(e?.response?.data?.message || 'Không tải được kỳ lương') }
    finally { setLoading(false) }
  }

  const generate = async () => {
    setLoading(true); setError('')
    try {
      const res = await payrollService.generate(year, month)
      setPeriod(res.data)
      await loadPeriods()
    } catch (e) { setError(e?.response?.data?.message || 'Không tạo được bảng lương') }
    finally { setLoading(false) }
  }

  const approved = period?.status === 'APPROVED'

  const editItem = (idx, field, value) => {
    setPeriod((p) => {
      const items = p.items.map((it, i) => i === idx ? { ...it, [field]: value } : it)
      return { ...p, items }
    })
  }

  const saveItem = async (item) => {
    try {
      const res = await payrollService.updateItem(item.id, {
        baseSalary: Number(item.baseSalary) || 0,
        performanceBonus: Number(item.performanceBonus) || 0,
        deduction: Number(item.deduction) || 0,
        note: item.note || null,
      })
      setPeriod((p) => ({ ...p, items: p.items.map((it) => it.id === item.id ? res.data : it) }))
    } catch (e) { setError(e?.response?.data?.message || 'Không lưu được dòng lương') }
  }

  const approve = async () => {
    if (!window.confirm('Duyệt bảng lương này? Sau khi duyệt sẽ không thể chỉnh sửa.')) return
    setLoading(true); setError('')
    try {
      const res = await payrollService.approve(period.id)
      setPeriod(res.data)
      await loadPeriods()
    } catch (e) { setError(e?.response?.data?.message || 'Không duyệt được bảng lương') }
    finally { setLoading(false) }
  }

  return (
    <div style={{ padding: 24 }}>
      <h2>Bảng lương</h2>
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', marginBottom: 16 }}>
        <label>Năm<br /><input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} style={{ width: 90 }} /></label>
        <label>Tháng<br /><input type="number" min={1} max={12} value={month} onChange={(e) => setMonth(Number(e.target.value))} style={{ width: 70 }} /></label>
        <button onClick={generate} disabled={loading} style={{ padding: '6px 16px' }}>Tạo / Soạn lại bảng lương</button>
      </div>
      {error && <div style={{ color: '#dc2626', marginBottom: 12 }}>{error}</div>}

      {periods.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <strong>Các kỳ đã tạo: </strong>
          {periods.map((p) => (
            <button key={p.id} onClick={() => openPeriod(p.id)}
              style={{ margin: 4, padding: '4px 10px', background: p.status === 'APPROVED' ? '#dcfce7' : '#eef2ff' }}>
              {p.month}/{p.year} · {p.status}
            </button>
          ))}
        </div>
      )}

      {period && (
        <div>
          <h3>Kỳ {period.month}/{period.year} — {period.status}
            {!approved && (
              <button onClick={approve} disabled={loading} style={{ marginLeft: 16, padding: '6px 16px', background: '#10b981', color: '#fff', border: 'none', borderRadius: 6 }}>
                Duyệt bảng lương
              </button>
            )}
          </h3>
          <table style={{ borderCollapse: 'collapse', width: '100%' }}>
            <thead>
              <tr>
                <th style={th}>Nhân viên</th><th style={th}>Vai trò</th>
                <th style={{ ...th, textAlign: 'right' }}>Hoạt động</th>
                <th style={{ ...th, textAlign: 'right' }}>Lương CB</th>
                <th style={{ ...th, textAlign: 'right' }}>Thưởng</th>
                <th style={{ ...th, textAlign: 'right' }}>Khấu trừ</th>
                <th style={{ ...th, textAlign: 'right' }}>Thực nhận</th>
                <th style={th}>Ghi chú</th>
                <th style={th}></th>
              </tr>
            </thead>
            <tbody>
              {(period.items || []).map((it, idx) => (
                <tr key={it.id}>
                  <td style={td}>{it.staffName}</td>
                  <td style={td}>{it.role || '—'}</td>
                  <td style={{ ...td, textAlign: 'right' }}>{it.activityCount}</td>
                  <td style={{ ...td, textAlign: 'right' }}>
                    {approved ? vnd(it.baseSalary) : <input style={numInput} type="number" value={it.baseSalary} onChange={(e) => editItem(idx, 'baseSalary', e.target.value)} />}
                  </td>
                  <td style={{ ...td, textAlign: 'right' }}>
                    {approved ? vnd(it.performanceBonus) : <input style={numInput} type="number" value={it.performanceBonus} onChange={(e) => editItem(idx, 'performanceBonus', e.target.value)} />}
                  </td>
                  <td style={{ ...td, textAlign: 'right' }}>
                    {approved ? vnd(it.deduction) : <input style={numInput} type="number" value={it.deduction} onChange={(e) => editItem(idx, 'deduction', e.target.value)} />}
                  </td>
                  <td style={{ ...td, textAlign: 'right', fontWeight: 700 }}>{vnd(it.netPay)}</td>
                  <td style={td}>
                    {approved ? (it.note || '') : <input style={{ width: 140 }} value={it.note || ''} onChange={(e) => editItem(idx, 'note', e.target.value)} />}
                  </td>
                  <td style={td}>
                    {!approved && <button onClick={() => saveItem(it)}>Lưu</button>}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td style={{ ...td, fontWeight: 700 }} colSpan={6}>Tổng thực nhận</td>
                <td style={{ ...td, textAlign: 'right', fontWeight: 700 }}>{vnd(period.totalNetPay)}</td>
                <td style={td} colSpan={2}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )
}
