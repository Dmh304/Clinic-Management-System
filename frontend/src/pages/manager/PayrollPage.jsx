/**
 * @author  ThangNB - HE201024
 * @created 2026-07-19
 * @updated 2026-07-20
 *
 * Payroll approval screen for the Clinic Manager
 * (UC-54 Approve Payroll): generate a monthly draft, adjust individual lines,
 * then approve the period.
 *
 * Business rules surfaced here:
 *  - BR-17 — only a Clinic Manager reaches this screen; the backend re-checks
 *  - BR-09 — once APPROVED every line is locked, so the inputs and the save
 *    action are disabled and the approve button disappears
 */
import { useEffect, useState } from 'react'
import { FiRefreshCw, FiDownload, FiCheckCircle, FiUsers, FiAlertTriangle, FiSearch, FiClock, FiSave } from 'react-icons/fi'
import { FaWallet } from 'react-icons/fa'
import { payrollService } from '../../services/payrollService'
import { pageTitle } from './managerTypography'

const C = { primary: '#7c3aed', secondary: '#00687a', success: '#059669', error: '#ba1a1a', warn: '#d97706', warnInk: '#92400e', ink: '#121c2a', muted: '#4a4455', border: '#e5e7eb', track: '#f1f5f9' }
const vnd = (v) => Number(v || 0).toLocaleString('vi-VN')
const initials = (name) => (name || '').replace(/^(BS|ĐD|KTV)\.?\s*/i, '').split(' ').filter(Boolean).slice(-2).map((w) => w[0]).join('').toUpperCase()

const card = { background: '#fff', border: `1px solid ${C.border}`, borderRadius: 12, boxShadow: '0 2px 4px rgba(0,0,0,0.03)' }

/** Fallback role label per staffType, used only when the line carries no role
 *  text of its own (specialty for doctors, position for staff). */
const STAFF_TYPE_LABEL = { DOCTOR: 'Bác sĩ', LAB_TECHNICIAN: 'Kỹ thuật viên xét nghiệm', STAFF: 'Nhân viên' }

/**
 * Derives the review badge for one payroll line.
 *
 * Validate: UC-54 E-2 — a line with no base salary is flagged "needs review"
 * so missing data is visible before the Manager approves the period.
 *
 * @param {Object} it       the payroll line
 * @param {boolean} approved whether the period is already approved
 * @returns {{label:string, bg:string, c:string, note:?string}} badge spec
 */
function rowStatus(it, approved) {
  if (approved) return { label: 'Đã duyệt', bg: '#e2e8f0', c: '#334155', note: null }
  if (!Number(it.baseSalary)) return { label: 'Cần kiểm tra', bg: '#fef3c7', c: C.warnInk, note: it.note || 'Thiếu lương cơ bản' }
  if (it.note) return { label: 'Đã điều chỉnh', bg: '#ede9fe', c: C.primary, note: it.note }
  return { label: 'Sẵn sàng', bg: '#d1fae5', c: '#065f46', note: null }
}

