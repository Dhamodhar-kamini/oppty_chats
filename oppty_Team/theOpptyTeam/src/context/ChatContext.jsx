import React, { createContext, useContext, useEffect, useMemo, useState, useReducer } from "react";
import { getAuthUser } from "../utils/auth.js";

const STORAGE_KEY = "opty_chat_v5";

function uid() {
  return crypto?.randomUUID?.() ?? `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function now() {
  return Date.now();
}

function loadChats() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveChats(chats) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(chats));
}

function safeTime(value) {
  const parsed = Number(value);
  if (Number.isFinite(parsed)) return parsed;
  const dateValue = new Date(value).getTime();
  if (Number.isFinite(dateValue)) return dateValue;
  return now();
}

const seed = [
  {
    id: "1",
    kind: "dm",
    name: "Elena@oppty",
    avatarUrl: "https://i.pravatar.cc/100?img=5",
    isOnline: true,
    lastSeen: "",
    about: "Hey there! I am using Oppty Chats.",
    contact: "elena@oppty.com",
    blocked: false,
    hasLeft: false,
    messages: [
      {
        id: uid(),
        chatId: "1",
        sender: "them",
        senderName: "Elena",
        type: "text",
        text: "Here are all the files. Let me know once you’ve had a look.",
        createdAt: now() - 1000 * 60 * 55,
        replyTo: null,
        deletedForAll: false,
        status: "read",
        unread: false,
        reactions: [],
        isStarred: false,
        isPinned: false
      },
      {
        id: uid(),
        chatId: "1",
        sender: "me",
        senderName: "You",
        type: "text",
        text: "Wow! Have great time. Enjoy.",
        createdAt: now() - 1000 * 60 * 52,
        replyTo: null,
        deletedForAll: false,
        status: "read",
        unread: false,
        reactions: ["❤️"],
        isStarred: true,
        isPinned: false
      },
    ],
  },
  {
    id: "2",
    kind: "dm",
    name: "Dhamodhar@oppty",
    avatarUrl: "https://i.pravatar.cc/100?img=12",
    isOnline: false,
    lastSeen: "last seen today at 10:21",
    about: "Hey there! I am using Oppty Chats.",
    contact: "Not available",
    blocked: false,
    hasLeft: false,
    messages: [
      {
        id: uid(),
        chatId: "2",
        sender: "them",
        senderName: "Dhamodhar",
        type: "text",
        text: "Video call later?",
        createdAt: now() - 1000 * 60 * 180,
        replyTo: null,
        deletedForAll: false,
        status: "delivered",
        unread: true, 
        reactions: [],
        isStarred: false,
        isPinned: false
      },
      {
        id: uid(),
        chatId: "2",
        sender: "them",
        senderName: "Dhamodhar",
        type: "text",
        text: "Let me know when you're free to catch up.",
        createdAt: now() - 1000 * 60 * 175,
        replyTo: null,
        deletedForAll: false,
        status: "delivered",
        unread: true, 
        reactions: [],
        isStarred: false,
        isPinned: false
      },
    ],
  },
  {
    id: "g1",
    kind: "group",
    name: "Oppty Team",
    avatarUrl: "https://i.pravatar.cc/100?img=20",
    isOnline: false,
    lastSeen: "",
    about: "Official team discussion group.",
    contact: "opptyteam@oppty.com",
    isAdmin: true,
    blocked: false,
    hasLeft: false,
    members: [
      { id: "emp-1", name: "Employee One", email: "employee@oppty.com", avatarUrl: "https://i.pravatar.cc/100?img=11", isAdmin: false },
      { id: "emp-3", name: "Maya", email: "maya@oppty.com", avatarUrl: "https://i.pravatar.cc/100?img=21", isAdmin: true },
    ],
    messages: [
      { id: uid(), chatId: "g1", sender: "system", senderName: "System", type: "system", text: "You created this group", createdAt: now() - 1000 * 60 * 305, replyTo: null, deletedForAll: false, status: "read", unread: false, reactions: [], isStarred: false, isPinned: false },
      { id: uid(), chatId: "g1", sender: "them", senderName: "Maya", type: "text", text: "Welcome to Oppty Team group! @Employee One let's get started.", createdAt: now() - 1000 * 60 * 300, replyTo: null, deletedForAll: false, status: "read", unread: false, reactions: [], isStarred: false, isPinned: false },
    ],
  },
];

function normalizeAndMerge(persisted) {
  if (!Array.isArray(persisted)) return seed;

  const persistedNormalized = persisted.map((c) => ({
    ...c,
    kind: c.kind ?? "dm",
    about: c.about ?? "Hey there! I am using Oppty Chats.",
    contact: c.contact ?? "Not available",
    isAdmin: c.isAdmin ?? false,
    blocked: c.blocked ?? false,
    hasLeft: c.hasLeft ?? false,
    members: Array.isArray(c.members) ? c.members.map(m => ({ ...m, isAdmin: m.isAdmin ?? false })) : [],
    messages: Array.isArray(c.messages)
      ? c.messages.map((m) => ({
          ...m,
          id: m.id ?? uid(),
          chatId: m.chatId ?? c.id,
          sender: m.sender ?? "them",
          senderName: m.senderName ?? (m.sender === "me" ? "You" : "Them"),
          type: m.type ?? "text",
          text: m.text ?? "",
          fileUrl: m.fileUrl ?? "",
          fileName: m.fileName ?? "",
          replyTo: m.replyTo ?? null,
          deletedForAll: m.deletedForAll ?? false,
          createdAt: safeTime(m.createdAt),
          isEdited: m.isEdited ?? false,
          status: m.status ?? "read",
          unread: m.unread ?? false,
          reactions: Array.isArray(m.reactions) ? m.reactions : [],
          isStarred: m.isStarred ?? false,
          isPinned: m.isPinned ?? false
        }))
      : [],
  }));

  const byId = new Map(persistedNormalized.map((c) => [c.id, c]));
  for (const s of seed) {
    if (!byId.has(s.id)) byId.set(s.id, s);
  }

  return Array.from(byId.values());
}

const ChatContext = createContext(null);

function isSystemAdmin() {
  const auth = getAuthUser();
  return auth?.role === "admin";
}

function createSystemMessage(chatId, text) {
  return { id: uid(), chatId, sender: "system", senderName: "System", type: "system", text, createdAt: now(), replyTo: null, deletedForAll: false, status: "read", unread: false, reactions: [], isStarred: false, isPinned: false };
}

function reducer(state, action) {
  switch (action.type) {
    case "INIT": return { chats: action.chats };
    case "RESET": saveChats(seed); return { chats: seed };

    case "SEND": {
      const text = action.text.trim();
      if (!text) return state;
      const target = state.chats.find((c) => c.id === action.chatId);
      if (!target || target.blocked || target.hasLeft) return state;

      const msg = {
        id: uid(), chatId: action.chatId, sender: "me", senderName: "You", type: "text",
        text, createdAt: now(), 
        replyTo: action.replyTo ? { id: action.replyTo.id, text: action.replyTo.text, type: action.replyTo.type, fileName: action.replyTo.fileName, senderName: action.replyTo.senderName || (action.replyTo.sender === 'me' ? 'You' : 'Them') } : null,
        deletedForAll: false, status: "read", unread: false, reactions: [], isStarred: false, isPinned: false
      };
      const chats = state.chats.map((c) => c.id === action.chatId ? { ...c, messages: [...c.messages, msg] } : c);
      saveChats(chats);
      return { chats };
    }

    case "SEND_ATTACHMENT": {
      const target = state.chats.find((c) => c.id === action.chatId);
      if (!target || target.blocked || target.hasLeft) return state;

      const msg = {
        id: uid(), chatId: action.chatId, sender: "me", senderName: "You", type: action.attachmentType,
        text: action.fileName || "", fileUrl: action.fileUrl || "", fileName: action.fileName || "",
        createdAt: now(), 
        replyTo: action.replyTo ? { id: action.replyTo.id, text: action.replyTo.text, type: action.replyTo.type, fileName: action.replyTo.fileName, senderName: action.replyTo.senderName || (action.replyTo.sender === 'me' ? 'You' : 'Them') } : null,
        deletedForAll: false, status: "read", unread: false, reactions: [], isStarred: false, isPinned: false
      };
      const chats = state.chats.map((c) => c.id === action.chatId ? { ...c, messages: [...c.messages, msg] } : c);
      saveChats(chats);
      return { chats };
    }

    case "EDIT_MESSAGE": {
      const chats = state.chats.map((c) => {
        if (c.id !== action.chatId) return c;
        return { ...c, messages: c.messages.map((m) => m.id === action.messageId ? { ...m, text: action.text.trim(), isEdited: true } : m) };
      });
      saveChats(chats);
      return { chats };
    }

    case "TOGGLE_REACTION": {
      const chats = state.chats.map(c => {
        if (c.id !== action.chatId) return c;
        return { ...c, messages: c.messages.map(m => {
          if (m.id !== action.messageId) return m;
          const exists = m.reactions.includes(action.emoji);
          return { ...m, reactions: exists ? m.reactions.filter(e => e !== action.emoji) : [...m.reactions, action.emoji] };
        })};
      });
      saveChats(chats);
      return { chats };
    }

    case "TOGGLE_STAR": {
      const chats = state.chats.map(c => {
        if (c.id !== action.chatId) return c;
        return { ...c, messages: c.messages.map(m => m.id === action.messageId ? { ...m, isStarred: !m.isStarred } : m) };
      });
      saveChats(chats);
      return { chats };
    }

    case "TOGGLE_PIN": {
      const chats = state.chats.map(c => {
        if (c.id !== action.chatId) return c;
        return { ...c, messages: c.messages.map(m => m.id === action.messageId ? { ...m, isPinned: !m.isPinned } : m) };
      });
      saveChats(chats);
      return { chats };
    }

    case "DELETE_MESSAGE_FOR_ME": {
      const ids = Array.isArray(action.messageId) ? action.messageId : [action.messageId];
      const chats = state.chats.map((chat) => {
        if (String(chat.id) !== String(action.chatId)) return chat;
        return { ...chat, messages: chat.messages.filter(msg => !ids.includes(msg.id)) };
      });
      saveChats(chats);
      return { chats };
    }

    case "DELETE_MESSAGE_FOR_ALL": {
      const ids = Array.isArray(action.messageId) ? action.messageId : [action.messageId];
      const chats = state.chats.map((chat) => {
        if (String(chat.id) !== String(action.chatId)) return chat;
        return {
          ...chat,
          messages: chat.messages.map((msg) => {
            if (!ids.includes(msg.id)) return msg;
            if (msg.sender !== "me" && !isSystemAdmin()) return msg;
            return { ...msg, type: "text", text: "This message was deleted", fileUrl: "", fileName: "", deletedForAll: true, reactions: [], isPinned: false };
          }),
        };
      });
      saveChats(chats);
      return { chats };
    }

    case "ADD_CONTACT": {
      const name = action.payload.name.trim();
      if (!name) return state;
      const newChat = {
        id: uid(), kind: "dm", name, avatarUrl: action.payload.avatarUrl || `https://i.pravatar.cc/100?u=${encodeURIComponent(name + Date.now())}`,
        isOnline: false, lastSeen: "last seen recently", about: "Hey there! I am using Oppty Chats.", contact: action.payload.contact?.trim() || "Not available", blocked: false, hasLeft: false, messages: [],
      };
      const chats = [newChat, ...state.chats];
      saveChats(chats);
      return { chats };
    }

    case "ADD_GROUP": {
      const name = action.payload.name.trim();
      if (!name) return state;
      const sysMsg = createSystemMessage(uid(), "You created this group");
      const newGroup = {
        id: sysMsg.chatId, kind: "group", name, avatarUrl: action.payload.avatarUrl || `https://i.pravatar.cc/100?u=${encodeURIComponent("group_" + name + Date.now())}`,
        isOnline: false, lastSeen: "", about: action.payload.about?.trim() || "New group created in Oppty Chats.", contact: action.payload.contact?.trim() || "Not available", isAdmin: true, blocked: false, hasLeft: false, members: [], messages: [sysMsg],
      };
      const chats = [newGroup, ...state.chats];
      saveChats(chats);
      return { chats };
    }

    case "UPDATE_CHAT_NAME": {
      const name = action.name.trim();
      if (!name) return state;
      const chats = state.chats.map((chat) => {
        if (String(chat.id) !== String(action.chatId)) return chat;
        let updatedChat = { ...chat, name };
        if (chat.kind === "group" && !chat.hasLeft) {
           updatedChat.messages = [...chat.messages, createSystemMessage(chat.id, `You changed the subject to "${name}"`)];
        }
        return updatedChat;
      });
      saveChats(chats);
      return { chats };
    }

    case "UPDATE_GROUP_ABOUT": {
      const about = action.about.trim();
      const chats = state.chats.map((chat) => {
        if (String(chat.id) !== String(action.chatId)) return chat;
        return { ...chat, about, messages: [...chat.messages, createSystemMessage(chat.id, "You changed the group description")] };
      });
      saveChats(chats);
      return { chats };
    }

    case "DELETE_CHAT": {
      if (!isSystemAdmin()) return state;
      const chats = state.chats.filter((chat) => String(chat.id) !== String(action.chatId));
      saveChats(chats);
      return { chats };
    }

    case "TOGGLE_BLOCK_CHAT": {
      if (!isSystemAdmin()) return state;
      const chats = state.chats.map((chat) => String(chat.id) === String(action.chatId) ? { ...chat, blocked: !chat.blocked } : chat);
      saveChats(chats);
      return { chats };
    }

    case "ADD_GROUP_MEMBER": {
      const chats = state.chats.map((chat) => {
        if (String(chat.id) !== String(action.chatId) || chat.kind !== "group") return chat;
        const exists = (chat.members || []).some((member) => String(member.id) === String(action.member.id));
        if (exists) return chat;
        return { ...chat, members: [...(chat.members || []), { ...action.member, isAdmin: false }], messages: [...chat.messages, createSystemMessage(chat.id, `You added ${action.member.name}`)] };
      });
      saveChats(chats);
      return { chats };
    }

    case "REMOVE_GROUP_MEMBER": {
      const chats = state.chats.map((chat) => {
        if (String(chat.id) !== String(action.chatId) || chat.kind !== "group") return chat;
        const memberToRemove = chat.members.find(m => String(m.id) === String(action.memberId));
        if (!memberToRemove) return chat;
        return { ...chat, members: chat.members.filter((m) => String(m.id) !== String(action.memberId)), messages: [...chat.messages, createSystemMessage(chat.id, `You removed ${memberToRemove.name}`)] };
      });
      saveChats(chats);
      return { chats };
    }

    case "PROMOTE_ADMIN": {
      const chats = state.chats.map((chat) => {
        if (String(chat.id) !== String(action.chatId) || chat.kind !== "group") return chat;
        const member = chat.members.find(m => String(m.id) === String(action.memberId));
        if (!member) return chat;
        return { ...chat, members: chat.members.map(m => String(m.id) === String(action.memberId) ? { ...m, isAdmin: true } : m), messages: [...chat.messages, createSystemMessage(chat.id, `You made ${member.name} a group admin`)] }
      });
      saveChats(chats);
      return { chats };
    }

    case "DEMOTE_ADMIN": {
      const chats = state.chats.map((chat) => {
        if (String(chat.id) !== String(action.chatId) || chat.kind !== "group") return chat;
        const member = chat.members.find(m => String(m.id) === String(action.memberId));
        if (!member) return chat;
        return { ...chat, members: chat.members.map(m => String(m.id) === String(action.memberId) ? { ...m, isAdmin: false } : m), messages: [...chat.messages, createSystemMessage(chat.id, `You dismissed ${member.name} as admin`)] }
      });
      saveChats(chats);
      return { chats };
    }

    case "LEAVE_GROUP": {
      const chats = state.chats.map((chat) => {
        if (String(chat.id) !== String(action.chatId) || chat.kind !== "group") return chat;
        return { ...chat, hasLeft: true, messages: [...chat.messages, createSystemMessage(chat.id, "You left")] }
      });
      saveChats(chats);
      return { chats };
    }

    default: return state;
  }
}

