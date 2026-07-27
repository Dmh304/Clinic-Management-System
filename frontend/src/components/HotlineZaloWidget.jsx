import { PhoneOutlined, MessageOutlined } from '@ant-design/icons'
import { Tooltip } from 'antd'
import { useSelector } from 'react-redux'
import { useState } from 'react'
import { CLINIC_INFO } from '../constants/clinicInfo'
import SupportBox from './chat/SupportBox'

/**
 * Widget nổi cố định (hotline + Zalo) cho khách hàng/bệnh nhân — kênh liên hệ
 * trực tiếp để đặt lịch/tư vấn qua điện thoại hoặc Zalo (song song với kênh
 * website tự đặt lịch). Chỉ hiển thị cho khách chưa đăng nhập hoặc bệnh nhân,
 * không hiện trên các màn hình nội bộ của nhân viên (xem Header.jsx).
 * Mặc định thu gọn chỉ còn icon tròn, có hiệu ứng rung + phát sóng để thu hút
 * chú ý; di chuột vào mới mở rộng để lộ nhãn/số điện thoại.
 */
export default function HotlineZaloWidget() {
  const { user } = useSelector(s => s.auth)
  const canChat = user && user.role === 'PATIENT'
  const [isChatOpen, setIsChatOpen] = useState(false)

  return (
    <div
      style={{
        position: 'fixed', left: 20, bottom: 24, zIndex: 60,
        display: 'flex', flexDirection: 'column', gap: 12,
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      <style>{`
        .hzw-btn {
          position: relative;
          display: flex;
          align-items: center;
          height: 48px;
          width: 48px;
          overflow: hidden;
          border-radius: 999px;
          text-decoration: none;
          color: #fff;
          white-space: nowrap;
          transition: width .35s ease;
        }
        .hzw-btn:hover {
          width: 210px;
        }
        .hzw-icon {
          position: relative;
          flex: 0 0 48px;
          width: 48px;
          height: 48px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          background: rgba(255,255,255,.18);
          animation: hzw-ring 3.2s ease-in-out infinite;
        }
        .hzw-ping {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          animation: hzw-ping 2.4s cubic-bezier(0,0,.2,1) infinite;
        }
        .hzw-label {
          padding-left: 10px;
          padding-right: 16px;
          font-size: 13px;
          font-weight: 700;
          opacity: 0;
          transform: translateX(-4px);
          transition: opacity .25s ease .08s, transform .25s ease .08s;
        }
        .hzw-btn:hover .hzw-label {
          opacity: 1;
          transform: translateX(0);
        }
        @keyframes hzw-ring {
          0%, 78%, 100% { transform: rotate(0deg); }
          80% { transform: rotate(-14deg); }
          82% { transform: rotate(11deg); }
          84% { transform: rotate(-9deg); }
          86% { transform: rotate(7deg); }
          88% { transform: rotate(-4deg); }
          90% { transform: rotate(0deg); }
        }
        @keyframes hzw-ping {
          0% { box-shadow: 0 0 0 0 rgba(255,255,255,.55); opacity: 1; }
          100% { box-shadow: 0 0 0 14px rgba(255,255,255,0); opacity: 0; }
        }
      `}</style>

      <a
        href={`tel:${CLINIC_INFO.hotline.replace(/\s+/g, '')}`}
        title={`Gọi hotline ${CLINIC_INFO.hotline}`}
        className="hzw-btn"
        style={{ backgroundColor: '#1d4ed8', boxShadow: '0 6px 20px rgba(29,78,216,.4)' }}
      >
        <span className="hzw-icon">
          <span className="hzw-ping" />
          <PhoneOutlined />
        </span>
        <span className="hzw-label">{CLINIC_INFO.hotline}</span>
      </a>

      <a
        href={CLINIC_INFO.zalo}
        target="_blank"
        rel="noopener noreferrer"
        title="Chat Zalo với phòng khám"
        className="hzw-btn"
        style={{ backgroundColor: '#0068ff', boxShadow: '0 6px 20px rgba(0,104,255,.4)' }}
      >
        <span className="hzw-icon">
          <span className="hzw-ping" />
          <span style={{ fontSize: 12, fontWeight: 800 }}>Za</span>
        </span>
        <span className="hzw-label">Chat Zalo</span>
      </a>
      <Tooltip title={!canChat ? "Vui lòng đăng nhập để nhận hỗ trợ chuyên sâu" : ""} placement="right">
        <button
          onClick={() => canChat && setIsChatOpen(!isChatOpen)}
          className="hzw-btn"
          style={{ 
            backgroundColor: '#10b981', 
            boxShadow: '0 6px 20px rgba(16,185,129,.4)',
            border: 'none',
            padding: 0,
            cursor: canChat ? 'pointer' : 'not-allowed',
            opacity: canChat ? 1 : 0.85
          }}
        >
          <span className="hzw-icon">
            <span className="hzw-ping" style={{ display: canChat ? 'block' : 'none' }} />
            <MessageOutlined style={{ fontSize: 18 }} />
          </span>
          <span className="hzw-label">Hỗ trợ trực tuyến</span>
        </button>
      </Tooltip>

      <SupportBox isOpen={isChatOpen} setIsOpen={setIsChatOpen} />
    </div>
  )
}