function StatCard({ label, value, sub, Icon, iconBg, iconColor, attention }) {
  return (
    <div style={{ ...card, padding: 24, flex: '1 1 240px', minWidth: 240, borderLeft: attention ? `4px solid ${C.warn}` : card.border }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <span style={{ fontSize: 12, letterSpacing: 1, textTransform: 'uppercase', fontWeight: attention ? 700 : 600, color: attention ? C.warnInk : C.muted }}>{label}</span>
        <div style={{ padding: 8, borderRadius: 8, background: iconBg, color: iconColor, display: 'flex' }}><Icon size={20} /></div>
      </div>
      <div style={{ fontSize: 28, fontWeight: 800, color: C.ink }}>{value}</div>
      {sub && <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>{sub}</div>}
    </div>
  )
}

const numInput = { width: 110, textAlign: 'right', border: `1px solid ${C.border}`, borderRadius: 6, padding: '4px 6px', fontSize: 13 }
const th = { padding: '12px 16px', fontSize: 11, letterSpacing: 0.5, textTransform: 'uppercase', fontWeight: 600, color: C.muted, whiteSpace: 'nowrap' }
const td = { padding: '12px 16px', fontSize: 14, borderTop: `1px solid ${C.border}` }

/**
 * Renders the payroll period list, the editable line table and the approve
 * action.
 * @returns {JSX.Element} the payroll screen
 */
export default function PayrollPage() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [periods, setPeriods] = useState([])
  const [period, setPeriod] = useState(null)
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  /** Refreshes the pay-period picker. Failures are ignored — the picker is
   *  secondary to whichever period is already open. */
  const loadPeriods = async () => { try { const r = await payrollService.listPeriods(); setPeriods(r.data || []) } catch { /* ignore */ } }
  useEffect(() => { loadPeriods() }, [])

  /**
   * Opens one pay period with its lines (UC-54 step 3).
   * @param {number} id pay period id
   */
  const openPeriod = async (id) => {
    setLoading(true); setError('')
    try { const r = await payrollService.getPeriod(id); setPeriod(r.data) }
    catch (e) { setError(e?.response?.data?.message || 'Không tải được kỳ lương') } finally { setLoading(false) }
  }
  /**
   * Generates the draft payroll for the selected month (UC-54 step 2).
   *
   * Validate: BR-09 — the backend refuses to regenerate an APPROVED period;
   * that rejection is shown as the error message.
   */
  const generate = async () => {
    setLoading(true); setError('')
    try { const r = await payrollService.generate(year, month); setPeriod(r.data); await loadPeriods() }
    catch (e) { setError(e?.response?.data?.message || 'Không tạo được bảng lương') } finally { setLoading(false) }
  }

  /** BR-09 gate: drives the read-only state of every input on this screen. */
  const approved = period?.status === 'APPROVED'

  /**
   * Updates one field of a line in local state, before it is saved.
   * @param {number} idx   row index
   * @param {string} field field name
   * @param {*} value      new value
   */
  const editItem = (idx, field, value) => setPeriod((p) => ({ ...p, items: p.items.map((it, i) => i === idx ? { ...it, [field]: value } : it) }))

  /**
   * Persists one adjusted payroll line (UC-54 step 3).
   *
   * Empty numeric inputs are coerced to 0 so the server never receives NaN,
   * which would corrupt the net-pay calculation.
   *
   * @param {Object} item the edited line
   *
   * Validate: BR-09 — rejected server-side if the period was approved in the
   * meantime, e.g. by another manager in a second tab.
   */
  const saveItem = async (item) => {
    try {
      const r = await payrollService.updateItem(item.id, {
        baseSalary: Number(item.baseSalary) || 0, performanceBonus: Number(item.performanceBonus) || 0,
        deduction: Number(item.deduction) || 0, note: item.note || null,
      })
      setPeriod((p) => ({ ...p, items: p.items.map((it) => it.id === item.id ? r.data : it) }))
    } catch (e) { setError(e?.response?.data?.message || 'Không lưu được dòng lương') }
  }
  /**
   * Approves the open pay period (UC-54 step 4).
   *
   * Validate: BR-09 — approval is irreversible, so an explicit confirmation is
   * required before the request goes out. BR-17 — the approving manager is
   * taken from the auth token server-side, never sent from here.
   */
  const approve = async () => {
    if (!window.confirm('Phê duyệt bảng lương này? Sau khi duyệt sẽ không thể chỉnh sửa.')) return
    setLoading(true); setError('')
    try { const r = await payrollService.approve(period.id); setPeriod(r.data); await loadPeriods() }
    catch (e) { setError(e?.response?.data?.message || 'Không duyệt được bảng lương') } finally { setLoading(false) }
  }
  /**
   * Exports the open period as CSV for Accounting (UC-54 POST-3 / ALT-2).
   *
   * Built client-side from the loaded rows. A UTF-8 BOM is prepended so Excel
   * decodes Vietnamese names correctly, and every cell is quoted with inner
   * quotes doubled so a name containing a comma cannot shift the columns.
   */
  const exportCsv = () => {
    if (!period) return
    const rows = [['Nhan vien', 'Vai tro', 'Luong co ban', 'Hoat dong', 'Phu cap/Hieu suat', 'Khau tru', 'Tong luong', 'Ghi chu']]
    period.items.forEach((it) => rows.push([it.staffName, it.role || '', it.baseSalary, it.activityCount, it.performanceBonus, it.deduction, it.netPay, it.note || '']))
    const csv = '﻿' + rows.map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\r\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const a = document.createElement('a'); a.href = url; a.download = `bang-luong-${period.month}-${period.year}.csv`; a.click()
    setTimeout(() => URL.revokeObjectURL(url), 60000)
  }

  const items = period?.items || []
  const shown = q ? items.filter((it) => (it.staffName || '').toLowerCase().includes(q.toLowerCase())) : items
  const needsCheck = items.filter((it) => !Number(it.baseSalary)).length
  const totalBonus = items.reduce((s, it) => s + (Number(it.performanceBonus) || 0), 0)
  const totalDeduct = items.reduce((s, it) => s + (Number(it.deduction) || 0), 0)

  const btn = (bg, color, border) => ({ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 18px', borderRadius: 8, border: border || 'none', background: bg, color, cursor: 'pointer', fontWeight: 600, fontSize: 14 })

  return (
    <div style={{ background: '#f8f9ff', color: C.ink }}>
      <div style={{ padding: '24px 32px', display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1 style={pageTitle}>Phê duyệt bảng lương</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4, fontSize: 13, color: C.muted }}>
              <span>Kỳ lương tháng {period ? `${String(period.month).padStart(2, '0')}/${period.year}` : `${String(month).padStart(2, '0')}/${year}`}</span>
              {period && <>
                <span style={{ width: 5, height: 5, borderRadius: 999, background: '#cbd5e1' }} />
                <span style={{ padding: '2px 10px', borderRadius: 999, background: approved ? '#d1fae5' : '#e2e8f0', color: approved ? '#065f46' : C.muted, fontSize: 11, fontWeight: 700, letterSpacing: 1 }}>
                  TRẠNG THÁI: {approved ? 'ĐÃ DUYỆT' : 'NHÁP'}
                </span>
              </>}
            </div>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
            <input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} style={{ width: 84, padding: '9px 10px', borderRadius: 8, border: `1px solid ${C.border}` }} />
            <input type="number" min={1} max={12} value={month} onChange={(e) => setMonth(Number(e.target.value))} style={{ width: 64, padding: '9px 10px', borderRadius: 8, border: `1px solid ${C.border}` }} />
            <button onClick={generate} disabled={loading} style={btn('#fff', C.error, `1px solid ${C.error}`)}><FiRefreshCw size={16} /> {period ? 'Yêu cầu tính toán lại' : 'Tạo bảng lương'}</button>
            {period && <button onClick={exportCsv} style={btn('#fff', C.primary, `1px solid ${C.primary}`)}><FiDownload size={16} /> Xuất file kế toán</button>}
            {/* UC-54 E-2. Backend cũng chặn, nhưng chặn luôn ở đây để quản lý thấy lý do
                trước khi bấm — duyệt là một chiều (BR-09). */}
            {period && !approved && (
              <button onClick={approve} disabled={loading || needsCheck > 0}
                title={needsCheck > 0 ? `Còn ${needsCheck} dòng thiếu lương cơ bản — bổ sung trước khi duyệt` : undefined}
                style={{ ...btn(needsCheck > 0 ? '#cbd5e1' : C.success, '#fff'), cursor: needsCheck > 0 ? 'not-allowed' : 'pointer' }}>
                <FiCheckCircle size={16} /> Phê duyệt bảng lương
              </button>
            )}
          </div>
        </div>

        {error && <div style={{ color: C.error }}>{error}</div>}

        {/* Danh sách kỳ đã tạo */}
        {periods.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
            <span style={{ color: C.muted, fontSize: 13 }}>Các kỳ:</span>
            {periods.map((p) => (
              <button key={p.id} onClick={() => openPeriod(p.id)}
                style={{ padding: '5px 12px', borderRadius: 999, cursor: 'pointer', fontSize: 13, border: `1px solid ${C.border}`,
                  background: period?.id === p.id ? '#ede9fe' : (p.status === 'APPROVED' ? '#f0fdf4' : '#fff'),
                  color: period?.id === p.id ? C.primary : C.muted, fontWeight: period?.id === p.id ? 600 : 400 }}>
                {p.month}/{p.year} · {p.status === 'APPROVED' ? 'Đã duyệt' : 'Nháp'}
              </button>
            ))}
          </div>
        )}

        {!period ? (
          <div style={{ ...card, padding: 48, textAlign: 'center', color: C.muted }}>Chọn một kỳ ở trên hoặc bấm "Tạo bảng lương" để bắt đầu.</div>
        ) : (
          <>
            {/* 3 thẻ tổng quan */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24 }}>
              <StatCard label="Tổng quỹ lương" value={`${vnd(period.totalNetPay)} đ`} Icon={FaWallet} iconBg="#f3e8ff" iconColor={C.primary} />
              <StatCard label="Tổng số nhân viên" value={items.length} sub="đã tính lương kỳ này" Icon={FiUsers} iconBg="#cffafe" iconColor={C.secondary} />
              <StatCard label="Cần kiểm tra" value={`${needsCheck} nhân sự`} sub="thiếu dữ liệu hoặc có điều chỉnh tay" Icon={FiAlertTriangle} iconBg="#fef3c7" iconColor={C.warn} attention />
            </div>

            {/* Bảng chi tiết */}
            <div style={{ ...card, overflow: 'hidden' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderBottom: `1px solid ${C.border}`, background: '#fafbff' }}>
                <div style={{ fontSize: 18, fontWeight: 700 }}>Chi tiết bảng lương</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fff', border: `1px solid ${C.border}`, borderRadius: 8, padding: '6px 12px', width: 260 }}>
                  <FiSearch color="#94a3b8" />
                  <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm nhân viên…" style={{ border: 'none', outline: 'none', flex: 1, fontSize: 14 }} />
                </div>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#fafbff', textAlign: 'left' }}>
                      <th style={th}>Nhân viên</th>
                      <th style={{ ...th, textAlign: 'right' }}>Lương cơ bản</th>
                      <th style={{ ...th, textAlign: 'center' }} title="Bác sĩ: ca khám hoàn thành · Điều dưỡng: buổi chăm sóc đã thực hiện · KTV: xét nghiệm đã trả kết quả">Hoạt động</th>
                      <th style={{ ...th, textAlign: 'right' }}>Phụ cấp/Hiệu suất</th>
                      <th style={{ ...th, textAlign: 'right' }}>Khấu trừ</th>
                      <th style={{ ...th, textAlign: 'right', color: C.ink }}>Tổng lương</th>
                      <th style={th}>Trạng thái / Ghi chú</th>
                      {!approved && <th style={{ ...th, textAlign: 'center' }} />}
                    </tr>
                  </thead>
                  <tbody>
                    {shown.map((it) => {
                      const idx = items.indexOf(it)
                      const st = rowStatus(it, approved)
                      return (
                        <tr key={it.id} style={{ background: st.label === 'Cần kiểm tra' ? '#fffbeb' : '#fff' }}>
                          <td style={td}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                              <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#f3e8ff', color: C.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>{initials(it.staffName) || 'NV'}</div>
                              <div>
                                <div style={{ fontWeight: 600 }}>{it.staffName}</div>
                                <div style={{ fontSize: 12, color: C.muted }}>{it.role || STAFF_TYPE_LABEL[it.staffType] || 'Nhân viên'}</div>
                              </div>
                            </div>
                          </td>
                          <td style={{ ...td, textAlign: 'right' }}>
                            {approved ? vnd(it.baseSalary) : <input style={numInput} type="number" value={it.baseSalary} onChange={(e) => editItem(idx, 'baseSalary', e.target.value)} onBlur={() => saveItem(items[idx])} />}
                          </td>
                          <td style={{ ...td, textAlign: 'center' }}>{it.activityCount}</td>
                          <td style={{ ...td, textAlign: 'right', color: C.success }}>
                            {approved ? `+${vnd(it.performanceBonus)}` : <input style={numInput} type="number" value={it.performanceBonus} onChange={(e) => editItem(idx, 'performanceBonus', e.target.value)} onBlur={() => saveItem(items[idx])} />}
                          </td>
                          <td style={{ ...td, textAlign: 'right', color: C.error }}>
                            {approved ? `-${vnd(it.deduction)}` : <input style={numInput} type="number" value={it.deduction} onChange={(e) => editItem(idx, 'deduction', e.target.value)} onBlur={() => saveItem(items[idx])} />}
                          </td>
                          <td style={{ ...td, textAlign: 'right', fontWeight: 800 }}>
                            {vnd(it.netPay)}
                            {/* UC-54 E-1: cho thấy đang lệch bao nhiêu TRƯỚC khi backend từ
                                chối vì vượt ngưỡng mà chưa ghi lý do. */}
                            {it.systemNetPay != null && Number(it.systemNetPay) !== Number(it.netPay) && (
                              <div style={{ fontSize: 11, fontWeight: 400, color: C.muted }}>
                                hệ thống tính: {vnd(it.systemNetPay)}
                              </div>
                            )}
                          </td>
                          <td style={td}>
                            <span style={{ display: 'inline-block', background: st.bg, color: st.c, padding: '2px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600 }}>{st.label}</span>
                            {!approved && <input value={it.note || ''} onChange={(e) => editItem(idx, 'note', e.target.value)} onBlur={() => saveItem(items[idx])} placeholder="Ghi chú…" style={{ display: 'block', marginTop: 6, width: 180, border: 'none', borderBottom: `1px solid ${C.border}`, outline: 'none', fontSize: 12, fontStyle: 'italic', color: C.muted, background: 'transparent' }} />}
                            {approved && st.note && <div style={{ fontSize: 12, color: C.muted, fontStyle: 'italic', marginTop: 4 }}>{st.note}</div>}
                          </td>
                          {!approved && <td style={{ ...td, textAlign: 'center' }}><button onClick={() => saveItem(items[idx])} title="Lưu" style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.muted }}><FiSave size={18} /></button></td>}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              {/* Footer tổng */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderTop: `1px solid ${C.border}`, background: '#fafbff', flexWrap: 'wrap', gap: 12 }}>
                <span style={{ fontWeight: 600, color: C.muted }}>Tổng cộng ({items.length} NV)</span>
                <div style={{ display: 'flex', gap: 32, alignItems: 'center' }}>
                  <div style={{ textAlign: 'right' }}><div style={{ fontSize: 11, color: C.muted }}>Tổng thưởng hiệu suất</div><div style={{ color: C.success, fontWeight: 700 }}>+{vnd(totalBonus)}</div></div>
                  <div style={{ textAlign: 'right' }}><div style={{ fontSize: 11, color: C.muted }}>Tổng khấu trừ</div><div style={{ color: C.error, fontWeight: 700 }}>-{vnd(totalDeduct)}</div></div>
                  <div style={{ textAlign: 'right', paddingLeft: 16, borderLeft: `1px solid ${C.border}` }}><div style={{ fontSize: 11, color: C.muted, textTransform: 'uppercase' }}>Tổng quỹ lương</div><div style={{ color: C.primary, fontWeight: 800, fontSize: 18 }}>{vnd(period.totalNetPay)} đ</div></div>
                </div>
              </div>
            </div>

            {/* Lịch sử hoạt động */}
            <div style={{ ...card, padding: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 18, fontWeight: 700, marginBottom: 16 }}><FiClock color={C.muted} /> Lịch sử hoạt động</div>
              <div style={{ borderLeft: `2px solid ${C.border}`, marginLeft: 6, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: -27, top: 4, width: 10, height: 10, borderRadius: 999, background: approved ? C.success : C.primary }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{approved ? 'Đã phê duyệt bảng lương' : 'Bảng lương nháp đã sẵn sàng'}</div>
                      <div style={{ fontSize: 13, color: C.muted }}>{approved ? `Kỳ ${period.month}/${period.year} đã được duyệt và khóa các dòng lương.` : `Kỳ ${period.month}/${period.year} đang chờ Quản lý xem xét & phê duyệt.`}</div>
                    </div>
                    <span style={{ fontSize: 12, color: C.muted }}>{period.approvedAt ? new Date(period.approvedAt).toLocaleString('vi-VN') : new Date(period.createdAt).toLocaleString('vi-VN')}</span>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
