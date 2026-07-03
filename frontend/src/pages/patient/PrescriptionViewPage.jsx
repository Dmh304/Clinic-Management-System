// DucTKH
// Màn hình xem danh sách Đơn thuốc / Đơn kính tổng hợp của Bệnh nhân (hiện đã được tích hợp vào trong MedicalHistoryPage).
import React, { useState, useEffect } from 'react';
import { Table, Button, Tabs, Spin, Tag, message } from 'antd';
import { PrinterOutlined } from '@ant-design/icons';
import { useSelector } from 'react-redux';
import { prescriptionService } from '../../services/prescriptionService';
import { eyeglassPrescriptionService } from '../../services/eyeglassPrescriptionService';

export default function PrescriptionViewPage() {
    const { user } = useSelector(s => s.auth);
    const patientId = user?.patientId || user?.id;
    
    const [loading, setLoading] = useState(false);
    const [drugPrescriptions, setDrugPrescriptions] = useState([]);
    const [eyePrescriptions, setEyePrescriptions] = useState([]);

    useEffect(() => {
        if (patientId) {
            fetchData();
        }
    }, [patientId]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [drugRes, eyeRes] = await Promise.all([
                prescriptionService.getByPatient(patientId),
                eyeglassPrescriptionService.getByPatient(patientId)
            ]);
            setDrugPrescriptions(drugRes.data || []);
            setEyePrescriptions(eyeRes.data || []);
        } catch (error) {
            message.error('Không thể tải lịch sử đơn thuốc');
        } finally {
            setLoading(false);
        }
    };

    const handlePrint = (id, type) => {
        const printContent = document.getElementById(`print-area-${type}-${id}`);
        const originalContents = document.body.innerHTML;
        
        document.body.innerHTML = printContent.innerHTML;
        window.print();
        document.body.innerHTML = originalContents;
        window.location.reload(); // Reload to restore React state bindings
    };

    const drugColumns = [
        { title: 'Ngày kê', dataIndex: 'createdAt', key: 'createdAt', render: v => new Date(v).toLocaleDateString('vi-VN') },
        { title: 'Bác sĩ', dataIndex: 'doctorName', key: 'doctorName' },
        { title: 'Trạng thái', dataIndex: 'status', key: 'status', render: v => <Tag>{v === 'PENDING' ? 'Chưa phát' : v === 'DISPENSED' ? 'Đã phát' : 'Hủy'}</Tag> },
    ];

    return (
        <div style={{ padding: '24px', maxWidth: 1000, margin: '0 auto' }}>
            <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24 }}>Đơn thuốc của tôi</h2>
            
            <Spin spinning={loading}>
                <Tabs
                    items={[
                        {
                            key: 'drugs',
                            label: 'Đơn thuốc',
                            children: (
                                <div>
                                    {drugPrescriptions.length === 0 ? <p>Chưa có đơn thuốc nào.</p> : (
                                        drugPrescriptions.map(p => (
                                            <div key={p.id} style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: 16, marginBottom: 16 }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                                                    <div>
                                                        <div style={{ fontWeight: 600 }}>Ngày khám: {new Date(p.createdAt).toLocaleDateString('vi-VN')}</div>
                                                        <div style={{ color: '#64748b' }}>Bác sĩ: {p.doctorName}</div>
                                                        <div style={{ color: '#64748b' }}>Trạng thái: {p.status}</div>
                                                    </div>
                                                    <Button icon={<PrinterOutlined />} onClick={() => handlePrint(p.id, 'drug')}>In đơn thuốc</Button>
                                                </div>
                                                
                                                {/* Print Area - Hidden normally, only visible during print or here for demonstration */}
                                                <div id={`print-area-drug-${p.id}`} className="print-area">
                                                    <div className="print-header" style={{ display: 'none' }}>
                                                        <h1 style={{ textAlign: 'center', margin: 0 }}>PHÒNG KHÁM EYESCARE</h1>
                                                        <h2 style={{ textAlign: 'center', marginTop: 10 }}>ĐƠN THUỐC</h2>
                                                        <p><strong>Bệnh nhân:</strong> {p.patientName}</p>
                                                        <p><strong>Bác sĩ khám:</strong> {p.doctorName}</p>
                                                        <p><strong>Ngày kê:</strong> {new Date(p.createdAt).toLocaleDateString('vi-VN')}</p>
                                                        <hr/>
                                                    </div>
                                                    
                                                    <Table 
                                                        dataSource={p.items} 
                                                        rowKey="id" 
                                                        pagination={false} 
                                                        size="small"
                                                        columns={[
                                                            { title: 'Tên thuốc', dataIndex: 'medicineName', render: (t, r) => <b>{t} ({r.dosageForm})</b> },
                                                            { title: 'SL', dataIndex: 'quantity' },
                                                            { title: 'ĐVT', dataIndex: 'unit' },
                                                            { title: 'Đơn giá', dataIndex: 'unitPrice', render: val => (val || 0).toLocaleString('vi-VN') + ' đ' },
                                                            { title: 'Thành tiền', dataIndex: 'totalPrice', render: val => (val || 0).toLocaleString('vi-VN') + ' đ' },
                                                            { title: 'Cách dùng', render: (_, r) => [r.dosage, r.frequency, r.instructions].filter(v => v && v !== '-').join('. ') }
                                                        ]}
                                                    />
                                                    
                                                    <div style={{ marginTop: 16, textAlign: 'right', fontSize: 16 }}>
                                                        <strong>Tổng tiền đơn thuốc: </strong>
                                                        <span style={{ color: '#1677ff', fontSize: 18 }}>{p.items?.reduce((sum, item) => sum + (item.totalPrice || 0), 0).toLocaleString('vi-VN')} VNĐ</span>
                                                    </div>

                                                    <div className="print-footer" style={{ display: 'none', marginTop: 40, textAlign: 'right' }}>
                                                        <p><strong>Chữ ký Bác sĩ</strong></p>
                                                        <div style={{ height: 60 }}></div>
                                                        <p>{p.doctorName}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )
                        },
                        {
                            key: 'eyeglasses',
                            label: 'Đơn kính',
                            children: (
                                <div>
                                    {eyePrescriptions.length === 0 ? <p>Chưa có đơn kính nào.</p> : (
                                        eyePrescriptions.map(p => (
                                            <div key={p.id} style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: 16, marginBottom: 16 }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                                                    <div>
                                                        <div style={{ fontWeight: 600 }}>Ngày khám: {new Date(p.createdAt).toLocaleDateString('vi-VN')}</div>
                                                        <div style={{ color: '#64748b' }}>Bác sĩ: {p.doctorName}</div>
                                                        <div style={{ color: '#64748b' }}>PD: {p.pd}mm | Loại tròng: {p.lensType}</div>
                                                    </div>
                                                    <Button icon={<PrinterOutlined />} onClick={() => handlePrint(p.id, 'eye')}>In đơn kính</Button>
                                                </div>
                                                
                                                <div id={`print-area-eye-${p.id}`} className="print-area">
                                                    <div className="print-header" style={{ display: 'none' }}>
                                                        <h1 style={{ textAlign: 'center', margin: 0 }}>PHÒNG KHÁM EYESCARE</h1>
                                                        <h2 style={{ textAlign: 'center', marginTop: 10 }}>ĐƠN KÍNH</h2>
                                                        <p><strong>Bệnh nhân:</strong> {p.patientName}</p>
                                                        <p><strong>Bác sĩ đo:</strong> {p.doctorName}</p>
                                                        <p><strong>Ngày đo:</strong> {new Date(p.createdAt).toLocaleDateString('vi-VN')}</p>
                                                        <hr/>
                                                    </div>

                                                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center', marginBottom: 20 }} border="1">
                                                        <thead>
                                                            <tr>
                                                                <th>Mắt</th>
                                                                <th>Cầu (SPH)</th>
                                                                <th>Trụ (CYL)</th>
                                                                <th>Trục (AXIS)</th>
                                                                <th>Cộng thêm (ADD)</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            <tr>
                                                                <td><strong>Phải (OD)</strong></td>
                                                                <td>{p.odSph}</td>
                                                                <td>{p.odCyl}</td>
                                                                <td>{p.odAxis}</td>
                                                                <td>{p.odAdd}</td>
                                                            </tr>
                                                            <tr>
                                                                <td><strong>Trái (OS)</strong></td>
                                                                <td>{p.osSph}</td>
                                                                <td>{p.osCyl}</td>
                                                                <td>{p.osAxis}</td>
                                                                <td>{p.osAdd}</td>
                                                            </tr>
                                                        </tbody>
                                                    </table>

                                                    <p><strong>Khoảng cách đồng tử (PD):</strong> {p.pd} mm</p>
                                                    <p><strong>Loại tròng:</strong> {p.lensType}</p>
                                                    {p.notes && <p><strong>Ghi chú:</strong> {p.notes}</p>}

                                                    <div className="print-footer" style={{ display: 'none', marginTop: 40, textAlign: 'right' }}>
                                                        <p><strong>Chữ ký Bác sĩ</strong></p>
                                                        <div style={{ height: 60 }}></div>
                                                        <p>{p.doctorName}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )
                        }
                    ]}
                />
            </Spin>
            <style>{`
                @media print {
                    body * { visibility: hidden; }
                    .print-area, .print-area * { visibility: visible; }
                    .print-area { position: absolute; left: 0; top: 0; width: 100%; padding: 20px; }
                    .print-header { display: block !important; margin-bottom: 20px; }
                    .print-footer { display: block !important; }
                    .ant-table-pagination { display: none !important; }
                }
            `}</style>
        </div>
    );
}
