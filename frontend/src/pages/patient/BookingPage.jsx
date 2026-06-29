/**
 * @file BookingPage.jsx
 * @version 1.0.0
 * @author ThangNBHE201024
 * @description Hiển thị và chọn bác sĩ và lịch khám bởi bệnh nhân.
 */
import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import Header from '../../components/layout/Header'
import { useSelector } from 'react-redux'
import logoImg from '../../assets/ECMS_Logo.png'
import { doctorService } from '../../services/doctorService';
import { appointmentService } from '../../services/appointmentService';
import { CLINIC_INFO } from '../../constants/clinicInfo';
// ─── Design tokens ───────────────────────────────────────────────
const C = {
  bg: "#f0f4ff",
  surface: "#ffffff",
  surfaceAlt: "#f8faff",
  primary: "#3b5bdb",
  primaryLight: "#e8edff",
  primaryDark: "#2f4ac2",
  accent: "#22c55e",
  accentLight: "#dcfce7",
  text: "#111827",
  textSub: "#6b7280",
  textMuted: "#9ca3af",
  border: "#e5e7eb",
  borderFocus: "#3b5bdb",
  error: "#ef4444",
  errorLight: "#fee2e2",
  warning: "#f59e0b",
  warningLight: "#fef3c7",
  shadow: "0 1px 3px rgba(0,0,0,.08), 0 4px 16px rgba(59,91,219,.07)",
  shadowLg: "0 8px 32px rgba(59,91,219,.13)",
};
const S = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    background: '#eef2ff',
    fontFamily: "'Segoe UI', system-ui, sans-serif",
  },
  header: {
    background: '#fff',
    boxShadow: '0 1px 4px rgba(0,0,0,.08)',
    padding: '14px 40px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  footer: { backgroundColor: '#0f172a', color: '#94a3b8', padding: '40px 0' },
  footerInner: {
    maxWidth: 1280, margin: '0 auto', padding: '0 24px',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16,
  },
  footerLogo: { display: 'flex', alignItems: 'center', gap: 8, color: '#fff', fontWeight: 700, fontSize: 16, marginBottom: 6 },
  footerCopy: { fontSize: 12, color: '#475569' },
  footerLinks: { display: 'flex', alignItems: 'center', gap: 24 },
  footerLink: { fontSize: 13, color: '#94a3b8', textDecoration: 'none' },
}
const font = "'IBM Plex Sans', 'Segoe UI', sans-serif";
const Footer = () => (
  <footer style={S.footer}>
    <div style={S.footerInner}>
      <div>
        <div style={S.footerLogo}>
          <img src={logoImg} alt="Anh Sao Eye Clinic" style={{ height: 44, width: 'auto' }} />
          NHÃN KHOA ÁNH SAO
        </div>
        <div style={S.footerCopy}>© 2024 Eyes Clinic Management System. All rights reserved.</div>
        <div style={{ ...S.footerCopy, marginTop: 2 }}>Chuyên nghiệp – Tin cậy – Tận tâm.</div>
      </div>
      <nav style={S.footerLinks}>
        {['Privacy Policy', 'Terms of Service', 'Contact Support', 'Clinic Locations'].map(t => (
          <Link key={t} to="/" style={S.footerLink}>{t}</Link>
        ))}
      </nav>
    </div>
  </footer>
);

/**
 * Thanh quá trình
 */
const steps = ["Chọn Bác Sĩ", "Chọn Lịch", "Xác Nhận"];
const StepBar = ({ current }) => (
  <div style={{
    background: C.surface, borderBottom: `1px solid ${C.border}`,
    padding: "16px 40px", fontFamily: font,
  }}>
    <div style={{ maxWidth: 640, margin: "0 auto", display: "flex", alignItems: "center" }}>
      {steps.map((s, i) => (
        <div key={s} style={{ display: "flex", alignItems: "center", flex: i < steps.length - 1 ? 1 : "none" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{
              width: 28, height: 28, borderRadius: "50%", display: "flex",
              alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700,
              background: i < current ? C.accent : i === current ? C.primary : C.border,
              color: i <= current ? "#fff" : C.textMuted,
              transition: "all .3s",
            }}>
              {i < current ? "✓" : i + 1}
            </div>
            <span style={{
              fontSize: 12, fontWeight: i === current ? 600 : 400,
              color: i === current ? C.primary : i < current ? C.accent : C.textMuted,
            }}>{s}</span>
          </div>
          {i < steps.length - 1 && (
            <div style={{
              flex: 1, height: 2, margin: "0 12px",
              background: i < current ? C.accent : C.border,
              transition: "background .3s",
            }} />
          )}
        </div>
      ))}
    </div>
  </div>
);

/** Đặt lịch online phải trước giờ khám tối thiểu (phút) — đồng bộ với backend
 *  BOOKING_LEAD_TIME_MINUTES; chỉ dùng để hiển thị ghi chú cho bệnh nhân. */
const MIN_LEAD_MINUTES = 120;

/** Chuyển một Date sang chuỗi YYYY-MM-DD theo giờ địa phương (tránh lệch múi giờ
 *  như toISOString vốn quy về UTC). */
/** Mỗi slot dài 30 phút — hiển thị dạng khoảng "07:30 - 08:00" cho rõ ràng
 *  (giống cách các nền tảng đặt lịch khám phổ biến hiển thị). */
const slotRangeLabel = (time) => {
  const [h, m] = time.split(":").map(Number);
  const endTotal = h * 60 + m + 30;
  const endLabel = `${String(Math.floor(endTotal / 60) % 24).padStart(2, "0")}:${String(endTotal % 60).padStart(2, "0")}`;
  return `${time} - ${endLabel}`;
};

const fmtVND = (amount) =>
  amount != null
    ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount)
    : '—';

