// src/App.jsx
import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ChatProvider } from "./context/ChatContext.jsx";
import { getAuthUser } from "./utils/auth.js";

import EmployeeLogin from "./pages/auth/EmployeeLogin.jsx";
import ChatsLayout from "./components/chat/ChatsLayout.jsx";
import ChatPage from "./components/chat/ChatPage.jsx";
import GroupChatPage from "./components/chat/GroupChatPage.jsx";
import EmptyState from "./components/chat/EmptyState.jsx";
import AppSidebar from "./components/sidebar/AppSidebar.jsx";
import AdminDashboard from "./components/admin/AdminDashboard.jsx";
import EmployeeViewer from "./components/admin/EmployeeViewer.jsx";

function ProtectedRoute({ children }) {
  const authUser = getAuthUser();
  if (!authUser) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function PublicRoute({ children }) {
  const authUser = getAuthUser();
  if (authUser) {
    return <Navigate to="/chats" replace />;
  }
  return children;
}

function AppLayout({ mode }) {
  return (
    <div className="app-container">
      <AppSidebar isChatOpen={false} />
      <div className="app-main">
        <ChatsLayout mode={mode} />
      </div>
    </div>
  );
}

function AdminLayout({ children }) {
  return (
    <div className="app-container">
      <AppSidebar isChatOpen={false} />
      <div className="app-main admin-main">
        {children}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ChatProvider>
        <Routes>
          {/* Public Routes */}
          <Route
            path="/login"
            element={
              <PublicRoute>
                <EmployeeLogin />
              </PublicRoute>
            }
          />

          {/* Private Chats */}
          <Route
            path="/chats"
            element={
              <ProtectedRoute>
                <AppLayout mode="private" />
              </ProtectedRoute>
            }
          >
            <Route index element={<EmptyState />} />
            <Route path=":chatId" element={<ChatPage />} />
          </Route>

          {/* Group Chats */}
          <Route
            path="/groups"
            element={
              <ProtectedRoute>
                <AppLayout mode="group" />
              </ProtectedRoute>
            }
          >
            <Route index element={<EmptyState />} />
            <Route path=":chatId" element={<GroupChatPage />} />
          </Route>

          {/* Admin Routes */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <AdminLayout>
                  <AdminDashboard />
                </AdminLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/employee/:employeeId"
            element={
              <ProtectedRoute>
                <AdminLayout>
                  <EmployeeViewer />
                </AdminLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/employee/:employeeId/chat/:targetId"
            element={
              <ProtectedRoute>
                <AdminLayout>
                  <EmployeeViewer />
                </AdminLayout>
              </ProtectedRoute>
            }
          />

          {/* Redirects */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </ChatProvider>
    </BrowserRouter>
  );
}