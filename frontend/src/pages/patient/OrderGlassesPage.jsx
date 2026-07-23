import React, { useState, useEffect } from 'react';
import { Card, Button, Form, Select, Spin, Typography, message, Divider, Tag, List, Avatar } from 'antd';
import { ShoppingCartOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import { useSelector } from 'react-redux';

const { Title, Text } = Typography;

export default function OrderGlassesPage() {
    const { prescriptionId } = useParams();
    const navigate = useNavigate();
    const { user } = useSelector(s => s.auth);
    const [loading, setLoading] = useState(false);
    const [prescription, setPrescription] = useState(null);
    const [frames, setFrames] = useState([]);
    const [coatings, setCoatings] = useState([]);
    
    const [selectedFrame, setSelectedFrame] = useState(null);
    const [selectedCoatings, setSelectedCoatings] = useState([]);
    const [totalPrice, setTotalPrice] = useState(0);

    const [form] = Form.useForm();

    useEffect(() => {
        fetchData();
    }, [prescriptionId]);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Fetch prescription details
            const pRes = await axiosClient.get(`/v1/eyeglass-prescriptions/${prescriptionId}`);
            setPrescription(pRes.data);

            // Fetch frames and coatings
            const fRes = await axiosClient.get('/eyeglass-catalog/frames');
            setFrames(fRes.filter(f => f.status === 'ACTIVE'));

            const cRes = await axiosClient.get('/eyeglass-catalog/coatings');
            setCoatings(cRes);
            
        } catch (error) {
            message.error('Lỗi khi tải thông tin đơn kính hoặc danh mục');
        } finally {
            setLoading(false);
        }
    };

    const calculateTotal = (frameId, coatingIds, lensPrice) => {
        let total = lensPrice || 0;
        
        const frame = frames.find(f => f.id === frameId);
        if (frame) total += frame.price;

        coatingIds?.forEach(id => {
            const coating = coatings.find(c => c.id === id);
            if (coating) total += coating.price;
        });
        
        setTotalPrice(total);
    };

    const handleValuesChange = (_, allValues) => {
        calculateTotal(allValues.frameId, allValues.coatingIds, prescription?.lensTypePrice);
        const frame = frames.find(f => f.id === allValues.frameId);
        setSelectedFrame(frame);
        
        const selectedC = coatings.filter(c => allValues.coatingIds?.includes(c.id));
        setSelectedCoatings(selectedC);
    };

    const handleSubmit = async (values) => {
        setLoading(true);
        try {
            await axiosClient.post('/eyeglass-orders', {
                prescriptionId: parseInt(prescriptionId),
                frameId: values.frameId,
                coatingIds: values.coatingIds || []
            });
            message.success(user?.role === 'RECEPTIONIST' ? 'Tạo đơn kính thành công!' : 'Đặt kính thành công! Lễ tân sẽ sớm liên hệ với bạn.');
            if (user?.role === 'RECEPTIONIST') {
                navigate('/receptionist/eyeglass-orders');
            } else {
                navigate('/patient/history');
            }
        } catch (error) {
            message.error(error.response?.data?.message || 'Có lỗi xảy ra khi đặt kính');
        } finally {
            setLoading(false);
        }
    };

    if (!prescription) return <Spin style={{ display: 'block', margin: '100px auto' }} />;

    return (
        <div style={{ padding: '24px', maxWidth: 800, margin: '0 auto' }}>
            <Title level={2} style={{ marginBottom: 24 }}><ShoppingCartOutlined /> Đặt Kính</Title>
            
            <Card title="Thông số Toa kính của bạn" style={{ marginBottom: 24, boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                    <div>
                        <Text strong>Bác sĩ đo:</Text> {prescription.doctorName} <br/>
                        <Text strong>Ngày đo:</Text> {new Date(prescription.createdAt).toLocaleDateString('vi-VN')}
                    </div>
                    <div>
                        <Text strong>Loại tròng:</Text> <Tag color="blue">{prescription.lensTypeName}</Tag> <br/>
                        <Text strong>PD:</Text> {prescription.pd} mm
                    </div>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center' }} border="1">
                    <thead style={{ backgroundColor: '#f8fafc' }}>
                        <tr>
                            <th style={{ padding: 8 }}>Mắt</th>
                            <th style={{ padding: 8 }}>SPH</th>
                            <th style={{ padding: 8 }}>CYL</th>
                            <th style={{ padding: 8 }}>AXIS</th>
                            <th style={{ padding: 8 }}>ADD</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td style={{ padding: 8 }}><strong>OD (Phải)</strong></td>
                            <td>{prescription.odSph}</td>
                            <td>{prescription.odCyl}</td>
                            <td>{prescription.odAxis}</td>
                            <td>{prescription.odAdd}</td>
                        </tr>
                        <tr>
                            <td style={{ padding: 8 }}><strong>OS (Trái)</strong></td>
                            <td>{prescription.osSph}</td>
                            <td>{prescription.osCyl}</td>
                            <td>{prescription.osAxis}</td>
                            <td>{prescription.osAdd}</td>
                        </tr>
                    </tbody>
                </table>
            </Card>

            <Card title="Chọn Gọng & Lớp Phủ" style={{ boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}>
                <Form 
                    form={form}
                    layout="vertical" 
                    onFinish={handleSubmit}
                    onValuesChange={handleValuesChange}
                >
                    <Form.Item 
                        label="Chọn Gọng Kính" 
                        name="frameId" 
                        rules={[{ required: true, message: 'Vui lòng chọn gọng kính' }]}
                    >
                        <Select 
                            placeholder="--- Chọn Gọng kính ---" 
                            size="large"
                            optionLabelProp="label"
                        >
                            {frames.map(f => (
                                <Select.Option key={f.id} value={f.id} label={`${f.name} - ${f.brand}`}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span><strong>{f.name}</strong> ({f.brand} - {f.material})</span>
                                        <span style={{ color: '#1677ff', fontWeight: 600 }}>{f.price.toLocaleString('vi-VN')} đ</span>
                                    </div>
                                </Select.Option>
                            ))}
                        </Select>
                    </Form.Item>

                    <Form.Item 
                        label="Chọn Lớp phủ phụ thêm (Không bắt buộc)" 
                        name="coatingIds"
                    >
                        <Select 
                            mode="multiple" 
                            placeholder="--- Chọn Lớp phủ ---"
                            size="large"
                            optionLabelProp="label"
                        >
                            {coatings.map(c => (
                                <Select.Option key={c.id} value={c.id} label={c.name}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span><strong>{c.name}</strong></span>
                                        <span style={{ color: '#1677ff', fontWeight: 600 }}>+ {c.price.toLocaleString('vi-VN')} đ</span>
                                    </div>
                                </Select.Option>
                            ))}
                        </Select>
                    </Form.Item>

                    <Divider />

                    <div style={{ backgroundColor: '#f0fdf4', padding: 16, borderRadius: 8, marginBottom: 24 }}>
                        <Title level={4} style={{ marginTop: 0, color: '#166534' }}>Tóm tắt đơn hàng</Title>
                        <List
                            size="small"
                            split={false}
                            dataSource={[
                                { title: 'Tròng kính', desc: prescription.lensTypeName, price: prescription.lensTypePrice || 0 },
                                selectedFrame ? { title: 'Gọng kính', desc: selectedFrame.name, price: selectedFrame.price } : null,
                                ...selectedCoatings.map(c => ({ title: 'Lớp phủ', desc: c.name, price: c.price }))
                            ].filter(Boolean)}
                            renderItem={item => (
                                <List.Item style={{ padding: '4px 0' }}>
                                    <span style={{ flex: 1 }}><strong>{item.title}:</strong> {item.desc}</span>
                                    <span>{typeof item.price === 'number' ? `${item.price.toLocaleString('vi-VN')} đ` : item.price}</span>
                                </List.Item>
                            )}
                        />
                        <Divider style={{ margin: '12px 0' }} />
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 18, fontWeight: 'bold' }}>
                            <span>Tổng thanh toán:</span>
                            <span style={{ color: '#1677ff' }}>{totalPrice === 0 ? (prescription?.lensTypePrice || 0).toLocaleString('vi-VN') : totalPrice.toLocaleString('vi-VN')} đ</span>
                        </div>
                    </div>

                    <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
                        <Button onClick={() => navigate('/patient/prescriptions')} style={{ marginRight: 12 }}>
                            Hủy bỏ
                        </Button>
                        <Button type="primary" htmlType="submit" size="large" icon={<CheckCircleOutlined />} loading={loading}>
                            Xác nhận Đặt hàng
                        </Button>
                    </Form.Item>
                </Form>
            </Card>
        </div>
    );
}
