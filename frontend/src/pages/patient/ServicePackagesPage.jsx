import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { Modal, message, Input, Spin } from "antd";
import {
  AppstoreOutlined,
  UnorderedListOutlined,
  ClockCircleOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  LockOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import { serviceService } from "../../services/serviceService";
import { patientService } from "../../services/patientService";

// ─── Design tokens — đồng bộ với dự án Nhãn Khoa Ánh Sao ────────
const C = {
  primary: "#1d4ed8",
  primaryLight: "#eff6ff",
  primaryDark: "#1e40af",
  primaryBorder: "#dbeafe",
  teal: "#0d9488",
  accent: "#22c55e",
  accentLight: "#dcfce7",
  text: "#111827",
  textSub: "#64748b",
  textMuted: "#94a3b8",
  border: "#e2e8f0",
  bg: "#f8fafc",
  surface: "#ffffff",
  shadow: "0 2px 8px rgba(0,0,0,.06)",
  shadowHover: "0 8px 28px rgba(29,78,216,.14)",
};
const font = "system-ui, -apple-system, sans-serif";

function formatPrice(price) {
  if (!price && price !== 0) return "—";
  return new Intl.NumberFormat("vi-VN").format(price) + "đ";
}

// Phân biệt dịch vụ khám lâm sàng (đặt lịch hẹn) và gói chăm sóc (đăng ký tư vấn)
const isClinical = (s) => s.serviceType === "CLINICAL";

// ─── Hero ────────────────────────────────────────────────────────
function HeroSection({ onScrollToServices }) {
  return (
    <section
      style={{
        background: "linear-gradient(135deg, #eff6ff 0%, #dbeafe 55%, #e0f2fe 100%)",
        padding: "72px 0",
        fontFamily: font,
      }}
    >
      <div
        style={{
          maxWidth: 1280, margin: "0 auto", padding: "0 24px",
          display: "flex", alignItems: "center", gap: 56,
        }}
      >
        <div style={{ flex: 1, maxWidth: 540 }}>
          <span
            style={{
              display: "inline-block", backgroundColor: "#0d9488", color: "#fff",
              fontSize: 11, fontWeight: 700, letterSpacing: 1,
              padding: "4px 12px", borderRadius: 999, marginBottom: 20,
            }}
          >
            DỊCH VỤ PHÒNG KHÁM
          </span>

          <h1
            style={{
              fontSize: 40, fontWeight: 800, color: "#0f172a",
              lineHeight: 1.2, margin: "0 0 18px", letterSpacing: -0.5,
            }}
          >
            Tất cả dịch vụ nhãn khoa
          </h1>

          <p
            style={{
              fontSize: 15, color: C.textSub, lineHeight: 1.75,
              margin: "0 0 32px", maxWidth: 440,
            }}
          >
            Từ dịch vụ khám lâm sàng chuyên sâu đến các gói chăm sóc và phục hồi
            thị lực. Chọn dịch vụ phù hợp, xem chi tiết liệu trình và đặt lịch
            hoặc đăng ký tư vấn chỉ trong vài bước.
          </p>

          <div style={{ display: "flex", gap: 12 }}>
            <button
              onClick={onScrollToServices}
              style={{
                backgroundColor: C.primary, color: "#fff", border: "none",
                borderRadius: 8, padding: "12px 24px", fontSize: 14, fontWeight: 600,
                cursor: "pointer", fontFamily: font, transition: "background-color 0.15s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = C.primaryDark)}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = C.primary)}
            >
              Xem tất cả dịch vụ
            </button>
          </div>
        </div>

        <div
          style={{
            flex: "0 0 420px", height: 320, borderRadius: 20,
            overflow: "hidden", boxShadow: "0 16px 48px rgba(29,78,216,.18)",
          }}
        >
          <img
            src="https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=840&h=640&fit=crop&auto=format"
            alt="Chăm sóc mắt chuyên nghiệp"
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        </div>
      </div>
    </section>
  );
}

// ─── Nút hành động (theo loại dịch vụ + vai trò) ──────────────────
function ActionButton({
  service, role, isAuthenticated, alreadyPending,
  onBook, onPatientRegister, onReceptionistOpen, loading, block,
}) {
  const navigate = useNavigate();
  const clinical = isClinical(service);
  const stop = (fn) => (e) => { e.stopPropagation(); fn(); };

  // Khách chưa đăng nhập
  if (!isAuthenticated) {
    return (
      <button
        onClick={stop(() => navigate("/login"))}
        style={{
          backgroundColor: C.primaryLight, color: C.primary,
          border: `1px solid ${C.primaryBorder}`, borderRadius: 8,
          padding: "9px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer",
          fontFamily: font, display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap",
        }}
      >
        <LockOutlined style={{ fontSize: 12 }} />
        {clinical ? "Đăng nhập để đặt lịch" : "Đăng nhập để đăng ký"}
      </button>
    );
  }

  // ── Dịch vụ khám lâm sàng → đặt lịch hẹn ──
  if (clinical) {
    if (role === "PATIENT") {
      return (
        <button
          onClick={stop(() => service.id && onBook(service))}
          disabled={!service.id}
          style={{
            backgroundColor: service.id ? C.primary : "#d1d5db", color: "#fff",
            border: "none", borderRadius: 8, padding: "9px 20px",
            fontSize: 13, fontWeight: 600, cursor: service.id ? "pointer" : "default",
            fontFamily: font, whiteSpace: "nowrap", transition: "background-color 0.15s",
          }}
          onMouseEnter={(e) => { if (service.id) e.currentTarget.style.backgroundColor = C.primaryDark; }}
          onMouseLeave={(e) => { if (service.id) e.currentTarget.style.backgroundColor = C.primary; }}
        >
          Đặt lịch khám
        </button>
      );
    }
    // Lễ tân / vai trò khác: dịch vụ khám đặt qua quầy (walk-in), chỉ xem ở đây
    return <ReadOnlyButton />;
  }

  // ── Gói chăm sóc → đăng ký tư vấn ──
  if (role === "PATIENT") {
    if (alreadyPending) {
      return (
        <button
          disabled
          style={{
            backgroundColor: "#fef3c7", color: "#d97706", border: "1px solid #fde68a",
            borderRadius: 8, padding: "9px 18px", fontSize: 13, fontWeight: 600,
            cursor: "default", fontFamily: font, whiteSpace: "nowrap",
          }}
        >
          ⏳ Đang chờ tư vấn
        </button>
      );
    }
    return (
      <button
        onClick={stop(() => service.id && onPatientRegister(service))}
        disabled={!service.id || loading || block}
        style={{
          backgroundColor: service.id && !block ? C.primary : "#d1d5db", color: "#fff",
          border: "none", borderRadius: 8, padding: "9px 20px", fontSize: 13, fontWeight: 600,
          cursor: service.id && !loading && !block ? "pointer" : "default",
          fontFamily: font, whiteSpace: "nowrap", transition: "background-color 0.15s",
          opacity: loading ? 0.75 : 1,
        }}
        onMouseEnter={(e) => { if (service.id && !loading && !block) e.currentTarget.style.backgroundColor = C.primaryDark; }}
        onMouseLeave={(e) => { if (service.id && !block) e.currentTarget.style.backgroundColor = C.primary; }}
      >
        {loading ? "Đang xử lý..." : "Đăng ký ngay"}
      </button>
    );
  }

  if (role === "RECEPTIONIST") {
    return (
      <button
        onClick={stop(() => service.id && onReceptionistOpen(service))}
        disabled={!service.id}
        style={{
          backgroundColor: service.id ? C.teal : "#d1d5db", color: "#fff",
          border: "none", borderRadius: 8, padding: "9px 20px", fontSize: 13, fontWeight: 600,
          cursor: service.id ? "pointer" : "default", fontFamily: font,
          whiteSpace: "nowrap", transition: "background-color 0.15s",
        }}
        onMouseEnter={(e) => { if (service.id) e.currentTarget.style.backgroundColor = "#0f766e"; }}
        onMouseLeave={(e) => { if (service.id) e.currentTarget.style.backgroundColor = C.teal; }}
      >
        Đăng ký cho BN
      </button>
    );
  }

  return <ReadOnlyButton />;
}

function ReadOnlyButton() {
  return (
    <button
      disabled
      style={{
        backgroundColor: "#f1f5f9", color: C.textMuted, border: `1px solid ${C.border}`,
        borderRadius: 8, padding: "9px 20px", fontSize: 13, fontWeight: 500,
        cursor: "not-allowed", fontFamily: font, whiteSpace: "nowrap",
      }}
    >
      Chỉ xem
    </button>
  );
}

// Nhãn loại dịch vụ
function TypeTag({ service }) {
  const clinical = isClinical(service);
  return (
    <span
      style={{
        fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 999,
        backgroundColor: clinical ? "#e0f2fe" : C.accentLight,
        color: clinical ? "#0369a1" : "#15803d",
      }}
    >
      {clinical ? "Khám lâm sàng" : "Gói chăm sóc"}
    </span>
  );
}

// ─── Thẻ dịch vụ ──────────────────────────────────────────────────
function ServiceCard({ service, isListMode, onOpenDetail, actionProps }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onClick={() => onOpenDetail(service)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        backgroundColor: C.surface, borderRadius: 20, overflow: "hidden",
        border: `1px solid ${hovered ? "#bfdbfe" : C.border}`,
        boxShadow: hovered ? C.shadowHover : C.shadow,
        display: "flex", flexDirection: isListMode ? "row" : "column",
        transform: hovered ? "translateY(-3px)" : "none",
        transition: "box-shadow 0.2s, transform 0.2s, border-color 0.2s",
        fontFamily: font, cursor: "pointer",
      }}
    >
      <div
        style={{
          position: "relative", flexShrink: 0,
          height: isListMode ? "auto" : 200, width: isListMode ? 240 : "100%",
          background: "#dbeafe", overflow: "hidden",
        }}
      >
        <img
          src={
            service.thumbnailUrl ||
            "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=600&h=360&fit=crop&auto=format"
          }
          alt={service.serviceName}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
        {service.badge && (
          <span
            style={{
              position: "absolute", top: 12, right: 12, backgroundColor: "#0d9488",
              color: "#fff", fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 999,
            }}
          >
            {service.badge}
          </span>
        )}
      </div>

      <div style={{ padding: "24px 28px", flex: 1, display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
          <TypeTag service={service} />
          {service.categoryName && (
            <span style={{ fontSize: 11, color: C.textMuted }}>{service.categoryName}</span>
          )}
        </div>

        <h3 style={{ fontSize: 17, fontWeight: 700, color: C.text, margin: "0 0 8px" }}>
          {service.serviceName}
        </h3>

        <p style={{ fontSize: 13, color: C.textSub, lineHeight: 1.65, margin: "0 0 16px", flex: 1 }}>
          {service.description}
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 7, marginBottom: 18 }}>
          {service.durationMinutes != null && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: C.textSub }}>
              <span style={{ color: "#0d9488", flexShrink: 0 }}><ClockCircleOutlined /></span>
              Thời lượng: {service.durationMinutes} phút
            </div>
          )}
          {!isClinical(service) && service.sessionsIncluded != null && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: C.textSub }}>
              <span style={{ color: "#0d9488", flexShrink: 0 }}><CalendarOutlined /></span>
              Số buổi: {service.sessionsIncluded} buổi
            </div>
          )}
        </div>

        <div
          style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            borderTop: `1px solid ${C.border}`, paddingTop: 18, gap: 12,
          }}
        >
          <div>
            <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 4 }}>
              {service.priceLabel || "Giá dịch vụ"}
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: C.primary, lineHeight: 1 }}>
              {formatPrice(service.price)}
            </div>
          </div>
          <ActionButton service={service} {...actionProps(service)} />
        </div>
      </div>
    </div>
  );
}

