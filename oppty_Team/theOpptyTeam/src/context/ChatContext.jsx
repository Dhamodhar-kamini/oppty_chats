// @refresh reset
import React, { createContext, useContext, useEffect, useMemo, useReducer } from "react";
import { getAuthUser } from "../utils/auth.js";

const STORAGE_KEY = "opty_chat_v1";

function uid() {
  return crypto?.randomUUID?.() ?? `${Date.now()}_${Math.random().toString(16).slice(2)}`;
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
        text: "Here are all the files. Let me know once you’ve had a look.",
        createdAt: Date.now() - 1000 * 60 * 55,
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
        text: "Video call later?",
        createdAt: Date.now() - 1000 * 60 * 180,
      },
      {
        id: uid(),
        chatId: "2",
        sender: "me",
        text: "Sure—send a time.",
        createdAt: Date.now() - 1000 * 60 * 175,
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
        text: "Welcome to Oppty Team group!",
        createdAt: Date.now() - 1000 * 60 * 300,
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
    messages: Array.isArray(c.messages) ? c.messages : [],
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
        text,
        createdAt: Date.now(),
      };

      const chats = state.chats.map((c) =>
        c.id === action.chatId ? { ...c, messages: [...c.messages, msg] } : c
      );

      const updated = chats.find((c) => c.id === action.chatId);
      const rest = chats.filter((c) => c.id !== action.chatId);
      const next = updated ? [updated, ...rest] : chats;

      saveChats(next);
      return { chats: next };
    }

    case "UPDATE_CHAT_NAME": {
      const name = action.name.trim();
      if (!name) return state;

      const next = state.chats.map((chat) => {
        if (String(chat.id) !== String(action.chatId)) return chat;

        if (isSystemAdmin()) return { ...chat, name };
        if (chat.kind === "group" && !chat.isAdmin) return chat;

        return { ...chat, name };
      });

      saveChats(next);
      return { chats: next };
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

      const next = [newChat, ...state.chats];
      saveChats(next);
      return { chats: next };
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

      const next = [newGroup, ...state.chats];
      saveChats(next);
      return { chats: next };
    }

    case "DELETE_CHAT": {
      if (!isSystemAdmin()) return state;
      const next = state.chats.filter((chat) => String(chat.id) !== String(action.chatId));
      saveChats(next);
      return { chats: next };
    }

    case "TOGGLE_BLOCK_CHAT": {
      if (!isSystemAdmin()) return state;
      const next = state.chats.map((chat) =>
        String(chat.id) === String(action.chatId)
          ? { ...chat, blocked: !chat.blocked }
          : chat
      );
      saveChats(next);
      return { chats: next };
    }

    case "ADD_GROUP_MEMBER": {
      if (!isSystemAdmin()) return state;

      const next = state.chats.map((chat) => {
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

      saveChats(next);
      return { chats: next };
    }

    case "REMOVE_GROUP_MEMBER": {
      if (!isSystemAdmin()) return state;

      const next = state.chats.map((chat) => {
        if (String(chat.id) !== String(action.chatId) || chat.kind !== "group") return chat;

        return {
          ...chat,
          members: (chat.members || []).filter(
            (member) => String(member.id) !== String(action.memberId)
          ),
        };
      });

      saveChats(next);
      return { chats: next };
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
      sendMessage: (chatId, text) => dispatch({ type: "SEND", chatId, text }),
      updateChatName: (chatId, name) =>
        dispatch({ type: "UPDATE_CHAT_NAME", chatId, name }),
      addContact: (payload) => dispatch({ type: "ADD_CONTACT", payload }),
      addGroup: (payload) => dispatch({ type: "ADD_GROUP", payload }),
      deleteChat: (chatId) => dispatch({ type: "DELETE_CHAT", chatId }),
      toggleBlockChat: (chatId) => dispatch({ type: "TOGGLE_BLOCK_CHAT", chatId }),
      addGroupMember: (chatId, member) =>
        dispatch({ type: "ADD_GROUP_MEMBER", chatId, member }),
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