const toLocalISODate = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/**
 * Trang 1: Chọn bác sĩ khám
 * @returns
 */
function Page1({ onNext, service }) {
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [loadingDoctors, setLoadingDoctors] = useState(true);

  useEffect(() => {
    doctorService.getAllDoctors()
      .then(res => {
        const list = res.data || [];
        setDoctors(list.map(d => ({
          id: d.id,
          name: d.fullName,
          title: d.specialization || 'Bác sĩ',
          department: d.department,
          experienceYears: d.experienceYears,
          bio: d.bio,
          avatarUrl: d.avatarUrl,
          avatar: '👨‍⚕️',
        })));
      })
      .catch(() => setDoctors([]))
      .finally(() => setLoadingDoctors(false));
  }, []);

  const canContinue = !!selectedDoc;

  return (
    <div style={{ fontFamily: font, flex: 1, background: C.bg, padding: "32px 40px" }}>
      <div style={{ maxWidth: 860, margin: "0 auto" }}>

        {/* Title */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: C.text, margin: 0, letterSpacing: "-.4px" }}>
            Đặt Lịch Khám
          </h1>
          <p style={{ fontSize: 14, color: C.textSub, margin: "4px 0 0" }}>
            Chọn chuyên khoa và bác sĩ phù hợp với nhu cầu của bạn
          </p>
        </div>

        {/* Dịch vụ đã chọn (UC-46) */}
        {service && (
          <div style={{
            background: C.accentLight, border: `1.5px solid ${C.accent}`, borderRadius: 12,
            padding: "12px 18px", marginBottom: 24, display: "flex", alignItems: "center", gap: 10,
          }}>
            <span style={{ fontSize: 18 }}>🩺</span>
            <span style={{ fontSize: 13, color: "#166534" }}>
              Dịch vụ: <strong>{service.serviceName}</strong>
            </span>
          </div>
        )}

        {/* Doctors */}
        <section style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 12 }}>
            Chọn Bác Sĩ
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {loadingDoctors ? (
              <div style={{ textAlign: "center", padding: 32, color: C.textMuted, fontSize: 14 }}>
                Đang tải danh sách bác sĩ...
              </div>
            ) : doctors.length === 0 ? (
              <div style={{ textAlign: "center", padding: 32, color: C.textMuted, fontSize: 14 }}>
                Không có bác sĩ nào
              </div>
            ) : doctors.map(doc => {
              const active = selectedDoc?.id === doc.id;
              return (
                <button key={doc.id}
                  onClick={() => setSelectedDoc(doc)}
                  style={{
                    padding: "16px 18px", borderRadius: 12,
                    border: `2px solid ${active ? C.primary : C.border}`,
                    background: active ? C.primaryLight : C.surface,
                    cursor: "pointer", textAlign: "left", transition: "all .2s",
                    display: "flex", alignItems: "flex-start", gap: 16,
                  }}
                >
                  <div style={{
                    width: 44, height: 44, borderRadius: 12,
                    background: active ? C.primary : C.bg,
                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22,
                    flexShrink: 0, overflow: "hidden",
                  }}>
                    {doc.avatarUrl
                      ? <img src={doc.avatarUrl} alt={doc.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      : doc.avatar}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: active ? C.primary : C.text, fontFamily: font }}>
                        {doc.name}
                      </span>
                      <span style={{
                        fontSize: 11, padding: "2px 8px", borderRadius: 20,
                        background: active ? "#fff" : C.bg, color: C.textSub,
                      }}>{doc.title}</span>
                      {doc.experienceYears != null && (
                        <span style={{ fontSize: 11, color: C.textMuted }}>
                          • {doc.experienceYears} năm kinh nghiệm
                        </span>
                      )}
                    </div>
                    {doc.department && (
                      <div style={{ fontSize: 12, color: C.textSub, marginTop: 3 }}>{doc.department}</div>
                    )}
                    {doc.bio && (
                      <div style={{ fontSize: 12, color: C.textMuted, marginTop: 3, lineHeight: 1.4 }}>{doc.bio}</div>
                    )}
                  </div>
                  {active && (
                    <div style={{
                      width: 22, height: 22, borderRadius: "50%", background: C.primary,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 12, color: "#fff", flexShrink: 0, marginTop: 2,
                    }}>✓</div>
                  )}
                </button>
              );
            })}
          </div>
        </section>

        {/* CTA */}
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button
            onClick={() => canContinue && onNext({ doctor: selectedDoc })}
            disabled={!canContinue}
            style={{
              padding: "12px 32px", borderRadius: 10, border: "none", cursor: canContinue ? "pointer" : "not-allowed",
              background: canContinue ? C.primary : C.border, color: canContinue ? "#fff" : C.textMuted,
              fontSize: 14, fontWeight: 600, fontFamily: font, transition: "all .2s",
              display: "flex", alignItems: "center", gap: 8,
            }}
          >
            Chọn Lịch Hẹn →
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Trang 2: chọn ngày và giờ khám bệnh
 * @returns 
 */
