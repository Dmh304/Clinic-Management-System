import React, { useState, useEffect, useRef } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { useSelector } from 'react-redux';
import { Button, Input, List, Avatar, Card } from 'antd';
import { MessageOutlined, CloseOutlined, SendOutlined } from '@ant-design/icons';
import axios from 'axios';

export default function SupportBox() {
    const { user, token } = useSelector(s => s.auth);
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [inputStr, setInputStr] = useState('');
    const [stompClient, setStompClient] = useState(null);
    const [sessionId, setSessionId] = useState(null);
    const messagesEndRef = useRef(null);

    useEffect(() => {
        if (isOpen && !stompClient && token) {
            connect();
        }
        return () => {
            if (stompClient) {
                stompClient.deactivate();
            }
        };
    }, [isOpen]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    const connect = async () => {
        try {
            // First get or create session
            const res = await axios.get('http://localhost:8080/api/chat/sessions/my', {
                headers: { Authorization: `Bearer ${token}` }
            });
            const session = res.data;
            setSessionId(session.id);

            // Fetch old messages
            const msgRes = await axios.get(`http://localhost:8080/api/chat/sessions/${session.id}/messages`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setMessages(msgRes.data);

            // Connect WebSocket
            const socket = new SockJS('http://localhost:8080/ws');
            const client = new Client({
                webSocketFactory: () => socket,
                connectHeaders: {
                    Authorization: `Bearer ${token}`
                },
                debug: function (str) {
                    console.log(str);
                },
                onConnect: () => {
                    client.subscribe(`/topic/chat/${session.id}`, (message) => {
                        if (message.body) {
                            const newMsg = JSON.parse(message.body);
                            setMessages(prev => [...prev, newMsg]);
                        }
                    });
                }
            });

            client.activate();
            setStompClient(client);

        } catch (error) {
            console.error('Error connecting to chat:', error);
        }
    };

    const sendMessage = () => {
        if (inputStr.trim() && stompClient && stompClient.connected) {
            stompClient.publish({
                destination: '/app/chat.sendMessage',
                body: JSON.stringify({
                    sessionId: sessionId,
                    content: inputStr
                }),
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            setInputStr('');
        }
    };

    if (!user || user.role !== 'PATIENT') return null;

    return (
        <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 1000 }}>
            {!isOpen && (
                <Button 
                    type="primary" 
                    shape="circle" 
                    size="large" 
                    icon={<MessageOutlined />} 
                    onClick={() => setIsOpen(true)}
                    style={{ width: 60, height: 60, boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}
                />
            )}

            {isOpen && (
                <Card 
                    title={
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span>Hỗ trợ trực tuyến</span>
                            <CloseOutlined onClick={() => setIsOpen(false)} style={{ cursor: 'pointer' }} />
                        </div>
                    }
                    style={{ width: 350, height: 500, display: 'flex', flexDirection: 'column', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}
                    bodyStyle={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}
                >
                    <div style={{ flex: 1, overflowY: 'auto', padding: '16px', backgroundColor: '#f9fafb' }}>
                        {messages.map((msg, index) => {
                            const isMe = msg.senderRole === 'PATIENT';
                            return (
                                <div key={index} style={{ 
                                    display: 'flex', 
                                    justifyContent: isMe ? 'flex-end' : 'flex-start',
                                    marginBottom: 12
                                }}>
                                    <div style={{
                                        maxWidth: '80%',
                                        padding: '8px 12px',
                                        borderRadius: '12px',
                                        backgroundColor: isMe ? '#1d4ed8' : '#e5e7eb',
                                        color: isMe ? 'white' : 'black',
                                        wordBreak: 'break-word'
                                    }}>
                                        {msg.content}
                                    </div>
                                </div>
                            );
                        })}
                        <div ref={messagesEndRef} />
                    </div>
                    <div style={{ padding: '12px', borderTop: '1px solid #f0f0f0', display: 'flex', gap: 8 }}>
                        <Input 
                            value={inputStr}
                            onChange={(e) => setInputStr(e.target.value)}
                            onPressEnter={sendMessage}
                            placeholder="Nhập tin nhắn..." 
                        />
                        <Button type="primary" icon={<SendOutlined />} onClick={sendMessage} />
                    </div>
                </Card>
            )}
        </div>
    );
}