// Global Toast Container Component
function ToastContainer({ toasts }) {
  return (
    <div className="globalToastContainer">
      {toasts.map(toast => (
        <div key={toast.id} className={`globalToast ${toast.type}`}>
          {toast.message}
        </div>
      ))}
    </div>
  );
}

export function ChatProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, { chats: seed });
  
  // UX Polish: App Loading State
  const [isLoading, setIsLoading] = useState(true);
  
  // UX Polish: Toast Notification System
  const [toasts, setToasts] = useState([]);

  const showToast = (message, type = 'success') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  };

  useEffect(() => {
    const persisted = loadChats();
    const merged = normalizeAndMerge(persisted);
    dispatch({ type: "INIT", chats: merged });
    saveChats(merged);
    
    // Simulate slight loading delay for skeletons
    const timer = setTimeout(() => setIsLoading(false), 600);
    return () => clearTimeout(timer);
  }, []);

  const api = useMemo(
    () => ({
      isLoading,
      showToast,
      chats: state.chats,
      getChatById: (id) => state.chats.find((c) => String(c.id) === String(id)),
      sendMessage: (chatId, text, replyTo = null) => dispatch({ type: "SEND", chatId, text, replyTo }),
      sendAttachment: (chatId, attachmentType, fileUrl, fileName, replyTo = null) => dispatch({ type: "SEND_ATTACHMENT", chatId, attachmentType, fileUrl, fileName, replyTo }),
      editMessage: (chatId, messageId, text) => dispatch({ type: "EDIT_MESSAGE", chatId, messageId, text }),
      toggleReaction: (chatId, messageId, emoji) => dispatch({ type: "TOGGLE_REACTION", chatId, messageId, emoji }),
      toggleStar: (chatId, messageId) => dispatch({ type: "TOGGLE_STAR", chatId, messageId }),
      togglePin: (chatId, messageId) => dispatch({ type: "TOGGLE_PIN", chatId, messageId }),
      deleteMessageForMe: (chatId, messageId) => dispatch({ type: "DELETE_MESSAGE_FOR_ME", chatId, messageId }),
      deleteMessageForAll: (chatId, messageId) => dispatch({ type: "DELETE_MESSAGE_FOR_ALL", chatId, messageId }),
      
      addContact: (payload) => dispatch({ type: "ADD_CONTACT", payload }),
      addGroup: (payload) => dispatch({ type: "ADD_GROUP", payload }),
      updateChatName: (chatId, name) => dispatch({ type: "UPDATE_CHAT_NAME", chatId, name }),
      updateGroupAbout: (chatId, about) => dispatch({ type: "UPDATE_GROUP_ABOUT", chatId, about }),
      deleteChat: (chatId) => dispatch({ type: "DELETE_CHAT", chatId }),
      toggleBlockChat: (chatId) => dispatch({ type: "TOGGLE_BLOCK_CHAT", chatId }),
      
      addGroupMember: (chatId, member) => dispatch({ type: "ADD_GROUP_MEMBER", chatId, member }),
      removeGroupMember: (chatId, memberId) => dispatch({ type: "REMOVE_GROUP_MEMBER", chatId, memberId }),
      promoteAdmin: (chatId, memberId) => dispatch({ type: "PROMOTE_ADMIN", chatId, memberId }),
      demoteAdmin: (chatId, memberId) => dispatch({ type: "DEMOTE_ADMIN", chatId, memberId }),
      leaveGroup: (chatId) => dispatch({ type: "LEAVE_GROUP", chatId }),
      
      resetChats: () => dispatch({ type: "RESET" }),
      isAdmin: isSystemAdmin(),
    }),
    [state.chats, isLoading]
  );

  return (
    <ChatContext.Provider value={api}>
      {children}
      <ToastContainer toasts={toasts} />
    </ChatContext.Provider>
  );
}

export function useChats() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useChats must be used inside ChatProvider");
  return ctx;
}