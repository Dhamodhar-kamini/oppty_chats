// src/context/ChatContext.jsx - ACTUALLY FIXED VERSION
import React, { createContext, useContext, useState, useCallback, useRef } from "react";
import { getAuthUser, clearAuthUser } from "../utils/auth.js";
import { apiFetch } from "../utils/api.js";

const ChatContext = createContext(null);

export function ChatProvider({ children }) {
  const [chats, setChats] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [totalUnread, setTotalUnread] = useState(0);

  // Refs to prevent concurrent fetches
  const fetchingRef = useRef(false);
  const fetchingGroupsRef = useRef(false);
  const lastFetchTime = useRef(0);
  const lastGroupFetchTime = useRef(0);

  // ✅ FIX: Use a ref-based helper so we never need chats/groups in dependency arrays
  const chatsRef = useRef(chats);
  chatsRef.current = chats;
  const groupsRef = useRef(groups);
  groupsRef.current = groups;

  const updateTotalUnread = useCallback((chatList, groupList) => {
    const chatUnread = chatList.reduce((sum, chat) => sum + (chat.unreadCount || 0), 0);
    const groupUnread = groupList.reduce((sum, group) => sum + (group.unreadCount || 0), 0);
    setTotalUnread(chatUnread + groupUnread);
  }, []);

  // ✅ FIX: ZERO state dependencies — uses refs to read current groups
  const fetchChats = useCallback(async () => {
    const authUser = getAuthUser();
    if (!authUser) {
      setChats([]);
      setLoading(false);
      return;
    }

    if (fetchingRef.current) {
      return;
    }

    const now = Date.now();
    if (now - lastFetchTime.current < 2000) {
      return;
    }
    lastFetchTime.current = now;
    fetchingRef.current = true;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/users/", {
        method: "GET",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });

      if (response.status === 401 || response.status === 403) {
        setError("Session expired. Please login again.");
        setChats([]);
        clearAuthUser();
        setTimeout(() => {
          if (window.location.pathname !== "/login") {
            window.location.href = "/login";
          }
        }, 500);
        return;
      }

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const users = await response.json();
      const currentUserId = authUser.id;

      const chatList = users
        .filter((user) => user.id !== currentUserId)
        .map((user) => ({
          id: String(user.id),
          name: user.name || user.email,
          email: user.email,
          role: user.role,
          about: user.about || "",
          kind: "dm",
          avatarUrl:
            user.avatarUrl ||
            `https://ui-avatars.com/api/?name=${encodeURIComponent(
              user.name || user.email
            )}&background=random`,
          messages: [],
          lastMessage: user.lastMessage || null,
          unreadCount: user.unreadCount || 0,
        }));

      setChats(chatList);
      // ✅ Read groups from ref, not from closure
      updateTotalUnread(chatList, groupsRef.current);
    } catch (err) {
      console.error("❌ Fetch error:", err);
      setError("Failed to load chats. Check your connection.");
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, [updateTotalUnread]); // ✅ No groups dependency

  // ✅ FIX: ZERO state dependencies — uses refs to read current chats
  const fetchGroups = useCallback(async () => {
    const authUser = getAuthUser();
    if (!authUser) {
      setGroups([]);
      return;
    }

    if (fetchingGroupsRef.current) {
      return;
    }

    const now = Date.now();
    if (now - lastGroupFetchTime.current < 2000) {
      return;
    }
    lastGroupFetchTime.current = now;
    fetchingGroupsRef.current = true;

    try {
      setGroupsLoading(true);

      const response = await apiFetch("/api/groups/", { method: "GET" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const groupsData = await response.json();

      const groupList = groupsData.map((group) => ({
        id: `group-${group.id}`,
        groupId: group.id,
        name: group.name,
        description: group.description || "",
        kind: "group",
        isGroup: true,
        avatarUrl:
          group.avatarUrl ||
          `https://ui-avatars.com/api/?name=${encodeURIComponent(
            group.name
          )}&background=4CAF50&color=fff`,
        memberCount: group.memberCount || 0,
        members: group.members || [],
        createdBy: group.createdBy,
        createdAt: group.createdAt,
        messages: [],
        lastMessage: group.lastMessage || null,
        unreadCount: group.unreadCount || 0,
      }));

      setGroups(groupList);
      // ✅ Read chats from ref, not from closure
      updateTotalUnread(chatsRef.current, groupList);
    } catch (err) {
      console.error("❌ Fetch groups error:", err);
    } finally {
      setGroupsLoading(false);
      fetchingGroupsRef.current = false;
    }
  }, [updateTotalUnread]); // ✅ No chats dependency

  // Create Group
  const createGroup = useCallback(async (groupData) => {
    const authUser = getAuthUser();
    if (!authUser || (authUser.role !== "admin" && authUser.role !== "superadmin")) {
      throw new Error("Only admins can create groups");
    }

    const response = await apiFetch("/api/groups/create/", {
      method: "POST",
      body: JSON.stringify({
        name: groupData.name,
        description: groupData.description || "",
        members: groupData.members || [],
      }),
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || "Failed to create group");
    }

    const newGroup = {
      id: `group-${result.id}`,
      groupId: result.id,
      name: result.name,
      description: result.description || "",
      kind: "group",
      isGroup: true,
      avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(
        result.name
      )}&background=4CAF50&color=fff`,
      memberCount: result.memberCount || 1,
      createdBy: authUser.name,
      createdAt: result.createdAt,
      messages: [],
      lastMessage: null,
      unreadCount: 0,
    };

    setGroups((prev) => [newGroup, ...prev]);
    return result;
  }, []);

  // Get Chat/Group by ID
  const getChatById = useCallback(
    (chatId) => {
      if (!chatId) return null;

      const cleanId = String(chatId).replace("emp-", "").replace("group-", "");

      if (String(chatId).startsWith("group-")) {
        return (
          groups.find(
            (g) => g.id === chatId || g.groupId === Number(cleanId)
          ) || null
        );
      }

      const chat = chats.find((c) => c.id === cleanId);
      if (chat) return chat;

      const group = groups.find(
        (g) => g.id === `group-${cleanId}` || g.groupId === Number(cleanId)
      );
      return group || null;
    },
    [chats, groups]
  );

  // Set Messages
  const setMessages = useCallback((chatId, messages) => {
    const cleanId = String(chatId).replace("emp-", "").replace("group-", "");
    const isGroup = String(chatId).startsWith("group-");

    if (isGroup) {
      setGroups((prev) =>
        prev.map((g) =>
          g.id === chatId || g.groupId === Number(cleanId)
            ? {
                ...g,
                messages,
                lastMessage: messages[messages.length - 1] || null,
              }
            : g
        )
      );
    } else {
      setChats((prev) =>
        prev.map((c) =>
          c.id === cleanId
            ? {
                ...c,
                messages,
                lastMessage: messages[messages.length - 1] || null,
              }
            : c
        )
      );
    }
  }, []);

  // ✅ FIX: Receive Message — uses functional updaters + refs, no state deps
  const receiveMessage = useCallback(
    (chatId, message) => {
      const cleanId = String(chatId).replace("emp-", "").replace("group-", "");
      const isGroup = String(chatId).startsWith("group-");

      const updater = (items) =>
        items.map((item) => {
          const matches = isGroup
            ? item.id === chatId || item.groupId === Number(cleanId)
            : item.id === cleanId;

          if (!matches) return item;
          if (item.messages?.some((m) => m.id === message.id)) return item;

          const newLastMessage = {
            id: message.id,
            text: message.text,
            sender: message.isMine ? "me" : message.senderName || "them",
            createdAt: new Date(message.createdAt).toISOString(),
          };

          return {
            ...item,
            messages: [...(item.messages || []), message],
            lastMessage: newLastMessage,
            unreadCount: message.isMine
              ? item.unreadCount
              : (item.unreadCount || 0) + 1,
          };
        });

      if (isGroup) {
        setGroups((prev) => {
          const updated = updater(prev);
          updateTotalUnread(chatsRef.current, updated);
          return updated;
        });
      } else {
        setChats((prev) => {
          const updated = updater(prev);
          updateTotalUnread(updated, groupsRef.current);
          return updated;
        });
      }
    },
    [updateTotalUnread] // ✅ No chats/groups dependency
  );

  // Update Message
  const updateMessage = useCallback((chatId, messageId, updates) => {
    const cleanId = String(chatId).replace("emp-", "").replace("group-", "");
    const isGroup = String(chatId).startsWith("group-");

    const updater = (items) =>
      items.map((item) => {
        const matches = isGroup
          ? item.id === chatId || item.groupId === Number(cleanId)
          : item.id === cleanId;

        if (!matches) return item;

        return {
          ...item,
          messages:
            item.messages?.map((m) =>
              m.id === messageId ? { ...m, ...updates } : m
            ) || [],
        };
      });

    if (isGroup) {
      setGroups(updater);
    } else {
      setChats(updater);
    }
  }, []);

  // ✅ FIX: Single deleteMessage (removed duplicate)
  const deleteMessage = useCallback((chatId, messageId, deleteType) => {
    const cleanId = String(chatId).replace("emp-", "").replace("group-", "");
    const isGroup = String(chatId).startsWith("group-");

    const updater = (items) =>
      items.map((item) => {
        const matches = isGroup
          ? item.id === chatId || item.groupId === Number(cleanId)
          : item.id === cleanId;

        if (!matches) return item;

        if (deleteType === "forMe") {
          return {
            ...item,
            messages: item.messages?.filter((m) => m.id !== messageId) || [],
          };
        } else {
          return {
            ...item,
            messages:
              item.messages?.map((m) =>
                m.id === messageId
                  ? {
                      ...m,
                      text: "🚫 This message was deleted",
                      isDeleted: true,
                      deletedForEveryone: true,
                    }
                  : m
              ) || [],
          };
        }
      });

    if (isGroup) {
      setGroups(updater);
    } else {
      setChats(updater);
    }
  }, []);

  // ✅ FIX: Mark as Read — uses functional updaters + refs
  const markChatAsRead = useCallback(
    async (chatId) => {
      const cleanId = String(chatId).replace("emp-", "").replace("group-", "");
      const isGroup = String(chatId).startsWith("group-");

      try {
        if (!isGroup) {
          await apiFetch(`/api/messages/${cleanId}/read/`, { method: "POST" });
        }

        if (isGroup) {
          setGroups((prev) => {
            const updated = prev.map((g) =>
              g.id === chatId || g.groupId === Number(cleanId)
                ? { ...g, unreadCount: 0 }
                : g
            );
            updateTotalUnread(chatsRef.current, updated);
            return updated;
          });
        } else {
          setChats((prev) => {
            const updated = prev.map((c) =>
              c.id === cleanId ? { ...c, unreadCount: 0 } : c
            );
            updateTotalUnread(updated, groupsRef.current);
            return updated;
          });
        }
      } catch (err) {
        console.error("Failed to mark as read:", err);
      }
    },
    [updateTotalUnread] // ✅ No chats/groups dependency
  );

  // Clear Chats
  const clearChats = useCallback(() => {
    setChats([]);
    setGroups([]);
    setTotalUnread(0);
    setError(null);
  }, []);

  return (
    <ChatContext.Provider
      value={{
        chats,
        groups,
        loading,
        groupsLoading,
        error,
        totalUnread,
        fetchChats,
        fetchGroups,
        createGroup,
        getChatById,
        setMessages,
        receiveMessage,
        updateMessage,
        deleteMessage,
        clearChats,
        markChatAsRead,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChats() {
  const context = useContext(ChatContext);
  if (!context) throw new Error("useChats must be used within ChatProvider");
  return context;
}