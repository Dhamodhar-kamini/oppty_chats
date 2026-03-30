import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useChats } from "../../context/ChatContext.jsx";
import { useMediaQuery } from "../../hooks/useMediaQuery.js";
import MessageBubble from "./MessageBubble.jsx";

function formatDay(ts) {
  return new Date(ts).toLocaleDateString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function HighlightText({ text, query }) {
  if (!query.trim()) return text;

  const regex = new RegExp(`(${escapeRegExp(query)})`, "gi");
  const parts = String(text).split(regex);

  return parts.map((part, index) =>
    regex.test(part) ? (
      <mark key={`${part}-${index}`} className="chatSearchHighlight">
        {part}
      </mark>
    ) : (
      <React.Fragment key={`${part}-${index}`}>{part}</React.Fragment>
    )
  );
}

export default function ChatPage() {
  const { chatId } = useParams();
  const navigate = useNavigate();
  const isDesktop = useMediaQuery("(min-width: 900px)");

  const { getChatById, sendMessage } = useChats();
  const chat = chatId ? getChatById(chatId) : null;

  const [text, setText] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeSearchIndex, setActiveSearchIndex] = useState(0);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [showChatInfo, setShowChatInfo] = useState(false);

  const endRef = useRef(null);
  const optionsRef = useRef(null);
  const searchInputRef = useRef(null);
  const messageRefs = useRef({});

  const canSend = text.trim().length > 0;

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatId, chat?.messages?.length]);

  useEffect(() => {
    if (searchOpen) {
      searchInputRef.current?.focus();
    }
  }, [searchOpen]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (optionsRef.current && !optionsRef.current.contains(event.target)) {
        setShowOptionsMenu(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setShowOptionsMenu(false);
        setShowChatInfo(false);
        if (searchOpen) {
          setSearchOpen(false);
          setSearchTerm("");
          setActiveSearchIndex(0);
        }
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [searchOpen]);

  const matchedMessages = useMemo(() => {
    if (!chat?.messages?.length || !searchTerm.trim()) return [];

    return chat.messages.filter((m) =>
      m.text?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [chat, searchTerm]);

  useEffect(() => {
    if (!matchedMessages.length) {
      setActiveSearchIndex(0);
      return;
    }

    if (activeSearchIndex >= matchedMessages.length) {
      setActiveSearchIndex(0);
    }
  }, [matchedMessages, activeSearchIndex]);

  useEffect(() => {
    if (!matchedMessages.length) return;

    const currentMatch = matchedMessages[activeSearchIndex];
    const node = messageRefs.current[currentMatch.id];

    if (node) {
      node.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [activeSearchIndex, matchedMessages]);

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

  const handleOpenSearch = () => {
    setSearchOpen(true);
    setShowOptionsMenu(false);
  };

  const handleCloseSearch = () => {
    setSearchOpen(false);
    setSearchTerm("");
    setActiveSearchIndex(0);
  };

  const handleNextMatch = () => {
    if (!matchedMessages.length) return;
    setActiveSearchIndex((prev) => (prev + 1) % matchedMessages.length);
  };

  const handlePrevMatch = () => {
    if (!matchedMessages.length) return;
    setActiveSearchIndex((prev) =>
      prev === 0 ? matchedMessages.length - 1 : prev - 1
    );
  };

  const handleToggleOptions = () => {
    setShowOptionsMenu((prev) => !prev);
  };

  const handleScrollToLatest = () => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
    setShowOptionsMenu(false);
  };

  const handleOpenChatInfo = () => {
    setShowChatInfo(true);
    setShowOptionsMenu(false);
  };

  const handleCloseChatInfo = () => {
    setShowChatInfo(false);
  };

  return (
    <div className="chat">
      <header className="chatHeader">
        {!isDesktop && (
          <button
            className="iconBtn"
            onClick={() => navigate("..", { relative: "path" })}
            aria-label="Back"
          >
            ←
          </button>
        )}

        <button
          type="button"
          className="chatProfileTrigger"
          onClick={handleOpenChatInfo}
          aria-label="Open profile info"
          title="View profile"
        >
          <img className="avatar" src={chat.avatarUrl} alt={chat.name} />
        </button>

        <button
          type="button"
          className="chatHeaderIdentity"
          onClick={handleOpenChatInfo}
          aria-label="Open profile information"
          title="View profile"
        >
          <div className="chatHeaderText">
            <div className="chatHeaderName">{chat.name}</div>
            <div className="chatHeaderMeta">
              {chat.isOnline ? "online" : chat.lastSeen ? chat.lastSeen : "offline"}
            </div>
          </div>
        </button>

        <div className="chatHeaderActions" ref={optionsRef}>
          <button
            className="iconBtn"
            aria-label="Search in chat"
            title="Search in chat"
            onClick={handleOpenSearch}
          >
            ⌕
          </button>

          <button
            className="iconBtn"
            aria-label="More options"
            title="More options"
            onClick={handleToggleOptions}
          >
            ⋯
          </button>

          {showOptionsMenu && (
            <div className="chatOptionsMenu">
              <button type="button" className="chatOptionsItem" onClick={handleOpenChatInfo}>
                View chat info
              </button>
              <button type="button" className="chatOptionsItem" onClick={handleCloseSearch}>
                Clear search
              </button>
              <button type="button" className="chatOptionsItem" onClick={handleScrollToLatest}>
                Scroll to latest
              </button>
              <button
                type="button"
                className="chatOptionsItem"
                onClick={() => setShowOptionsMenu(false)}
              >
                Close
              </button>
            </div>
          )}
        </div>
      </header>

      {searchOpen && (
        <div className="chatSearchBar">
          <input
            ref={searchInputRef}
            type="text"
            className="chatSearchInput"
            placeholder="Search in this chat"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setActiveSearchIndex(0);
            }}
          />

          <div className="chatSearchMeta">
            <span className="chatSearchCount">
              {matchedMessages.length
                ? `${activeSearchIndex + 1}/${matchedMessages.length}`
                : "0/0"}
            </span>

            <button
              type="button"
              className="iconBtn"
              onClick={handlePrevMatch}
              disabled={!matchedMessages.length}
              title="Previous"
            >
              ↑
            </button>

            <button
              type="button"
              className="iconBtn"
              onClick={handleNextMatch}
              disabled={!matchedMessages.length}
              title="Next"
            >
              ↓
            </button>

            <button
              type="button"
              className="iconBtn"
              onClick={handleCloseSearch}
              title="Close search"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {showChatInfo && (
        <div className="chatInfoOverlay" onClick={handleCloseChatInfo}>
          <aside
            className="chatInfoDrawer"
            onClick={(e) => e.stopPropagation()}
            aria-label="Chat profile information"
          >
            <div className="chatInfoDrawerHeader">
              <button
                type="button"
                className="iconBtn"
                onClick={handleCloseChatInfo}
                aria-label="Close profile info"
              >
                ←
              </button>
              <div className="chatInfoDrawerTitle">Contact info</div>
            </div>

            <div className="chatInfoHero">
              <img className="chatInfoHeroAvatar" src={chat.avatarUrl} alt={chat.name} />
              <div className="chatInfoHeroName">{chat.name}</div>
              <div className="chatInfoHeroStatus">
                {chat.isOnline ? "online" : chat.lastSeen ? chat.lastSeen : "offline"}
              </div>
            </div>

            <div className="chatInfoSection">
              <div className="chatInfoCardRow">
                <span className="chatInfoLabel">About</span>
                <strong className="chatInfoValue">
                  {chat.about || "Hey there! I am using Oppty Chats."}
                </strong>
              </div>

              <div className="chatInfoCardRow">
                <span className="chatInfoLabel">Phone / Email</span>
                <strong className="chatInfoValue">
                  {chat.contact || chat.email || "Not available"}
                </strong>
              </div>
            </div>

            <div className="chatInfoDrawerActions">
              <button
                type="button"
                className="popup-btn popup-btn-secondary"
                onClick={handleCloseChatInfo}
              >
                Close
              </button>
            </div>
          </aside>
        </div>
      )}

      <section className="messages" aria-label="Messages">
        {groups.map((g) => (
          <div key={g.day}>
            <div className="dayChip">{g.day}</div>

            {g.messages
              .filter((m) =>
                searchTerm.trim()
                  ? m.text?.toLowerCase().includes(searchTerm.toLowerCase())
                  : true
              )
              .map((m) => {
                const isMatched =
                  searchTerm.trim() &&
                  m.text?.toLowerCase().includes(searchTerm.toLowerCase());
                const matchedIndex = matchedMessages.findIndex((item) => item.id === m.id);
                const isActiveMatched = matchedIndex === activeSearchIndex;

                return (
                  <div
                    key={m.id}
                    ref={(el) => {
                      messageRefs.current[m.id] = el;
                    }}
                    className={isActiveMatched ? "chatMatchedMessageActive" : ""}
                  >
                    <MessageBubble
                      message={{
                        ...m,
                        text: isMatched ? (
                          <HighlightText text={m.text} query={searchTerm} />
                        ) : (
                          m.text
                        ),
                      }}
                    />
                  </div>
                );
              })}
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