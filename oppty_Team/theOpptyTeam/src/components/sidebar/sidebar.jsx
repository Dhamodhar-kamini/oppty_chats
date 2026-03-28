import React, { useState } from 'react';
import profileImg from "../../assets/profiledp.jpeg"
import './Sidebar.css';

function Sidebar() {
  const [active, setActive] = useState('chats');

  const navItems = [
    { id: 'chats', icon: '💬', badge: '99+' },
    { id: 'status', icon: '⭕', dot: true },
    { id: 'channels', icon: '📢', dot: true },
    { id: 'communities', icon: '👥' },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-top">
        {navItems.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`sidebar-item ${active === item.id ? 'active' : ''}`}
            onClick={() => setActive(item.id)}
            aria-label={item.id}
          >
            <span className="sidebar-icon">{item.icon}</span>
            {item.badge && <span className="sidebar-badge">{item.badge}</span>}
            {item.dot && <span className="sidebar-dot" />}
          </button>
        ))}

        <div className="sidebar-divider" />
        <div className="sidebar-ai" />
      </div>

      <div className="sidebar-bottom">
        {/* <button type="button" className="sidebar-item" aria-label="media">
          <span className="sidebar-icon">🖼️</span>
        </button> */}

        <button type="button" className="sidebar-profile" aria-label="profile">
          <img
            src={profileImg}
            alt="User"
            className="sidebar-profile-img"
          />
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;