// ─── Modal chi tiết dịch vụ (content do manager nhập từ DB) ───────
function DetailModal({ service, onClose, actionProps }) {
  if (!service) return null;
  return (
    <Modal
      open={!!service}
      onCancel={onClose}
      footer={null}
      width={640}
      title={<span style={{ fontFamily: font, fontWeight: 700 }}>{service.serviceName}</span>}
    >
      <div style={{ fontFamily: font }}>
        <img
          src={
            service.thumbnailUrl ||
            "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=600&h=360&fit=crop&auto=format"
          }
          alt={service.serviceName}
          style={{ width: "100%", height: 220, objectFit: "cover", borderRadius: 12, marginBottom: 16 }}
        />

        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
          <TypeTag service={service} />
          {service.categoryName && (
            <span style={{ fontSize: 12, color: C.textMuted }}>{service.categoryName}</span>
          )}
        </div>

        <p style={{ fontSize: 14, color: C.textSub, lineHeight: 1.7, margin: "0 0 16px" }}>
          {service.description}
        </p>

        {/* Thông số nhanh */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 10, marginBottom: 18 }}>
          {service.durationMinutes != null && (
            <InfoBox label="Thời lượng" value={`${service.durationMinutes} phút`} />
          )}
          {!isClinical(service) && service.sessionsIncluded != null && (
            <InfoBox label="Số buổi" value={`${service.sessionsIncluded} buổi`} />
          )}
          {!isClinical(service) && service.validityDays != null && (
            <InfoBox label="Hiệu lực" value={`${service.validityDays} ngày`} />
          )}
          <InfoBox label={service.priceLabel || "Giá"} value={formatPrice(service.price)} highlight />
        </div>

        {/* Nội dung chi tiết — quản lý nhập trong DB (không hard-code) */}
        {service.content ? (
          <div style={{ marginBottom: 20 }}>
            <h4 style={{ fontSize: 14, fontWeight: 700, color: C.text, margin: "0 0 8px" }}>
              Chi tiết liệu trình
            </h4>
            <div style={{ fontSize: 14, color: C.textSub, lineHeight: 1.75, whiteSpace: "pre-wrap" }}>
              {service.content}
            </div>
          </div>
        ) : (
          <div style={{ fontSize: 13, color: C.textMuted, fontStyle: "italic", marginBottom: 20 }}>
            Thông tin chi tiết đang được cập nhật.
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", borderTop: `1px solid ${C.border}`, paddingTop: 16 }}>
          <ActionButton service={service} {...actionProps(service)} />
        </div>
      </div>
    </Modal>
  );
}

function InfoBox({ label, value, highlight }) {
  return (
    <div style={{ background: highlight ? C.primaryLight : "#f8fafc", borderRadius: 10, padding: "10px 14px" }}>
      <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 15, fontWeight: 700, color: highlight ? C.primary : C.text }}>{value}</div>
    </div>
  );
}

