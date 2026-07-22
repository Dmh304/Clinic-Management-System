import React, { useState, useEffect, useRef } from 'react';
import { Layout, Menu, Input, Button, List, Typography, Badge, Avatar, Tag } from 'antd';
import { SendOutlined, UserOutlined } from '@ant-design/icons';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { useSelector } from 'react-redux';
import axios from 'axios';

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

    const fetchSessions = async () => {
        try {
            const res = await axios.get('http://localhost:8080/api/chat/sessions', {
                headers: { Authorization: `Bearer ${token}` }
            });
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

    const fetchMessages = async (sessionId) => {
        if (messages[sessionId]) return;
        try {
            const res = await axios.get(`http://localhost:8080/api/chat/sessions/${sessionId}/messages`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setMessages(prev => ({ ...prev, [sessionId]: res.data }));
        } catch (error) {
            console.error('Failed to fetch messages', error);
        }
    };

    const connectWebSocket = () => {
        const socket = new SockJS('http://localhost:8080/ws');
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
            await axios.patch(`http://localhost:8080/api/chat/sessions/${sessionId}/assign`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchSessions();
        } catch (error) {
            console.error('Lỗi khi phân công', error);
        }
    };

    return (
        <Layout style={{ height: 'calc(100vh - 64px)', background: '#fff' }}>
            <Sider width={350} style={{ background: '#fafafa', borderRight: '1px solid #f0f0f0' }}>
                <div style={{ padding: '16px', borderBottom: '1px solid #f0f0f0', display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ fontWeight: 'bold', fontSize: '16px' }}>Phiên hỗ trợ trực tuyến ({sessions.length})</div>
                </div>
                <List
                    itemLayout="horizontal"
                    dataSource={sessions}
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
                                        <div style={{ marginTop: 4 }}>
                                            Cập nhật: {new Date(session.updatedAt).toLocaleTimeString()}
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
