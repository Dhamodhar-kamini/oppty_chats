// src/components/sidebar/AppSidebar.jsx
import React, { useState, useRef, useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useChats } from "../../context/ChatContext.jsx";
import { getAuthUser, clearAuthUser, getCsrfToken, updateAuthUser } from "../../utils/auth.js";
import { createEmployee, updateProfile, uploadProfileImage } from "../../utils/api.js";
import "./Sidebar.css";

function getInitials(name) {
  if (!name) return "U";
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) {
    return (words[0][0] + words[words.length - 1][0]).toUpperCase();
  }
  return words[0].substring(0, 2).toUpperCase();
}

export default function AppSidebar({ isChatOpen }) {
  const navigate = useNavigate();
  const { chats, fetchChats, fetchGroups, totalUnread, createGroup } = useChats();

  const [authUser, setAuthUserState] = useState(() => getAuthUser());
  const isAdminUser = authUser?.role === "admin" || authUser?.role === "superadmin";

  const [showProfilePopup, setShowProfilePopup] = useState(false);
  const [profileMode, setProfileMode] = useState("view");
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const [editName, setEditName] = useState("");
  const [editAbout, setEditAbout] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const [showCreatePopup, setShowCreatePopup] = useState(false);
  const [createMode, setCreateMode] = useState("contacts");
  const [contactSearchTerm, setContactSearchTerm] = useState("");

  // Group creation state
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupAbout, setNewGroupAbout] = useState("");
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [memberSearchTerm, setMemberSearchTerm] = useState("");
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);

  // Employee creation state
  const [newEmpName, setNewEmpName] = useState("");
  const [newEmpEmail, setNewEmpEmail] = useState("");
  const [newEmpPassword, setNewEmpPassword] = useState("");
  const [isCreatingEmployee, setIsCreatingEmployee] = useState(false);

  const popupRef = useRef(null);
  const profileBtnRef = useRef(null);
  const createPopupRef = useRef(null);
  const createBtnRef = useRef(null);
  const fileInputRef = useRef(null);

  const profile = {
    name: authUser?.name || "User",
    email: authUser?.email || "",
    role: authUser?.role || "employee",
    about: authUser?.about || "Hey there! I'm using Chat App",
    avatarUrl: authUser?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(authUser?.name || 'U')}&background=random&size=200`,
  };

  useEffect(() => {
    if (profileMode === "edit") {
      setEditName(profile.name);
      setEditAbout(profile.about);
    }
  }, [profileMode, profile.name, profile.about]);

  const handleCloseAll = () => {
    setShowProfilePopup(false);
    setShowCreatePopup(false);
    setProfileMode("view");
    setCreateMode("contacts");
    setContactSearchTerm("");
    setNewGroupName("");
    setNewGroupAbout("");
    setSelectedMembers([]);
    setMemberSearchTerm("");
    setNewEmpName("");
    setNewEmpEmail("");
    setNewEmpPassword("");
  };

  const handleConfirmLogout = async () => {
    setIsLoggingOut(true);
    handleCloseAll();
    
    try {
      const csrfToken = getCsrfToken();
      await fetch("/api/logout/", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": csrfToken || "",
        },
      });
    } catch (e) {
      console.error("Logout error:", e);
    }
    
    clearAuthUser();
    
    setTimeout(() => {
      window.location.href = "/login";
    }, 500);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      alert("Please select a valid image file (JPEG, PNG, GIF, or WebP)");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("File too large. Maximum size is 5MB");
      return;
    }

    setUploadingImage(true);
    try {
      const result = await uploadProfileImage(file);
      const updated = updateAuthUser({ avatarUrl: result.avatarUrl });
      setAuthUserState(updated);
    } catch (err) {
      console.error("Upload error:", err);
      alert("Failed to upload image: " + err.message);
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleSaveProfile = async () => {
    if (!editName.trim()) {
      alert("Name cannot be empty");
      return;
    }

    setIsSaving(true);
    try {
      const result = await updateProfile({
        name: editName.trim(),
        about: editAbout.trim(),
      });
      
      const updated = updateAuthUser({
        name: result.name,
        about: result.about,
      });
      setAuthUserState(updated);
      setProfileMode("view");
    } catch (err) {
      console.error("Save error:", err);
      alert("Failed to save profile: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleStartDirectMessage = (chat) => {
    handleCloseAll();
    navigate(`/chats/${chat.id}`);
  };

  // Toggle member selection
  const toggleMemberSelection = (member) => {
    setSelectedMembers(prev => {
      const isSelected = prev.some(m => m.id === member.id);
      if (isSelected) {
        return prev.filter(m => m.id !== member.id);
      } else {
        return [...prev, { id: member.id, name: member.name, avatarUrl: member.avatarUrl }];
      }
    });
  };

  // Select all members
  const selectAllMembers = () => {
    const allMembers = filteredMemberContacts.map(c => ({
      id: c.id,
      name: c.name,
      avatarUrl: c.avatarUrl
    }));
    setSelectedMembers(allMembers);
  };

  // Clear all members
  const clearAllMembers = () => {
    setSelectedMembers([]);
  };

  // Remove selected member
  const removeMember = (memberId) => {
    setSelectedMembers(prev => prev.filter(m => m.id !== memberId));
  };

  // Group creation with members
  const handleCreateGroup = async () => {
    if (!isAdminUser) {
      alert("Only admins can create groups");
      return;
    }
    
    if (!newGroupName.trim()) {
      alert("Please enter a group name");
      return;
    }

    if (selectedMembers.length === 0) {
      alert("Please select at least one member");
      return;
    }

    setIsCreatingGroup(true);
    
    try {
      await createGroup({ 
        name: newGroupName.trim(), 
        description: newGroupAbout.trim(),
        members: selectedMembers.map(m => Number(m.id))
      });
      
      handleCloseAll();
      fetchGroups();
      navigate("/groups");
    } catch (err) {
      console.error("Create group error:", err);
      alert("Failed to create group: " + err.message);
    } finally {
      setIsCreatingGroup(false);
    }
  };

  const handleCreateEmployee = async () => {
    if (!newEmpName.trim() || !newEmpEmail.trim() || !newEmpPassword.trim()) {
      alert("Please fill all fields");
      return;
    }

    if (newEmpPassword.trim().length < 8) {
      alert("Password must be at least 8 characters");
      return;
    }

    setIsCreatingEmployee(true);
    
    try {
      await createEmployee({
        name: newEmpName.trim(),
        email: newEmpEmail.trim(),
        password: newEmpPassword.trim(),
      });
      
      handleCloseAll();
      fetchChats();
    } catch (err) {
      console.error("Create employee error:", err);
      alert("Error: " + err.message);
    } finally {
      setIsCreatingEmployee(false);
    }
  };

  // Filter contacts for chat list
  const filteredContacts = chats.filter(
    (chat) =>
      chat.email !== profile.email &&
      (chat.name.toLowerCase().includes(contactSearchTerm.toLowerCase()) ||
        chat.email.toLowerCase().includes(contactSearchTerm.toLowerCase()))
  );

  // Filter contacts for member selection
  const filteredMemberContacts = chats.filter(
    (chat) =>
      chat.email !== profile.email &&
      (chat.name.toLowerCase().includes(memberSearchTerm.toLowerCase()) ||
        chat.email.toLowerCase().includes(memberSearchTerm.toLowerCase()))
  );

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        showProfilePopup &&
        popupRef.current &&
        !popupRef.current.contains(event.target) &&
        profileBtnRef.current &&
        !profileBtnRef.current.contains(event.target)
      ) {
        setShowProfilePopup(false);
        setProfileMode("view");
      }
      if (
        showCreatePopup &&
        createPopupRef.current &&
        !createPopupRef.current.contains(event.target) &&
        createBtnRef.current &&
        !createBtnRef.current.contains(event.target)
      ) {
        handleCloseAll();
      }
    };
    
    const handleEscape = (event) => {
      if (event.key === "Escape") handleCloseAll();
    };
    
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [showProfilePopup, showCreatePopup]);

  const hasCustomAvatar = profile.avatarUrl && !profile.avatarUrl.includes('ui-avatars.com');

  return (
    <>
      <aside className={`sidebar ${isChatOpen ? "sidebar-hidden-mobile" : ""}`}>
        {/* Top Navigation */}
        <div className="sidebar-top">
          <NavLink 
            to="/chats" 
            className={({ isActive }) => `sidebar-nav-item ${isActive ? "active" : ""}`}
            title="Chats"
          >
            <span className="sidebar-icon">💬</span>
            {totalUnread > 0 && (
              <span className="sidebar-badge">{totalUnread > 99 ? "99+" : totalUnread}</span>
            )}
          </NavLink>

          <NavLink 
            to="/groups" 
            className={({ isActive }) => `sidebar-nav-item ${isActive ? "active" : ""}`}
            title="Groups"
          >
            <span className="sidebar-icon">👥</span>
          </NavLink>

          {isAdminUser && (
            <NavLink 
              to="/admin" 
              className={({ isActive }) => `sidebar-nav-item ${isActive ? "active" : ""}`}
              title="Admin Dashboard"
            >
              <span className="sidebar-icon">👨‍💼</span>
            </NavLink>
          )}

          <div className="sidebar-divider" />

          {/* Create New Button */}
          <div className="sidebar-create-wrapper">
            <button
              ref={createBtnRef}
              className={`sidebar-nav-item sidebar-create-btn ${showCreatePopup ? "active" : ""}`}
              onClick={() => {
                setShowCreatePopup(!showCreatePopup);
                setCreateMode("contacts");
                setShowProfilePopup(false);
              }}
              title="New Chat"
            >
              <span className="sidebar-icon">➕</span>
            </button>

            {showCreatePopup && (
              <div ref={createPopupRef} className="sidebar-popup create-popup">
                {/* Contacts Mode */}
                {createMode === "contacts" && (
                  <>
                    <div className="popup-title">New Chat</div>
                    <input
                      type="text"
                      className="popup-search"
                      placeholder="Search contacts..."
                      value={contactSearchTerm}
                      onChange={(e) => setContactSearchTerm(e.target.value)}
                      autoFocus
                    />

                    {isAdminUser && !contactSearchTerm && (
                      <div className="popup-section popup-admin-actions">
                        <button className="popup-menu-btn" onClick={() => setCreateMode("group")}>
                          <span className="menu-icon">👥</span>
                          <span>New Group</span>
                        </button>
                        <button className="popup-menu-btn" onClick={() => setCreateMode("employee")}>
                          <span className="menu-icon">➕</span>
                          <span>Create Employee</span>
                        </button>
                      </div>
                    )}

                    <div className="popup-section popup-contacts-list">
                      {filteredContacts.length > 0 ? (
                        filteredContacts.map((chat) => (
                          <button
                            key={chat.id}
                            className="popup-contact-btn"
                            onClick={() => handleStartDirectMessage(chat)}
                          >
                            <img 
                              src={chat.avatarUrl} 
                              alt="" 
                              className="popup-contact-avatar"
                              onError={(e) => {
                                e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(chat.name)}&background=random`;
                              }}
                            />
                            <div className="popup-contact-info">
                              <span className="popup-contact-name">{chat.name}</span>
                              <span className="popup-contact-email">{chat.email}</span>
                            </div>
                          </button>
                        ))
                      ) : (
                        <div className="popup-empty">
                          {contactSearchTerm ? "No contacts found" : "No contacts available"}
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* Create Group Mode */}
                {createMode === "group" && (
                  <>
                    <div className="popup-header">
                      <button className="popup-back-btn" onClick={() => setCreateMode("contacts")}>←</button>
                      <span className="popup-title">Create Group</span>
                    </div>
                    
                    <div className="popup-form">
                      <div className="form-group">
                        <label className="popup-label">Group Name *</label>
                        <input
                          type="text"
                          className="popup-input"
                          value={newGroupName}
                          onChange={(e) => setNewGroupName(e.target.value)}
                          placeholder="Enter group name"
                          autoFocus
                        />
                      </div>
                      
                      <div className="form-group">
                        <label className="popup-label">Description</label>
                        <input
                          type="text"
                          className="popup-input"
                          value={newGroupAbout}
                          onChange={(e) => setNewGroupAbout(e.target.value)}
                          placeholder="What's this group about?"
                        />
                      </div>

                      {/* Selected Members */}
                      <div className="form-group">
                        <label className="popup-label">
                          Members * ({selectedMembers.length} selected)
                        </label>
                        
                        {selectedMembers.length > 0 && (
                          <div className="selected-members">
                            {selectedMembers.map(member => (
                              <div key={member.id} className="selected-member-chip">
                                <img 
                                  src={member.avatarUrl} 
                                  alt="" 
                                  className="chip-avatar"
                                  onError={(e) => {
                                    e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name)}&background=random&size=24`;
                                  }}
                                />
                                <span>{member.name.split(' ')[0]}</span>
                                <button 
                                  className="chip-remove" 
                                  onClick={() => removeMember(member.id)}
                                  type="button"
                                >
                                  ✕
                                </button>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Select All / Clear Buttons */}
                        <div className="member-select-actions">
                          <button 
                            type="button"
                            className="select-all-btn"
                            onClick={selectAllMembers}
                            disabled={filteredMemberContacts.length === 0}
                          >
                            Select All ({filteredMemberContacts.length})
                          </button>
                          <button 
                            type="button"
                            className="clear-all-btn"
                            onClick={clearAllMembers}
                            disabled={selectedMembers.length === 0}
                          >
                            Clear
                          </button>
                        </div>

                        {/* Search Members */}
                        <input
                          type="text"
                          className="popup-search member-search"
                          placeholder="Search employees..."
                          value={memberSearchTerm}
                          onChange={(e) => setMemberSearchTerm(e.target.value)}
                        />

                        <div className="member-selection-list">
                          {filteredMemberContacts.length > 0 ? (
                            filteredMemberContacts.map((contact) => {
                              const isSelected = selectedMembers.some(m => m.id === contact.id);
                              return (
                                <div
                                  key={contact.id}
                                  className={`member-select-item ${isSelected ? 'selected' : ''}`}
                                  onClick={() => toggleMemberSelection(contact)}
                                >
                                  <img 
                                    src={contact.avatarUrl} 
                                    alt="" 
                                    className="member-avatar"
                                    onError={(e) => {
                                      e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(contact.name)}&background=random`;
                                    }}
                                  />
                                  <div className="member-info">
                                    <span className="member-name">{contact.name}</span>
                                    <span className="member-email">{contact.email}</span>
                                  </div>
                                  <div className={`member-checkbox ${isSelected ? 'checked' : ''}`}>
                                    {isSelected && '✓'}
                                  </div>
                                </div>
                              );
                            })
                          ) : (
                            <div className="popup-empty">No employees found</div>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="popup-actions">
                        <button 
                          className="popup-btn-secondary" 
                          onClick={() => setCreateMode("contacts")}
                          disabled={isCreatingGroup}
                          type="button"
                        >
                          Cancel
                        </button>
                        <button 
                          className="popup-btn-primary" 
                          onClick={handleCreateGroup}
                          disabled={!newGroupName.trim() || selectedMembers.length === 0 || isCreatingGroup}
                          type="button"
                        >
                          {isCreatingGroup ? "Creating..." : "Create Group"}
                        </button>
                      </div>
                    </div>
                  </>
                )}

                {/* Create Employee Mode */}
                {createMode === "employee" && (
                  <>
                    <div className="popup-header">
                      <button className="popup-back-btn" onClick={() => setCreateMode("contacts")}>←</button>
                      <span className="popup-title">Create Employee</span>
                    </div>
                    <div className="popup-form">
                      <div className="form-group">
                        <label className="popup-label">Full Name *</label>
                        <input
                          type="text"
                          className="popup-input"
                          value={newEmpName}
                          onChange={(e) => setNewEmpName(e.target.value)}
                          placeholder="John Doe"
                          autoFocus
                        />
                      </div>
                      <div className="form-group">
                        <label className="popup-label">Email *</label>
                        <input
                          type="email"
                          className="popup-input"
                          value={newEmpEmail}
                          onChange={(e) => setNewEmpEmail(e.target.value)}
                          placeholder="john@company.com"
                        />
                      </div>
                      <div className="form-group">
                        <label className="popup-label">Password *</label>
                        <input
                          type="password"
                          className="popup-input"
                          value={newEmpPassword}
                          onChange={(e) => setNewEmpPassword(e.target.value)}
                          placeholder="Min 8 characters"
                        />
                      </div>
                      <div className="popup-actions">
                        <button 
                          className="popup-btn-secondary" 
                          onClick={() => setCreateMode("contacts")}
                          disabled={isCreatingEmployee}
                          type="button"
                        >
                          Cancel
                        </button>
                        <button 
                          className="popup-btn-primary" 
                          onClick={handleCreateEmployee}
                          disabled={!newEmpName.trim() || !newEmpEmail.trim() || !newEmpPassword.trim() || isCreatingEmployee}
                          type="button"
                        >
                          {isCreatingEmployee ? "Creating..." : "Create"}
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Bottom - Profile */}
        <div className="sidebar-bottom">
          <button
            ref={profileBtnRef}
            className="sidebar-profile-btn"
            onClick={() => {
              setShowProfilePopup(!showProfilePopup);
              setProfileMode("view");
              setShowCreatePopup(false);
            }}
            title={profile.name}
          >
            {hasCustomAvatar ? (
              <img 
                src={profile.avatarUrl} 
                alt={profile.name}
                className="sidebar-avatar-img"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                }}
              />
            ) : null}
            <div 
              className="sidebar-avatar-initials"
              style={{ 
                background: isAdminUser ? "#ff6b00" : "#00a884",
                display: hasCustomAvatar ? 'none' : 'flex'
              }}
            >
              {getInitials(profile.name)}
            </div>
          </button>

          {showProfilePopup && (
            <div ref={popupRef} className="sidebar-popup profile-popup">
              {/* View Mode */}
              {profileMode === "view" && (
                <>
                  <div className="profile-header">
                    <div className="profile-avatar-wrapper">
                      {hasCustomAvatar ? (
                        <img 
                          src={profile.avatarUrl} 
                          alt={profile.name}
                          className="profile-avatar-img"
                        />
                      ) : (
                        <div 
                          className="profile-avatar-initials"
                          style={{ background: isAdminUser ? "#ff6b00" : "#00a884" }}
                        >
                          {getInitials(profile.name)}
                        </div>
                      )}
                      <button 
                        className="profile-avatar-edit"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingImage}
                        type="button"
                      >
                        {uploadingImage ? "..." : "📷"}
                      </button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        hidden
                        onChange={handleImageUpload}
                      />
                    </div>
                    <div className="profile-info">
                      <h3>{profile.name}</h3>
                      {isAdminUser && <span className="admin-tag">Admin</span>}
                      <p>{profile.email}</p>
                    </div>
                  </div>

                  <div className="profile-details">
                    <div className="profile-detail-item">
                      <span className="detail-label">About</span>
                      <span className="detail-value">{profile.about}</span>
                    </div>
                    <div className="profile-detail-item">
                      <span className="detail-label">Role</span>
                      <span className="detail-value">{profile.role}</span>
                    </div>
                  </div>

                  <div className="profile-menu">
                    <button className="profile-menu-btn" onClick={() => setProfileMode("edit")} type="button">
                      ✏️ Edit Profile
                    </button>
                    <button className="profile-menu-btn danger" onClick={() => setProfileMode("logout")} type="button">
                      🚪 Logout
                    </button>
                  </div>
                </>
              )}

              {/* Edit Mode */}
              {profileMode === "edit" && (
                <>
                  <div className="popup-header">
                    <button className="popup-back-btn" onClick={() => setProfileMode("view")} type="button">←</button>
                    <span className="popup-title">Edit Profile</span>
                  </div>
                  <div className="popup-form">
                    <div className="form-group">
                      <label className="popup-label">Name</label>
                      <input
                        type="text"
                        className="popup-input"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label className="popup-label">About</label>
                      <textarea
                        className="popup-input popup-textarea"
                        value={editAbout}
                        onChange={(e) => setEditAbout(e.target.value)}
                        rows={3}
                      />
                    </div>
                    <div className="popup-actions">
                      <button 
                        className="popup-btn-secondary" 
                        onClick={() => setProfileMode("view")} 
                        disabled={isSaving}
                        type="button"
                      >
                        Cancel
                      </button>
                      <button 
                        className="popup-btn-primary" 
                        onClick={handleSaveProfile}
                        disabled={isSaving || !editName.trim()}
                        type="button"
                      >
                        {isSaving ? "Saving..." : "Save"}
                      </button>
                    </div>
                  </div>
                </>
              )}

              {/* Logout Confirmation */}
              {profileMode === "logout" && (
                <div className="logout-confirm">
                  <div className="logout-icon">🚪</div>
                  <h3>Logout?</h3>
                  <p>Are you sure you want to logout?</p>
                  <div className="popup-actions">
                    <button className="popup-btn-secondary" onClick={() => setProfileMode("view")} type="button">
                      Cancel
                    </button>
                    <button className="popup-btn-danger" onClick={handleConfirmLogout} type="button">
                      Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </aside>

      {/* Logout Loading Overlay */}
      {isLoggingOut && (
        <div className="logout-overlay">
          <div className="logout-box">
            <div className="spinner"></div>
            <p>Signing out...</p>
          </div>
        </div>
      )}
    </>
  );
}