// ─── Receptionist: chọn bệnh nhân ────────────────────────────────
function ReceptionistModal({ open, service, onClose, onConfirm, loading }) {
  const [keyword, setKeyword] = useState("");
  const [patients, setPatients] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState(null);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!open) { setKeyword(""); setPatients([]); setSelected(null); setNotes(""); }
  }, [open]);

  const handleSearch = async () => {
    if (!keyword.trim()) return;
    setSearching(true);
    try {
      const res = await patientService.searchPatients(keyword.trim());
      setPatients(res.data ?? []);
    } catch {
      message.error("Không thể tìm kiếm bệnh nhân");
    } finally {
      setSearching(false);
    }
  };

  return (
    <Modal
      open={open}
      title={<span style={{ fontFamily: font, fontWeight: 700 }}>Đăng ký dịch vụ cho bệnh nhân</span>}
      onCancel={onClose}
      okText="Xác nhận đăng ký"
      cancelText="Hủy"
      okButtonProps={{ disabled: !selected, loading, style: { backgroundColor: C.primary, borderColor: C.primary } }}
      onOk={() => onConfirm({ patientId: selected.id, notes })}
      width={520}
    >
      <div style={{ fontFamily: font }}>
        <div style={{ backgroundColor: C.primaryLight, border: `1px solid ${C.primaryBorder}`, borderRadius: 10, padding: "12px 16px", marginBottom: 20 }}>
          <strong style={{ color: C.text }}>{service?.serviceName}</strong>
          {service?.price && (
            <span style={{ color: C.primary, marginLeft: 8, fontWeight: 700 }}>
              — {formatPrice(service.price)}
            </span>
          )}
        </div>

        <p style={{ fontSize: 13, color: C.textSub, marginBottom: 8 }}>Tìm bệnh nhân (tên hoặc SĐT):</p>
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <Input
            placeholder="Nhập tên hoặc số điện thoại..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onPressEnter={handleSearch}
            prefix={<SearchOutlined style={{ color: C.textMuted }} />}
          />
          <button
            onClick={handleSearch}
            disabled={searching || !keyword.trim()}
            style={{
              backgroundColor: C.primary, color: "#fff", border: "none", borderRadius: 6,
              padding: "0 16px", cursor: "pointer", fontFamily: font, fontSize: 13, fontWeight: 600,
              opacity: searching ? 0.7 : 1,
            }}
          >
            {searching ? "..." : "Tìm"}
          </button>
        </div>

        {patients.length > 0 && (
          <div style={{ border: `1px solid ${C.border}`, borderRadius: 10, overflow: "hidden", maxHeight: 200, overflowY: "auto", marginBottom: 16 }}>
            {patients.map((p) => (
              <div
                key={p.id}
                onClick={() => setSelected(p)}
                style={{
                  padding: "10px 16px", cursor: "pointer",
                  backgroundColor: selected?.id === p.id ? C.primaryLight : C.surface,
                  borderBottom: `1px solid ${C.border}`,
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  fontSize: 13, transition: "background-color 0.1s",
                }}
                onMouseEnter={(e) => { if (selected?.id !== p.id) e.currentTarget.style.backgroundColor = "#f8fafc"; }}
                onMouseLeave={(e) => { if (selected?.id !== p.id) e.currentTarget.style.backgroundColor = C.surface; }}
              >
                <div>
                  <div style={{ fontWeight: 600, color: C.text }}>{p.fullName}</div>
                  <div style={{ color: C.textMuted, fontSize: 12 }}>{p.phone} · {p.email}</div>
                </div>
                {selected?.id === p.id && <CheckCircleOutlined style={{ color: C.primary, fontSize: 16 }} />}
              </div>
            ))}
          </div>
        )}

        {selected && (
          <div style={{ backgroundColor: C.accentLight, borderRadius: 8, padding: "10px 14px", fontSize: 13, marginBottom: 14, color: "#15803d" }}>
            ✓ Đã chọn: <strong>{selected.fullName}</strong>
          </div>
        )}

        <p style={{ fontSize: 13, color: C.textSub, marginBottom: 6 }}>Ghi chú (tùy chọn):</p>
        <Input.TextArea
          rows={3}
          placeholder="Ghi chú về yêu cầu hoặc tình trạng sức khỏe..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>
    </Modal>
  );
}

