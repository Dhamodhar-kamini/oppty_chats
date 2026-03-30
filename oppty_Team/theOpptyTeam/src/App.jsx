import React, { useEffect, useState } from "react";
import { Navigate, Route, Routes, useLocation, matchPath } from "react-router-dom";
import Sidebar from "./components/sidebar/Sidebar.jsx";
import ChatsLayout from "./components/chat/ChatsLayout.jsx";
import EmptyState from "./components/chat/EmptyState.jsx";
import ChatPage from "./components/chat/ChatPage.jsx";
import "./App.css";

function AppContent() {
  const location = useLocation();
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const isChatRoute =
    !!matchPath("/chats/:chatId", location.pathname) ||
    !!matchPath("/groups/:chatId", location.pathname);

  const hideSidebarOnMobile = isMobile && isChatRoute;

  return (
    <div className="app">
      {!hideSidebarOnMobile && <Sidebar />}

      <main className={`main-content ${hideSidebarOnMobile ? "main-content--full" : ""}`}>
        <Routes>
          <Route path="/" element={<Navigate to="/chats" replace />} />

          <Route path="/chats" element={<ChatsLayout mode="dm" />}>
            <Route index element={<EmptyState />} />
            <Route path=":chatId" element={<ChatPage />} />
          </Route>

          <Route path="/groups" element={<ChatsLayout mode="group" />}>
            <Route index element={<EmptyState />} />
            <Route path=":chatId" element={<ChatPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/chats" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default AppContent;