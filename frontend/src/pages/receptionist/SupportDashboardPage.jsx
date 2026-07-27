/*
 * Author: DucTKH - HE204463
 * Created: 2026-06-22
 * Last Update: 2026-07-22
 */
import React, { useState, useEffect, useRef } from 'react';
import { Layout, Menu, Input, Button, List, Typography, Badge, Avatar, Tag, Tabs } from 'antd';
import { FiSend as SendOutlined, FiUser as UserOutlined } from 'react-icons/fi';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { useSelector } from 'react-redux';
import axiosClient from '../../api/axiosClient';

const { Sider, Content } = Layout;
const { Text } = Typography;

export default function SupportDashboardPage() {
    const { token, user } = useSelector(s => s.auth);
    const [sessions, setSessions] = useState([]);
    const [activeSession, setActiveSession] = useState(null);
    const [messages, setMessages] = useState({});
    const [inputStr, setInputStr] = useState('');
    const [stompClient, setStompClient] = useState(null);
    const [isConnected, setIsConnected] = useState(false);
    const [activeTab, setActiveTab] = useState('all');
    const messagesEndRef = useRef(null);

    useEffect(() => {
        fetchSessions();
        const client = connectWebSocket();
        return () => {
            if (client) client.deactivate();
        };
    }, []);

    useEffect(() => {
        if (activeSession) {
            fetchMessages(activeSession.id);
        }
    }, [activeSession]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, activeSession]);

    // Chức năng: Lấy danh sách toàn bộ các phiên chat của bệnh nhân
    const fetchSessions = async () => {
        try {
            // Tương tác API: Lấy các session chat hiện có
            const res = await axiosClient.get('/v1/chat/sessions');
            setSessions(res.data);
            // Cập nhật lại activeSession nếu dữ liệu mới có thay đổi về assignedTo
            setActiveSession(prev => {
                if (!prev) return prev;
                return res.data.find(s => s.id === prev.id) || prev;
            });
        } catch (error) {
            console.error('Failed to fetch sessions', error);
        }
    };

    // Chức năng: Lấy chi tiết lịch sử tin nhắn của một phiên chat cụ thể
    const fetchMessages = async (sessionId) => {
        // Điều kiện: Nếu đã tải tin nhắn cho session này rồi thì bỏ qua
        // Nhưng nếu session đó có unread, ta vẫn nên gọi lại để server mark as read và lấy tin nhắn mới
        try {
            const res = await axiosClient.get(`/v1/chat/sessions/${sessionId}/messages`);
            setMessages(prev => ({ ...prev, [sessionId]: res.data }));
            // Đánh dấu ở FE là đã đọc luôn để update UI
            setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, hasUnread: false } : s));
        } catch (error) {
            console.error('Failed to fetch messages', error);
        }
    };

    // Chức năng: Kết nối Web Socket qua SockJS & STOMP để nhận tin nhắn real-time
    const connectWebSocket = () => {
        const socket = new SockJS('/ws');
        const client = new Client({
            webSocketFactory: () => socket,
            connectHeaders: { Authorization: `Bearer ${token}` },
            onConnect: () => {
                setIsConnected(true);
                // Lắng nghe cập nhật danh sách session
                client.subscribe('/topic/chat/sessions', () => {
                    fetchSessions();
                });
            }
        });
        client.activate();
        setStompClient(client);
        return client;
    };

    // Khi danh sách session thay đổi hoặc socket kết nối thành công, cần subscribe
    useEffect(() => {
        if (stompClient && isConnected) {
            sessions.forEach(session => subscribeToSession(stompClient, session.id));
        }
    }, [sessions, stompClient, isConnected]);

    const subscribedSessions = useRef(new Set());
    const subscribeToSession = (client, sessionId) => {
        if (subscribedSessions.current.has(sessionId)) return;
        client.subscribe(`/topic/chat/${sessionId}`, (message) => {
            if (message.body) {
                const newMsg = JSON.parse(message.body);
                setMessages(prev => {
                    const currentMsgs = prev[sessionId] || [];
                    // Tránh duplicate
                    if (currentMsgs.find(m => m.id === newMsg.id)) return prev;
                    return { ...prev, [sessionId]: [...currentMsgs, newMsg] };
                });
            }
        });
        subscribedSessions.current.add(sessionId);
    };

    const sendMessage = () => {
        if (inputStr.trim() && stompClient && activeSession) {
            stompClient.publish({
                destination: '/app/chat.sendMessage',
                body: JSON.stringify({
                    sessionId: activeSession.id,
                    content: inputStr
                }),
                headers: { Authorization: `Bearer ${token}` }
            });
            setInputStr('');
        }
    };

    const assignSession = async (sessionId) => {
        try {
            await axiosClient.patch(`/v1/chat/sessions/${sessionId}/assign`);
            fetchSessions();
        } catch (error) {
            console.error('Lỗi khi phân công', error);
        }
    };

    return (
        <Layout style={{ height: 'calc(100vh - 64px)', background: '#fff' }}>
            <Sider width={350} style={{ background: '#fafafa', borderRight: '1px solid #f0f0f0' }}>
                <div style={{ padding: '16px', borderBottom: '1px solid #f0f0f0', fontWeight: 'bold', fontSize: 16 }}>
                    Phiên hỗ trợ trực tuyến ({sessions.length})
                </div>
                
                <Tabs 
                    activeKey={activeTab} 
                    onChange={setActiveTab} 
                    style={{ padding: '0 16px' }}
                    items={[
                        { key: 'all', label: 'Tất cả' },
                        { key: 'unread', label: `Chưa đọc (${sessions.filter(s => s.hasUnread).length})` }
                    ]}
                />

                <List
                    style={{ flex: 1, overflowY: 'auto' }}
                    dataSource={sessions.filter(s => activeTab === 'all' || (activeTab === 'unread' && s.hasUnread))}
                    renderItem={session => (
                        <List.Item
                            onClick={() => setActiveSession(session)}
                            style={{
                                padding: '12px 16px',
                                cursor: 'pointer',
                                background: activeSession?.id === session.id ? '#e6f7ff' : 'transparent',
                                borderBottom: '1px solid #f0f0f0'
                            }}
                        >
                            <List.Item.Meta
                                avatar={<Avatar icon={<UserOutlined />} />}
                                title={session.patientName}
                                description={
                                    <div style={{ fontSize: '12px', color: '#8c8c8c', marginTop: 4 }}>
                                        {session.assignedToName ? (
                                            <Tag color={session.assignedToId === (user?.id || user?.userId) ? "blue" : "default"}>
                                                Phụ trách: {session.assignedToId === (user?.id || user?.userId) ? "Bạn" : session.assignedToName}
                                            </Tag>
                                        ) : (
                                            <Tag color="warning">Chưa phân công</Tag>
                                        )}
                                        {session.hasUnread && (
                                            <Badge status="processing" text="Có tin nhắn mới" style={{ marginLeft: 4 }} />
                                        )}
                                        <div style={{ marginTop: 4 }}>
                                            Cập nhật: {new Date(session.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    </div>
                                }
                            />
                        </List.Item>
                    )}
                />
            </Sider>
            <Content style={{ display: 'flex', flexDirection: 'column' }}>
                {activeSession ? (
                    <>
                        <div style={{ padding: '16px', borderBottom: '1px solid #f0f0f0', fontWeight: 'bold' }}>
                            Đang hỗ trợ: {activeSession.patientName}
                        </div>
                        <div style={{ flex: 1, overflowY: 'auto', padding: '24px', backgroundColor: '#f9fafb' }}>
                            {(messages[activeSession.id] || []).map((msg, idx) => {
                                const isMe = msg.senderRole === 'RECEPTIONIST';
                                return (
                                    <div key={idx} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start', marginBottom: 16 }}>
                                        <div style={{
                                            maxWidth: '60%',
                                            padding: '12px 16px',
                                            borderRadius: '16px',
                                            backgroundColor: isMe ? '#1890ff' : '#fff',
                                            color: isMe ? '#fff' : '#000',
                                            boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                                        }}>
                                            {msg.content}
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={messagesEndRef} />
                        </div>
                        <div style={{ padding: '16px', borderTop: '1px solid #f0f0f0' }}>
                            {!activeSession.assignedToId ? (
                                <div style={{ textAlign: 'center' }}>
                                    <Button type="primary" size="large" onClick={() => assignSession(activeSession.id)}>
                                        Tiếp nhận hỗ trợ
                                    </Button>
                                </div>
                            ) : activeSession.assignedToId !== (user?.id || user?.userId) ? (
                                <div style={{ textAlign: 'center', color: '#8c8c8c' }}>
                                    <span style={{ marginRight: 16 }}>Đoạn chat này đang được xử lý bởi <b>{activeSession.assignedToName}</b>.</span>
                                    <Button size="small" onClick={() => assignSession(activeSession.id)}>Giành quyền xử lý</Button>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', gap: 12 }}>
                                    <Input
                                        value={inputStr}
                                        onChange={(e) => setInputStr(e.target.value)}
                                        onPressEnter={sendMessage}
                                        placeholder="Nhập câu trả lời..."
                                        size="large"
                                    />
                                    <Button type="primary" size="large" icon={<SendOutlined />} onClick={sendMessage}>Gửi</Button>
                                </div>
                            )}
                        </div>
                    </>
                ) : (
                    <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#bfbfbf' }}>
                        Chọn một phiên chat để bắt đầu hỗ trợ
                    </div>
                )}
            </Content>
        </Layout>
    );
}
