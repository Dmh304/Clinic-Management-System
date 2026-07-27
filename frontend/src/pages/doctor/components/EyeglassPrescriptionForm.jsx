/*
 * Author: DucTKH - HE204463
 * Created: 2026-06-22
 * Last Update: 2026-07-22
 */
import React, { useState, useEffect } from 'react';
import { Form, Input, Button, InputNumber, Select, message, Spin, Tag, Descriptions, Popconfirm } from 'antd';
import { eyeglassPrescriptionService } from '../../../services/eyeglassPrescriptionService';
import axiosClient from '../../../api/axiosClient';

const EyeFields = ({ prefix, label, isReadOnly, lockRefraction }) => (
    <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, padding: '14px 16px', marginBottom: 12 }}>
        <div style={{ fontWeight: 600, fontSize: 13, color: '#475569', marginBottom: 10 }}>{label}</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12 }}>
            <Form.Item label="SPH" name={`${prefix}Sph`} style={{ marginBottom: 0 }}>
                <InputNumber style={{ width: '100%' }} placeholder="0.00" step={0.25} disabled={isReadOnly || lockRefraction} />
            </Form.Item>
            <Form.Item label="CYL" name={`${prefix}Cyl`} style={{ marginBottom: 0 }}>
                <InputNumber style={{ width: '100%' }} placeholder="0.00" step={0.25} disabled={isReadOnly || lockRefraction} />
            </Form.Item>
            <Form.Item label="AXIS (°)" name={`${prefix}Axis`} style={{ marginBottom: 0 }}>
                <InputNumber style={{ width: '100%' }} placeholder="0" min={0} max={180} disabled={isReadOnly || lockRefraction} />
            </Form.Item>
            {/* ADD luôn cho phép nhập tay — không đo được từ khúc xạ kế, do bác sĩ quyết định */}
            <Form.Item label="ADD" name={`${prefix}Add`} style={{ marginBottom: 0 }}>
                <InputNumber style={{ width: '100%' }} placeholder="0.00" step={0.25} disabled={isReadOnly} />
            </Form.Item>
        </div>
        {lockRefraction && !isReadOnly && (
            <div style={{ fontSize: 12, color: '#0d9488', marginTop: 6 }}>
                SPH/CYL/AXIS được lấy tự động từ kết quả đo khúc xạ đã duyệt.
            </div>
        )}
    </div>
)

