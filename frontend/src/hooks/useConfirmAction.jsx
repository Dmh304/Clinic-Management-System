import { Modal } from "antd";
import { ExclamationCircleFilled, CheckCircleFilled, CloseCircleFilled, InfoCircleFilled } from "@ant-design/icons";

const TYPE_CONFIG = {
  warning: {
    icon: <ExclamationCircleFilled style={{ color: "#faad14" }} />,
    okButtonProps: { style: { background: "#faad14", borderColor: "#faad14" } },
  },
  success: {
    icon: <CheckCircleFilled style={{ color: "#52c41a" }} />,
    okButtonProps: { style: { background: "#52c41a", borderColor: "#52c41a" } },
  },
  danger: {
    icon: <CloseCircleFilled style={{ color: "#ff4d4f" }} />,
    okButtonProps: { danger: true },
  },
  info: {
    icon: <InfoCircleFilled style={{ color: "#1677ff" }} />,
    okButtonProps: { type: "primary" },
  },
};
 
const useConfirmAction = () => {
  const [modal, contextHolder] = Modal.useModal();
 
  const confirmAction = ({
    type = "warning",
    title,
    description,
    details = [],       // [{ label, value }]
    confirmText = "Xác nhận",
    cancelText = "Hủy",
    onConfirm,
    onCancel,
  }) => {
    const config = TYPE_CONFIG[type] || TYPE_CONFIG.warning;
 
    const contentNode = (
      <div style={{ marginTop: 8 }}>
        {description && (
          <p style={{ marginBottom: details.length ? 12 : 0, color: "#555" }}>
            {description}
          </p>
        )}
        {details.length > 0 && (
          <div
            style={{
              background: "#fafafa",
              border: "1px solid #f0f0f0",
              borderRadius: 6,
              padding: "8px 12px",
            }}
          >
            {details.map(({ label, value }, idx) => (
              <div
                key={idx}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "3px 0",
                  fontSize: 13,
                  borderBottom: idx < details.length - 1 ? "1px dashed #f0f0f0" : "none",
                }}
              >
                <span style={{ color: "#888", fontWeight: 500 }}>{label}:</span>
                <span style={{ color: "#222", fontWeight: 600, marginLeft: 12 }}>{value}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
 
    modal.confirm({
      title,
      icon: config.icon,
      content: contentNode,
      okText: confirmText,
      cancelText,
      okButtonProps: config.okButtonProps,
      centered: true,
      maskClosable: false,
      onOk: async () => {
        if (onConfirm) await onConfirm();
      },
      onCancel: () => {
        if (onCancel) onCancel();
      },
    });
  };
 
  return { confirmAction, contextHolder };
};
 
export default useConfirmAction;