function Page2({ data, onNext, onBack }) {
  const today = new Date();
  const todayMid = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const maxDate = new Date(todayMid);
  maxDate.setDate(todayMid.getDate() + 30); // chỉ cho đặt trong vòng 30 ngày tới

  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  // Tháng đang hiển thị trên lịch (mốc = ngày 1 của tháng)
  const [viewMonth, setViewMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [slots, setSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slotsError, setSlotsError] = useState(null);
  const reqIdRef = useRef(0); // bỏ qua kết quả cũ khi đổi ngày liên tục

  // Chọn ngày + tải khung giờ trống THẬT từ backend (theo bác sĩ + ngày)
  const selectDate = (d) => {
    setSelectedDate(d);
    setSelectedSlot(null);
    setLoadingSlots(true);
    setSlotsError(null);
    setSlots([]);
    const reqId = ++reqIdRef.current;
    appointmentService.getAvailableSlots(data.doctor.id, toLocalISODate(d))
      .then(res => { if (reqId === reqIdRef.current) setSlots(res.data || []); })
      .catch(() => { if (reqId === reqIdRef.current) setSlotsError("Không tải được khung giờ trống. Vui lòng thử lại."); })
      .finally(() => { if (reqId === reqIdRef.current) setLoadingSlots(false); });
  };

  // Lưới ngày của tháng đang xem, căn đúng theo thứ (Thứ 2 là đầu tuần)
  const firstOfMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1);
  const leadingBlanks = (firstOfMonth.getDay() + 6) % 7; // Mon=0 … Sun=6
  const daysInMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0).getDate();
  const calCells = [
    ...Array.from({ length: leadingBlanks }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) =>
      new Date(viewMonth.getFullYear(), viewMonth.getMonth(), i + 1)),
  ];

  const sameDay = (a, b) => a && b && a.toDateString() === b.toDateString();
  const isToday = (d) => sameDay(d, todayMid);
  const isPast = (d) => d < todayMid;
  const isFuture30 = (d) => d > maxDate;
  const isSunday = (d) => d.getDay() === 0;
  const isDisabled = (d) => isPast(d) || isFuture30(d) || isSunday(d);
  const isSelected = (d) => sameDay(d, selectedDate);

  // Điều hướng tháng — không lùi quá tháng hiện tại, không vượt quá tháng chứa maxDate
  const monthKey = (d) => d.getFullYear() * 12 + d.getMonth();
  const canPrevMonth = monthKey(viewMonth) > monthKey(todayMid);
  const canNextMonth = monthKey(viewMonth) < monthKey(maxDate);
  const goMonth = (delta) =>
    setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + delta, 1));

  const morningSlots = slots.filter(s => s.session === "MORNING");
  const afternoonSlots = slots.filter(s => s.session === "AFTERNOON");
  const availableCount = slots.filter(s => s.available).length;

  const dayLabels = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

  const fmtDate = (d) => d
    ? `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`
    : "";

  const canConfirm = selectedDate && selectedSlot;

  return (
    <div style={{ fontFamily: font, flex: 1, background: C.bg, padding: "32px 40px" }}>
      <div style={{ maxWidth: 860, margin: "0 auto" }}>

        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: C.text, margin: 0, letterSpacing: "-.4px" }}>
            Chọn Ngày & Giờ Khám
          </h1>
          <p style={{ fontSize: 14, color: C.textSub, margin: "4px 0 0" }}>
            Lịch trống trong vòng 30 ngày tới
          </p>
        </div>

        {/* Doctor info card */}
        <div style={{
          background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12,
          padding: "14px 18px", marginBottom: 24, display: "flex", alignItems: "center", gap: 14,
        }}>
          <div style={{
            width: 42, height: 42, borderRadius: 10, background: C.primaryLight,
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, overflow: "hidden",
          }}>
            {data.doctor.avatarUrl
              ? <img src={data.doctor.avatarUrl} alt={data.doctor.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : data.doctor.avatar}
          </div>
          <div style={{ flex: 1 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{data.doctor.name}</span>
            <span style={{ fontSize: 12, color: C.textSub, display: "block" }}>
              {data.doctor.title}
              {data.doctor.experienceYears != null && ` • ${data.doctor.experienceYears} năm kinh nghiệm`}
            </span>
          </div>
          <button onClick={onBack} style={{
            fontSize: 12, color: C.primary, background: "none", border: "none",
            cursor: "pointer", fontFamily: font, padding: 0,
          }}>← Đổi bác sĩ</button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          {/* Calendar */}
          <div style={{
            background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: 18,
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <button onClick={() => canPrevMonth && goMonth(-1)}
                disabled={!canPrevMonth}
                style={{
                  width: 28, height: 28, borderRadius: 7, border: `1px solid ${C.border}`,
                  background: !canPrevMonth ? C.bg : C.surface, cursor: !canPrevMonth ? "not-allowed" : "pointer",
                  fontSize: 13, color: !canPrevMonth ? C.textMuted : C.text,
                }}>‹</button>
              <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>
                {viewMonth.toLocaleDateString("vi-VN", { month: "long", year: "numeric" })}
              </span>
              <button onClick={() => canNextMonth && goMonth(1)}
                disabled={!canNextMonth}
                style={{
                  width: 28, height: 28, borderRadius: 7, border: `1px solid ${C.border}`,
                  background: !canNextMonth ? C.bg : C.surface, cursor: !canNextMonth ? "not-allowed" : "pointer",
                  fontSize: 13, color: !canNextMonth ? C.textMuted : C.text,
                }}>›</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 3, marginBottom: 6 }}>
              {dayLabels.map(l => (
                <div key={l} style={{ textAlign: "center", fontSize: 11, fontWeight: 600, color: C.textMuted, padding: "2px 0" }}>
                  {l}
                </div>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 3 }}>
              {calCells.map((d, i) => {
                if (!d) return <div key={`b${i}`} />; // ô trống đầu tháng để căn đúng thứ
                const disabled = isDisabled(d);
                const selected = isSelected(d);
                const todayMark = isToday(d);
                return (
                  <button key={i}
                    onClick={() => !disabled && selectDate(d)}
                    disabled={disabled}
                    style={{
                      aspectRatio: "1", borderRadius: 8, border: selected ? `2px solid ${C.primary}` : "2px solid transparent",
                      background: selected ? C.primary : todayMark ? C.primaryLight : "transparent",
                      color: disabled ? C.textMuted : selected ? "#fff" : todayMark ? C.primary : C.text,
                      cursor: disabled ? "not-allowed" : "pointer",
                      fontSize: 12, fontWeight: selected || todayMark ? 600 : 400, fontFamily: font,
                      transition: "all .15s",
                      opacity: disabled ? 0.4 : 1,
                    }}
                  >
                    {d.getDate()}
                  </button>
                );
              })}
            </div>
            <div style={{ marginTop: 12, display: "flex", gap: 12, fontSize: 11, color: C.textSub }}>
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ width: 10, height: 10, borderRadius: 3, background: C.primaryLight, display: "inline-block" }} />
                Hôm nay
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ width: 10, height: 10, borderRadius: 3, background: C.primary, display: "inline-block" }} />
                Đã chọn
              </span>
            </div>
          </div>

          {/* Time slots */}
          <div>
            {!selectedDate ? (
              <div style={{
                background: C.surface, border: `1px dashed ${C.border}`, borderRadius: 14,
                padding: 32, textAlign: "center", color: C.textMuted,
              }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>📅</div>
                <p style={{ margin: 0, fontSize: 13 }}>Chọn ngày để xem các khung giờ trống</p>
              </div>
            ) : loadingSlots ? (
              <div style={{
                background: C.surface, border: `1px dashed ${C.border}`, borderRadius: 14,
                padding: 32, textAlign: "center", color: C.textMuted,
              }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>⏳</div>
                <p style={{ margin: 0, fontSize: 13 }}>Đang tải khung giờ trống...</p>
              </div>
            ) : slotsError ? (
              <div style={{
                background: C.errorLight, border: `1px solid ${C.error}`, borderRadius: 14,
                padding: 24, textAlign: "center",
              }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>⚠️</div>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: C.error }}>{slotsError}</p>
                <button
                  onClick={() => selectDate(selectedDate)}
                  style={{
                    marginTop: 10, padding: "6px 16px", borderRadius: 8, border: `1.5px solid ${C.error}`,
                    background: C.surface, color: C.error, cursor: "pointer", fontSize: 12, fontFamily: font,
                  }}
                >Thử lại</button>
              </div>
            ) : slots.length === 0 || availableCount === 0 ? (
              <div style={{
                background: C.warningLight, border: `1px solid ${C.warning}`, borderRadius: 14,
                padding: 24, textAlign: "center",
              }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>😔</div>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#92400e" }}>
                  {slots.length === 0
                    ? "Phòng khám không nhận lịch vào ngày này"
                    : "Đã hết khung giờ trống cho ngày này"}
                </p>
                <p style={{ margin: "4px 0 0", fontSize: 12, color: "#b45309" }}>
                  Vui lòng chọn ngày khác hoặc bác sĩ khác
                </p>
              </div>
            ) : (
              <div style={{
                background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: 18,
              }}>
                <p style={{ margin: "0 0 14px", fontSize: 13, fontWeight: 600, color: C.text }}>
                  Ngày {fmtDate(selectedDate)} — {availableCount} khung giờ trống
                </p>

                {isToday(selectedDate) && (
                  <p style={{ margin: "0 0 12px", fontSize: 12, color: C.textSub }}>
                    ℹ️ Chỉ nhận đặt trước giờ khám tối thiểu {MIN_LEAD_MINUTES} phút.
                  </p>
                )}

                {[{ label: "☀️ Buổi sáng", list: morningSlots }, { label: "🌤 Buổi chiều", list: afternoonSlots }].map(({ label, list }) => (
                  <div key={label} style={{ marginBottom: 16 }}>
                    <p style={{ fontSize: 11, fontWeight: 600, color: C.textSub, textTransform: "uppercase", margin: "0 0 8px", letterSpacing: ".5px" }}>
                      {label}
                    </p>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
                      {list.map(slot => {
                        const unavailable = !slot.available;
                        const isChosen = selectedSlot?.time === slot.time;
                        return (
                          <button key={slot.time}
                            onClick={() => !unavailable && setSelectedSlot(slot)}
                            disabled={unavailable}
                            title={unavailable ? "Đã được đặt hoặc đã qua giờ" : ""}
                            style={{
                              padding: "7px 4px", borderRadius: 8, fontSize: 11.5, fontFamily: font, fontWeight: isChosen ? 600 : 400,
                              border: `1.5px solid ${isChosen ? C.primary : C.border}`,
                              background: isChosen ? C.primary : unavailable ? C.bg : "#fff",
                              color: isChosen ? "#fff" : unavailable ? C.textMuted : C.text,
                              cursor: unavailable ? "not-allowed" : "pointer",
                              transition: "all .15s",
                              textDecoration: unavailable ? "line-through" : "none",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {slotRangeLabel(slot.time)}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Tóm tắt nhanh lựa chọn (chi tiết người khám sẽ nhập ở bước sau) */}
            {canConfirm && (
              <div style={{
                background: C.primaryLight, border: `1.5px solid ${C.primary}`, borderRadius: 12,
                padding: 16, marginTop: 14,
              }}>
                <p style={{ margin: "0 0 10px", fontSize: 12, fontWeight: 700, color: C.primary, textTransform: "uppercase", letterSpacing: ".5px" }}>
                  Bạn đã chọn
                </p>
                {[
                  ...(data.service ? [["Dịch vụ", data.service.serviceName]] : []),
                  ["Bác sĩ", data.doctor.name],
                  ["Ngày", fmtDate(selectedDate)],
                  ["Giờ", slotRangeLabel(selectedSlot.time)],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 5 }}>
                    <span style={{ color: C.textSub }}>{k}</span>
                    <span style={{ fontWeight: 600, color: C.text }}>{v}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 16 }}>
          <button onClick={onBack} style={{
            padding: "11px 24px", borderRadius: 10, border: `1.5px solid ${C.border}`,
            background: C.surface, cursor: "pointer",
            fontSize: 14, fontFamily: font, color: C.text,
          }}>← Quay Lại</button>
          <button
            onClick={() => canConfirm && onNext({ date: selectedDate, slot: selectedSlot })}
            disabled={!canConfirm}
            style={{
              padding: "12px 32px", borderRadius: 10, border: "none",
              cursor: canConfirm ? "pointer" : "not-allowed",
              background: canConfirm ? C.primary : C.border,
              color: canConfirm ? "#fff" : C.textMuted,
              fontSize: 14, fontWeight: 600, fontFamily: font,
            }}
          >
            Tiếp Tục →
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Trang 3: Form nhập thông tin người khám + xác nhận đặt lịch (kiểu một biểu mẫu
 * gọn, gộp toàn bộ thông tin cần thiết trên một màn hình).
 */
function Page3({ data, onConfirm, onBack, submitting, submitError }) {
  const { user } = useSelector((s) => s.auth);
  const [forOther, setForOther] = useState(false);
  // Người khám
  const [pName, setPName] = useState(user?.fullName || "");
  const [pGender, setPGender] = useState("");
  const [pPhone, setPPhone] = useState("");
  const [pEmail, setPEmail] = useState("");
  const [pDob, setPDob] = useState("");
  const [pAddress, setPAddress] = useState("");
  const [symptom, setSymptom] = useState("");

  // Khi đổi giữa "đặt cho mình" / "đặt cho người thân": với chính mình thì điền
  // sẵn tên tài khoản, với người thân thì xoá trống để nhập tên người khám.
  const switchTarget = (other) => {
    setForOther(other);
    setPName(other ? "" : (user?.fullName || ""));
  };

  const headerDate = data.date
    ? data.date.toLocaleDateString("vi-VN", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" })
    : "";

  const canConfirm = pName.trim() && pPhone.trim() && pDob && pGender;

  const inputStyle = {
    width: "100%", padding: "10px 12px", borderRadius: 8, border: `1.5px solid ${C.border}`,
    fontSize: 13, fontFamily: font, outline: "none", boxSizing: "border-box", background: "#fff",
  };
  const labelStyle = { fontSize: 12, fontWeight: 600, color: C.text, display: "block", marginBottom: 6 };
  const sectionTitle = {
    fontSize: 12, fontWeight: 700, color: C.primary, textTransform: "uppercase",
    letterSpacing: ".5px", margin: "0 0 12px",
  };

  const handleSubmit = () => {
    if (!canConfirm || submitting) return;
    onConfirm({
      forOther,
      patientName: pName,
      patientGender: pGender,
      patientPhone: pPhone,
      patientEmail: pEmail,
      patientDob: pDob,
      patientAddress: pAddress,
      symptomNote: symptom,
    });
  };

  return (
    <div style={{ fontFamily: font, flex: 1, background: C.bg, padding: "32px 40px" }}>
      <div style={{ maxWidth: 680, margin: "0 auto" }}>

        {/* Header: bác sĩ + giờ + địa chỉ khám */}
        <div style={{
          background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14,
          padding: "16px 18px", marginBottom: 20, display: "flex", gap: 14, alignItems: "flex-start",
        }}>
          <div style={{
            width: 52, height: 52, borderRadius: 12, background: C.primaryLight, flexShrink: 0,
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, overflow: "hidden",
          }}>
            {data.doctor.avatarUrl
              ? <img src={data.doctor.avatarUrl} alt={data.doctor.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : data.doctor.avatar}
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontSize: 11, color: C.textMuted, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".4px" }}>
              Đặt lịch khám
            </p>
            <p style={{ margin: "2px 0 0", fontSize: 16, fontWeight: 700, color: C.primary }}>{data.doctor.name}</p>
            <p style={{ margin: "6px 0 0", fontSize: 13, color: C.warning, fontWeight: 600 }}>
              📅 {slotRangeLabel(data.slot.time)} — {headerDate}
            </p>
            <p style={{ margin: "4px 0 0", fontSize: 12, color: C.textSub }}>
              🏥 {CLINIC_INFO.name}
            </p>
            <p style={{ margin: "1px 0 0", fontSize: 12, color: C.textMuted }}>{CLINIC_INFO.address}</p>
          </div>
        </div>

        {/* Giá khám (chỉ khi có dịch vụ cụ thể) */}
        {data.service?.price != null && (
          <div style={{
            background: C.warningLight, border: `1.5px solid ${C.warning}`, borderRadius: 10,
            padding: "10px 16px", marginBottom: 20, fontSize: 14, fontWeight: 700, color: "#92400e",
            display: "inline-block",
          }}>
            Giá khám {fmtVND(data.service.price)}
          </div>
        )}

        {/* Toggle đặt cho mình / người thân */}
        <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
          {[["Đặt cho mình", false], ["Đặt cho người thân", true]].map(([label, val]) => {
            const active = forOther === val;
            return (
              <button key={label} onClick={() => switchTarget(val)}
                style={{
                  flex: 1, padding: "10px 12px", borderRadius: 10, cursor: "pointer", fontSize: 13,
                  fontWeight: 600, fontFamily: font,
                  border: `1.5px solid ${active ? C.primary : C.border}`,
                  background: active ? C.primaryLight : C.surface,
                  color: active ? C.primary : C.textSub,
                }}>
                {active ? "● " : "○ "}{label}
              </button>
            );
          })}
        </div>

        {/* Thông tin người đặt — lấy thẳng từ tài khoản đang đăng nhập, không cần
            nhập lại. Hệ thống tự gắn lịch hẹn với tài khoản này để bạn quản lý. */}
        {forOther && (
          <div style={{
            background: C.accentLight, border: `1px solid ${C.accent}`, borderRadius: 10,
            padding: "10px 14px", marginBottom: 18, fontSize: 12, color: "#166534",
          }}>
            ℹ️ Lịch hẹn sẽ gắn với tài khoản của bạn (<strong>{user?.fullName}</strong>) để bạn quản lý và xem trong "Lịch hẹn của tôi".
          </div>
        )}

        {/* Thông tin người khám */}
        <div style={{
          background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 18, marginBottom: 18,
        }}>
          <p style={sectionTitle}>Thông tin người khám</p>

          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Họ tên người khám *</label>
            <input value={pName} onChange={e => setPName(e.target.value)}
              placeholder="Ghi rõ họ và tên, ví dụ: Trần Văn Phú" style={inputStyle} />
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Giới tính *</label>
            <div style={{ display: "flex", gap: 10 }}>
              {[["Nam", "MALE"], ["Nữ", "FEMALE"]].map(([label, val]) => {
                const active = pGender === val;
                return (
                  <button key={val} onClick={() => setPGender(val)}
                    style={{
                      padding: "8px 22px", borderRadius: 8, cursor: "pointer", fontSize: 13, fontFamily: font,
                      fontWeight: 600, border: `1.5px solid ${active ? C.primary : C.border}`,
                      background: active ? C.primaryLight : "#fff", color: active ? C.primary : C.textSub,
                    }}>
                    {active ? "● " : "○ "}{label}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
            <div>
              <label style={labelStyle}>Số điện thoại *</label>
              <input value={pPhone} onChange={e => setPPhone(e.target.value)} placeholder="0912 345 678" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Năm sinh *</label>
              <input type="date" value={pDob} onChange={e => setPDob(e.target.value)}
                max={toLocalISODate(new Date())} style={inputStyle} />
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Email <span style={{ color: C.textMuted, fontWeight: 400 }}>(không bắt buộc)</span></label>
            <input value={pEmail} onChange={e => setPEmail(e.target.value)} placeholder="example@email.com" style={inputStyle} />
          </div>

          <div>
            <label style={labelStyle}>Địa chỉ <span style={{ color: C.textMuted, fontWeight: 400 }}>(không bắt buộc)</span></label>
            <input value={pAddress} onChange={e => setPAddress(e.target.value)}
              placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành phố" style={inputStyle} />
          </div>
        </div>

        {/* Triệu chứng */}
        <div style={{
          background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 18, marginBottom: 18,
        }}>
          <label style={labelStyle}>Mô tả triệu chứng / lý do khám <span style={{ color: C.textMuted, fontWeight: 400 }}>(không bắt buộc)</span></label>
          <textarea value={symptom} onChange={e => setSymptom(e.target.value)} rows={3}
            placeholder="Ví dụ: Mắt mỏi, nhìn mờ khi đọc sách, cần đo lại độ kính..."
            style={{ ...inputStyle, resize: "vertical" }} />
        </div>

        {/* Hình thức thanh toán + tổng tiền */}
        <div style={{
          background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 18, marginBottom: 18,
        }}>
          <p style={sectionTitle}>Hình thức thanh toán</p>
          <div style={{ fontSize: 13, color: C.text, marginBottom: 14 }}>● Thanh toán sau tại cơ sở y tế</div>
          {data.service?.price != null ? (
            <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6 }}>
                <span style={{ color: C.textSub }}>Giá khám</span>
                <span style={{ fontWeight: 600, color: C.text }}>{fmtVND(data.service.price)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6 }}>
                <span style={{ color: C.textSub }}>Phí đặt lịch</span>
                <span style={{ fontWeight: 600, color: C.accent }}>Miễn phí</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, marginTop: 8, paddingTop: 8, borderTop: `1px solid ${C.border}` }}>
                <span style={{ fontWeight: 700, color: C.text }}>Tổng cộng</span>
                <span style={{ fontWeight: 700, color: C.error }}>{fmtVND(data.service.price)}</span>
              </div>
            </div>
          ) : (
            <p style={{ margin: 0, fontSize: 12, color: C.textMuted }}>
              Phí khám sẽ được thông báo và thanh toán tại quầy khi đến khám.
            </p>
          )}
        </div>

        {submitError && (
          <div style={{
            background: C.errorLight, border: `1px solid ${C.error}`, borderRadius: 8,
            padding: "10px 14px", marginBottom: 16, fontSize: 13, color: C.error,
          }}>
            ⚠️ {submitError}
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
          <button onClick={onBack} disabled={submitting} style={{
            padding: "12px 24px", borderRadius: 10, border: `1.5px solid ${C.border}`,
            background: C.surface, cursor: submitting ? "not-allowed" : "pointer",
            fontSize: 14, fontFamily: font, color: C.text,
          }}>← Quay Lại</button>
          <button onClick={handleSubmit} disabled={!canConfirm || submitting}
            style={{
              flex: 1, padding: "12px 32px", borderRadius: 10, border: "none",
              cursor: canConfirm && !submitting ? "pointer" : "not-allowed",
              background: canConfirm && !submitting ? C.primary : C.border,
              color: canConfirm && !submitting ? "#fff" : C.textMuted,
              fontSize: 15, fontWeight: 700, fontFamily: font,
            }}>
            {submitting ? "Đang đặt lịch..." : "Xác Nhận Đặt Khám"}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Trang 4: Hiển thị kết quả đặt lịch khám thành công
 * @returns
 */
function Page4({ data, onReset }) {
  const navigate = useNavigate();
  const fmtDate = (d) =>
    d.toLocaleDateString("vi-VN", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  const { user } = useSelector((s) => s.auth);
  return (
    <div style={{ fontFamily: font, flex: 1, background: C.bg, padding: "32px 40px" }}>
      <div style={{ maxWidth: 640, margin: "0 auto" }}>

        {/* Success hero */}
        <div style={{
          background: `linear-gradient(135deg, ${C.primary} 0%, #5b21b6 100%)`,
          borderRadius: 20, padding: "36px 32px", textAlign: "center", marginBottom: 24,
          boxShadow: C.shadowLg,
        }}>
          <div style={{
            width: 64, height: 64, borderRadius: "50%", background: "rgba(255,255,255,.15)",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 16px", fontSize: 32,
          }}>✓</div>
          <h2 style={{ color: "#fff", fontSize: 22, fontWeight: 700, margin: "0 0 8px", letterSpacing: "-.4px" }}>
            Đặt Lịch Thành Công!
          </h2>
          <p style={{ color: "rgba(255,255,255,.78)", fontSize: 13, margin: 0, lineHeight: 1.6 }}>
            Lịch hẹn của bạn đã được tạo và đang chờ xác nhận.<br />
            Bạn có thể theo dõi trong mục <strong style={{ color: "#fff" }}>Lịch hẹn của tôi</strong>.
            Khi đến phòng khám, vui lòng cung cấp <strong style={{ color: "#fff" }}>họ tên</strong> để lễ tân tra cứu.
          </p>
        </div>

        {/* Status badge */}
        <div style={{
          background: C.warningLight, border: `1.5px solid ${C.warning}`, borderRadius: 12,
          padding: "12px 18px", marginBottom: 20, display: "flex", alignItems: "center", gap: 10,
        }}>
          <span style={{ fontSize: 20 }}>⏳</span>
          <div>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#92400e" }}>Trạng thái: Đang Chờ Xác Nhận (PENDING)</p>
            <p style={{ margin: "2px 0 0", fontSize: 12, color: "#b45309" }}>
              Lễ tân sẽ xác nhận lịch hẹn trong vòng 30 phút
            </p>
          </div>
        </div>

        {/* Appointment details */}
        <div style={{
          background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: 22, marginBottom: 20,
        }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: C.text, margin: "0 0 16px" }}>Chi Tiết Lịch Hẹn</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {[
              ...(data.service ? [{ icon: "🩺", label: "Dịch vụ", value: data.service.serviceName }] : []),
              { icon: "👨‍⚕️", label: "Bác sĩ", value: data.doctor.name },
              { icon: "📅", label: "Ngày khám", value: fmtDate(data.date) },
              { icon: "⏰", label: "Giờ khám", value: slotRangeLabel(data.slot.time) },
              { icon: "👤", label: "Bệnh nhân", value: data.patientName || user.fullName },
              ...(data.service?.price != null ? [{ icon: "💰", label: "Giá khám", value: fmtVND(data.service.price) }] : []),
              { icon: "📍", label: "Địa chỉ khám", value: CLINIC_INFO.address },
              ...(data.symptomNote?.trim() ? [{ icon: "📝", label: "Triệu chứng / lý do khám", value: data.symptomNote.trim() }] : []),
            ].map(({ icon, label, value }) => (
              <div key={label} style={{ display: "flex", gap: 10 }}>
                <span style={{ fontSize: 18, flexShrink: 0 }}>{icon}</span>
                <div>
                  <p style={{ margin: 0, fontSize: 11, color: C.textMuted, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".4px" }}>{label}</p>
                  <p style={{ margin: "2px 0 0", fontSize: 13, fontWeight: 600, color: C.text }}>{value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Email confirmation */}
        <div style={{
          background: C.accentLight, border: `1.5px solid ${C.accent}`, borderRadius: 12,
          padding: "14px 18px", marginBottom: 20, display: "flex", gap: 12, alignItems: "flex-start",
        }}>
          <span style={{ fontSize: 20 }}>📧</span>
          <div>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#166534" }}>Email Xác Nhận Đã Gửi</p>
            <p style={{ margin: "3px 0 0", fontSize: 12, color: "#15803d" }}>
              Email xác nhận đã được gửi đến <strong>{user.id}</strong>. Vui lòng kiểm tra hộp thư đến (và thư mục spam).
            </p>
          </div>
        </div>

        {/* What to prepare */}
        <div style={{
          background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: 20, marginBottom: 24,
        }}>
          <h3 style={{ fontSize: 13, fontWeight: 700, color: C.text, margin: "0 0 12px" }}>📋 Chuẩn Bị Trước Khi Đến</h3>
          {[
            "Mang theo CCCD/CMND và thẻ bảo hiểm y tế (nếu có)",
            "Đến trước giờ hẹn 10–15 phút để làm thủ tục",
            "Mang theo kết quả khám mắt lần trước (nếu có)",
            "Không dùng thuốc nhỏ mắt giãn đồng tử trước 4 giờ khám",
          ].map((tip, i) => (
            <div key={i} style={{ display: "flex", gap: 10, marginBottom: 8, alignItems: "flex-start" }}>
              <div style={{
                width: 20, height: 20, borderRadius: "50%", background: C.primaryLight,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 10, fontWeight: 700, color: C.primary, flexShrink: 0,
              }}>{i + 1}</div>
              <span style={{ fontSize: 13, color: C.textSub, lineHeight: 1.5 }}>{tip}</span>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 8 }}>
          <button
            onClick={() => navigate('/patient/appointments')}
            style={{
              padding: "12px", borderRadius: 10, border: `1.5px solid ${C.primary}`,
              background: C.surface, cursor: "pointer", fontSize: 13, fontFamily: font,
              fontWeight: 600, color: C.primary,
            }}
          >
            📋 Xem Lịch Hẹn Của Tôi
          </button>
          <button
            onClick={onReset}
            style={{
              padding: "12px", borderRadius: 10, border: "none",
              background: C.primary, cursor: "pointer", fontSize: 13, fontFamily: font,
              fontWeight: 600, color: "#fff",
            }}
          >
            + Đặt Lịch Khác
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Trang đặt lịch khám bệnh.
 *
 * Bao gồm:
 * - Chọn thông tin lịch hẹn
 * - Xác nhận đặt lịch
 * - Hiển thị kết quả đặt lịch thành công
 */
export default function BookingPage() {
  // UC-46: dịch vụ được pre-fill khi đến từ trang "Dịch vụ khám mắt" (có thể null)
  const preselectedService = useLocation().state?.service || null;
  const [page, setPage] = useState(1);
  const [bookingData, setBookingData] = useState({ service: preselectedService });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  const handleConfirm = async (d) => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      // Ghép ngày + giờ theo giờ địa phương (KHÔNG dùng toISOString vì nó quy về
      // UTC, làm lệch giờ khám). Ví dụ: 2026-07-06T13:30:00
      const appointmentTime = `${toLocalISODate(d.date)}T${d.slot.time}:00`;

      // notes chỉ còn dùng cho mô tả triệu chứng/lý do khám — thông tin người
      // KHÁM (tên/giới tính/ngày sinh/...) và người ĐẶT (qua bookedBy) đều đã là
      // các trường có cấu trúc riêng, không cần nhét chung vào notes nữa.
      const notes = d.symptomNote?.trim() || null;

      await appointmentService.bookAppointment({
        doctorId: d.doctor.id,
        appointmentTime,
        notes,
        serviceId: d.service?.id || null,
        bookingForOther: d.forOther,
        patientName: d.patientName?.trim() || null,
        patientGender: d.patientGender || null,
        patientDob: d.patientDob || null, // 'YYYY-MM-DD'
        patientPhone: d.patientPhone?.trim() || null,
        patientEmail: d.patientEmail?.trim() || null,
        patientAddress: d.patientAddress?.trim() || null,
      });
      setBookingData(d);
      setPage(4);
    } catch (err) {
      setSubmitError(err?.response?.data?.message || 'Đặt lịch thất bại. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: C.bg }}>
      <Header />
      <StepBar current={page - 1} />
      {page === 1 && (
        <Page1
          service={bookingData.service}
          onNext={(d) => { setBookingData(prev => ({ ...prev, ...d })); setPage(2); }}
        />
      )}
      {page === 2 && (
        <Page2
          data={bookingData}
          onNext={(d) => { setBookingData(prev => ({ ...prev, ...d })); setPage(3); }}
          onBack={() => setPage(1)}
        />
      )}
      {page === 3 && (
        <Page3
          data={bookingData}
          onConfirm={(form) => handleConfirm({ ...bookingData, ...form })}
          onBack={() => { setSubmitError(null); setPage(2); }}
          submitting={submitting}
          submitError={submitError}
        />
      )}
      {page === 4 && (
        <Page4
          data={bookingData}
          onReset={() => { setBookingData({ service: preselectedService }); setSubmitError(null); setPage(1); }}
        />
      )}
      <div style={{ flex: 1 }} />
      <Footer />
    </div>
  );
}
