// DucTKH
// Màn hình quản lý Cấp phát thuốc dành cho Dược sĩ.
// Cho phép xem danh sách đơn thuốc chờ phát, xem chi tiết và xác nhận phát thuốc.
import React, { useState, useEffect } from 'react';
import { Table, Button, message, Modal, Tag, Spin, Space, Popconfirm, InputNumber, Tabs } from 'antd';
import { prescriptionService } from '../../services/prescriptionService';
import { eyeglassPrescriptionService } from '../../services/eyeglassPrescriptionService';

export default function DispensingPage() {
    const [prescriptions, setPrescriptions] = useState([]);
    const [eyePrescriptions, setEyePrescriptions] = useState([]);
    const [activeTab, setActiveTab] = useState('1');
    const [loading, setLoading] = useState(false);
    const [selectedPrescription, setSelectedPrescription] = useState(null);
    const [editableItems, setEditableItems] = useState([]);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);

    useEffect(() => {
        fetchPendingPrescriptions();
    }, []);

    useEffect(() => {
        if (selectedPrescription) {
            setEditableItems(selectedPrescription.items?.map(item => ({ ...item })) || []);
        }
    }, [selectedPrescription]);

    const fetchPendingPrescriptions = async () => {
        setLoading(true);
        try {
            const [res1, res2] = await Promise.all([
                prescriptionService.getPending(),
                eyeglassPrescriptionService.getPending()
            ]);
            setPrescriptions(res1.data || []);
            setEyePrescriptions(res2.data || []);
        } catch (error) {
            message.error('Lỗi khi tải danh sách đơn thuốc/đơn kính');
        } finally {
            setLoading(false);
        }
    };

    const handleDispense = async (id) => {
        setActionLoading(true);
        try {
            // Chuẩn bị dữ liệu payload gửi lên server bao gồm số lượng thực tế dược sĩ đã chỉnh sửa
            const payload = {
                // Vòng lặp - Duyệt qua danh sách thuốc đang hiển thị để lấy số lượng mới nhất
                items: editableItems.map(item => ({
                    prescriptionItemId: item.id,
                    actualQuantity: item.quantity
                }))
            };
            // Tương tác API - Gọi hàm dispense từ prescriptionService
            await prescriptionService.dispense(id, payload);
            message.success('Phát thuốc thành công');
            setIsModalVisible(false);
            fetchPendingPrescriptions();
        } catch (error) {
            message.error(error?.response?.data?.message || 'Phát thuốc thất bại');
        } finally {
            setActionLoading(false);
        }
    };

    const handleSkip = async (id) => {
        setActionLoading(true);
        try {
            await prescriptionService.skip(id);
            message.success('Đã cập nhật trạng thái: Không mua');
            setIsModalVisible(false);
            fetchPendingPrescriptions();
        } catch (error) {
            message.error('Cập nhật thất bại');
        } finally {
            setActionLoading(false);
        }
    };

    const handleDispenseEye = async (id) => {
        try {
            await eyeglassPrescriptionService.dispense(id);
            message.success('Phát đơn kính thành công');
            fetchPendingPrescriptions();
        } catch (error) {
            message.error('Phát đơn kính thất bại');
        }
    };

    const handleSkipEye = async (id) => {
        try {
            await eyeglassPrescriptionService.skip(id);
            message.success('Đã hủy đơn kính');
            fetchPendingPrescriptions();
        } catch (error) {
            message.error('Hủy đơn kính thất bại');
        }
    };

    const handleQuantityChange = (index, newVal) => {
        const newItems = [...editableItems];
        newItems[index].quantity = newVal || 0;
        newItems[index].totalPrice = newItems[index].quantity * (newItems[index].unitPrice || 0);
        setEditableItems(newItems);
    };

    const columns = [
        {
            title: 'Mã ĐT',
            dataIndex: 'id',
            key: 'id',
            width: 80,
            render: (id) => `DT-${id}`
        },
        {
            title: 'Bệnh nhân',
            dataIndex: 'patientName',
            key: 'patientName',
            render: (text) => <span style={{ fontWeight: 600 }}>{text}</span>
        },
        {
            title: 'Bác sĩ kê đơn',
            dataIndex: 'doctorName',
            key: 'doctorName',
        },
        {
            title: 'Ngày kê',
            dataIndex: 'createdAt',
            key: 'createdAt',
            render: (val) => new Date(val).toLocaleString('vi-VN')
        },
        {
            title: 'Trạng thái',
            dataIndex: 'status',
            key: 'status',
            render: (status) => (
                <Tag color={status === 'PENDING' ? 'processing' : 'default'}>
                    {status === 'PENDING' ? 'Chờ phát' : status}
                </Tag>
            )
        },
        {
            title: 'Hành động',
            key: 'action',
            render: (_, record) => (
                <Button type="primary" size="small" onClick={() => {
                    setSelectedPrescription(record);
                    setIsModalVisible(true);
                }}>
                    Xem chi tiết
                </Button>
            )
        }
    ];

    const eyeColumns = [
        {
            title: 'Mã ĐK',
            dataIndex: 'id',
            key: 'id',
            width: 80,
            render: (id) => `DK-${id}`
        },
        {
            title: 'Bệnh nhân',
            dataIndex: 'patientName',
            key: 'patientName',
            render: (text) => <span style={{ fontWeight: 600 }}>{text}</span>
        },
        {
            title: 'Bác sĩ đo',
            dataIndex: 'doctorName',
            key: 'doctorName',
        },
        {
            title: 'Ngày kê',
            dataIndex: 'createdAt',
            key: 'createdAt',
            render: (val) => new Date(val).toLocaleString('vi-VN')
        },
        {
            title: 'Trạng thái',
            dataIndex: 'status',
            key: 'status',
            render: (status) => (
                <Tag color={status === 'PENDING' ? 'processing' : 'default'}>
                    {status === 'PENDING' ? 'Chờ duyệt' : status}
                </Tag>
            )
        },
        {
            title: 'Hành động',
            key: 'action',
            render: (_, record) => (
                <Space>
                    <Popconfirm 
                        title="Xác nhận duyệt đơn kính?" 
                        onConfirm={() => handleDispenseEye(record.id)}
                    >
                        <Button type="primary" size="small" style={{ backgroundColor: '#059669' }}>Duyệt</Button>
                    </Popconfirm>
                    <Popconfirm 
                        title="Hủy đơn kính?" 
                        onConfirm={() => handleSkipEye(record.id)}
                    >
                        <Button danger size="small">Hủy</Button>
                    </Popconfirm>
                </Space>
            )
        }
    ];

    const itemColumns = [
        { title: 'Tên thuốc', dataIndex: 'medicineName', key: 'name', render: (text, record) => <b>{text} ({record.dosageForm})</b> },
        { title: 'ĐVT', dataIndex: 'unit', key: 'unit', width: 80 },
        { 
            title: 'Số lượng', 
            dataIndex: 'quantity', 
            key: 'quantity', 
            width: 120, 
            render: (val, record, index) => (
                <InputNumber 
                    min={0} 
                    value={val} 
                    onChange={(newVal) => handleQuantityChange(index, newVal)} 
                />
            ) 
        },
        { title: 'Đơn giá', dataIndex: 'unitPrice', key: 'unitPrice', render: val => val ? val.toLocaleString('vi-VN') : '0' },
        { title: 'Thành tiền', dataIndex: 'totalPrice', key: 'totalPrice', render: (_, record) => ((record.quantity || 0) * (record.unitPrice || 0)).toLocaleString('vi-VN') + ' đ' },
        { title: 'Cách dùng', render: (_, record) => [record.dosage, record.frequency, record.instructions].filter(v => v && v !== '-').join('. ') },
    ];

    return (
        <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h2 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#0f172a' }}>Danh sách đơn thuốc chờ phát</h2>
                <Button onClick={fetchPendingPrescriptions} loading={loading}>Tải lại</Button>
            </div>

            <div style={{ backgroundColor: '#fff', padding: 24, borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <Table 
                    columns={columns} 
                    dataSource={prescriptions} 
                    rowKey="id" 
                    loading={loading}
                    pagination={{ pageSize: 10 }}
                />
            </div>

            <Modal
                title={`Chi tiết đơn thuốc DT-${selectedPrescription?.id}`}
                open={isModalVisible}
                onCancel={() => setIsModalVisible(false)}
                width={900}
                footer={[
                    <Button key="cancel" onClick={() => setIsModalVisible(false)}>Đóng</Button>,
                    <Popconfirm 
                        key="skip" 
                        title="Xác nhận khách không mua thuốc?" 
                        onConfirm={() => handleSkip(selectedPrescription?.id)}
                    >
                        <Button danger loading={actionLoading}>Khách không mua</Button>
                    </Popconfirm>,
                    <Popconfirm 
                        key="dispense" 
                        title="Xác nhận đã phát đủ thuốc theo đơn?" 
                        onConfirm={() => handleDispense(selectedPrescription?.id)}
                    >
                        <Button type="primary" style={{ backgroundColor: '#059669' }} loading={actionLoading}>Đã phát xong</Button>
                    </Popconfirm>
                ]}
            >
                {selectedPrescription?.notes && (
                    <div style={{ marginBottom: 16, padding: '12px 16px', backgroundColor: '#fef3c7', borderRadius: 8, color: '#92400e' }}>
                        <b>Ghi chú của bác sĩ: </b> {selectedPrescription.notes}
                    </div>
                )}
                
                <Table 
                    columns={itemColumns} 
                    dataSource={editableItems} 
                    rowKey="id" 
                    pagination={false} 
                    size="small"
                />

                <div style={{ marginTop: 16, textAlign: 'right', fontSize: 18, fontWeight: 'bold', color: '#1677ff' }}>
                    Tổng tiền dự kiến: {editableItems.reduce((sum, item) => sum + ((item.quantity || 0) * (item.unitPrice || 0)), 0).toLocaleString('vi-VN')} VNĐ
                </div>
            </Modal>
        </div>
    );
}