export default function EyeglassPrescriptionForm({ emr, isReadOnly, onPrescriptionSaved, onAutoSaveEMR }) {
    const [form] = Form.useForm();
    const [saving, setSaving] = useState(false);
    const [existingPrescriptions, setExistingPrescriptions] = useState([]);
    const [lensTypes, setLensTypes] = useState([]);
    const [editPrescriptionId, setEditPrescriptionId] = useState(null);
    const activeEmrIdRef = React.useRef(emr?.id);

    // Đã có kết quả khúc xạ từ Lab (được bác sĩ duyệt) hay chưa —
    // nếu có, SPH/CYL/AXIS sẽ tự điền và khóa; PD và ADD vẫn luôn nhập tay
    const hasLabRefraction = !!emr && (
        emr.sphL != null || emr.sphR != null ||
        emr.axisL != null || emr.axisR != null
    )

    useEffect(() => {
        if (hasLabRefraction) {
            form.setFieldsValue({
                odSph: emr.sphR, odCyl: emr.cylR, odAxis: emr.axisR,
                osSph: emr.sphL, osCyl: emr.cylL, osAxis: emr.axisL,
            })
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [emr?.sphL, emr?.sphR, emr?.cylL, emr?.cylR, emr?.axisL, emr?.axisR])

    // Chức năng: Lấy danh sách các loại tròng kính từ hệ thống để bác sĩ chọn
    useEffect(() => {
        const fetchLensTypes = async () => {
            try {
                // Tương tác API: Lấy danh mục tròng kính
                const res = await axiosClient.get('/v1/eyeglass-catalog/lens-types');
                setLensTypes(res.data || []);
            } catch (error) {
                console.error('Lỗi khi tải danh sách loại tròng kính', error);
            }
        };
        fetchLensTypes();
    }, []);

    useEffect(() => {
        activeEmrIdRef.current = emr?.id;
        if (emr?.patientId) {
            fetchExistingPrescriptions();
        }
    }, [emr?.patientId, emr?.id]);

    // Chức năng: Tải danh sách đơn kính đã được lưu cho bệnh án này (để hiển thị)
    const fetchExistingPrescriptions = async () => {
        try {
            const targetEmrId = activeEmrIdRef.current || emr?.id;
            if (!targetEmrId) return;
            // Tương tác API: Lấy đơn kính theo bệnh nhân
            const res = await eyeglassPrescriptionService.getByPatient(emr.patientId);
            const currentPrescriptions = (res.data || []).filter(p => p.medicalRecordId === targetEmrId);
            setExistingPrescriptions(currentPrescriptions);
        } catch (error) {
            console.error('Lỗi khi tải danh sách đơn kính đã lưu', error);
        }
    };

    // Chức năng: Xử lý lưu thông tin đo mắt và tròng kính thành một đơn kính mới
    const handleSave = async (values) => {
        let currentEmrId = activeEmrIdRef.current;
        // Điều kiện: Bệnh án phải được lưu trước khi có thể kê đơn kính
        if (!currentEmrId) {
            if (onAutoSaveEMR) {
                const savedEmr = await onAutoSaveEMR();
                if (savedEmr && savedEmr.id) {
                    currentEmrId = savedEmr.id;
                    activeEmrIdRef.current = currentEmrId;
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
            lensTypeId: values.lensTypeId,
            notes: values.notes || ''
        };

        setSaving(true);
        try {
            if (editPrescriptionId) {
                await eyeglassPrescriptionService.update(editPrescriptionId, payload);
                message.success('Cập nhật đơn kính thành công');
                setEditPrescriptionId(null);
            } else {
                await eyeglassPrescriptionService.create(payload);
                message.success('Kê đơn kính thành công');
            }
            fetchExistingPrescriptions();
            form.resetFields();
            if (onPrescriptionSaved) onPrescriptionSaved();
        } catch (error) {
            const errMsg = error.response?.data?.message || error.message || 'Lỗi không xác định';
            message.error(`Kê đơn kính thất bại: ${errMsg}`);
        } finally {
            setSaving(false);
        }
    };

    const hasPendingPrescription = existingPrescriptions.some(p => p.status === 'ISSUED');
    const isFormDisabled = isReadOnly || (hasPendingPrescription && !editPrescriptionId);

    // Watch the selected lens type to dynamically disable ADD fields
    const selectedLensTypeId = Form.useWatch('lensTypeId', form);
    const isSingleVision = React.useMemo(() => {
        const lt = lensTypes.find(l => l.id === selectedLensTypeId);
        return lt ? lt.name.toLowerCase().includes('đơn tròng') : false;
    }, [selectedLensTypeId, lensTypes]);

    const handleDeletePrescription = async (id) => {
        try {
            await eyeglassPrescriptionService.delete(id);
            message.success('Đã xóa đơn kính thành công');
            fetchExistingPrescriptions();
        } catch (error) {
            const errMsg = error.response?.data?.message || 'Xóa thất bại';
            message.error(errMsg);
        }
    };

    return (
        <div style={{ paddingTop: 12 }}>
            <Form component={false} form={form} layout="vertical" onFinish={handleSave} disabled={isFormDisabled}>
                <EyeFields prefix="od" label="Mắt phải (OD)" isReadOnly={isFormDisabled} lockRefraction={hasLabRefraction} />
                <EyeFields prefix="os" label="Mắt trái (OS)" isReadOnly={isFormDisabled} lockRefraction={hasLabRefraction} />

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16 }}>
                    <Form.Item label="Khoảng cách đồng tử (PD)" name="pd" rules={[{ required: true, message: 'Nhập PD' }]}>
                        <InputNumber style={{ width: '100%' }} placeholder="mm" />
                    </Form.Item>
                    <Form.Item label="Loại tròng kính" name="lensTypeId" rules={[{ required: true, message: 'Chọn loại tròng' }]}>
                        <Select 
                            placeholder="Chọn loại tròng"
                            onChange={(value) => {
                                const selected = lensTypes.find(lt => lt.id === value);
                                if (selected && selected.name.toLowerCase().includes('đơn tròng')) {
                                    // Tự động xóa độ ADD nếu lỡ nhập trước đó
                                    form.setFieldsValue({
                                        odAdd: null,
                                        osAdd: null
                                    });
                                    message.info('Đã xóa độ ADD vì Kính Đơn tròng không có thông số này.');
                                }
                            }}
                        >
                            {lensTypes.map(lt => (
                                <Select.Option key={lt.id} value={lt.id}>{lt.name}</Select.Option>
                            ))}
                        </Select>
                    </Form.Item>
                </div>

                <Form.Item label="Ghi chú đơn kính" name="notes">
                    <Input.TextArea rows={2} placeholder="Ghi chú thêm..." />
                </Form.Item>

                {!isFormDisabled && (
                    <div style={{ textAlign: 'right' }}>
                        {editPrescriptionId && (
                            <Button style={{ marginRight: 8 }} onClick={() => {
                                setEditPrescriptionId(null);
                                form.resetFields();
                            }}>
                                Hủy sửa
                            </Button>
                        )}
                        <Button type="primary" onClick={() => form.submit()} loading={saving} style={{ backgroundColor: '#0d9488', borderColor: '#0d9488' }}>
                            {editPrescriptionId ? 'Cập nhật đơn kính' : 'Phát đơn kính'}
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
                                <span>Đơn kính #{idx + 1} - Ngày kê: {new Date(p.createdAt).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
                                <Tag color="blue">Kính thuốc</Tag>
                                {p.status === 'ISSUED' && !isReadOnly && (
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <Button type="primary" size="small" onClick={() => {
                                            setEditPrescriptionId(p.id);
                                            form.setFieldsValue({
                                                odSph: p.odSph, odCyl: p.odCyl, odAxis: p.odAxis, odAdd: p.odAdd,
                                                osSph: p.osSph, osCyl: p.osCyl, osAxis: p.osAxis, osAdd: p.osAdd,
                                                pd: p.pd, lensTypeId: p.lensTypeId, notes: p.notes
                                            });
                                            message.info('Đã tải dữ liệu đơn kính để chỉnh sửa');
                                            window.scrollTo({ top: 0, behavior: 'smooth' });
                                        }}>
                                            Sửa
                                        </Button>
                                        <Popconfirm title="Bạn có chắc chắn muốn xóa đơn kính này không?" onConfirm={() => handleDeletePrescription(p.id)} okText="Có" cancelText="Không">
                                            <Button type="primary" danger size="small">Xóa đơn kính</Button>
                                        </Popconfirm>
                                    </div>
                                )}
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
                                    <b>{p.lensTypeName}</b>
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
