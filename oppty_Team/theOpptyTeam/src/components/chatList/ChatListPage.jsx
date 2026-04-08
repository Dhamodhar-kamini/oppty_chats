// src/components/chatList/ChatListPage.jsx
import React, { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useChats } from "../../context/ChatContext.jsx";

export default function ChatListPage({ mode }) {
  const { 
    chats, 
    groups,
    loading, 
    groupsLoading,
    error, 
    fetchChats, 
    fetchGroups,
    markChatAsRead 
  } = useChats();
  
  const { chatId } = useParams();
  const navigate = useNavigate();

  const isGroupMode = mode === "group";
  const items = isGroupMode ? groups : chats;
  const isLoading = isGroupMode ? groupsLoading : loading;

  useEffect(() => {
    if (isGroupMode) {
      fetchGroups();
    } else {
      fetchChats();
    }
  }, [isGroupMode, fetchChats, fetchGroups]);

  const handleItemClick = async (item) => {
    if (item.unreadCount > 0) {
      await markChatAsRead(item.id);
    }
    
    if (isGroupMode) {
      navigate(`/groups/${item.id}`);
    } else {
      navigate(`/chats/${item.id}`);
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return "";
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) {
        return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      } else if (diffDays === 1) {
        return "Yesterday";
      } else if (diffDays < 7) {
        return date.toLocaleDateString([], { weekday: "short" });
      } else {
        return date.toLocaleDateString([], { month: "short", day: "numeric" });
      }
    } catch {
      return "";
    }
  };

  const getMessagePreview = (lastMessage, isGroup = false) => {
    if (!lastMessage) return "";
    
    let prefix = "";
    if (isGroup && lastMessage.sender && lastMessage.sender !== "me") {
      prefix = `${lastMessage.sender.split(' ')[0]}: `;
    } else if (lastMessage.sender === "me") {
      prefix = "You: ";
    }
    
    const text = lastMessage.text || "";
    const maxLength = 28;
    const truncated = text.length > maxLength ? text.substring(0, maxLength) + "..." : text;
    return prefix + truncated;
  };

  const handleRefresh = () => {
    if (isGroupMode) {
      fetchGroups();
    } else {
      fetchChats();
    }
  };

  if (isLoading) {
    return (
      <div className="chatList">
        <header className="chatListHeader">
          <h2>{isGroupMode ? "Groups" : "Chats"}</h2>
        </header>
        <div className="chatListLoading">
          <div className="spinner"></div>
          <p>Loading {isGroupMode ? "groups" : "chats"}...</p>
        </div>
      </div>
    );
  }

  if (error && !isGroupMode) {
    return (
      <div className="chatList">
        <header className="chatListHeader">
          <h2>{isGroupMode ? "Groups" : "Chats"}</h2>
        </header>
        <div className="chatListError">
          <p>⚠️ {error}</p>
          <button onClick={handleRefresh} className="refreshBtn">🔄 Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="chatList">
      <header className="chatListHeader">
        <h2>{isGroupMode ? "Groups" : "Chats"}</h2>
        <button className="refreshBtn" onClick={handleRefresh} title="Refresh">
          🔄
        </button>
      </header>

      {items.length === 0 ? (
        <div className="chatListEmpty">
          {isGroupMode ? (
            <>
              <span style={{ fontSize: 48, marginBottom: 12 }}>👥</span>
              <p>No groups yet</p>
              <span className="muted">Groups will appear here</span>
            </>
          ) : (
            <>
              <span style={{ fontSize: 48, marginBottom: 12 }}>💬</span>
              <p>No conversations yet</p>
              <span className="muted">Start chatting with colleagues!</span>
            </>
          )}
        </div>
      ) : (
        <ul className="chatListItems">
          {items.map((item) => {
            const isActive = chatId === item.id;
            const lastMsg = item.lastMessage;
            const hasUnread = (item.unreadCount || 0) > 0;

            return (
              <li
                key={item.id}
                className={`chatListItem ${isActive ? "active" : ""} ${hasUnread ? "hasUnread" : ""}`}
                onClick={() => handleItemClick(item)}
              >
                <div className="chatListAvatarWrapper">
                  <img 
                    className="chatListAvatar" 
                    src={item.avatarUrl} 
                    alt={item.name}
                    onError={(e) => {
                      const bgColor = isGroupMode ? "4CAF50" : "random";
                      e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(item.name)}&background=${bgColor}`;
                    }}
                  />
                  {hasUnread && <span className="chatListOnlineDot" />}
                  {isGroupMode && <span className="groupBadge">👥</span>}
                </div>
                <div className="chatListContent">
                  <div className="chatListTop">
                    <span className={`chatListName ${hasUnread ? "bold" : ""}`}>
                      {item.name}
                    </span>
                    {lastMsg && (
                      <span className={`chatListTime ${hasUnread ? "unreadTime" : ""}`}>
                        {formatTime(lastMsg.createdAt)}
                      </span>
                    )}
                  </div>
                  <div className="chatListBottom">
                    <span className={`chatListPreview ${hasUnread ? "unreadPreview" : ""}`}>
                      {lastMsg 
                        ? getMessagePreview(lastMsg, isGroupMode) 
                        : (isGroupMode ? `${item.memberCount || 0} members` : item.email)
                      }
                    </span>
                    {hasUnread && (
                      <span className="chatListBadge">{item.unreadCount}</span>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}