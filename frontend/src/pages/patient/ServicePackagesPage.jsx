import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { Modal, message, Input, Spin } from "antd";
import {
  AppstoreOutlined,
  UnorderedListOutlined,
  ClockCircleOutlined,
  CalendarOutlined,
  TeamOutlined,
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

// ─── Fallback khi API chưa có dữ liệu ───────────────────────────
const DEFAULT_SERVICES = [
  {
    id: null,
    badge: "Phổ biến",
    serviceName: "Gói Massage Mắt Thư Giãn",
    description:
      "Giảm căng thẳng mỏi mắt kỹ thuật số với liệu pháp massage kết hợp chườm ấm thảo dược.",
    thumbnailUrl:
      "https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?w=600&h=360&fit=crop&auto=format",
    features: [
      { icon: <ClockCircleOutlined />, text: "Thời lượng: 45 phút" },
      { icon: <CheckCircleOutlined />, text: "Massage cơ vòng mắt & Chườm ấm" },
    ],
    priceLabel: "Giá chỉ từ",
    price: 450000,
  },
  {
    id: null,
    badge: null,
    serviceName: "Thiền & Phục Hồi Thị Lực",
    description:
      "Liệu trình phục hồi tự nhiên thông qua các bài tập điều tiết mắt và thiền định sâu.",
    thumbnailUrl:
      "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=600&h=360&fit=crop&auto=format",
    features: [
      { icon: <CalendarOutlined />, text: "Liệu trình: 4 tuần (8 buổi)" },
      { icon: <CheckCircleOutlined />, text: "Hướng dẫn bởi chuyên gia nhãn khoa" },
    ],
    priceLabel: "Giá trọn gói",
    price: 2800000,
  },
  {
    id: null,
    badge: null,
    serviceName: "Combo Chăm Sóc Gia Đình",
    description:
      "Gói khám tổng quát và thư giãn cho tối đa 4 thành viên với chi phí tối ưu nhất.",
    thumbnailUrl:
      "https://images.unsplash.com/photo-1573497491765-dccce02b29df?w=600&h=360&fit=crop&auto=format",
    features: [
      { icon: <TeamOutlined />, text: "Dành cho: 4 người" },
      { icon: <CheckCircleOutlined />, text: "Tầm soát khúc xạ & Thư giãn mắt" },
    ],
    priceLabel: "Giá ưu đãi",
    price: 5200000,
  },
];

function formatPrice(price) {
  if (!price && price !== 0) return "—";
  return new Intl.NumberFormat("vi-VN").format(price) + "đ";
}

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
          maxWidth: 1280,
          margin: "0 auto",
          padding: "0 24px",
          display: "flex",
          alignItems: "center",
          gap: 56,
        }}
      >
        {/* Left */}
        <div style={{ flex: 1, maxWidth: 540 }}>
          <span
            style={{
              display: "inline-block",
              backgroundColor: "#0d9488",
              color: "#fff",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: 1,
              padding: "4px 12px",
              borderRadius: 999,
              marginBottom: 20,
            }}
          >
            CHĂM SÓC TOÀN DIỆN
          </span>

          <h1
            style={{
              fontSize: 40,
              fontWeight: 800,
              color: "#0f172a",
              lineHeight: 1.2,
              margin: "0 0 18px",
              letterSpacing: -0.5,
            }}
          >
            Gói dịch vụ chăm sóc mắt
          </h1>

          <p
            style={{
              fontSize: 15,
              color: C.textSub,
              lineHeight: 1.75,
              margin: "0 0 32px",
              maxWidth: 440,
            }}
          >
            Khám phá các gói dịch vụ phục hồi và thư giãn được thiết kế riêng
            biệt để giúp đôi mắt của bạn luôn sáng khỏe trong kỷ nguyên số.
            Từ liệu pháp massage đến các khóa thiền định thị giác chuyên sâu.
          </p>

          <div style={{ display: "flex", gap: 12 }}>
            <button
              onClick={onScrollToServices}
              style={{
                backgroundColor: C.primary,
                color: "#fff",
                border: "none",
                borderRadius: 8,
                padding: "12px 24px",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: font,
                transition: "background-color 0.15s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = C.primaryDark)}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = C.primary)}
            >
              Xem các gói dịch vụ
            </button>
            <button
              style={{
                backgroundColor: "#fff",
                color: C.primary,
                border: `1.5px solid ${C.primaryBorder}`,
                borderRadius: 8,
                padding: "12px 24px",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: font,
                transition: "background-color 0.15s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = C.primaryLight)}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#fff")}
            >
              Tư vấn ngay
            </button>
          </div>
        </div>

        {/* Right image */}
        <div
          style={{
            flex: "0 0 420px",
            height: 320,
            borderRadius: 20,
            overflow: "hidden",
            boxShadow: "0 16px 48px rgba(29,78,216,.18)",
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

// ─── Register button (role-aware) ────────────────────────────────
function RegisterButton({ service, role, isAuthenticated, onPatientRegister, onReceptionistOpen, loading }) {
  const navigate = useNavigate();

  if (!isAuthenticated) {
    return (
      <button
        onClick={() => navigate("/login")}
        style={{
          backgroundColor: C.primaryLight,
          color: C.primary,
          border: `1px solid ${C.primaryBorder}`,
          borderRadius: 8,
          padding: "9px 18px",
          fontSize: 13,
          fontWeight: 600,
          cursor: "pointer",
          fontFamily: font,
          display: "flex",
          alignItems: "center",
          gap: 6,
          whiteSpace: "nowrap",
        }}
      >
        <LockOutlined style={{ fontSize: 12 }} />
        Đăng nhập để đăng ký
      </button>
    );
  }

  if (role === "PATIENT") {
    return (
      <button
        onClick={() => service.id && onPatientRegister(service)}
        disabled={!service.id || loading}
        style={{
          backgroundColor: service.id ? C.primary : "#d1d5db",
          color: "#fff",
          border: "none",
          borderRadius: 8,
          padding: "9px 20px",
          fontSize: 13,
          fontWeight: 600,
          cursor: service.id && !loading ? "pointer" : "default",
          fontFamily: font,
          whiteSpace: "nowrap",
          transition: "background-color 0.15s",
          opacity: loading ? 0.75 : 1,
        }}
        onMouseEnter={(e) => { if (service.id && !loading) e.currentTarget.style.backgroundColor = C.primaryDark; }}
        onMouseLeave={(e) => { if (service.id) e.currentTarget.style.backgroundColor = C.primary; }}
      >
        {loading ? "Đang xử lý..." : "Đăng ký ngay"}
      </button>
    );
  }

  if (role === "RECEPTIONIST") {
    return (
      <button
        onClick={() => service.id && onReceptionistOpen(service)}
        disabled={!service.id}
        style={{
          backgroundColor: service.id ? C.teal : "#d1d5db",
          color: "#fff",
          border: "none",
          borderRadius: 8,
          padding: "9px 20px",
          fontSize: 13,
          fontWeight: 600,
          cursor: service.id ? "pointer" : "default",
          fontFamily: font,
          whiteSpace: "nowrap",
          transition: "background-color 0.15s",
        }}
        onMouseEnter={(e) => { if (service.id) e.currentTarget.style.backgroundColor = "#0f766e"; }}
        onMouseLeave={(e) => { if (service.id) e.currentTarget.style.backgroundColor = C.teal; }}
      >
        Đăng ký cho BN
      </button>
    );
  }

  // Read-only — DOCTOR, ADMIN, MANAGER...
  return (
    <button
      disabled
      style={{
        backgroundColor: "#f1f5f9",
        color: C.textMuted,
        border: `1px solid ${C.border}`,
        borderRadius: 8,
        padding: "9px 20px",
        fontSize: 13,
        fontWeight: 500,
        cursor: "not-allowed",
        fontFamily: font,
        whiteSpace: "nowrap",
      }}
    >
      Chỉ xem
    </button>
  );
}

// ─── Service card ─────────────────────────────────────────────────
function ServiceCard({ service, isListMode, role, isAuthenticated, onPatientRegister, onReceptionistOpen, loadingId }) {
  const [hovered, setHovered] = useState(false);

  const features = service.features ?? (
    service.durationMinutes
      ? [{ icon: <ClockCircleOutlined />, text: `Thời lượng: ${service.durationMinutes} phút` }]
      : []
  );

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        backgroundColor: C.surface,
        borderRadius: 20,
        overflow: "hidden",
        border: `1px solid ${hovered ? "#bfdbfe" : C.border}`,
        boxShadow: hovered ? C.shadowHover : C.shadow,
        display: "flex",
        flexDirection: isListMode ? "row" : "column",
        transform: hovered ? "translateY(-3px)" : "none",
        transition: "box-shadow 0.2s, transform 0.2s, border-color 0.2s",
        fontFamily: font,
      }}
    >
      {/* Image */}
      <div
        style={{
          position: "relative",
          flexShrink: 0,
          height: isListMode ? "auto" : 200,
          width: isListMode ? 240 : "100%",
          background: "#dbeafe",
          overflow: "hidden",
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
              position: "absolute",
              top: 12,
              right: 12,
              backgroundColor: "#0d9488",
              color: "#fff",
              fontSize: 11,
              fontWeight: 700,
              padding: "4px 10px",
              borderRadius: 999,
            }}
          >
            {service.badge}
          </span>
        )}
      </div>

      {/* Body */}
      <div style={{ padding: "24px 28px", flex: 1, display: "flex", flexDirection: "column" }}>
        <h3 style={{ fontSize: 17, fontWeight: 700, color: C.text, margin: "0 0 8px" }}>
          {service.serviceName}
        </h3>

        <p style={{ fontSize: 13, color: C.textSub, lineHeight: 1.65, margin: "0 0 16px", flex: 1 }}>
          {service.description}
        </p>

        {features.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 7, marginBottom: 18 }}>
            {features.map((f, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: C.textSub }}>
                <span style={{ color: "#0d9488", flexShrink: 0 }}>{f.icon}</span>
                {f.text}
              </div>
            ))}
          </div>
        )}

        {/* Price + CTA */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderTop: `1px solid ${C.border}`,
            paddingTop: 18,
            gap: 12,
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
          <RegisterButton
            service={service}
            role={role}
            isAuthenticated={isAuthenticated}
            onPatientRegister={onPatientRegister}
            onReceptionistOpen={onReceptionistOpen}
            loading={service.id != null && loadingId === service.id}
          />
        </div>
      </div>
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

// ─── Service catalog ──────────────────────────────────────────────
function ServiceCatalog({ catalogRef, services, loading, role, isAuthenticated }) {
  const [isListMode, setIsListMode] = useState(false);
  const [loadingId, setLoadingId] = useState(null);
  const [confirmModal, setConfirmModal] = useState({ open: false, service: null });
  const [receptionistModal, setReceptionistModal] = useState({ open: false, service: null });

  const handlePatientRegister = (service) => setConfirmModal({ open: true, service });

  const handlePatientConfirm = async () => {
    const { service } = confirmModal;
    setLoadingId(service.id);
    try {
      await serviceService.register({ serviceId: service.id });
      message.success(`Đăng ký "${service.serviceName}" thành công! Chúng tôi sẽ liên hệ sớm.`);
      setConfirmModal({ open: false, service: null });
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

  return (
    <section ref={catalogRef} style={{ backgroundColor: "#f8fafc", padding: "64px 0", fontFamily: font }}>
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 36 }}>
          <div>
            <h2 style={{ fontSize: 28, fontWeight: 800, color: C.text, margin: "0 0 6px", letterSpacing: -0.3 }}>
              Danh mục dịch vụ
            </h2>
            <p style={{ fontSize: 14, color: C.textSub, margin: 0 }}>
              Chọn gói giải pháp phù hợp nhất với nhu cầu của bạn
            </p>
          </div>
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
                  border: "none",
                  borderRight: mode === false ? `1px solid ${C.border}` : "none",
                  padding: "8px 14px",
                  cursor: "pointer",
                  fontSize: 16,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "background-color 0.15s",
                }}
              >
                <Icon />
              </button>
            ))}
          </div>
        </div>

        {/* Cards */}
        {loading ? (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <Spin size="large" />
          </div>
        ) : (
          <div
            style={
              isListMode
                ? { display: "flex", flexDirection: "column", gap: 20 }
                : { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }
            }
          >
            {services.map((s, i) => (
              <ServiceCard
                key={s.id ?? i}
                service={s}
                isListMode={isListMode}
                role={role}
                isAuthenticated={isAuthenticated}
                onPatientRegister={handlePatientRegister}
                onReceptionistOpen={(svc) => setReceptionistModal({ open: true, service: svc })}
                loadingId={loadingId}
              />
            ))}
          </div>
        )}
      </div>

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
            Sau khi đăng ký, đội ngũ phòng khám sẽ liên hệ với bạn để xác nhận và sắp xếp lịch hẹn phù hợp.
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

  useEffect(() => {
    serviceService
      .getServicesByType('CARE')
      .then((res) => {
        const data = res.data ?? [];
        setServices(data.length > 0 ? data : DEFAULT_SERVICES);
      })
      .catch(() => setServices(DEFAULT_SERVICES))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ fontFamily: font, color: C.text }}>
      <HeroSection
        onScrollToServices={() =>
          catalogRef.current?.scrollIntoView({ behavior: "smooth" })
        }
      />
      <ServiceCatalog
        catalogRef={catalogRef}
        services={services}
        loading={loading}
        role={role}
        isAuthenticated={isAuthenticated}
      />
    </div>
  );
}
