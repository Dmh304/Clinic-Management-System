import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Modal, message, Input, Select, DatePicker } from "antd";
import { LockOutlined, CheckCircleOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { patientService } from "../../services/patientService";
import { disabledClinicDate, disabledClinicTime, validateClinicTime } from "../../constants/clinicInfo";
import { C, font, formatPrice, isClinical } from "./serviceUtils";

export function ReadOnlyButton() {
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

// ─── Nút hành động (theo loại dịch vụ + vai trò) ──────────────────
export function ActionButton({
  service, role, isAuthenticated,
  onBook, onCareBook, onReceptionistOpen, loading, block,
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

  // ── Gói chăm sóc → tự đặt lịch ngay (chọn giờ, không qua bước chờ tư vấn) ──
  if (role === "PATIENT") {
    return (
      <button
        onClick={stop(() => service.id && onCareBook(service))}
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
        {loading ? "Đang xử lý..." : "Đặt lịch ngay"}
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

// Nhãn loại dịch vụ
export function TypeTag({ service }) {
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

export function InfoBox({ label, value, highlight }) {
  return (
    <div style={{ background: highlight ? C.primaryLight : "#f8fafc", borderRadius: 10, padding: "10px 14px" }}>
      <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 15, fontWeight: 700, color: highlight ? C.primary : C.text }}>{value}</div>
    </div>
  );
}

// ─── Receptionist: tìm bệnh nhân + chọn giờ → đăng ký & đặt buổi luôn ─────
// Đăng ký hộ do lễ tân thực hiện coi như đã "được đồng ý" ngay (lễ tân đang
// trao đổi trực tiếp với bệnh nhân) nên gọi thẳng registerAtCounter — không
// qua bước "chờ liên hệ tư vấn" như đăng ký online của bệnh nhân tự làm.
export function ReceptionistModal({ open, service, onClose, onConfirm, loading }) {
  const [keyword, setKeyword] = useState("");
  const [patients, setPatients] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [scheduledDateTime, setScheduledDateTime] = useState(null);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!open) { setKeyword(""); setPatients([]); setSelectedId(null); setScheduledDateTime(null); setNotes(""); }
  }, [open]);

  const handleSearch = async (value) => {
    setKeyword(value || "");
    if (!value || value.trim().length < 2) {
      setPatients([]);
      return;
    }
    setSearching(true);
    try {
      const res = await patientService.searchPatients(value.trim());
      setPatients(res.data ?? []);
    } catch {
      message.error("Không thể tìm kiếm bệnh nhân");
    } finally {
      setSearching(false);
    }
  };

  const timeError = scheduledDateTime ? validateClinicTime(scheduledDateTime, dayjs) : null;
  const canConfirm = !!selectedId && !!scheduledDateTime && !timeError;

  return (
    <Modal
      open={open}
      title={<span style={{ fontFamily: font, fontWeight: 700 }}>Đăng ký dịch vụ cho bệnh nhân</span>}
      onCancel={onClose}
      okText="Xác nhận đăng ký & đặt buổi"
      cancelText="Hủy"
      okButtonProps={{ disabled: !canConfirm, loading, style: { backgroundColor: C.primary, borderColor: C.primary } }}
      onOk={() => canConfirm && onConfirm({ patientId: selectedId, scheduledDateTime, notes })}
      width={520}
      destroyOnHidden
    >
      <div style={{ fontFamily: font }}>
        <div style={{ backgroundColor: C.primaryLight, border: `1px solid ${C.primaryBorder}`, borderRadius: 10, padding: "12px 16px", marginBottom: 20 }}>
          <strong style={{ color: C.text }}>{service?.serviceName}</strong>
          {service?.price != null && (
            <span style={{ color: C.primary, marginLeft: 8, fontWeight: 700 }}>
              — {formatPrice(service.price)}
            </span>
          )}
        </div>

        <p style={{ fontSize: 13, color: C.textSub, marginBottom: 6 }}>Bệnh nhân:</p>
        <Select
          showSearch
          filterOption={false}
          placeholder="Nhập ít nhất 2 ký tự (tên hoặc số điện thoại)..."
          value={selectedId}
          onSearch={handleSearch}
          onChange={setSelectedId}
          loading={searching}
          notFoundContent={keyword.trim().length < 2 ? "Nhập ít nhất 2 ký tự để tìm kiếm" : (searching ? "Đang tìm..." : "Không tìm thấy bệnh nhân")}
          style={{ width: "100%", marginBottom: 16 }}
          options={patients.map((p) => ({
            label: `${p.fullName}${p.phone ? " — " + p.phone : ""}${p.email ? " — " + p.email : ""}`,
            value: p.id,
          }))}
          suffixIcon={selectedId ? <CheckCircleOutlined style={{ color: C.accent }} /> : undefined}
        />

        <p style={{ fontSize: 13, color: C.textSub, marginBottom: 6 }}>Chọn ngày giờ buổi đầu tiên:</p>
        <DatePicker
          showTime={{ format: "HH:mm" }}
          format="DD/MM/YYYY HH:mm"
          placeholder="Chọn ngày giờ"
          value={scheduledDateTime}
          onChange={setScheduledDateTime}
          disabledDate={(current) => disabledClinicDate(current, dayjs)}
          disabledTime={(current) => disabledClinicTime(current, dayjs)}
          style={{ width: "100%", marginBottom: 6 }}
        />
        {timeError && (
          <p style={{ color: "#dc2626", fontSize: 12, margin: "0 0 10px" }}>{timeError}</p>
        )}

        <p style={{ fontSize: 13, color: C.textSub, margin: "14px 0 6px" }}>Ghi chú (tùy chọn):</p>
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

// ─── Bệnh nhân: tự đặt lịch ngay cho gói chăm sóc (chọn giờ + ghi chú) ─────
export function CareBookingModal({ open, service, onClose, onConfirm, loading }) {
  const [scheduledDateTime, setScheduledDateTime] = useState(null);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!open) { setScheduledDateTime(null); setNotes(""); }
  }, [open]);

  const timeError = scheduledDateTime ? validateClinicTime(scheduledDateTime, dayjs) : null;
  const canConfirm = !!scheduledDateTime && !timeError;

  return (
    <Modal
      open={open}
      title={<span style={{ fontFamily: font, fontWeight: 700 }}>Đặt lịch dịch vụ</span>}
      onCancel={onClose}
      okText="Xác nhận đặt lịch"
      cancelText="Hủy"
      okButtonProps={{
        disabled: !canConfirm,
        loading,
        style: { backgroundColor: C.primary, borderColor: C.primary },
      }}
      onOk={() => canConfirm && onConfirm({ scheduledDateTime, notes })}
      width={480}
      destroyOnHidden
    >
      <div style={{ fontFamily: font }}>
        <div style={{ backgroundColor: C.primaryLight, border: `1px solid ${C.primaryBorder}`, borderRadius: 10, padding: "12px 16px", marginBottom: 20 }}>
          <strong style={{ color: C.text }}>{service?.serviceName}</strong>
          {service?.price != null && (
            <span style={{ color: C.primary, marginLeft: 8, fontWeight: 700 }}>
              — {formatPrice(service.price)}
            </span>
          )}
        </div>

        <p style={{ fontSize: 13, color: C.textSub, marginBottom: 6 }}>Chọn ngày giờ buổi đầu tiên:</p>
        <DatePicker
          showTime={{ format: "HH:mm" }}
          format="DD/MM/YYYY HH:mm"
          placeholder="Chọn ngày giờ"
          value={scheduledDateTime}
          onChange={setScheduledDateTime}
          disabledDate={(current) => disabledClinicDate(current, dayjs)}
          disabledTime={(current) => disabledClinicTime(current, dayjs)}
          style={{ width: "100%", marginBottom: 6 }}
        />
        {timeError && (
          <p style={{ color: "#dc2626", fontSize: 12, margin: "0 0 10px" }}>{timeError}</p>
        )}

        <p style={{ fontSize: 13, color: C.textSub, margin: "14px 0 6px" }}>Ghi chú (tùy chọn):</p>
        <Input.TextArea
          rows={3}
          placeholder="Ghi chú về yêu cầu hoặc tình trạng sức khỏe..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />

        <p style={{ color: C.textSub, fontSize: 12, marginTop: 14, lineHeight: 1.6 }}>
          Gói dịch vụ sẽ được kích hoạt và giữ buổi hẹn ngay khi bạn xác nhận. Thanh toán được thực hiện
          trực tiếp tại phòng khám sau khi trải nghiệm dịch vụ.
        </p>
      </div>
    </Modal>
  );
}
