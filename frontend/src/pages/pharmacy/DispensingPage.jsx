import React, { useState, useEffect } from 'react';
import { Table, Button, message, Modal, Tag, Spin, Space, Popconfirm } from 'antd';
import { prescriptionService } from '../../services/prescriptionService';

export default function DispensingPage() {
    const [prescriptions, setPrescriptions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedPrescription, setSelectedPrescription] = useState(null);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);

    useEffect(() => {
        fetchPendingPrescriptions();
    }, []);

    const fetchPendingPrescriptions = async () => {
        setLoading(true);
        try {
            const res = await prescriptionService.getPending();
            setPrescriptions(res.data || []);
        } catch (error) {
            message.error('Lỗi khi tải danh sách đơn thuốc');
        } finally {
            setLoading(false);
        }
    };

    const handleDispense = async (id) => {
        setActionLoading(true);
        try {
            await prescriptionService.dispense(id);
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

    const itemColumns = [
        { title: 'Tên thuốc', dataIndex: 'medicineName', key: 'name', render: (text, record) => <b>{text} ({record.dosageForm})</b> },
        { title: 'ĐVT', dataIndex: 'unit', key: 'unit', width: 80 },
        { title: 'Số lượng', dataIndex: 'quantity', key: 'quantity', width: 100, render: (val) => <span style={{ fontWeight: 600, color: '#0d9488' }}>{val}</span> },
        { title: 'Số ngày', dataIndex: 'duration', key: 'duration' },
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
                width={800}
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
                    dataSource={selectedPrescription?.items || []} 
                    rowKey="id" 
                    pagination={false} 
                    size="small"
                />
            </Modal>
        </div>
    );
}
