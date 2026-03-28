import React, { useMemo, useState } from "react";
import { NavLink } from "react-router-dom";
import { useChats } from "../../context/ChatContext.jsx";
import opptyLogo from '../../assets/opptylogo.png'

function formatTime(ts) {
  if (!ts) return "";
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function ChatListPage() {
  const { chats } = useChats();
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return chats;
    return chats.filter((c) => c.name.toLowerCase().includes(query));
  }, [chats, q]);

  return (
    <div className="sidebarInner">
      <div className="sidebarTop">
        <div className="brand"><img src={opptyLogo} alt="logo" style={{height:"24px"}} /><span style={{marginLeft:"-18px", color:"orangered"}}>Ch</span>ats</div>

        <input
          className="searchInput"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search or start new chat"
          aria-label="Search chats"
        />
      </div>

      <div className="chatList" role="list">
        {filtered.map((chat) => {
          const last = chat.messages?.[chat.messages.length - 1];
          return (
            <NavLink
              key={chat.id}
              to={`/chats/${chat.id}`}
              className={({ isActive }) => `chatRow ${isActive ? "active" : ""}`}
              role="listitem"
            >
              <img className="avatar" src={chat.avatarUrl} alt="" />
              <div className="chatRowBody">
                <div className="chatRowTop">
                  <div className="chatName">{chat.name}</div>
                  <div className="chatTime">{formatTime(last?.createdAt)}</div>
                </div>
                <div className="chatPreview">
                  {last?.text ? last.text : <span className="muted">No messages yet</span>}
                </div>
              </div>
            </NavLink>
          );
        })}
      </div>
    </div>
  );
}