// ─── Catalog ──────────────────────────────────────────────────────
function ServiceCatalog({ catalogRef, services, loading, role, isAuthenticated, pendingIds, onRegistered }) {
  const navigate = useNavigate();
  const [isListMode, setIsListMode] = useState(false);
  const [search, setSearch] = useState("");
  const [loadingId, setLoadingId] = useState(null);
  const [confirmModal, setConfirmModal] = useState({ open: false, service: null });
  const [receptionistModal, setReceptionistModal] = useState({ open: false, service: null });
  const [detail, setDetail] = useState(null);

  // Bệnh nhân đặt lịch khám cho dịch vụ lâm sàng → chuyển sang luồng đặt lịch hẹn
  const handleBook = (service) => {
    navigate("/patient/booking", {
      state: { service: { id: service.id, serviceName: service.serviceName } },
    });
  };

  const handlePatientRegister = (service) => setConfirmModal({ open: true, service });

  const handlePatientConfirm = async () => {
    const { service } = confirmModal;
    setLoadingId(service.id);
    try {
      await serviceService.register({ serviceId: service.id });
      message.success(`Đăng ký "${service.serviceName}" thành công! Phòng khám sẽ liên hệ tư vấn sớm.`);
      onRegistered(service.id);
      setConfirmModal({ open: false, service: null });
      setDetail(null);
    } catch (err) {
      message.error(err?.response?.data?.message ?? "Đăng ký thất bại, vui lòng thử lại");
    } finally {
      setLoadingId(null);
    }
  };

  const handleReceptionistConfirm = async ({ patientId, notes }) => {
    const { service } = receptionistModal;
    setLoadingId(service.id);
    try {
      await serviceService.register({ serviceId: service.id, patientId, notes });
      message.success("Đăng ký dịch vụ cho bệnh nhân thành công!");
      setReceptionistModal({ open: false, service: null });
    } catch (err) {
      message.error(err?.response?.data?.message ?? "Đăng ký thất bại");
    } finally {
      setLoadingId(null);
    }
  };

  // Props cho nút hành động — dùng chung cho card và modal chi tiết
  const actionProps = (service) => ({
    role,
    isAuthenticated,
    alreadyPending: pendingIds.has(service.id),
    onBook: handleBook,
    onPatientRegister: handlePatientRegister,
    onReceptionistOpen: (svc) => setReceptionistModal({ open: true, service: svc }),
    loading: service.id != null && loadingId === service.id,
  });

  // Lọc theo từ khoá: tên / mô tả / danh mục (tìm nhanh khi không nhớ rõ tên)
  const kw = search.trim().toLowerCase();
  const visible = kw
    ? services.filter((s) =>
        [s.serviceName, s.description, s.categoryName]
          .filter(Boolean)
          .some((v) => v.toLowerCase().includes(kw)))
    : services;

  return (
    <section ref={catalogRef} style={{ backgroundColor: "#f8fafc", padding: "64px 0", fontFamily: font }}>
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px" }}>
        {/* Header + search + view toggle */}
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 28, gap: 16, flexWrap: "wrap" }}>
          <div>
            <h2 style={{ fontSize: 28, fontWeight: 800, color: C.text, margin: "0 0 6px", letterSpacing: -0.3 }}>
              Danh mục dịch vụ
            </h2>
            <p style={{ fontSize: 14, color: C.textSub, margin: 0 }}>
              Tất cả dịch vụ khám và gói chăm sóc của phòng khám
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Input
              allowClear
              placeholder="Tìm dịch vụ theo từ khoá..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              prefix={<SearchOutlined style={{ color: C.textMuted }} />}
              style={{ width: 280, borderRadius: 8 }}
            />
            <div style={{ display: "flex", border: `1px solid ${C.border}`, borderRadius: 8, overflow: "hidden" }}>
              {[
                { mode: false, Icon: AppstoreOutlined },
                { mode: true, Icon: UnorderedListOutlined },
              ].map(({ mode, Icon }) => (
                <button
                  key={String(mode)}
                  onClick={() => setIsListMode(mode)}
                  style={{
                    backgroundColor: isListMode === mode ? C.primaryLight : C.surface,
                    color: isListMode === mode ? C.primary : C.textSub,
                    border: "none", borderRight: mode === false ? `1px solid ${C.border}` : "none",
                    padding: "8px 14px", cursor: "pointer", fontSize: 16,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    transition: "background-color 0.15s",
                  }}
                >
                  <Icon />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Cards */}
        {loading ? (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <Spin size="large" />
          </div>
        ) : visible.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: C.textMuted, fontSize: 15 }}>
            {kw ? `Không tìm thấy dịch vụ nào khớp "${search}".` : "Hiện chưa có dịch vụ nào."}
          </div>
        ) : (
          <div
            style={
              isListMode
                ? { display: "flex", flexDirection: "column", gap: 20 }
                : { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }
            }
          >
            {visible.map((s, i) => (
              <ServiceCard
                key={s.id ?? i}
                service={s}
                isListMode={isListMode}
                onOpenDetail={setDetail}
                actionProps={actionProps}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modal chi tiết */}
      <DetailModal service={detail} onClose={() => setDetail(null)} actionProps={actionProps} />

      {/* Patient confirm modal */}
      <Modal
        open={confirmModal.open}
        title={<span style={{ fontFamily: font, fontWeight: 700 }}>Xác nhận đăng ký dịch vụ</span>}
        onCancel={() => setConfirmModal({ open: false, service: null })}
        okText="Đăng ký ngay"
        cancelText="Hủy"
        okButtonProps={{
          loading: loadingId === confirmModal.service?.id,
          style: { backgroundColor: C.primary, borderColor: C.primary },
        }}
        onOk={handlePatientConfirm}
      >
        <div style={{ fontFamily: font }}>
          <p style={{ color: C.textSub, fontSize: 14 }}>Bạn muốn đăng ký gói dịch vụ:</p>
          <div style={{ backgroundColor: C.primaryLight, border: `1px solid ${C.primaryBorder}`, borderRadius: 10, padding: "14px 18px", marginTop: 8 }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: C.text }}>{confirmModal.service?.serviceName}</div>
            {confirmModal.service?.price && (
              <div style={{ color: C.primary, fontWeight: 700, marginTop: 4 }}>
                {formatPrice(confirmModal.service.price)}
              </div>
            )}
          </div>
          <p style={{ color: C.textSub, fontSize: 13, marginTop: 14, lineHeight: 1.6 }}>
            Sau khi đăng ký, đội ngũ phòng khám sẽ liên hệ với bạn để tư vấn và sắp xếp lịch hẹn phù hợp.
            Đăng ký này sẽ xuất hiện trong "Dịch vụ của tôi" ở trạng thái <strong>Chờ liên hệ tư vấn</strong>.
          </p>
        </div>
      </Modal>

      {/* Receptionist modal */}
      <ReceptionistModal
        open={receptionistModal.open}
        service={receptionistModal.service}
        onClose={() => setReceptionistModal({ open: false, service: null })}
        onConfirm={handleReceptionistConfirm}
        loading={loadingId === receptionistModal.service?.id}
      />
    </section>
  );
}

