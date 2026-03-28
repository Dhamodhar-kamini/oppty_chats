import React, { createContext, useContext, useEffect, useMemo, useReducer } from "react";

const STORAGE_KEY = "opty_chat_v1";

function uid() {
  return (crypto?.randomUUID?.() ?? `${Date.now()}_${Math.random().toString(16).slice(2)}`);
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
    name: "Alice Whitman",
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
    name: "Jason Ballmer",
    avatarUrl: "https://i.pravatar.cc/100?img=12",
    isOnline: false,
    lastSeen: "last seen today at 10:21",
    messages: [
      { id: uid(), chatId: "2", sender: "them", text: "Video call later?", createdAt: Date.now() - 1000 * 60 * 180 },
      { id: uid(), chatId: "2", sender: "me", text: "Sure—send a time.", createdAt: Date.now() - 1000 * 60 * 175 },
    ],
  },
];

const ChatContext = createContext(null);

function reducer(state, action) {
  switch (action.type) {
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
  const persisted = loadChats();
  const [state, dispatch] = useReducer(reducer, { chats: persisted ?? seed });

  useEffect(() => {
    if (!persisted) saveChats(state.chats);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const api = useMemo(
    () => ({
      chats: state.chats,
      getChatById: (id) => state.chats.find((c) => c.id === id),
      sendMessage: (chatId, text) => dispatch({ type: "SEND", chatId, text }),
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