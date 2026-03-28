import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useChats } from "../../context/ChatContext.jsx";
import { useMediaQuery } from "../../hooks/useMediaQuery.js";
import MessageBubble from "./MessageBubble.jsx";

function formatDay(ts) {
  return new Date(ts).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
}

export default function ChatPage() {
  const { chatId } = useParams();
  const navigate = useNavigate();
  const isDesktop = useMediaQuery("(min-width: 900px)");

  const { getChatById, sendMessage } = useChats();
  const chat = chatId ? getChatById(chatId) : null;

  const [text, setText] = useState("");
  const endRef = useRef(null);
  const canSend = text.trim().length > 0;

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatId, chat?.messages?.length]);

  const groups = useMemo(() => {
    if (!chat?.messages?.length) return [];
    const map = new Map();
    for (const m of chat.messages) {
      const day = formatDay(m.createdAt);
      if (!map.has(day)) map.set(day, []);
      map.get(day).push(m);
    }
    return Array.from(map.entries()).map(([day, messages]) => ({ day, messages }));
  }, [chat]);

  if (!chat) {
    return (
      <div className="chatEmpty">
        <div className="muted">Chat not found: {chatId}</div>
      </div>
    );
  }

  const onSend = () => {
    const v = text.trim();
    if (!v) return;
    sendMessage(chat.id, v);
    setText("");
  };

  return (
    <div className="chat">
      <header className="chatHeader">
        {!isDesktop && (
          <button
            className="iconBtn"
            onClick={() => navigate("..", { relative: "path" })} // ✅ works for /chats/:id and /groups/:id
            aria-label="Back"
          >
            ←
          </button>
        )}

        <img className="avatar" src={chat.avatarUrl} alt="" />

        <div className="chatHeaderText">
          <div className="chatHeaderName">{chat.name}</div>
          <div className="chatHeaderMeta">
            {chat.isOnline ? "online" : chat.lastSeen ? chat.lastSeen : "offline"}
          </div>
        </div>

        <div className="chatHeaderActions">
          <button className="iconBtn" aria-label="Search in chat">⌕</button>
          <button className="iconBtn" aria-label="More options">⋯</button>
        </div>
      </header>

      <section className="messages" aria-label="Messages">
        {groups.map((g) => (
          <div key={g.day}>
            <div className="dayChip">{g.day}</div>
            {g.messages.map((m) => (
              <MessageBubble key={m.id} message={m} />
            ))}
          </div>
        ))}
        <div ref={endRef} />
      </section>

      <footer className="composer">
        <textarea
          className="composerInput"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a message"
          rows={1}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSend();
            }
          }}
        />

        <button
          type="button"
          className="sendBtn"
          onClick={onSend}
          aria-label="Send"
          title="Send"
          disabled={!canSend}
        >
          <svg className="sendIcon" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
            <path fill="currentColor" d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
          </svg>
        </button>
      </footer>
    </div>
  );
}