// ─── Page ─────────────────────────────────────────────────────────
export default function ServicePackagesPage() {
  const catalogRef = useRef(null);
  const { isAuthenticated, user } = useSelector((s) => s.auth);
  const role = user?.role ?? null;

  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  // serviceId mà bệnh nhân đang có đăng ký chờ tư vấn (PENDING) — chặn đăng ký trùng
  const [pendingIds, setPendingIds] = useState(new Set());

  useEffect(() => {
    serviceService
      .getAllServices()
      .then((res) => setServices(res.data ?? []))
      .catch(() => setServices([]))
      .finally(() => setLoading(false));
  }, []);

  // Bệnh nhân: lấy các đăng ký đang chờ tư vấn để khoá nút "Đăng ký ngay"
  useEffect(() => {
    if (isAuthenticated && role === "PATIENT") {
      serviceService
        .getMyRegistrations()
        .then((res) => {
          const ids = (res.data ?? [])
            .filter((r) => r.status === "PENDING")
            .map((r) => r.serviceId);
          setPendingIds(new Set(ids));
        })
        .catch(() => {});
    }
  }, [isAuthenticated, role]);

  const markPending = (serviceId) =>
    setPendingIds((prev) => new Set(prev).add(serviceId));

  return (
    <div style={{ fontFamily: font, color: C.text }}>
      <HeroSection
        onScrollToServices={() => catalogRef.current?.scrollIntoView({ behavior: "smooth" })}
      />
      <ServiceCatalog
        catalogRef={catalogRef}
        services={services}
        loading={loading}
        role={role}
        isAuthenticated={isAuthenticated}
        pendingIds={pendingIds}
        onRegistered={markPending}
      />
    </div>
  );
}
