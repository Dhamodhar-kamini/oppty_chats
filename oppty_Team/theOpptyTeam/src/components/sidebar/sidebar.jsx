import React from "react";
import { NavLink } from "react-router-dom";
import profileImg from "../../assets/profiledp.jpeg";
import "./Sidebar.css";

function ChatsIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M4 4h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H9l-5 4v-4H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"
      />
    </svg>
  );
}

function GroupsIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M16 11c1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 3-1.34 3-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.67 0-8 1.34-8 4v2h12v-2c0-2.66-5.33-4-4-4zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.95v2h7v-2c0-2.66-5.33-4-8-4z"
      />
    </svg>
  );
}

const ICON_BY_ID = {
  chats: <ChatsIcon />,
  groups: <GroupsIcon />,
};

export default function Sidebar() {
  const navItems = [
    { id: "chats", to: "/chats", badge: "99+" },
    { id: "groups", to: "/groups", dot: true },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-top">
        {navItems.map((item) => (
          <NavLink
            key={item.id}
            to={item.to}
            className={({ isActive }) => `sidebar-item ${isActive ? "active" : ""}`}
            aria-label={item.id}
            title={item.id}
          >
            <span className="sidebar-icon">{ICON_BY_ID[item.id]}</span>
            {item.badge && <span className="sidebar-badge">{item.badge}</span>}
            {item.dot && <span className="sidebar-dot" />}
          </NavLink>
        ))}

        <div className="sidebar-divider" />
        <div className="sidebar-ai" />
      </div>

      <div className="sidebar-bottom">
        <button type="button" className="sidebar-profile" aria-label="profile" title="Profile">
          <img src={profileImg} alt="User" className="sidebar-profile-img" />
        </button>
      </div>
    </aside>
  );
}