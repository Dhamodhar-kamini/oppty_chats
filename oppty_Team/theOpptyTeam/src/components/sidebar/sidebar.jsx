import React, { useEffect, useRef, useState } from "react";
import { NavLink } from "react-router-dom";
import profileImg from "../../assets/profiledp.jpeg";
import "./Sidebar.css";

function ChatsIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M4 4h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H9l-5 4v-4H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"
      />
    </svg>
  );
}

function GroupsIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M16 11c1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 3-1.34 3-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.67 0-8 1.34-8 4v2h12v-2c0-2.66-5.33-4-4-4zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.95v2h7v-2c0-2.66-5.33-4-8-4z"
      />
    </svg>
  );
}

const ICON_BY_ID = {
  chats: <ChatsIcon />,
  groups: <GroupsIcon />,
};

export default function Sidebar({ isChatOpen }) {
  const [showProfilePopup, setShowProfilePopup] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isViewingProfile, setIsViewingProfile] = useState(false);

  const [profile, setProfile] = useState({
    name: "Your Name",
    email: "yourmail@example.com",
    phone: "+91 9876543210",
    bio: "Passionate about building beautiful chat experiences.",
    photo: profileImg,
  });

  const [draftName, setDraftName] = useState(profile.name);
  const [draftPhoto, setDraftPhoto] = useState(profile.photo);

  const popupRef = useRef(null);
  const profileBtnRef = useRef(null);
  const fileInputRef = useRef(null);

  const navItems = [
    { id: "chats", to: "/chats", badge: "99+" },
    { id: "groups", to: "/groups", dot: true },
  ];

  const handleTogglePopup = () => {
    setShowProfilePopup((prev) => !prev);
    setIsEditingProfile(false);
    setIsViewingProfile(false);
    setDraftName(profile.name);
    setDraftPhoto(profile.photo);
  };

  const handleClosePopup = () => {
    setShowProfilePopup(false);
    setIsEditingProfile(false);
    setIsViewingProfile(false);
    setDraftName(profile.name);
    setDraftPhoto(profile.photo);
  };

  const handleViewProfile = () => {
    setIsViewingProfile(true);
    setIsEditingProfile(false);
  };

  const handleStartEdit = () => {
    setIsEditingProfile(true);
    setIsViewingProfile(false);
    setDraftName(profile.name);
    setDraftPhoto(profile.photo);
  };

  const handleBackToMenu = () => {
    setIsEditingProfile(false);
    setIsViewingProfile(false);
  };

  const handleCancelEdit = () => {
    setIsEditingProfile(false);
    setDraftName(profile.name);
    setDraftPhoto(profile.photo);
  };

  const handleSaveProfile = () => {
    const trimmedName = draftName.trim();
    if (!trimmedName) return;

    setProfile((prev) => ({
      ...prev,
      name: trimmedName,
      photo: draftPhoto,
    }));

    setIsEditingProfile(false);
  };

  const handleLogout = () => {
    console.log("Logged out");
    setShowProfilePopup(false);
  };

  const handlePhotoButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handlePhotoChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const objectUrl = URL.createObjectURL(file);
    setDraftPhoto(objectUrl);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        showProfilePopup &&
        popupRef.current &&
        !popupRef.current.contains(event.target) &&
        profileBtnRef.current &&
        !profileBtnRef.current.contains(event.target)
      ) {
        handleClosePopup();
      }
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        handleClosePopup();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [showProfilePopup, profile]);

  return (
    <aside className={`sidebar ${isChatOpen ? "sidebar-hidden-mobile" : ""}`}>
      <div className="sidebar-top">
        {navItems.map((item) => (
          <NavLink
            key={item.id}
            to={item.to}
            className={({ isActive }) => `sidebar-item ${isActive ? "active" : ""}`}
            aria-label={item.id}
            title={item.id}
          >
            <span className="sidebar-icon">{ICON_BY_ID[item.id]}</span>
            {item.badge && <span className="sidebar-badge">{item.badge}</span>}
            {item.dot && <span className="sidebar-dot" />}
          </NavLink>
        ))}

        <div className="sidebar-divider" />
        <div className="sidebar-ai" />
      </div>

      <div className="sidebar-bottom">
        <div className="sidebar-profile-wrapper">
          <button
            ref={profileBtnRef}
            type="button"
            className="sidebar-profile"
            aria-label="profile"
            title="Profile"
            onClick={handleTogglePopup}
          >
            <img src={profile.photo} alt="User" className="sidebar-profile-img" />
          </button>

          {showProfilePopup && (
            <div
              ref={popupRef}
              className="profile-popup profile-popup--expanded"
              role="dialog"
              aria-label="Profile options"
            >
              {!isEditingProfile && !isViewingProfile && (
                <>
                  <div className="profile-popup-header">
                    <img src={profile.photo} alt="User" className="profile-popup-avatar" />
                    <div className="profile-popup-user">
                      <h4>{profile.name}</h4>
                      <p>{profile.email}</p>
                    </div>
                  </div>

                  <div className="profile-popup-menu">
                    <button type="button" className="profile-menu-btn" onClick={handleViewProfile}>
                      View Profile
                    </button>

                    <button type="button" className="profile-menu-btn" onClick={handleStartEdit}>
                      Edit Name / Photo
                    </button>

                    <button
                      type="button"
                      className="profile-menu-btn profile-menu-btn-danger"
                      onClick={handleLogout}
                    >
                      Logout
                    </button>
                  </div>
                </>
              )}

              {isViewingProfile && (
                <>
                  <div className="profile-popup-header">
                    <img
                      src={profile.photo}
                      alt="User"
                      className="profile-popup-avatar profile-popup-avatar-large"
                    />
                    <div className="profile-popup-user">
                      <h4>{profile.name}</h4>
                      <p>{profile.email}</p>
                    </div>
                  </div>

                  <div className="profile-view-details">
                    <div className="profile-detail-card">
                      <span className="profile-detail-label">Phone</span>
                      <span className="profile-detail-value">{profile.phone}</span>
                    </div>

                    <div className="profile-detail-card">
                      <span className="profile-detail-label">Bio</span>
                      <span className="profile-detail-value">{profile.bio}</span>
                    </div>
                  </div>

                  <div className="profile-popup-actions">
                    <button
                      type="button"
                      className="popup-btn popup-btn-secondary"
                      onClick={handleBackToMenu}
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      className="popup-btn popup-btn-danger"
                      onClick={handleStartEdit}
                    >
                      Edit Profile
                    </button>
                  </div>
                </>
              )}

              {isEditingProfile && (
                <>
                  <div className="profile-popup-header">
                    <img src={draftPhoto} alt="Preview" className="profile-popup-avatar" />
                    <div className="profile-popup-user">
                      <h4>Edit Profile</h4>
                      <p>Update your name and photo</p>
                    </div>
                  </div>

                  <div className="profile-edit-form">
                    <label className="profile-input-group">
                      <span className="profile-input-label">Name</span>
                      <input
                        type="text"
                        className="profile-input"
                        value={draftName}
                        onChange={(e) => setDraftName(e.target.value)}
                        placeholder="Enter your name"
                      />
                    </label>

                    <div className="profile-input-group">
                      <span className="profile-input-label">Photo</span>
                      <div className="profile-edit-actions">
                        <button
                          type="button"
                          className="popup-btn popup-btn-secondary"
                          onClick={handlePhotoButtonClick}
                        >
                          Choose Photo
                        </button>

                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          className="profile-file-input"
                          onChange={handlePhotoChange}
                        />
                      </div>
                    </div>

                    <div className="profile-popup-actions">
                      <button
                        type="button"
                        className="popup-btn popup-btn-secondary"
                        onClick={handleCancelEdit}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        className="popup-btn popup-btn-danger"
                        onClick={handleSaveProfile}
                        disabled={!draftName.trim()}
                      >
                        Save
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}