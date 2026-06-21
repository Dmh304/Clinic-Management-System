/**
 * @file BookingPage.jsx
 * @version 1.0.0
 * @author ThangNBHE201024
 * @description Hiển thị và chọn bác sĩ và lịch khám bởi bệnh nhân.
 */
import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import Header from '../../components/layout/Header'
import { useSelector } from 'react-redux'
import logoImg from '../../assets/ECMS_Logo.png'
import { doctorService } from '../../services/doctorService';
import { appointmentService } from '../../services/appointmentService';
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

/**
 * Tạo bảng chọn thời gian khám
 * @param {*} date ngày chọn thời gian khám
 * @returns 
 */
const generateSlots = (date) => {
  const dayOfWeek = date.getDay();
  if (dayOfWeek === 0) return []; // Sunday
  const morning = ["07:30", "08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00"];
  const afternoon = ["13:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30"];
  const all = [...morning, ...afternoon];
  // Randomly mark some as booked for realism
  const seed = date.getDate() + date.getMonth();
  return all.map((t, i) => ({
    time: t,
    available: !((seed + i) % 3 === 0),
    session: morning.includes(t) ? "morning" : "afternoon",
  }));
};

/**
 * Trang 1: Chọn bác sĩ khám
 * @returns 
 */
function Page1({ onNext }) {
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [forOther, setForOther] = useState(false);
  const [otherName, setOtherName] = useState("");
  const [otherPhone, setOtherPhone] = useState("");
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
          avatar: '👨‍⚕️',
        })));
      })
      .catch(() => setDoctors([]))
      .finally(() => setLoadingDoctors(false));
  }, []);

  const canContinue = selectedDoc && (!forOther || (otherName.trim() && otherPhone.trim()));

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

        {/* For someone else toggle */}
        <div style={{
          background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12,
          padding: "14px 18px", marginBottom: 24, display: "flex", alignItems: "center",
          justifyContent: "space-between",
        }}>
          <div>
            <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>Đặt cho người thân?</span>
            <span style={{ fontSize: 12, color: C.textSub, marginLeft: 8 }}>
              Bạn sẽ quản lý lịch hẹn thay mặt họ
            </span>
          </div>
          <button
            onClick={() => setForOther(!forOther)}
            style={{
              padding: "6px 14px", borderRadius: 8, border: "none", cursor: "pointer",
              fontSize: 12, fontWeight: 600,
              background: forOther ? C.primary : C.border,
              color: forOther ? "#fff" : C.textSub,
              transition: "all .2s",
            }}
          >
            {forOther ? "✓ Đang đặt cho người thân" : "Đặt cho người khác"}
          </button>
        </div>

        {forOther && (
          <div style={{
            background: C.primaryLight, border: `1px solid #c7d7f7`, borderRadius: 12,
            padding: 18, marginBottom: 24, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14,
          }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: C.primary, display: "block", marginBottom: 6 }}>
                Họ tên người thân *
              </label>
              <input
                value={otherName}
                onChange={e => setOtherName(e.target.value)}
                placeholder="Nguyễn Thị Bình"
                style={{
                  width: "100%", padding: "9px 12px", borderRadius: 8, border: `1.5px solid ${C.borderFocus}`,
                  fontSize: 13, fontFamily: font, outline: "none", boxSizing: "border-box",
                  background: "#fff",
                }}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: C.primary, display: "block", marginBottom: 6 }}>
                Số điện thoại *
              </label>
              <input
                value={otherPhone}
                onChange={e => setOtherPhone(e.target.value)}
                placeholder="0912 345 678"
                style={{
                  width: "100%", padding: "9px 12px", borderRadius: 8, border: `1.5px solid ${C.borderFocus}`,
                  fontSize: 13, fontFamily: font, outline: "none", boxSizing: "border-box",
                  background: "#fff",
                }}
              />
            </div>
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
                    display: "flex", alignItems: "center", gap: 16,
                  }}
                >
                  <div style={{
                    width: 44, height: 44, borderRadius: 12,
                    background: active ? C.primary : C.bg,
                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22,
                    flexShrink: 0,
                  }}>{doc.avatar}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: active ? C.primary : C.text, fontFamily: font }}>
                        {doc.name}
                      </span>
                      <span style={{
                        fontSize: 11, padding: "2px 8px", borderRadius: 20,
                        background: active ? "#fff" : C.bg, color: C.textSub,
                      }}>{doc.title}</span>
                    </div>
                  </div>
                  {active && (
                    <div style={{
                      width: 22, height: 22, borderRadius: "50%", background: C.primary,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 12, color: "#fff", flexShrink: 0,
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
            onClick={() => canContinue && onNext({ doctor: selectedDoc, forOther, otherName, otherPhone })}
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
function Page2({ data, onNext, onBack, submitting, submitError }) {
  const today = new Date();
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [calOffset, setCalOffset] = useState(0); // week offset
  const { isAuthenticated, user } = useSelector((s) => s.auth)

  const startDate = new Date(today);
  startDate.setDate(today.getDate() - today.getDay() + 1 + calOffset * 7); // Monday

  const calDays = Array.from({ length: 35 }, (_, i) => {
    const d = new Date(startDate);
    d.setDate(startDate.getDate() + i);
    return d;
  });

  const maxDate = new Date(today);
  maxDate.setDate(today.getDate() + 30);

  const slots = selectedDate ? generateSlots(selectedDate) : [];
  const morningSlots = slots.filter(s => s.session === "morning");
  const afternoonSlots = slots.filter(s => s.session === "afternoon");
  // const isToday = (d) => d.toDateString() === today.toDateString();
  // const isPast = (d) => d < today && !isToday(d);

  const isToday = (d) => false;
  const isTodayTest = (d) => d.toDateString() === today.toDateString();
  const isPast = (d) => d < today && !isTodayTest(d);

  const isFuture30 = (d) => d > maxDate;
  const isSunday = (d) => d.getDay() === 0;
  const isDisabled = (d) => isPast(d) || isFuture30(d) || isSunday(d);
  const isSelected = (d) => selectedDate?.toDateString() === d.toDateString();

  // E2: Check if slot is too close (< 24 hours from now)
  const isTooSoon = (slot) => {
    const slotTime = new Date(today);
    if (!selectedDate || !isToday(selectedDate)) {
      return false;
    }
    const [h, m] = slot.time.split(":").map(Number);
    slotTime.setHours(h, m, 0, 0);
    //return (slotTime - today) < 24 * 60 * 60 * 1000;
    return false;
  };

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
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22,
          }}>{data.doctor.avatar}</div>
          <div style={{ flex: 1 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{data.doctor.name}</span>
            <span style={{ fontSize: 12, color: C.textSub, display: "block" }}>{data.doctor.title}</span>
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
              <button onClick={() => setCalOffset(o => Math.max(0, o - 1))}
                disabled={calOffset === 0}
                style={{
                  width: 28, height: 28, borderRadius: 7, border: `1px solid ${C.border}`,
                  background: calOffset === 0 ? C.bg : C.surface, cursor: calOffset === 0 ? "not-allowed" : "pointer",
                  fontSize: 13, color: calOffset === 0 ? C.textMuted : C.text,
                }}>‹</button>
              <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>
                {startDate.toLocaleDateString("vi-VN", { month: "long", year: "numeric" })}
              </span>
              <button onClick={() => setCalOffset(o => Math.min(4, o + 1))}
                disabled={calOffset >= 4}
                style={{
                  width: 28, height: 28, borderRadius: 7, border: `1px solid ${C.border}`,
                  background: calOffset >= 4 ? C.bg : C.surface, cursor: calOffset >= 4 ? "not-allowed" : "pointer",
                  fontSize: 13, color: calOffset >= 4 ? C.textMuted : C.text,
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
              {calDays.map((d, i) => {
                const disabled = isDisabled(d);
                const selected = isSelected(d);
                const todayMark = isToday(d);
                return (
                  <button key={i}
                    onClick={() => !disabled && (setSelectedDate(d), setSelectedSlot(null))}
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
            ) : slots.length === 0 ? (
              <div style={{
                background: C.warningLight, border: `1px solid ${C.warning}`, borderRadius: 14,
                padding: 24, textAlign: "center",
              }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>😔</div>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#92400e" }}>
                  Không có khung giờ nào cho ngày này
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
                  Ngày {fmtDate(selectedDate)} — {slots.filter(s => s.available).length} slot trống
                </p>

                {[{ label: "☀️ Buổi sáng", list: morningSlots }, { label: "🌤 Buổi chiều", list: afternoonSlots }].map(({ label, list }) => (
                  <div key={label} style={{ marginBottom: 16 }}>
                    <p style={{ fontSize: 11, fontWeight: 600, color: C.textSub, textTransform: "uppercase", margin: "0 0 8px", letterSpacing: ".5px" }}>
                      {label}
                    </p>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
                      {list.map(slot => {
                        const tooSoon = isTooSoon(slot);
                        const unavailable = !slot.available || tooSoon;
                        const isChosen = selectedSlot?.time === slot.time;
                        return (
                          <button key={slot.time}
                            onClick={() => !unavailable && setSelectedSlot(slot)}
                            disabled={unavailable}
                            title={tooSoon ? "Cần đặt trước ít nhất 24 giờ" : !slot.available ? "Đã được đặt" : ""}
                            style={{
                              padding: "7px 0", borderRadius: 8, fontSize: 12, fontFamily: font, fontWeight: isChosen ? 600 : 400,
                              border: `1.5px solid ${isChosen ? C.primary : unavailable ? C.border : C.border}`,
                              background: isChosen ? C.primary : unavailable ? C.bg : "#fff",
                              color: isChosen ? "#fff" : unavailable ? C.textMuted : C.text,
                              cursor: unavailable ? "not-allowed" : "pointer",
                              transition: "all .15s",
                              textDecoration: unavailable && !tooSoon ? "line-through" : "none",
                            }}
                          >
                            {slot.time}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}

                {selectedDate && isToday(selectedDate) && (
                  <div style={{
                    background: C.warningLight, border: `1px solid #fcd34d`, borderRadius: 8,
                    padding: "8px 12px", fontSize: 12, color: "#92400e", marginTop: 8,
                  }}>
                    ⚠️ Slot bị mờ: Cần đặt trước ít nhất 24 giờ
                  </div>
                )}
              </div>
            )}

            {/* Summary */}
            {canConfirm && (
              <div style={{
                background: C.primaryLight, border: `1.5px solid ${C.primary}`, borderRadius: 12,
                padding: 16, marginTop: 14,
              }}>
                <p style={{ margin: "0 0 10px", fontSize: 12, fontWeight: 700, color: C.primary, textTransform: "uppercase", letterSpacing: ".5px" }}>
                  Tóm Tắt Lịch Hẹn
                </p>
                {[
                  ["Bác sĩ", data.doctor.name],
                  ["Ngày", fmtDate(selectedDate)],
                  ["Giờ", selectedSlot.time],
                  ["Bệnh nhân", data.forOther ? data.otherName : user.fullName],
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
        {submitError && (
          <div style={{
            background: C.errorLight, border: `1px solid ${C.error}`, borderRadius: 8,
            padding: "10px 14px", marginTop: 16, fontSize: 13, color: C.error,
          }}>
            ⚠️ {submitError}
          </div>
        )}
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 16 }}>
          <button onClick={onBack} disabled={submitting} style={{
            padding: "11px 24px", borderRadius: 10, border: `1.5px solid ${C.border}`,
            background: C.surface, cursor: submitting ? "not-allowed" : "pointer",
            fontSize: 14, fontFamily: font, color: C.text,
          }}>← Quay Lại</button>
          <button
            onClick={() => canConfirm && !submitting && onNext({ ...data, date: selectedDate, slot: selectedSlot })}
            disabled={!canConfirm || submitting}
            style={{
              padding: "12px 32px", borderRadius: 10, border: "none",
              cursor: canConfirm && !submitting ? "pointer" : "not-allowed",
              background: canConfirm && !submitting ? C.primary : C.border,
              color: canConfirm && !submitting ? "#fff" : C.textMuted,
              fontSize: 14, fontWeight: 600, fontFamily: font,
            }}
          >
            {submitting ? "Đang đặt lịch..." : "Xác Nhận Đặt Lịch →"}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Trang 3: Hiển thị tạo xét duyệt lịch khám thành công
 * @returns 
 */
function Page3({ data, onReset, bookingResult }) {
  const navigate = useNavigate();
  const fmtDate = (d) =>
    d.toLocaleDateString("vi-VN", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  const bookingCode = bookingResult?.id ? `#${bookingResult.id}` : `NKA-${Date.now().toString(36).slice(-6).toUpperCase()}`;
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
          <p style={{ color: "rgba(255,255,255,.75)", fontSize: 13, margin: "0 0 20px" }}>
            Lịch hẹn của bạn đã được tạo và đang chờ xác nhận
          </p>
          <div style={{
            background: "rgba(255,255,255,.1)", borderRadius: 10, padding: "10px 20px",
            display: "inline-block",
          }}>
            <span style={{ color: "rgba(255,255,255,.7)", fontSize: 11, letterSpacing: "1px" }}>MÃ ĐẶT LỊCH</span>
            <p style={{ color: "#fff", fontSize: 18, fontWeight: 700, margin: "2px 0 0", letterSpacing: "2px" }}>
              {bookingCode}
            </p>
          </div>
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
              { icon: "👨‍⚕️", label: "Bác sĩ", value: data.doctor.name },
              { icon: "📅", label: "Ngày khám", value: fmtDate(data.date) },
              { icon: "⏰", label: "Giờ khám", value: data.slot.time },
              { icon: "👤", label: "Bệnh nhân", value: data.forOther ? data.otherName : user.fullName },
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
            onClick={() => navigate('/patient/dashboard')}
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
  const [page, setPage] = useState(1);
  const [bookingData, setBookingData] = useState({});
  const [bookingResult, setBookingResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  const handleConfirm = async (d) => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const [hours, minutes] = d.slot.time.split(':');
      const dt = new Date(d.date);
      dt.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      const appointmentTime = dt.toISOString().slice(0, 19);

      const res = await appointmentService.bookAppointment({
        doctorId: d.doctor.id,
        appointmentTime,
        notes: d.forOther ? `Đặt cho người thân: ${d.otherName} - ${d.otherPhone}` : null,
      });
      setBookingResult(res.data);
      setBookingData(d);
      setPage(3);
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
        <Page1 onNext={(d) => { setBookingData(d); setPage(2); }} />
      )}
      {page === 2 && (
        <Page2
          data={bookingData}
          onNext={handleConfirm}
          onBack={() => setPage(1)}
          submitting={submitting}
          submitError={submitError}
        />
      )}
      {page === 3 && (
        <Page3
          data={bookingData}
          onReset={() => { setBookingData({}); setBookingResult(null); setPage(1); }}
          bookingResult={bookingResult}
        />
      )}
      <div style={{ flex: 1 }} />
      <Footer />
    </div>
  );
}
