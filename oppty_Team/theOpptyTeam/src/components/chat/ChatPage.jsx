import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useChats } from "../../context/ChatContext.jsx";
import { useMediaQuery } from "../../hooks/useMediaQuery.js";
import { employeeDB } from "../../data/employees";
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

function isLink(text) {
  return /^https?:\/\//i.test(text || "");
}

const fallbackMedia = [
  {
    id: "fallback-media-1",
    fileUrl: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=500",
    fileName: "sample-image-1.jpg",
    type: "image",
  },
  {
    id: "fallback-media-2",
    fileUrl: "https://images.unsplash.com/photo-1455390582262-044cdead277a?w=500",
    fileName: "sample-image-2.jpg",
    type: "image",
  },
];

const fallbackDocs = [
  {
    id: "fallback-doc-1",
    fileUrl: "#",
    fileName: "Project-Brief.pdf",
    type: "document",
  },
];

export default function ChatPage() {
  const { chatId } = useParams();
  const navigate = useNavigate();
  const isDesktop = useMediaQuery("(min-width: 900px)");

  const {
    chats,
    getChatById,
    sendMessage,
    sendAttachment,
    editMessage,
    updateChatName,
    deleteChat,
    toggleBlockChat,
    addGroupMember,
    removeGroupMember,
    deleteMessageForMe,
    deleteMessageForAll,
    isAdmin,
  } = useChats();

  const chat = chatId ? getChatById(chatId) : null;

  const [text, setText] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeSearchIndex, setActiveSearchIndex] = useState(0);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [showChatInfo, setShowChatInfo] = useState(false);

  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState("");

  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [memberSearch, setMemberSearch] = useState("");
  const [groupMemberFilter, setGroupMemberFilter] = useState("");
  const [previewMedia, setPreviewMedia] = useState("");

  const [showMediaPanel, setShowMediaPanel] = useState(false);
  const [activeMediaTab, setActiveMediaTab] = useState("media");

  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showStickerMenu, setShowStickerMenu] = useState(false);

  const [replyingTo, setReplyingTo] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  
  // Modals state
  const [forwardingMessage, setForwardingMessage] = useState(null);
  const [deletePrompt, setDeletePrompt] = useState(null);

  const endRef = useRef(null);
  const optionsRef = useRef(null);
  const searchInputRef = useRef(null);
  const editNameInputRef = useRef(null);
  const messageRefs = useRef({});

  const addMemberSearchRef = useRef(null);
  const membersFilterRef = useRef(null);
  const addMemberSectionRef = useRef(null);
  const membersListSectionRef = useRef(null);

  const attachMenuRef = useRef(null);
  const stickerMenuRef = useRef(null);
  const attachBtnRef = useRef(null);
  const stickerBtnRef = useRef(null);

  const imageInputRef = useRef(null);
  const documentInputRef = useRef(null);

  const stickerOptions = ["😀", "😂", "😍", "🔥", "🎉", "❤️", "👍", "🙏", "😎", "🥳"];

  const canSend = text.trim().length > 0;
  const canEditName =
    isAdmin || chat?.kind !== "group" || chat?.isAdmin === true;

  const memberCount = chat?.kind === "group" ? chat.members?.length || 0 : 0;

  const availableEmployees = useMemo(() => {
    if (!chat || chat.kind !== "group") return [];
    const memberIds = new Set((chat.members || []).map((m) => String(m.id)));
    return employeeDB
      .filter((emp) => emp.role === "employee")
      .filter((emp) => !memberIds.has(String(emp.id)))
      .filter((emp) =>
        memberSearch.trim()
          ? `${emp.name} ${emp.email}`.toLowerCase().includes(memberSearch.toLowerCase())
          : true
      );
  }, [chat, memberSearch]);

  const filteredGroupMembers = useMemo(() => {
    if (!chat || chat.kind !== "group") return [];
    return (chat.members || []).filter((member) =>
      groupMemberFilter.trim()
        ? `${member.name} ${member.email}`.toLowerCase().includes(groupMemberFilter.toLowerCase())
        : true
    );
  }, [chat, groupMemberFilter]);

  const uploadedMediaItems = useMemo(() => {
    return (chat?.messages || []).filter((m) => m.type === "image");
  }, [chat]);

  const uploadedDocItems = useMemo(() => {
    return (chat?.messages || []).filter((m) => m.type === "document");
  }, [chat]);

  const linkItems = useMemo(() => {
    return (chat?.messages || []).filter((m) => isLink(m.text));
  }, [chat]);

  const mediaItems = uploadedMediaItems.length ? uploadedMediaItems : fallbackMedia;
  const docItems = uploadedDocItems.length ? uploadedDocItems : fallbackDocs;

  const totalSharedCount =
    uploadedMediaItems.length + uploadedDocItems.length + linkItems.length ||
    mediaItems.length + docItems.length + linkItems.length;

  useEffect(() => {
    setReplyingTo(null);
    setEditingMessage(null);
  }, [chatId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatId, chat?.messages?.length]);

  useEffect(() => {
    if (searchOpen) searchInputRef.current?.focus();
  }, [searchOpen]);

  useEffect(() => {
    if (isEditingName) editNameInputRef.current?.focus();
  }, [isEditingName]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (optionsRef.current && !optionsRef.current.contains(event.target)) {
        setShowOptionsMenu(false);
      }

      if (
        showAttachMenu &&
        attachMenuRef.current &&
        !attachMenuRef.current.contains(event.target) &&
        attachBtnRef.current &&
        !attachBtnRef.current.contains(event.target)
      ) {
        setShowAttachMenu(false);
      }

      if (
        showStickerMenu &&
        stickerMenuRef.current &&
        !stickerMenuRef.current.contains(event.target) &&
        stickerBtnRef.current &&
        !stickerBtnRef.current.contains(event.target)
      ) {
        setShowStickerMenu(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setShowOptionsMenu(false);
        setShowChatInfo(false);
        setIsEditingName(false);
        setPreviewMedia("");
        setShowMediaPanel(false);
        setShowAttachMenu(false);
        setShowStickerMenu(false);
        setForwardingMessage(null);
        setDeletePrompt(null);

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
  }, [searchOpen, showAttachMenu, showStickerMenu]);

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
      node.scrollIntoView({ behavior: "smooth", block: "center" });
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
    if (!v || chat.blocked) return;

    if (editingMessage) {
      editMessage(chat.id, editingMessage.id, v);
      setEditingMessage(null);
    } else {
      sendMessage(chat.id, v, replyingTo);
    }
    
    setText("");
    setReplyingTo(null);
    setShowAttachMenu(false);
    setShowStickerMenu(false);
  };

  const handleAttachmentAction = (type) => {
    if (chat.blocked) return;

    if (type === "image") {
      imageInputRef.current?.click();
    } else if (type === "document") {
      documentInputRef.current?.click();
    } else if (type === "contact") {
      setText((prev) => `${prev}${prev ? " " : ""}[Shared Contact]`);
      setShowAttachMenu(false);
    }
  };

  const handleImageSelected = (e) => {
    const file = e.target.files?.[0];
    if (!file || chat.blocked) return;

    const fileUrl = URL.createObjectURL(file);
    sendAttachment(chat.id, "image", fileUrl, file.name, replyingTo);
    setReplyingTo(null);

    setShowAttachMenu(false);
    e.target.value = "";
  };

  const handleDocumentSelected = (e) => {
    const file = e.target.files?.[0];
    if (!file || chat.blocked) return;

    const fileUrl = URL.createObjectURL(file);
    sendAttachment(chat.id, "document", fileUrl, file.name, replyingTo);
    setReplyingTo(null);

    setShowAttachMenu(false);
    e.target.value = "";
  };

  const handleStickerSelect = (sticker) => {
    if (chat.blocked) return;
    setText((prev) => `${prev}${prev ? " " : ""}${sticker}`);
    setShowStickerMenu(false);
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
    setEditedName(chat.name || "");
    setIsEditingName(false);
  };

  const handleCloseChatInfo = () => {
    setShowChatInfo(false);
    setIsEditingName(false);
    setEditedName(chat.name || "");
    setSelectedMemberId("");
    setMemberSearch("");
    setGroupMemberFilter("");
  };

  const handleStartEditName = () => {
    if (!canEditName) return;
    setEditedName(chat.name || "");
    setIsEditingName(true);
  };

  const handleCancelEditName = () => {
    setIsEditingName(false);
    setEditedName(chat.name || "");
  };

  const handleSaveEditName = () => {
    const trimmed = editedName.trim();
    if (!trimmed || !canEditName) return;
    updateChatName(chat.id, trimmed);
    setIsEditingName(false);
  };

  const handleDeleteChat = () => {
    if (!isAdmin) return;
    deleteChat(chat.id);
    setShowOptionsMenu(false);
    setShowChatInfo(false);
    navigate(chat.kind === "group" ? "/groups" : "/chats");
  };

  const handleToggleBlock = () => {
    if (!isAdmin) return;
    toggleBlockChat(chat.id);
    setShowOptionsMenu(false);
  };

  const handleAddMember = () => {
    if (!isAdmin || chat.kind !== "group" || !selectedMemberId) return;

    const employee = employeeDB.find((emp) => String(emp.id) === String(selectedMemberId));
    if (!employee) return;

    addGroupMember(chat.id, {
      id: employee.id,
      name: employee.name,
      email: employee.email,
      avatarUrl: employee.avatarUrl,
    });

    setSelectedMemberId("");
    setMemberSearch("");
  };

  const handleRemoveMember = (memberId) => {
    if (!isAdmin || chat.kind !== "group") return;
    removeGroupMember(chat.id, memberId);
  };

  const handleFocusAddMember = () => {
    if (!isAdmin) return;
    addMemberSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    setTimeout(() => addMemberSearchRef.current?.focus(), 250);
  };

  const handleFocusMemberSearch = () => {
    membersListSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    setTimeout(() => membersFilterRef.current?.focus(), 250);
  };

  const handleReplyMessage = (message) => {
    setReplyingTo(message);
    setEditingMessage(null);
  };

  const handleEditMessage = (message) => {
    setEditingMessage(message);
    setText(message.text);
    setReplyingTo(null);
  };

  const handleForwardSubmit = (targetChatId) => {
    if (!forwardingMessage) return;
    if (forwardingMessage.type === "text") {
      sendMessage(targetChatId, forwardingMessage.text);
    } else {
      sendAttachment(targetChatId, forwardingMessage.type, forwardingMessage.fileUrl, forwardingMessage.fileName);
    }
    setForwardingMessage(null);
  };

  const confirmDelete = () => {
    if (!deletePrompt) return;
    if (deletePrompt.type === 'me') deleteMessageForMe(chat.id, deletePrompt.id);
    if (deletePrompt.type === 'all') deleteMessageForAll(chat.id, deletePrompt.id);
    setDeletePrompt(null);
  };

  const handleScrollToMessage = (msgId) => {
    const node = messageRefs.current[msgId];
    if (node) {
      node.scrollIntoView({ behavior: "smooth", block: "center" });
      node.classList.add("chatMatchedMessageActive");
      setTimeout(() => node.classList.remove("chatMatchedMessageActive"), 1500);
    }
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
              {chat.kind === "group"
                ? `${memberCount} member${memberCount !== 1 ? "s" : ""}`
                : chat.blocked
                ? "blocked by admin"
                : chat.isOnline
                ? "online"
                : chat.lastSeen
                ? chat.lastSeen
                : "offline"}
            </div>
          </div>
        </button>

        <div className="chatHeaderActions" ref={optionsRef}>
          <button className="iconBtn" onClick={handleOpenSearch}>⌕</button>
          <button className="iconBtn" onClick={handleToggleOptions}>⋯</button>

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

              {isAdmin && (
                <>
                  <button type="button" className="chatOptionsItem" onClick={handleToggleBlock}>
                    {chat.blocked ? "Unblock" : "Block"}{" "}
                    {chat.kind === "group" ? "group" : "contact"}
                  </button>
                  <button
                    type="button"
                    className="chatOptionsItem chatOptionsItemDanger"
                    onClick={handleDeleteChat}
                  >
                    Delete {chat.kind === "group" ? "group" : "chat"}
                  </button>
                </>
              )}

              <button type="button" className="chatOptionsItem" onClick={() => setShowOptionsMenu(false)}>
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
              {matchedMessages.length ? `${activeSearchIndex + 1}/${matchedMessages.length}` : "0/0"}
            </span>
            <button type="button" className="iconBtn" onClick={handlePrevMatch} disabled={!matchedMessages.length}>↑</button>
            <button type="button" className="iconBtn" onClick={handleNextMatch} disabled={!matchedMessages.length}>↓</button>
            <button type="button" className="iconBtn" onClick={handleCloseSearch}>✕</button>
          </div>
        </div>
      )}

      {showChatInfo && (
        <div className="chatInfoOverlay" onClick={handleCloseChatInfo}>
          <aside
            className="chatInfoDrawer whatsappGroupInfoDrawer"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Same info drawer content as original... */}
            <div className="chatInfoDrawerHeader whatsappGroupInfoHeader">
              <button type="button" className="iconBtn" onClick={handleCloseChatInfo}>←</button>
              <div className="chatInfoDrawerTitle">
                {chat.kind === "group" ? "Group info" : "Contact info"}
              </div>
            </div>

            <div className="whatsappGroupTopCard">
              <img className="whatsappGroupAvatar" src={chat.avatarUrl} alt={chat.name} />

              {!isEditingName ? (
                <>
                  <div className="whatsappGroupNameRow">
                    <div className="whatsappGroupName">{chat.name}</div>
                    {canEditName && (
                      <button type="button" className="groupInlineEditBtn" onClick={handleStartEditName}>
                        ✎
                      </button>
                    )}
                  </div>

                  {chat.kind === "group" ? (
                    <div className="whatsappGroupMeta">
                      Group · {memberCount} member{memberCount !== 1 ? "s" : ""}
                    </div>
                  ) : (
                    <div className="whatsappGroupMeta">
                      {chat.blocked
                        ? "Blocked by admin"
                        : chat.isOnline
                        ? "online"
                        : chat.lastSeen
                        ? chat.lastSeen
                        : "offline"}
                    </div>
                  )}
                </>
              ) : (
                <div className="chatEditNameBox">
                  <input
                    ref={editNameInputRef}
                    type="text"
                    className="chatEditNameInput"
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    placeholder={chat.kind === "group" ? "Enter group name" : "Enter name"}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSaveEditName();
                    }}
                  />
                  <div className="chatEditNameActions">
                    <button type="button" className="popup-btn popup-btn-secondary" onClick={handleCancelEditName}>
                      Cancel
                    </button>
                    <button type="button" className="popup-btn popup-btn-danger" onClick={handleSaveEditName} disabled={!editedName.trim()}>
                      Save
                    </button>
                  </div>
                </div>
              )}

              {chat.kind === "group" && isAdmin && (
                <>
                  <div className="groupQuickActions">
                    <button type="button" className="groupQuickActionBtn" onClick={handleFocusAddMember}>
                      <span>👤+</span>
                      <span>Add</span>
                    </button>
                    <button type="button" className="groupQuickActionBtn" onClick={handleFocusMemberSearch}>
                      <span>🔍</span>
                      <span>Search</span>
                    </button>
                  </div>

                  <div className="groupDescriptionCard">
                    <div className="groupSectionLabel">Add group description</div>
                    <div className="groupSectionValue">
                      {chat.about || "No description added yet."}
                    </div>
                  </div>

                  <div className="groupCreatedMeta">
                    Group created by +91 78934 58943, on 2/24/2026 at 11:44 AM
                  </div>
                </>
              )}

              {chat.kind !== "group" && (
                <div className="chatInfoSection chatInfoSectionContactOnly">
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

                  <div
                    className="groupInfoSectionCard mediaLinksDocsCard"
                    onClick={() => setShowMediaPanel(true)}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="groupInfoSectionTop">
                      <div className="groupInfoSectionTitle">Media, links and docs</div>
                      <div className="groupInfoSectionCount">{totalSharedCount}</div>
                    </div>

                    <div className="groupMediaPreviewRow">
                      {mediaItems.slice(0, 2).map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          className="groupMediaPreviewItem"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (item.fileUrl && item.fileUrl !== "#") {
                              setPreviewMedia(item.fileUrl);
                            }
                          }}
                        >
                          <img src={item.fileUrl} alt={item.fileName} />
                        </button>
                      ))}
                    </div>
                  </div>

                  {isAdmin && (
                    <div className="chatInfoAdminActions">
                      <button type="button" className="popup-btn popup-btn-secondary" onClick={handleToggleBlock}>
                        {chat.blocked ? "Unblock" : "Block"} Contact
                      </button>

                      <button type="button" className="popup-btn popup-btn-danger" onClick={handleDeleteChat}>
                        Delete Chat
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {chat.kind === "group" && (
              <>
                <div
                  className="groupInfoSectionCard mediaLinksDocsCard"
                  onClick={() => setShowMediaPanel(true)}
                  role="button"
                  tabIndex={0}
                >
                  <div className="groupInfoSectionTop">
                    <div className="groupInfoSectionTitle">Media, links and docs</div>
                    <div className="groupInfoSectionCount">{totalSharedCount}</div>
                  </div>

                  <div className="groupMediaPreviewRow">
                    {mediaItems.slice(0, 2).length ? (
                      mediaItems.slice(0, 2).map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          className="groupMediaPreviewItem"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (item.fileUrl && item.fileUrl !== "#") {
                              setPreviewMedia(item.fileUrl);
                            }
                          }}
                        >
                          <img src={item.fileUrl} alt={item.fileName} />
                        </button>
                      ))
                    ) : (
                      <div className="muted">No media, docs or links shared yet.</div>
                    )}
                  </div>
                </div>

                <div className="groupMembersSection" ref={membersListSectionRef}>
                  <div className="groupMembersHeaderRow">
                    <div className="groupMembersHeaderTitle">
                      {memberCount} member{memberCount !== 1 ? "s" : ""}
                    </div>
                  </div>

                  <div className="groupAddMemberSearchBox groupMembersFilterBox">
                    <input
                      ref={membersFilterRef}
                      type="text"
                      className="groupMemberSearchInput"
                      value={groupMemberFilter}
                      onChange={(e) => setGroupMemberFilter(e.target.value)}
                      placeholder="Search members by name or email"
                    />
                  </div>

                  {isAdmin && (
                    <div className="groupAddMemberCard" ref={addMemberSectionRef}>
                      <div className="groupAddMemberCardHeader">Add member</div>

                      <div className="groupAddMemberSearchBox">
                        <input
                          ref={addMemberSearchRef}
                          type="text"
                          className="groupMemberSearchInput"
                          value={memberSearch}
                          onChange={(e) => setMemberSearch(e.target.value)}
                          placeholder="Search employee by name or email"
                        />
                      </div>

                      <div className="groupAddMemberBox">
                        <select
                          className="groupMemberSelect"
                          value={selectedMemberId}
                          onChange={(e) => setSelectedMemberId(e.target.value)}
                        >
                          <option value="">Select employee</option>
                          {availableEmployees.map((emp) => (
                            <option key={emp.id} value={emp.id}>
                              {emp.name} ({emp.email})
                            </option>
                          ))}
                        </select>

                        <button
                          type="button"
                          className="popup-btn popup-btn-danger"
                          onClick={handleAddMember}
                          disabled={!selectedMemberId}
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="groupMembersListWhatsapp">
                    {filteredGroupMembers.length ? (
                      filteredGroupMembers.map((member) => (
                        <div key={member.id} className="groupMemberWhatsappItem">
                          <div className="groupMemberInfoWrap">
                            <img
                              src={member.avatarUrl || "https://i.pravatar.cc/100"}
                              alt={member.name}
                              className="groupMemberAvatar"
                            />
                            <div className="groupMemberInfo">
                              <strong>{member.name}</strong>
                              <span>{member.email}</span>
                            </div>
                          </div>

                          <div className="groupMemberRightMeta">
                            {isAdmin && (
                              <button
                                type="button"
                                className="groupMemberRemoveBtn"
                                onClick={() => handleRemoveMember(member.id)}
                              >
                                Remove
                              </button>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="emptyList">
                        <div className="muted">No members found.</div>
                      </div>
                    )}
                  </div>

                  {isAdmin && (
                    <div className="groupBottomActions">
                      <button
                        type="button"
                        className="groupBottomActionBtn danger"
                        onClick={handleDeleteChat}
                      >
                        Delete group
                      </button>

                      <button
                        type="button"
                        className="groupBottomActionBtn danger"
                        onClick={handleToggleBlock}
                      >
                        {chat.blocked ? "Unblock group" : "Block group"}
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}

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

            {g.messages.map((m) => {
              const isMatched =
                searchTerm.trim() &&
                typeof m.text === "string" &&
                m.text.toLowerCase().includes(searchTerm.toLowerCase());

              const matchedIndex = matchedMessages.findIndex((item) => item.id === m.id);
              const isActiveMatched = isMatched && matchedIndex === activeSearchIndex;

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
                      displayText: isMatched ? (
                        <HighlightText text={m.text} query={searchTerm} />
                      ) : (
                        m.text
                      ),
                    }}
                    onReply={() => handleReplyMessage(m)}
                    onEdit={() => handleEditMessage(m)}
                    onForward={() => setForwardingMessage(m)}
                    onDeleteForMe={() => setDeletePrompt({ id: m.id, type: 'me' })}
                    onDeleteForAll={() => setDeletePrompt({ id: m.id, type: 'all' })}
                    canDeleteForAll={m.sender === "me" || isAdmin}
                    onScrollToReply={handleScrollToMessage}
                    onPreviewImage={(url) => setPreviewMedia(url)}
                  />
                </div>
              );
            })}
          </div>
        ))}
        <div ref={endRef} />
      </section>

      <footer className="composer">
        {replyingTo && (
          <div className="waComposerReplyBar">
            <div className="waComposerReplyAccent" />
            <div className="waComposerReplyContent">
              <div className="waComposerReplyTitle">
                {replyingTo.sender === "me" ? "You" : chat.name}
              </div>
              <div className="waComposerReplyText">
                {replyingTo.type === "image"
                  ? `🖼 ${replyingTo.fileName || "Photo"}`
                  : replyingTo.type === "document"
                  ? `📄 ${replyingTo.fileName || "Document"}`
                  : replyingTo.text}
              </div>
            </div>
            <button
              type="button"
              className="waComposerReplyClose"
              onClick={() => setReplyingTo(null)}
            >
              ✕
            </button>
          </div>
        )}

        {editingMessage && (
          <div className="waComposerReplyBar">
            <div className="waComposerReplyAccent" />
            <div className="waComposerReplyContent">
              <div className="waComposerReplyTitle">Editing message</div>
              <div className="waComposerReplyText">
                {editingMessage.text}
              </div>
            </div>
            <button
              type="button"
              className="waComposerReplyClose"
              onClick={() => { setEditingMessage(null); setText(""); }}
            >
              ✕
            </button>
          </div>
        )}

        <div className="composer-actions-left">
          <div className="composer-action-wrapper">
            <button
              ref={attachBtnRef}
              type="button"
              className="composerActionBtn"
              onClick={() => {
                setShowAttachMenu((prev) => !prev);
                setShowStickerMenu(false);
              }}
              title="Attach"
              aria-label="Attach"
              disabled={chat.blocked}
            >
              +
            </button>

            {showAttachMenu && (
              <div ref={attachMenuRef} className="composerPopupMenu attachMenu">
                <button
                  type="button"
                  className="composerPopupItem"
                  onClick={() => handleAttachmentAction("image")}
                >
                  🖼 Image
                </button>
                <button
                  type="button"
                  className="composerPopupItem"
                  onClick={() => handleAttachmentAction("document")}
                >
                  📄 Document
                </button>
                <button
                  type="button"
                  className="composerPopupItem"
                  onClick={() => handleAttachmentAction("contact")}
                >
                  👤 Contact
                </button>
              </div>
            )}
          </div>

          <div className="composer-action-wrapper">
            <button
              ref={stickerBtnRef}
              type="button"
              className="composerActionBtn"
              onClick={() => {
                setShowStickerMenu((prev) => !prev);
                setShowAttachMenu(false);
              }}
              title="Stickers"
              aria-label="Stickers"
              disabled={chat.blocked}
            >
              ☺
            </button>

            {showStickerMenu && (
              <div ref={stickerMenuRef} className="composerPopupMenu stickerMenu">
                <div className="stickerGrid">
                  {stickerOptions.map((sticker, index) => (
                    <button
                      key={`${sticker}-${index}`}
                      type="button"
                      className="stickerBtn"
                      onClick={() => handleStickerSelect(sticker)}
                    >
                      {sticker}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            className="hiddenFileInput"
            onChange={handleImageSelected}
          />

          <input
            ref={documentInputRef}
            type="file"
            className="hiddenFileInput"
            onChange={handleDocumentSelected}
          />
        </div>

        <textarea
          className="composerInput"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={chat.blocked ? "This chat is blocked by admin" : editingMessage ? "Edit message" : "Type a message"}
          rows={1}
          disabled={chat.blocked}
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
          disabled={!canSend || chat.blocked}
        >
          <svg className="sendIcon" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
            <path fill="currentColor" d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
          </svg>
        </button>
      </footer>

      {showMediaPanel && (
        <div className="mediaSharedOverlay">
          <div className="mediaSharedPanel">
            <div className="mediaSharedHeader">
              <button
                type="button"
                className="iconBtn"
                onClick={() => setShowMediaPanel(false)}
              >
                ←
              </button>
              <div className="mediaSharedTabs">
                <button
                  className={`mediaTabBtn ${activeMediaTab === "media" ? "active" : ""}`}
                  onClick={() => setActiveMediaTab("media")}
                >
                  Media
                </button>
                <button
                  className={`mediaTabBtn ${activeMediaTab === "docs" ? "active" : ""}`}
                  onClick={() => setActiveMediaTab("docs")}
                >
                  Docs
                </button>
                <button
                  className={`mediaTabBtn ${activeMediaTab === "links" ? "active" : ""}`}
                  onClick={() => setActiveMediaTab("links")}
                >
                  Links
                </button>
              </div>
            </div>

            <div className="mediaSharedBody">
              {activeMediaTab === "media" && (
                <>
                  {mediaItems.length ? (
                    <div className="mediaSharedGrid">
                      {mediaItems.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          className="mediaSharedItem"
                          onClick={() => item.fileUrl !== "#" && setPreviewMedia(item.fileUrl)}
                        >
                          <img src={item.fileUrl} alt={item.fileName} />
                          <div className="mediaSharedLabel">{item.fileName}</div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="mediaEmptyState">
                      <h3>No media</h3>
                      <p>Media shared in this chat will appear here.</p>
                    </div>
                  )}
                </>
              )}

              {activeMediaTab === "docs" && (
                <>
                  {docItems.length ? (
                    <div className="docsSharedList">
                      {docItems.map((item) => (
                        <a
                          key={item.id}
                          href={item.fileUrl || "#"}
                          target="_blank"
                          rel="noreferrer"
                          className="docsSharedItem"
                        >
                          <span>📄</span>
                          <div>
                            <strong>{item.fileName}</strong>
                            <small>{item.fileUrl && item.fileUrl !== "#" ? "Open document" : "Sample document"}</small>
                          </div>
                        </a>
                      ))}
                    </div>
                  ) : (
                    <div className="mediaEmptyState">
                      <h3>No docs</h3>
                      <p>Documents shared in this chat will appear here.</p>
                    </div>
                  )}
                </>
              )}

              {activeMediaTab === "links" && (
                <>
                  {linkItems.length ? (
                    <div className="docsSharedList">
                      {linkItems.map((item) => (
                        <a
                          key={item.id}
                          href={item.text}
                          target="_blank"
                          rel="noreferrer"
                          className="docsSharedItem"
                        >
                          <span>🔗</span>
                          <div>
                            <strong>{item.text}</strong>
                            <small>Open link</small>
                          </div>
                        </a>
                      ))}
                    </div>
                  ) : (
                    <div className="mediaEmptyState">
                      <h3>No links</h3>
                      <p>Links shared in this chat will appear here.</p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletePrompt && (
        <div className="mediaPreviewOverlay" onClick={() => setDeletePrompt(null)}>
          <div className="customModal" onClick={(e) => e.stopPropagation()}>
            <h3 className="customModalTitle">Delete Message?</h3>
            <p className="customModalText">Are you sure you want to delete this message {deletePrompt.type === 'all' ? "for everyone" : "for yourself"}?</p>
            <div className="customModalActions">
              <button className="popup-btn popup-btn-secondary" onClick={() => setDeletePrompt(null)}>Cancel</button>
              <button className="popup-btn popup-btn-danger" onClick={confirmDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Forward Modal */}
      {forwardingMessage && (
        <div className="mediaPreviewOverlay" onClick={() => setForwardingMessage(null)}>
          <div className="customModal forwardModal" onClick={(e) => e.stopPropagation()}>
            <div className="forwardModalHeader">
              <h3 className="customModalTitle">Forward to...</h3>
              <button className="iconBtn" onClick={() => setForwardingMessage(null)}>✕</button>
            </div>
            <div className="forwardChatList">
              {chats.map(c => (
                <div key={c.id} className="forwardChatRow" onClick={() => handleForwardSubmit(c.id)}>
                  <img src={c.avatarUrl} alt={c.name} className="forwardChatAvatar" />
                  <div className="forwardChatName">{c.name}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {previewMedia && (
        <div className="mediaPreviewOverlay" onClick={() => setPreviewMedia("")}>
          <div className="mediaPreviewModal" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="mediaPreviewCloseBtn"
              onClick={() => setPreviewMedia("")}
            >
              ✕
            </button>
            <img src={previewMedia} alt="Preview" className="mediaPreviewImage" />
          </div>
        </div>
      )}
    </div>
  );
}