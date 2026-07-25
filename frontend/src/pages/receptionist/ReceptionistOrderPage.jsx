/*
 * Author: DucTKH - HE204463
 * Created: 2026-06-22
 * Last Update: 2026-07-22
 */
import React, { useState, useEffect } from 'react';
import { Table, Button, Tag, Space, message, Modal, Typography, Card, Spin, Select, Form, Input } from 'antd';
import { CheckOutlined, PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import { useSelector } from 'react-redux';

const { Title, Text } = Typography;

export default function ReceptionistOrderPage() {
    const { token } = useSelector(s => s.auth);
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(false);

    // Modals visibility
    const [detailModalVisible, setDetailModalVisible] = useState(false);
    const [createModalVisible, setCreateModalVisible] = useState(false);
    const [updateModalVisible, setUpdateModalVisible] = useState(false);

    // States for data
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [prescriptionDetails, setPrescriptionDetails] = useState(null);
    const [fetchingDetails, setFetchingDetails] = useState(false);
    const [pendingPrescriptions, setPendingPrescriptions] = useState([]);

    // For Update Order
    const [frames, setFrames] = useState([]);
    const [coatings, setCoatings] = useState([]);
    const [updateForm] = Form.useForm();
    const [updating, setUpdating] = useState(false);

    const navigate = useNavigate();

    useEffect(() => {
        fetchOrders();
        fetchCatalog();
    }, []);

    const fetchOrders = async () => {
        setLoading(true);
        try {
            // Lấy tất cả đơn hàng thay vì chỉ pending để có thể quản lý
            const res = await axios.get('http://localhost:8080/api/v1/eyeglass-orders/pending', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setOrders(res.data?.data ?? res.data ?? []);
        } catch (error) {
            message.error('Lỗi khi tải danh sách đơn kính');
        } finally {
            setLoading(false);
        }
    };

    const fetchCatalog = async () => {
        try {
            const fRes = await axiosClient.get('/v1/eyeglass-catalog/frames');
            setFrames(fRes.filter(f => f.status === 'ACTIVE'));
            const cRes = await axiosClient.get('/v1/eyeglass-catalog/coatings');
            setCoatings(cRes);
        } catch (error) {
            console.error('Lỗi tải catalog', error);
        }
    };

    const fetchPendingPrescriptions = async () => {
        try {
            const res = await axiosClient.get('/v1/eyeglass-prescriptions/pending');
            const validPrescriptions = (res.data || []).filter(p => !p.isExpired && !p.hasNewer);
            setPendingPrescriptions(validPrescriptions);
        } catch (error) {
            message.error('Lỗi tải toa kính');
        }
    };

    const handleConfirm = (orderId) => {
        Modal.confirm({
            title: 'Xác nhận cọc',
            content: 'Bạn đã thu tiền cọc và muốn chuyển đơn này xuống xưởng cắt kính?',
            okText: 'Xác nhận',
            cancelText: 'Hủy',
            onOk: async () => {
                try {
                    await axios.patch(`http://localhost:8080/api/v1/eyeglass-orders/${orderId}/confirm`, {}, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    message.success('Xác nhận thành công!');
                    setDetailModalVisible(false);
                    fetchOrders();
                } catch (error) {
                    message.error(error.response?.data?.message || 'Có lỗi xảy ra');
                }
            }
        });
    };

    const handleCancelOrder = (orderId) => {
        let cancelReason = '';
        Modal.confirm({
            title: 'Xóa / Hủy Đơn Kính',
            content: (
                <div>
                    <p>Nhập lý do hủy đơn (ví dụ: Khách không mua nữa, Khách trả lại...):</p>
                    <Input.TextArea rows={3} onChange={e => cancelReason = e.target.value} placeholder="Lý do hủy..." />
                </div>
            ),
            okText: 'Xác nhận Hủy',
            okButtonProps: { danger: true },
            cancelText: 'Đóng',
            onOk: async () => {
                if (!cancelReason.trim()) {
                    message.error('Vui lòng nhập lý do hủy');
                    return Promise.reject();
                }
                try {
                    await axios.patch(`http://localhost:8080/api/v1/eyeglass-orders/${orderId}/cancel`, { cancelReason }, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    message.success('Hủy đơn thành công!');
                    setDetailModalVisible(false);
                    fetchOrders();
                } catch (error) {
                    message.error(error.response?.data?.message || 'Lỗi khi hủy đơn');
                }
            }
        });
    };

    const handleViewDetails = async (record) => {
        setSelectedOrder(record);
        setDetailModalVisible(true);
        setFetchingDetails(true);
        try {
            const res = await axios.get(`http://localhost:8080/api/v1/eyeglass-prescriptions/${record.prescriptionId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setPrescriptionDetails(res.data.data);
        } catch (error) {
            message.error('Không thể tải chi tiết đơn kính');
            setPrescriptionDetails(null);
        } finally {
            setFetchingDetails(false);
        }
    };

    const openCreateModal = () => {
        fetchPendingPrescriptions();
        setCreateModalVisible(true);
    };

    const openUpdateModal = () => {
        const frame = frames.find(f => f.name === selectedOrder?.frameName);

        updateForm.setFieldsValue({
            frameId: frame?.id,
            coatingIds: []
        });
        setUpdateModalVisible(true);
    };

    const handleUpdateOrder = async (values) => {
        setUpdating(true);
        try {
            await axios.put(`http://localhost:8080/api/v1/eyeglass-orders/${selectedOrder.id}`, {
                prescriptionId: selectedOrder.prescriptionId,
                frameId: values.frameId,
                coatingIds: values.coatingIds || []
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            message.success('Cập nhật đơn kính thành công!');
            setUpdateModalVisible(false);
            setDetailModalVisible(false);
            fetchOrders();
        } catch (error) {
            message.error(error.response?.data?.message || 'Lỗi khi cập nhật đơn');
        } finally {
            setUpdating(false);
        }
    };

    const columns = [
        { title: 'Mã đơn', dataIndex: 'id', key: 'id' },
        { title: 'Bệnh nhân', dataIndex: 'patientName', key: 'patientName' },
        { title: 'Tổng tiền', dataIndex: 'totalAmount', key: 'totalAmount', render: val => (val || 0).toLocaleString('vi-VN') + ' đ' },
        {
            title: 'Trạng thái', dataIndex: 'status', key: 'status', render: val => (
                <Tag color={val === 'PENDING_CONFIRMATION' ? 'orange' : 'blue'}>
                    {val === 'PENDING_CONFIRMATION' ? 'Chờ xác nhận cọc' : 'Đang xử lý'}
                </Tag>
            )
        },
        { title: 'Ngày tạo', dataIndex: 'createdAt', key: 'createdAt', render: val => new Date(val).toLocaleString('vi-VN') },
        {
            title: 'Thao tác',
            key: 'action',
            render: (_, record) => (
                <Button size="small" type="primary" onClick={() => handleViewDetails(record)}>
                    Xem chi tiết
                </Button>
            )
        }
    ];

    return (
        <div style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <Title level={2} style={{ margin: 0 }}>Quản lý Đơn Đặt Kính</Title>
                <Button type="primary" icon={<PlusOutlined />} size="large" onClick={openCreateModal}>
                    Tạo Đơn Mới (Bệnh nhân tại quầy)
                </Button>
            </div>

            <Card>
                <Table
                    dataSource={orders}
                    columns={columns}
                    rowKey="id"
                    loading={loading}
                    bordered
                />
            </Card>

            {/* View Details Modal */}
            <Modal
                title={`Chi tiết Đơn Đặt Kính #${selectedOrder?.id}`}
                open={detailModalVisible}
                onCancel={() => setDetailModalVisible(false)}
                width={700}
                footer={[
                    <Button key="close" onClick={() => setDetailModalVisible(false)}>
                        Đóng
                    </Button>,
                    selectedOrder?.status === 'PENDING_CONFIRMATION' && (
                        <Button key="update" icon={<EditOutlined />} onClick={openUpdateModal}>
                            Cập nhật (Sửa đơn)
                        </Button>
                    ),
                    selectedOrder?.status === 'PENDING_CONFIRMATION' && (
                        <Button key="cancel" danger icon={<DeleteOutlined />} onClick={() => handleCancelOrder(selectedOrder.id)}>
                            Xóa / Hủy Đơn
                        </Button>
                    ),
                    selectedOrder?.status === 'PENDING_CONFIRMATION' && (
                        <Button key="confirm" type="primary" icon={<CheckOutlined />} onClick={() => handleConfirm(selectedOrder.id)}>
                            Xác nhận cọc
                        </Button>
                    )
                ].filter(Boolean)}
            >
                {fetchingDetails ? (
                    <div style={{ textAlign: 'center', padding: '20px' }}><Spin /></div>
                ) : (
                    <div>
                        <Card size="small" title="Thông tin chung" style={{ marginBottom: 16 }}>
                            <p><b>Bệnh nhân:</b> {selectedOrder?.patientName}</p>
                            <p><b>SĐT:</b> {selectedOrder?.patientPhone || 'Chưa cập nhật'} - <b>Giới tính:</b> {selectedOrder?.patientGender === 'MALE' ? 'Nam' : selectedOrder?.patientGender === 'FEMALE' ? 'Nữ' : 'Chưa cập nhật'} - <b>Năm sinh:</b> {selectedOrder?.patientDob ? new Date(selectedOrder.patientDob).getFullYear() : 'Chưa cập nhật'}</p>
                            <p><b>Địa chỉ:</b> {selectedOrder?.patientAddress || 'Chưa cập nhật'}</p>
                            <p><b>Gọng kính:</b> {selectedOrder?.frameName || 'Không có'}</p>
                            <p><b>Lớp phủ:</b> {selectedOrder?.coatings?.join(', ') || 'Không có'}</p>
                            <p><b>Tổng tiền cọc (Tạm tính):</b> <span style={{ color: '#1677ff', fontWeight: 'bold' }}>{(selectedOrder?.totalAmount || 0).toLocaleString('vi-VN')} đ</span></p>
                        </Card>

                        {prescriptionDetails && (
                            <Card size="small" title="Chi tiết toa kính (Thông số mài lắp)" style={{ marginBottom: 16 }}>
                                <p><b>Loại tròng kính:</b> {prescriptionDetails.lensTypeName} - <b>Giá:</b> {(prescriptionDetails.lensTypePrice || 0).toLocaleString('vi-VN')} đ</p>
                                <Table
                                    dataSource={[
                                        { key: 'OD', eye: 'Mắt phải (OD)', sph: prescriptionDetails.odSph, cyl: prescriptionDetails.odCyl, ax: prescriptionDetails.odAxis, add: prescriptionDetails.odAdd },
                                        { key: 'OS', eye: 'Mắt trái (OS)', sph: prescriptionDetails.osSph, cyl: prescriptionDetails.osCyl, ax: prescriptionDetails.osAxis, add: prescriptionDetails.osAdd }
                                    ]}
                                    pagination={false}
                                    size="small"
                                    columns={[
                                        { title: 'Mắt', dataIndex: 'eye', key: 'eye', width: '25%' },
                                        { title: 'SPH', dataIndex: 'sph', key: 'sph', render: v => v ? Number(v).toFixed(2) : '' },
                                        { title: 'CYL', dataIndex: 'cyl', key: 'cyl', render: v => v ? Number(v).toFixed(2) : '' },
                                        { title: 'AXIS', dataIndex: 'ax', key: 'ax' },
                                        { title: 'ADD', dataIndex: 'add', key: 'add', render: v => v ? Number(v).toFixed(2) : '' }
                                    ]}
                                />
                                {prescriptionDetails.pd && (
                                    <p style={{ marginTop: 12 }}><b>Khoảng cách đồng tử (PD):</b> {prescriptionDetails.pd} mm</p>
                                )}
                            </Card>
                        )}
                    </div>
                )}
            </Modal>

            {/* Create Order Modal */}
            <Modal
                title="Tạo Đơn Kính Mới"
                open={createModalVisible}
                onCancel={() => setCreateModalVisible(false)}
                footer={null}
            >
                <div style={{ padding: '20px 0' }}>
                    <p>Chọn Toa Kính Của Bệnh Nhân (Chưa có đơn hàng):</p>
                    <Select
                        showSearch
                        style={{ width: '100%', marginBottom: 20 }}
                        placeholder="Tìm kiếm bệnh nhân hoặc mã toa..."
                        optionFilterProp="children"
                        onChange={(val) => {
                            setCreateModalVisible(false);
                            navigate(`/v1/receptionist/order-glasses/${val}`);
                        }}
                    >
                        {pendingPrescriptions.map(p => (
                            <Select.Option key={p.id} value={p.id}>
                                Toa số #{p.id} - Bệnh nhân: {p.patientName} (Bác sĩ: {p.doctorName})
                            </Select.Option>
                        ))}
                    </Select>
                    {pendingPrescriptions.length === 0 && (
                        <Text type="danger">Không có toa kính nào đang chờ đặt!</Text>
                    )}
                </div>
            </Modal>

            {/* Update Order Modal */}
            <Modal
                title={`Cập nhật Đơn Kính #${selectedOrder?.id}`}
                open={updateModalVisible}
                onCancel={() => setUpdateModalVisible(false)}
                onOk={() => updateForm.submit()}
                confirmLoading={updating}
            >
                <Form form={updateForm} layout="vertical" onFinish={handleUpdateOrder}>
                    <Form.Item
                        label="Gọng kính"
                        name="frameId"
                        rules={[{ required: true, message: 'Vui lòng chọn gọng kính' }]}
                    >
                        <Select placeholder="Chọn Gọng kính mới">
                            {frames.map(f => (
                                <Select.Option key={f.id} value={f.id}>
                                    {f.name} - {f.price.toLocaleString('vi-VN')} đ
                                </Select.Option>
                            ))}
                        </Select>
                    </Form.Item>

                    <Form.Item label="Lớp phủ" name="coatingIds">
                        <Select mode="multiple" placeholder="Chọn các lớp phủ mới">
                            {coatings.map(c => (
                                <Select.Option key={c.id} value={c.id}>
                                    {c.name} - {c.price.toLocaleString('vi-VN')} đ
                                </Select.Option>
                            ))}
                        </Select>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
}
