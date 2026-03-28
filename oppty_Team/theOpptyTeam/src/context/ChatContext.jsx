// @refresh reset
import React, { createContext, useContext, useEffect, useMemo, useReducer } from "react";

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

/**
 * kind:
 *  - "dm"    => normal chats
 *  - "group" => groups
 */
const seed = [
  {
    id: "1",
    kind: "dm",
    name: "Elena@oppty",
    avatarUrl: "https://i.pravatar.cc/100?img=5",
    isOnline: true,
    lastSeen: "",
    messages: [
      {
        id: uid(),
        chatId: "1",
        sender: "them",
        text: "Here are all the files. Let me know once you’ve had a look.",
        createdAt: Date.now() - 1000 * 60 * 55,
      },
      {
        id: uid(),
        chatId: "1",
        sender: "me",
        text: "Wow! Have great time. Enjoy.",
        createdAt: Date.now() - 1000 * 60 * 52,
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
    messages: [
      { id: uid(), chatId: "2", sender: "them", text: "Video call later?", createdAt: Date.now() - 1000 * 60 * 180 },
      { id: uid(), chatId: "2", sender: "me", text: "Sure—send a time.", createdAt: Date.now() - 1000 * 60 * 175 },
    ],
  },

  // ✅ Group example
  {
    id: "g1",
    kind: "group",
    name: "Oppty Team",
    avatarUrl: "https://i.pravatar.cc/100?img=20",
    isOnline: false,
    lastSeen: "",
    messages: [
      { id: uid(), chatId: "g1", sender: "them", text: "Welcome to Oppty Team group!", createdAt: Date.now() - 1000 * 60 * 300 },
    ],
  },
];

function normalizeAndMerge(persisted) {
  // If nothing persisted, return seed
  if (!Array.isArray(persisted)) return seed;

  // Normalize old persisted records (if kind is missing)
  const persistedNormalized = persisted.map((c) => ({
    ...c,
    kind: c.kind ?? "dm",
    messages: Array.isArray(c.messages) ? c.messages : [],
  }));

  // Merge: keep persisted chats by id, but add any new seed chats not present (like groups)
  const byId = new Map(persistedNormalized.map((c) => [c.id, c]));
  for (const s of seed) {
    if (!byId.has(s.id)) byId.set(s.id, s);
  }

  return Array.from(byId.values());
}

const ChatContext = createContext(null);

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

      // Move updated chat to top
      const updated = chats.find((c) => c.id === action.chatId);
      const rest = chats.filter((c) => c.id !== action.chatId);
      const next = updated ? [updated, ...rest] : chats;

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
    saveChats(merged); // ensure groups are persisted too
  }, []);

  const api = useMemo(
    () => ({
      chats: state.chats,
      getChatById: (id) => state.chats.find((c) => c.id === id),
      sendMessage: (chatId, text) => dispatch({ type: "SEND", chatId, text }),
      resetChats: () => dispatch({ type: "RESET" }),
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