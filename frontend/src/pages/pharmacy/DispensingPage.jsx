//Author: DucTKH - HE204463
//Created: 2026-06-01
//Last Update: 2026-07-21
// Màn hình quản lý Cấp phát thuốc dành cho Dược sĩ.
// Cho phép xem danh sách đơn thuốc chờ phát, xem chi tiết và xác nhận phát thuốc.
import React, { useState, useEffect } from 'react';
import { Table, Button, message, Modal, Tag, Spin, Space, Popconfirm, InputNumber, Tabs, Typography, Row, Col, Card, Statistic, Input, Select, DatePicker } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { prescriptionService } from '../../services/prescriptionService';
import { useSelector } from 'react-redux';

const { Title, Text } = Typography;

const PRESCRIPTION_STATUS_MAP = {
    PENDING: { color: 'orange', label: 'Chờ phát' },
    DISPENSED: { color: 'success', label: 'Đã phát' },
    SKIPPED: { color: 'error', label: 'Đã hủy / Bỏ qua' }
};

export default function DispensingPage() {
    const [prescriptions, setPrescriptions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedPrescription, setSelectedPrescription] = useState(null);
    const [editableItems, setEditableItems] = useState([]);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);

    const [searchText, setSearchText] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [dateFilter, setDateFilter] = useState(null);
    const [sortOrder, setSortOrder] = useState('DESC');

    useEffect(() => {
        fetchPendingPrescriptions();
    }, []);

    useEffect(() => {
        if (selectedPrescription) {
            setEditableItems(selectedPrescription.items?.map(item => ({ ...item })) || []);
        }
    }, [selectedPrescription]);

    // Chức năng: Lấy danh sách toàn bộ các đơn thuốc đang chờ phát (PENDING)
    async function fetchPendingPrescriptions() {
        setLoading(true);
        try {
            const res = await prescriptionService.getAll();
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

    // Chức năng: Đánh dấu hủy / bỏ qua đơn thuốc không phát (SKIPPED)
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

    // Chức năng: Tải và in file PDF của đơn thuốc
    const handlePrintPrescription = async (prescriptionId) => {
        if (!prescriptionId) {
            message.warning('Không tìm thấy ID đơn thuốc!');
            return;
        }
        setActionLoading(true);
        try {
            const response = await prescriptionService.downloadPdf(prescriptionId);
            const url = window.URL.createObjectURL(new Blob([response]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Don_Thuoc_${prescriptionId}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.parentNode.removeChild(link);
        } catch (error) {
            message.error('Không thể tải file đơn thuốc');
        } finally {
            setActionLoading(false);
        }
    };

    // Chức năng: Cập nhật số lượng thuốc thực tế khi phát và tính lại thành tiền
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
            render: (text, record) => (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontWeight: 600 }}>{text}</span>
                    {record.patientPhone && <span style={{ fontSize: '12px', color: '#64748b' }}>{record.patientPhone}</span>}
                </div>
            )
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
            render: (val) => new Date(val).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' })
        },
        {
            title: 'Trạng thái',
            dataIndex: 'status',
            key: 'status',
            render: (status) => {
                const info = PRESCRIPTION_STATUS_MAP[status] || { color: 'default', label: status };
                return <Tag color={info.color}>{info.label}</Tag>;
            }
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
                    disabled={selectedPrescription?.status !== 'PENDING'}
                />
            )
        },
        { title: 'Đơn giá', dataIndex: 'unitPrice', key: 'unitPrice', render: val => val ? val.toLocaleString('vi-VN') : '0' },
        { title: 'Thành tiền', dataIndex: 'totalPrice', key: 'totalPrice', render: (_, record) => ((record.quantity || 0) * (record.unitPrice || 0)).toLocaleString('vi-VN') + ' đ' },
        { title: 'Cách dùng', render: (_, record) => [record.dosage, record.frequency, record.instructions].filter(v => v && v !== '-').join('. ') },
    ];

    // Chức năng: Lọc danh sách đơn thuốc theo từ khóa tìm kiếm (Mã, Tên BN, SĐT), trạng thái, ngày tháng và sắp xếp
    const filteredPrescriptions = prescriptions.filter(p => {
        const matchSearch = p.patientName?.toLowerCase().includes(searchText.toLowerCase()) ||
            p.id?.toString().includes(searchText) ||
            p.patientPhone?.includes(searchText);
        const matchStatus = statusFilter === 'ALL' || p.status === statusFilter;
        let matchDate = true;
        if (dateFilter) {
            const recordDate = new Date(p.createdAt).setHours(0, 0, 0, 0);
            const filterDate = dateFilter.toDate().setHours(0, 0, 0, 0);
            matchDate = recordDate === filterDate;
        }
        return matchSearch && matchStatus && matchDate;
    }).sort((a, b) => {
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        return sortOrder === 'DESC' ? dateB - dateA : dateA - dateB;
    });

    return (
        <div style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <Title level={2} style={{ margin: 0 }}>Danh sách đơn thuốc chờ phát</Title>
                <Button onClick={fetchPendingPrescriptions} loading={loading}>Tải lại</Button>
            </div>

            {/* Summary Cards */}
            <Row gutter={12} style={{ marginBottom: 24 }}>
                {[
                    { label: 'Tổng', value: prescriptions.length, color: '#6366f1' },
                    { label: 'Chờ phát', value: prescriptions.filter(o => o.status === 'PENDING').length, color: '#f59e0b' },
                    { label: 'Đã phát', value: prescriptions.filter(o => o.status === 'DISPENSED').length, color: '#10b981' },
                    { label: 'Đã hủy', value: prescriptions.filter(o => o.status === 'SKIPPED').length, color: '#ef4444' },
                ].map(({ label, value, color }) => (
                    <Col key={label} flex="1">
                        <Card size="small" style={{ textAlign: 'center', borderTop: `3px solid ${color}` }}>
                            <Statistic
                                title={<span style={{ fontSize: 11 }}>{label}</span>}
                                value={value}
                                valueStyle={{ fontSize: 20, color }}
                            />
                        </Card>
                    </Col>
                ))}
            </Row>

            {/* Filters */}
            <Card style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', gap: 16 }}>
                    <Input
                        placeholder="Tìm theo Mã ĐT, Tên hoặc SĐT..."
                        prefix={<SearchOutlined />}
                        value={searchText}
                        onChange={e => setSearchText(e.target.value)}
                        style={{ width: 300 }}
                        allowClear
                    />
                    <Select value={statusFilter} onChange={setStatusFilter} style={{ width: 200 }}>
                        <Select.Option value="ALL">Tất cả trạng thái</Select.Option>
                        {Object.entries(PRESCRIPTION_STATUS_MAP).map(([key, { label }]) => (
                            <Select.Option key={key} value={key}>{label}</Select.Option>
                        ))}
                    </Select>
                    <DatePicker 
                        placeholder="Chọn ngày kê" 
                        format="DD/MM/YYYY" 
                        value={dateFilter} 
                        onChange={setDateFilter} 
                        style={{ width: 150 }} 
                        allowClear
                    />
                    <Select value={sortOrder} onChange={setSortOrder} style={{ width: 150 }}>
                        <Select.Option value="DESC">Mới nhất trước</Select.Option>
                        <Select.Option value="ASC">Cũ nhất trước</Select.Option>
                    </Select>
                </div>
            </Card>

            <Table
                columns={columns}
                dataSource={filteredPrescriptions}
                rowKey="id"
                loading={loading}
                pagination={{ pageSize: 10 }}
                style={{ backgroundColor: '#fff', borderRadius: '8px' }}
            />

            <Modal
                title={`Chi tiết đơn thuốc DT-${selectedPrescription?.id}`}
                open={isModalVisible}
                onCancel={() => setIsModalVisible(false)}
                width={900}
                footer={[
                    <Button key="cancel" onClick={() => setIsModalVisible(false)}>Đóng</Button>,
                    <Button
                        key="print"
                        onClick={() => handlePrintPrescription(selectedPrescription?.id)}
                        loading={actionLoading}
                    >
                        Xuất file đơn thuốc
                    </Button>,
                    selectedPrescription?.status === 'PENDING' && (
                        <Popconfirm
                            key="skip"
                            title="Xác nhận khách không mua thuốc?"
                            onConfirm={() => handleSkip(selectedPrescription?.id)}
                        >
                            <Button danger loading={actionLoading}>Khách không mua</Button>
                        </Popconfirm>
                    ),
                    selectedPrescription?.status === 'PENDING' && (
                        <Popconfirm
                            key="dispense"
                            title="Xác nhận đã phát đủ thuốc theo đơn?"
                            onConfirm={() => handleDispense(selectedPrescription?.id)}
                        >
                            <Button type="primary" style={{ backgroundColor: '#059669' }} loading={actionLoading}>Đã phát xong</Button>
                        </Popconfirm>
                    )
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
                    Tổng tiền: {editableItems.reduce((sum, item) => sum + ((item.quantity || 0) * (item.unitPrice || 0)), 0).toLocaleString('vi-VN')} VNĐ
                </div>
            </Modal>
        </div>
    );
}
