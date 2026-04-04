import React, { createContext, useContext, useEffect, useMemo, useReducer } from "react";
import { getAuthUser } from "../utils/auth.js";

const STORAGE_KEY = "opty_chat_v1";

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
    messages: [
      {
        id: uid(),
        chatId: "1",
        sender: "them",
        type: "text",
        text: "Here are all the files. Let me know once you’ve had a look.",
        createdAt: now() - 1000 * 60 * 55,
        replyTo: null,
        deletedForAll: false,
        status: "read"
      },
      {
        id: uid(),
        chatId: "1",
        sender: "me",
        type: "text",
        text: "Wow! Have great time. Enjoy.",
        createdAt: now() - 1000 * 60 * 52,
        replyTo: null,
        deletedForAll: false,
        status: "read"
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
    messages: [
      {
        id: uid(),
        chatId: "2",
        sender: "them",
        type: "text",
        text: "Video call later?",
        createdAt: now() - 1000 * 60 * 180,
        replyTo: null,
        deletedForAll: false,
        status: "read"
      },
      {
        id: uid(),
        chatId: "2",
        sender: "me",
        type: "text",
        text: "Sure—send a time.",
        createdAt: now() - 1000 * 60 * 175,
        replyTo: null,
        deletedForAll: false,
        status: "read"
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
    members: [
      {
        id: "emp-1",
        name: "Employee One",
        email: "employee@oppty.com",
        avatarUrl: "https://i.pravatar.cc/100?img=11",
      },
      {
        id: "emp-3",
        name: "Maya",
        email: "maya@oppty.com",
        avatarUrl: "https://i.pravatar.cc/100?img=21",
      },
    ],
    messages: [
      {
        id: uid(),
        chatId: "g1",
        sender: "them",
        type: "text",
        text: "Welcome to Oppty Team group!",
        createdAt: now() - 1000 * 60 * 300,
        replyTo: null,
        deletedForAll: false,
        status: "read"
      },
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
    members: Array.isArray(c.members) ? c.members : [],
    messages: Array.isArray(c.messages)
      ? c.messages.map((m) => ({
          id: m.id ?? uid(),
          chatId: m.chatId ?? c.id,
          sender: m.sender ?? "them",
          type: m.type ?? "text",
          text: m.text ?? "",
          fileUrl: m.fileUrl ?? "",
          fileName: m.fileName ?? "",
          replyTo: m.replyTo ?? null,
          deletedForAll: m.deletedForAll ?? false,
          createdAt: safeTime(m.createdAt),
          isEdited: m.isEdited ?? false,
          status: m.status ?? "read"
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

function reducer(state, action) {
  switch (action.type) {
    case "INIT":
      return { chats: action.chats };

    case "RESET":
      saveChats(seed);
      return { chats: seed };

    case "SEND": {
      const text = action.text.trim();
      if (!text) return state;

      const target = state.chats.find((c) => c.id === action.chatId);
      if (!target || target.blocked) return state;

      const msg = {
        id: uid(),
        chatId: action.chatId,
        sender: "me",
        type: "text",
        text,
        createdAt: now(),
        replyTo: action.replyTo
          ? {
              id: action.replyTo.id,
              text: action.replyTo.text || "",
              sender: action.replyTo.sender || "them",
              type: action.replyTo.type || "text",
              fileName: action.replyTo.fileName || "",
            }
          : null,
        deletedForAll: false,
        status: "read", // Simulated immediate read for UI
      };

      const chats = state.chats.map((c) =>
        c.id === action.chatId ? { ...c, messages: [...c.messages, msg] } : c
      );

      saveChats(chats);
      return { chats };
    }

    case "SEND_ATTACHMENT": {
      const target = state.chats.find((c) => c.id === action.chatId);
      if (!target || target.blocked) return state;

      const msg = {
        id: uid(),
        chatId: action.chatId,
        sender: "me",
        type: action.attachmentType,
        text: action.fileName || "",
        fileUrl: action.fileUrl || "",
        fileName: action.fileName || "",
        createdAt: now(),
        replyTo: action.replyTo
          ? {
              id: action.replyTo.id,
              text: action.replyTo.text || "",
              sender: action.replyTo.sender || "them",
              type: action.replyTo.type || "text",
              fileName: action.replyTo.fileName || "",
            }
          : null,
        deletedForAll: false,
        status: "read",
      };

      const chats = state.chats.map((c) =>
        c.id === action.chatId ? { ...c, messages: [...c.messages, msg] } : c
      );

      saveChats(chats);
      return { chats };
    }

    case "EDIT_MESSAGE": {
      const text = action.text.trim();
      if (!text) return state;

      const chats = state.chats.map((c) => {
        if (c.id !== action.chatId) return c;
        return {
          ...c,
          messages: c.messages.map((m) =>
            m.id === action.messageId ? { ...m, text, isEdited: true } : m
          ),
        };
      });

      saveChats(chats);
      return { chats };
    }

    case "DELETE_MESSAGE_FOR_ME": {
      const chats = state.chats.map((chat) => {
        if (String(chat.id) !== String(action.chatId)) return chat;
        return {
          ...chat,
          messages: (chat.messages || []).filter(
            (msg) => String(msg.id) !== String(action.messageId)
          ),
        };
      });

      saveChats(chats);
      return { chats };
    }

    case "DELETE_MESSAGE_FOR_ALL": {
      const chats = state.chats.map((chat) => {
        if (String(chat.id) !== String(action.chatId)) return chat;

        return {
          ...chat,
          messages: (chat.messages || []).map((msg) => {
            if (String(msg.id) !== String(action.messageId)) return msg;
            if (msg.sender !== "me" && !isSystemAdmin()) return msg;

            return {
              ...msg,
              type: "text",
              text: "This message was deleted",
              fileUrl: "",
              fileName: "",
              deletedForAll: true,
            };
          }),
        };
      });

      saveChats(chats);
      return { chats };
    }

    case "UPDATE_CHAT_NAME": {
      const name = action.name.trim();
      if (!name) return state;

      const chats = state.chats.map((chat) => {
        if (String(chat.id) !== String(action.chatId)) return chat;
        if (isSystemAdmin()) return { ...chat, name };
        if (chat.kind === "group" && !chat.isAdmin) return chat;
        return { ...chat, name };
      });

      saveChats(chats);
      return { chats };
    }

    case "ADD_CONTACT": {
      const name = action.payload.name.trim();
      if (!name) return state;

      const newChat = {
        id: uid(),
        kind: "dm",
        name,
        avatarUrl:
          action.payload.avatarUrl ||
          `https://i.pravatar.cc/100?u=${encodeURIComponent(name + Date.now())}`,
        isOnline: false,
        lastSeen: "last seen recently",
        about: "Hey there! I am using Oppty Chats.",
        contact: action.payload.contact?.trim() || "Not available",
        blocked: false,
        messages: [],
      };

      const chats = [newChat, ...state.chats];
      saveChats(chats);
      return { chats };
    }

    case "ADD_GROUP": {
      const name = action.payload.name.trim();
      if (!name) return state;

      const newGroup = {
        id: uid(),
        kind: "group",
        name,
        avatarUrl:
          action.payload.avatarUrl ||
          `https://i.pravatar.cc/100?u=${encodeURIComponent("group_" + name + Date.now())}`,
        isOnline: false,
        lastSeen: "",
        about: action.payload.about?.trim() || "New group created in Oppty Chats.",
        contact: action.payload.contact?.trim() || "Not available",
        isAdmin: true,
        blocked: false,
        members: [],
        messages: [],
      };

      const chats = [newGroup, ...state.chats];
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
      const chats = state.chats.map((chat) =>
        String(chat.id) === String(action.chatId)
          ? { ...chat, blocked: !chat.blocked }
          : chat
      );
      saveChats(chats);
      return { chats };
    }

    case "ADD_GROUP_MEMBER": {
      if (!isSystemAdmin()) return state;

      const chats = state.chats.map((chat) => {
        if (String(chat.id) !== String(action.chatId) || chat.kind !== "group") return chat;

        const exists = (chat.members || []).some(
          (member) => String(member.id) === String(action.member.id)
        );
        if (exists) return chat;

        return {
          ...chat,
          members: [...(chat.members || []), action.member],
        };
      });

      saveChats(chats);
      return { chats };
    }

    case "REMOVE_GROUP_MEMBER": {
      if (!isSystemAdmin()) return state;

      const chats = state.chats.map((chat) => {
        if (String(chat.id) !== String(action.chatId) || chat.kind !== "group") return chat;

        return {
          ...chat,
          members: (chat.members || []).filter(
            (member) => String(member.id) !== String(action.memberId)
          ),
        };
      });

      saveChats(chats);
      return { chats };
    }

    default:
      return state;
  }
}

export function ChatProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, { chats: seed });

  useEffect(() => {
    const persisted = loadChats();
    const merged = normalizeAndMerge(persisted);
    dispatch({ type: "INIT", chats: merged });
    saveChats(merged);
  }, []);

  const api = useMemo(
    () => ({
      chats: state.chats,
      getChatById: (id) => state.chats.find((c) => String(c.id) === String(id)),
      sendMessage: (chatId, text, replyTo = null) =>
        dispatch({ type: "SEND", chatId, text, replyTo }),
      sendAttachment: (chatId, attachmentType, fileUrl, fileName, replyTo = null) =>
        dispatch({
          type: "SEND_ATTACHMENT",
          chatId,
          attachmentType,
          fileUrl,
          fileName,
          replyTo,
        }),
      editMessage: (chatId, messageId, text) =>
        dispatch({ type: "EDIT_MESSAGE", chatId, messageId, text }),
      deleteMessageForMe: (chatId, messageId) =>
        dispatch({ type: "DELETE_MESSAGE_FOR_ME", chatId, messageId }),
      deleteMessageForAll: (chatId, messageId) =>
        dispatch({ type: "DELETE_MESSAGE_FOR_ALL", chatId, messageId }),
      updateChatName: (chatId, name) => dispatch({ type: "UPDATE_CHAT_NAME", chatId, name }),
      addContact: (payload) => dispatch({ type: "ADD_CONTACT", payload }),
      addGroup: (payload) => dispatch({ type: "ADD_GROUP", payload }),
      deleteChat: (chatId) => dispatch({ type: "DELETE_CHAT", chatId }),
      toggleBlockChat: (chatId) => dispatch({ type: "TOGGLE_BLOCK_CHAT", chatId }),
      addGroupMember: (chatId, member) => dispatch({ type: "ADD_GROUP_MEMBER", chatId, member }),
      removeGroupMember: (chatId, memberId) =>
        dispatch({ type: "REMOVE_GROUP_MEMBER", chatId, memberId }),
      resetChats: () => dispatch({ type: "RESET" }),
      isAdmin: isSystemAdmin(),
    }),
    [state.chats]
  );

  return <ChatContext.Provider value={api}>{children}</ChatContext.Provider>;
}

export function useChats() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useChats must be used inside ChatProvider");
  return ctx;
}