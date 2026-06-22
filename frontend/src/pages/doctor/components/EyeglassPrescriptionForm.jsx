import React, { useState } from 'react';
import { Form, Input, Button, InputNumber, Select, message, Spin, Tag, Descriptions } from 'antd';
import { eyeglassPrescriptionService } from '../../../services/eyeglassPrescriptionService';

const EyeFields = ({ prefix, label, isReadOnly }) => (
    <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, padding: '14px 16px', marginBottom: 12 }}>
        <div style={{ fontWeight: 600, fontSize: 13, color: '#475569', marginBottom: 10 }}>{label}</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12 }}>
            <Form.Item label="SPH" name={`${prefix}Sph`} style={{ marginBottom: 0 }}>
                <InputNumber style={{ width: '100%' }} placeholder="0.00" step={0.25} disabled={isReadOnly} />
            </Form.Item>
            <Form.Item label="CYL" name={`${prefix}Cyl`} style={{ marginBottom: 0 }}>
                <InputNumber style={{ width: '100%' }} placeholder="0.00" step={0.25} disabled={isReadOnly} />
            </Form.Item>
            <Form.Item label="AXIS (°)" name={`${prefix}Axis`} style={{ marginBottom: 0 }}>
                <InputNumber style={{ width: '100%' }} placeholder="0" min={0} max={180} disabled={isReadOnly} />
            </Form.Item>
            <Form.Item label="ADD" name={`${prefix}Add`} style={{ marginBottom: 0 }}>
                <InputNumber style={{ width: '100%' }} placeholder="0.00" step={0.25} disabled={isReadOnly} />
            </Form.Item>
        </div>
    </div>
);

export default function EyeglassPrescriptionForm({ emr, isReadOnly, onPrescriptionSaved, onAutoSaveEMR }) {
    const [form] = Form.useForm();
    const [saving, setSaving] = useState(false);
    const [existingPrescriptions, setExistingPrescriptions] = useState([]);
    const activeEmrIdRef = React.useRef(emr?.id);

    React.useEffect(() => {
        activeEmrIdRef.current = emr?.id;
        if (emr?.patientId) {
            fetchExistingPrescriptions();
        }
    }, [emr?.patientId, emr?.id]);

    const fetchExistingPrescriptions = async () => {
        try {
            const res = await eyeglassPrescriptionService.getByPatient(emr.patientId);
            const currentPrescriptions = (res.data || []).filter(p => p.medicalRecordId === emr.id);
            setExistingPrescriptions(currentPrescriptions);
        } catch (error) {
            console.error('Lỗi khi tải danh sách đơn kính đã lưu', error);
        }
    };

    const handleSave = async (values) => {
        let currentEmrId = activeEmrIdRef.current;
        if (!currentEmrId) {
            if (onAutoSaveEMR) {
                const savedEmr = await onAutoSaveEMR();
                if (savedEmr && savedEmr.id) {
                    currentEmrId = savedEmr.id;
                } else {
                    return; // Save failed
                }
            } else {
                message.warning('Vui lòng lưu bệnh án trước khi kê đơn kính');
                return;
            }
        }

        const payload = {
            medicalRecordId: currentEmrId,
            odSph: values.odSph,
            odCyl: values.odCyl,
            odAxis: values.odAxis,
            odAdd: values.odAdd,
            osSph: values.osSph,
            osCyl: values.osCyl,
            osAxis: values.osAxis,
            osAdd: values.osAdd,
            pd: values.pd,
            lensType: values.lensType,
            notes: values.notes || ''
        };

        setSaving(true);
        try {
            await eyeglassPrescriptionService.create(payload);
            message.success('Kê đơn kính thành công');
            fetchExistingPrescriptions();
            form.resetFields();
            if (onPrescriptionSaved) onPrescriptionSaved();
        } catch (error) {
            message.error('Kê đơn kính thất bại');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div style={{ paddingTop: 12 }}>
            <Form component={false} form={form} layout="vertical" onFinish={handleSave} disabled={isReadOnly}>
                <EyeFields prefix="od" label="Mắt phải (OD)" isReadOnly={isReadOnly} />
                <EyeFields prefix="os" label="Mắt trái (OS)" isReadOnly={isReadOnly} />
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16 }}>
                    <Form.Item label="Khoảng cách đồng tử (PD)" name="pd" rules={[{ required: true, message: 'Nhập PD' }]}>
                        <InputNumber style={{ width: '100%' }} placeholder="mm" />
                    </Form.Item>
                    <Form.Item label="Loại tròng kính" name="lensType" rules={[{ required: true, message: 'Chọn loại tròng' }]}>
                        <Select placeholder="Chọn loại tròng">
                            <Select.Option value="Đơn tròng">Đơn tròng</Select.Option>
                            <Select.Option value="Đa tròng">Đa tròng</Select.Option>
                            <Select.Option value="Hai tròng">Hai tròng</Select.Option>
                            <Select.Option value="Chống ánh sáng xanh">Chống ánh sáng xanh</Select.Option>
                            <Select.Option value="Khác">Khác</Select.Option>
                        </Select>
                    </Form.Item>
                </div>

                <Form.Item label="Ghi chú đơn kính" name="notes">
                    <Input.TextArea rows={2} placeholder="Ghi chú thêm..." />
                </Form.Item>

                {!isReadOnly && (
                    <div style={{ textAlign: 'right' }}>
                        <Button type="primary" onClick={() => form.submit()} loading={saving} style={{ backgroundColor: '#0d9488', borderColor: '#0d9488' }}>
                            Lưu đơn kính
                        </Button>
                    </div>
                )}
            </Form>

            {existingPrescriptions.length > 0 && (
                <div style={{ marginTop: 24, borderTop: '1px solid #f1f5f9', paddingTop: 16 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 600, color: '#0f172a', marginBottom: 12 }}>Các đơn kính đã kê trong phiên khám này:</h3>
                    {existingPrescriptions.map((p, idx) => (
                        <div key={p.id} style={{ marginBottom: 16, padding: 16, backgroundColor: '#f8fafc', borderRadius: 8 }}>
                            <div style={{ fontWeight: 500, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
                                <span>Đơn kính #{idx + 1} - Ngày kê: {new Date(p.createdAt).toLocaleString('vi-VN')}</span>
                                <Tag color="blue">Kính thuốc</Tag>
                            </div>
                            
                            <Descriptions bordered size="small" column={2}>
                                <Descriptions.Item label="Mắt phải (OD)">
                                    SPH: <b>{p.odSph}</b>, CYL: <b>{p.odCyl}</b>, AXIS: <b>{p.odAxis}°</b>, ADD: <b>{p.odAdd}</b>
                                </Descriptions.Item>
                                <Descriptions.Item label="Mắt trái (OS)">
                                    SPH: <b>{p.osSph}</b>, CYL: <b>{p.osCyl}</b>, AXIS: <b>{p.osAxis}°</b>, ADD: <b>{p.osAdd}</b>
                                </Descriptions.Item>
                                <Descriptions.Item label="Khoảng cách đồng tử (PD)">
                                    <b>{p.pd} mm</b>
                                </Descriptions.Item>
                                <Descriptions.Item label="Loại tròng kính">
                                    <b>{p.lensType}</b>
                                </Descriptions.Item>
                                {p.notes && (
                                    <Descriptions.Item label="Ghi chú" span={2}>
                                        {p.notes}
                                    </Descriptions.Item>
                                )}
                            </Descriptions>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
