// DucTKH
// Component form kê đơn thuốc cho bác sĩ
import React, { useState, useEffect, useRef } from 'react';
import { Form, Input, Button, Table, InputNumber, message, AutoComplete, Popconfirm, Modal, Tag } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
import { medicineService } from '../../../services/medicineService';
import { prescriptionService } from '../../../services/prescriptionService';

export default function DrugPrescriptionForm({ emr, isReadOnly, appointmentId, onPrescriptionSaved }) {
    const [form] = Form.useForm();
    const [medicines, setMedicines] = useState([]);
    const [selectedItems, setSelectedItems] = useState([]);
    const [searchKeyword, setSearchKeyword] = useState('');
    const [notes, setNotes] = useState('');
    const [existingPrescriptions, setExistingPrescriptions] = useState([]);
    
    // Preview Modal state
    const [previewVisible, setPreviewVisible] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (emr?.patientId) {
            fetchExistingPrescriptions();
        }
    }, [emr?.patientId, emr?.id]);

    const fetchExistingPrescriptions = async () => {
        try {
            const res = await prescriptionService.getByPatient(emr.patientId);
            const currentPrescriptions = (res.data || []).filter(p => p.medicalRecordId === emr.id);
            setExistingPrescriptions(currentPrescriptions);
        } catch (error) {
            console.error('Lỗi khi tải danh sách đơn thuốc đã lưu', error);
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchMedicines(searchKeyword);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchKeyword]);

    const fetchMedicines = async (keyword) => {
        try {
            const res = await medicineService.getAll(keyword);
            setMedicines(res.data || []);
        } catch (error) {
            console.error('Lỗi khi tải danh sách thuốc', error);
        }
    };

    const handleSelectMedicine = (val, option) => {
        const medicine = option.data;
        if (selectedItems.find(item => item.medicineId === medicine.id)) {
            message.warning('Thuốc này đã được thêm vào đơn');
            return;
        }
        
        setSelectedItems([...selectedItems, {
            medicineId: medicine.id,
            medicineName: medicine.name,
            dosageForm: medicine.dosageForm,
            unit: medicine.unit,
            quantity: 1,
            duration: 1,
            instructions: ''
        }]);
        setSearchKeyword('');
    };

    const handleRemoveItem = (id) => {
        setSelectedItems(selectedItems.filter(item => item.medicineId !== id));
    };

    const updateItem = (id, field, value) => {
        setSelectedItems(selectedItems.map(item => {
            if (item.medicineId === id) {
                return { ...item, [field]: value };
            }
            return item;
        }));
    };

    const activeEmrIdRef = useRef(null);

    const handlePreview = async () => {
        let currentEmrId = emr?.id;
        
        if (!currentEmrId) {
            if (onAutoSaveEMR) {
                const savedEmr = await onAutoSaveEMR();
                if (!savedEmr || !savedEmr.id) {
                    return; // Save failed, user must retry
                }
                currentEmrId = savedEmr.id;
            } else {
                message.warning('Vui lòng lưu bệnh án trước khi kê đơn');
                return;
            }
        }

        if (selectedItems.length === 0) {
            message.warning('Đơn thuốc phải có ít nhất 1 loại thuốc');
            return;
        }

        activeEmrIdRef.current = currentEmrId;
        setPreviewVisible(true);
    };

    const confirmSave = async () => {
        const payload = {
            medicalRecordId: activeEmrIdRef.current || emr?.id,
            notes: notes || '',
            items: selectedItems.map(item => ({
                medicineId: item.medicineId,
                quantity: item.quantity,
                dosage: '-', // Default empty to satisfy DB NOT NULL constraint while keeping UI clean
                frequency: '-', // Default empty to satisfy DB NOT NULL constraint while keeping UI clean
                duration: item.duration,
                instructions: item.instructions || ''
            }))
        };

        setSaving(true);
        try {
            await prescriptionService.create(payload);
            message.success('Kê đơn thuốc thành công');
            setPreviewVisible(false);
            setSelectedItems([]);
            setNotes('');
            fetchExistingPrescriptions();
            if (onPrescriptionSaved) onPrescriptionSaved();
        } catch (error) {
            console.error('Lỗi khi lưu đơn thuốc:', error);
            const errMsg = error.response?.data?.message || error.message || 'Kê đơn thất bại';
            message.error(`Kê đơn thất bại: ${errMsg}`);
        } finally {
            setSaving(false);
        }
    };

    const columns = [
        {
            title: 'Tên thuốc',
            dataIndex: 'medicineName',
            key: 'name',
            render: (text, record) => (
                <div>
                    <div style={{ fontWeight: 600 }}>{text}</div>
                    <div style={{ fontSize: 12, color: '#64748b' }}>ĐVT: {record.unit}</div>
                </div>
            )
        },
        {
            title: 'Số lượng',
            dataIndex: 'quantity',
            key: 'quantity',
            width: 100,
            render: (val, record) => (
                <InputNumber 
                    min={1} 
                    value={val} 
                    onChange={v => updateItem(record.medicineId, 'quantity', v)} 
                    disabled={isReadOnly}
                    style={{ width: '100%' }}
                />
            )
        },
        {
            title: 'Số ngày',
            dataIndex: 'duration',
            key: 'duration',
            width: 90,
            render: (val, record) => (
                <InputNumber 
                    min={1} 
                    value={val} 
                    onChange={v => updateItem(record.medicineId, 'duration', v)}
                    disabled={isReadOnly}
                    style={{ width: '100%' }}
                />
            )
        },
        {
            title: 'Hướng dẫn (Liều & Lần)',
            dataIndex: 'instructions',
            key: 'instructions',
            render: (val, record) => (
                <Input 
                    value={val} 
                    onChange={e => updateItem(record.medicineId, 'instructions', e.target.value)}
                    disabled={isReadOnly}
                    placeholder="VD: Sáng 1 viên, tối 1 viên sau ăn..."
                />
            )
        },
        {
            title: '',
            key: 'action',
            width: 50,
            render: (_, record) => !isReadOnly && (
                <Popconfirm title="Xóa thuốc này?" onConfirm={() => handleRemoveItem(record.medicineId)}>
                    <Button type="text" danger icon={<DeleteOutlined />} />
                </Popconfirm>
            )
        }
    ];

    const autocompleteOptions = medicines.map(m => ({
        value: m.name,
        label: (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>{m.name} ({m.unit})</span>
            </div>
        ),
        data: m
    }));

    const handleDeletePrescription = async (id) => {
        try {
            // Tương tác API - Gọi service để xóa đơn thuốc
            await prescriptionService.delete(id);
            message.success('Đã xóa đơn thuốc thành công');
            // Cập nhật lại danh sách đơn thuốc sau khi xóa
            fetchExistingPrescriptions();
        } catch (error) {
            console.error('Lỗi khi xóa đơn thuốc:', error);
            // Điều kiện - Hiển thị lỗi từ server nếu có, ngược lại dùng lỗi mặc định
            const errMsg = error.response?.data?.message || 'Xóa thất bại';
            message.error(errMsg);
        }
    };

    return (
        <div style={{ paddingTop: 12 }}>
            {!isReadOnly && (
                <div style={{ marginBottom: 16 }}>
                    <AutoComplete
                        style={{ width: '100%', maxWidth: 500 }}
                        options={autocompleteOptions}
                        onSelect={handleSelectMedicine}
                        onSearch={setSearchKeyword}
                        value={searchKeyword}
                        onChange={setSearchKeyword}
                        placeholder="Tìm kiếm thuốc để thêm vào đơn..."
                        allowClear
                    />
                </div>
            )}

            <Table 
                dataSource={selectedItems}
                columns={columns}
                rowKey="medicineId"
                pagination={false}
                size="small"
                style={{ marginBottom: 16 }}
            />

            <div style={{ marginBottom: 16 }}>
                <div style={{ marginBottom: 8, fontWeight: 500 }}>Ghi chú đơn thuốc</div>
                <Input.TextArea 
                    rows={2} 
                    value={notes} 
                    onChange={e => setNotes(e.target.value)} 
                    disabled={isReadOnly} 
                    placeholder="Ghi chú thêm cho dược sĩ hoặc bệnh nhân..." 
                />
            </div>

            {!isReadOnly && (
                <div style={{ textAlign: 'right' }}>
                    <Button type="primary" onClick={handlePreview} style={{ backgroundColor: '#0d9488', borderColor: '#0d9488' }}>
                        Lưu đơn thuốc
                    </Button>
                </div>
            )}

            {/* Modal xác nhận lưu đơn thuốc */}
            <Modal
                title="Xác nhận Đơn thuốc"
                open={previewVisible}
                onCancel={() => setPreviewVisible(false)}
                footer={[
                    <Button key="back" onClick={() => setPreviewVisible(false)}>
                        Quay lại sửa
                    </Button>,
                    <Button key="submit" type="primary" loading={saving} onClick={confirmSave} style={{ backgroundColor: '#0d9488', borderColor: '#0d9488' }}>
                        Đồng ý gửi Dược sĩ
                    </Button>,
                ]}
                width={700}
            >
                <div style={{ marginBottom: 16 }}>
                    <p style={{ color: '#4b5563', marginBottom: 12 }}>
                        Vui lòng kiểm tra lại danh sách thuốc trước khi gửi cho bộ phận Dược để phát thuốc:
                    </p>
                    <Table 
                        dataSource={selectedItems}
                        rowKey="medicineId"
                        pagination={false}
                        size="small"
                        columns={[
                            { title: 'Tên thuốc', dataIndex: 'medicineName', key: 'name', render: (t, r) => <b>{t}</b> },
                            { title: 'ĐVT', dataIndex: 'unit', key: 'unit' },
                            { title: 'Số lượng', dataIndex: 'quantity', key: 'quantity' },
                            { title: 'Hướng dẫn', dataIndex: 'instructions', key: 'instructions' }
                        ]}
                    />
                </div>
                {notes && (
                    <div>
                        <b>Ghi chú đơn thuốc:</b> {notes}
                    </div>
                )}
            </Modal>

            {existingPrescriptions.length > 0 && (
                <div style={{ marginTop: 24, borderTop: '1px solid #f1f5f9', paddingTop: 16 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 600, color: '#0f172a', marginBottom: 12 }}>Các đơn thuốc đã kê trong phiên khám này:</h3>
                    {existingPrescriptions.map((p, idx) => (
                        <div key={p.id} style={{ marginBottom: 16, padding: 16, backgroundColor: '#f8fafc', borderRadius: 8 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                <div style={{ fontWeight: 500 }}>
                                    Đơn thuốc #{idx + 1} - Ngày kê: {new Date(p.createdAt).toLocaleString('vi-VN')}
                                    <span style={{ marginLeft: 12 }}>Trạng thái: </span>
                                    <Tag color={p.status === 'PENDING' ? 'blue' : p.status === 'DISPENSED' ? 'green' : 'red'}>
                                        {p.status === 'PENDING' ? 'Chưa phát' : p.status === 'DISPENSED' ? 'Đã phát' : 'Hủy'}
                                    </Tag>
                                </div>
                                {p.status === 'PENDING' && !isReadOnly && (
                                    <Popconfirm title="Bạn có chắc chắn muốn xóa đơn thuốc này không?" onConfirm={() => handleDeletePrescription(p.id)} okText="Có" cancelText="Không">
                                        <Button type="primary" danger size="small">Xóa đơn thuốc</Button>
                                    </Popconfirm>
                                )}
                            </div>
                            {p.notes && <div style={{ fontSize: 13, color: '#64748b', marginBottom: 8 }}>Ghi chú: {p.notes}</div>}
                            <Table 
                                dataSource={p.items} 
                                rowKey="id" 
                                pagination={false} 
                                size="small"
                                columns={[
                                    { title: 'Tên thuốc', dataIndex: 'medicineName', render: (t, r) => <b>{t} ({r.dosageForm})</b> },
                                    { title: 'Bác sĩ kê', dataIndex: 'quantity', width: 90 },
                                    { title: 'Dược sĩ phát', render: (_, r) => r.actualQuantity != null ? r.actualQuantity : '-', width: 110 },
                                    { title: 'ĐVT', dataIndex: 'unit', width: 70 },
                                    { title: 'Cách dùng', render: (_, r) => r.instructions }
                                ]}
                            />
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
