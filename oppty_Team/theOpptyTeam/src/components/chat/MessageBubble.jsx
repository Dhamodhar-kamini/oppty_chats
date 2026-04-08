// src/components/chat/MessageBubble.jsx
import React, { useState, useRef, useEffect } from "react";
import FilePreview from "./FilePreview.jsx";
import { 
  addReaction, 
  removeReaction, 
  editMessage, 
  deleteMessageForMe, 
  deleteMessageForEveryone,
  respondToMeetInvite 
} from "../../utils/api.js";
import "./FileUpload.css";

export default function MessageBubble({ message, showSenderInfo = false, onMessageUpdate, onMessageDelete }) {
  const isMine = message.isMine;
  const [showMenu, setShowMenu] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editContent, setEditContent] = useState(message.text || "");
  const [reactions, setReactions] = useState(message.reactions || {});
  const [userReaction, setUserReaction] = useState(message.userReaction || null);
  const [localDeleted, setLocalDeleted] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [myInviteStatus, setMyInviteStatus] = useState(message.myInviteStatus);
  const menuRef = useRef(null);

  const formatTime = (timestamp) => {
    try {
      return new Date(timestamp).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "";
    }
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false);
      }
    };

    if (showMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showMenu]);

  // Handle reactions
  const handleReaction = async (reactionType) => {
    try {
      if (userReaction === reactionType) {
        await removeReaction(message.id);
        setUserReaction(null);
        setReactions(prev => {
          const updated = { ...prev };
          if (updated[reactionType]) {
            updated[reactionType]--;
            if (updated[reactionType] === 0) delete updated[reactionType];
          }
          return updated;
        });
      } else {
        await addReaction(message.id, reactionType);
        if (userReaction) {
          setReactions(prev => {
            const updated = { ...prev };
            if (updated[userReaction]) {
              updated[userReaction]--;
              if (updated[userReaction] === 0) delete updated[userReaction];
            }
            return updated;
          });
        }
        setUserReaction(reactionType);
        setReactions(prev => ({
          ...prev,
          [reactionType]: (prev[reactionType] || 0) + 1,
        }));
      }
      setShowMenu(false);
    } catch (err) {
      console.error("Reaction error:", err);
    }
  };

  // Handle edit
  const handleEdit = async () => {
    if (!editContent.trim()) {
      alert("Message cannot be empty");
      return;
    }
    
    setIsEditing(true);
    try {
      await editMessage(message.id, editContent.trim());
      setShowEditModal(false);
      if (onMessageUpdate) {
        onMessageUpdate(message.id, { text: editContent.trim(), isEdited: true });
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setIsEditing(false);
    }
  };

  // Handle delete for me
  const handleDeleteForMe = async () => {
    if (!window.confirm("Delete this message for yourself?")) return;
    
    try {
      await deleteMessageForMe(message.id);
      setLocalDeleted(true);
      if (onMessageDelete) {
        onMessageDelete(message.id, 'forMe');
      }
    } catch (err) {
      alert(err.message);
    }
    setShowMenu(false);
  };

  // Handle delete for everyone
  const handleDeleteForEveryone = async () => {
    if (!window.confirm("Delete this message for everyone? This cannot be undone.")) return;
    
    try {
      await deleteMessageForEveryone(message.id);
      if (onMessageDelete) {
        onMessageDelete(message.id, 'forEveryone');
      }
    } catch (err) {
      alert(err.message);
    }
    setShowMenu(false);
  };

  // Handle meet invite response
  const handleMeetResponse = async (status) => {
    try {
      await respondToMeetInvite(message.id, status);
      setMyInviteStatus(status);
    } catch (err) {
      alert(err.message);
    }
  };

  // Join meeting
  const handleJoinMeet = () => {
    if (message.meetLink) {
      window.open(message.meetLink, '_blank');
      if (!isMine) {
        handleMeetResponse('attended');
      }
    }
  };

  // If deleted locally, don't render
  if (localDeleted) {
    return null;
  }

  const hasReactions = Object.keys(reactions).length > 0;
  const time = formatTime(message.createdAt);
  const isMeetMessage = message.messageType === 'meet';
  const isDeleted = message.isDeleted || message.deletedForEveryone;

  return (
    <>
      <div className={`waRow ${isMine ? "mine" : "theirs"}`}>
        <div className="message-container">
          {/* Message Bubble */}
          <div className={`waBubble ${isMine ? "mine" : "theirs"} ${isDeleted ? "deleted" : ""}`}>
            {/* 3-dot menu button */}
            {!isDeleted && (
              <div className="message-menu-wrapper">
                <button 
                  className="message-menu-btn"
                  onClick={() => setShowMenu(!showMenu)}
                  type="button"
                >
                  ⋮
                </button>
                
                {/* Context Menu */}
                {showMenu && (
                  <div className="message-context-menu" ref={menuRef}>
                    {/* Reactions */}
                    <div className="menu-section reactions-section">
                      <button 
                        className={`reaction-option ${userReaction === 'ok' ? 'active' : ''}`}
                        onClick={() => handleReaction('ok')}
                        type="button"
                      >
                        👍
                      </button>
                      <button 
                        className={`reaction-option ${userReaction === 'not_ok' ? 'active' : ''}`}
                        onClick={() => handleReaction('not_ok')}
                        type="button"
                      >
                        👎
                      </button>
                    </div>
                    
                    <div className="menu-divider"></div>
                    
                    {/* Edit (only for sender, within 15 min) */}
                    {isMine && message.canEdit && !isMeetMessage && (
                      <button 
                        className="menu-item"
                        onClick={() => {
                          setEditContent(message.text || "");
                          setShowEditModal(true);
                          setShowMenu(false);
                        }}
                        type="button"
                      >
                        ✏️ Edit
                      </button>
                    )}
                    
                    {/* Delete for Me */}
                    <button 
                      className="menu-item"
                      onClick={handleDeleteForMe}
                      type="button"
                    >
                      🗑️ Delete for me
                    </button>
                    
                    {/* Delete for Everyone (only for sender, within 1 hour) */}
                    {isMine && message.canDeleteForEveryone && (
                      <button 
                        className="menu-item danger"
                        onClick={handleDeleteForEveryone}
                        type="button"
                      >
                        🗑️ Delete for everyone
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Sender name for group chats */}
            {showSenderInfo && !isMine && message.senderName && (
              <div className="waSenderName">{message.senderName}</div>
            )}

            {/* Deleted message */}
            {isDeleted ? (
              <div className="deleted-message-text">
                🚫 This message was deleted
              </div>
            ) : (
              <>
                {/* File Preview */}
                {message.messageType !== "text" && message.messageType !== "meet" && message.fileUrl && (
                  <FilePreview message={message} />
                )}

                {/* Meet Message */}
                {isMeetMessage && message.meetLink && (
                  <div className="meet-message">
                    <div className="meet-header">
                      <span className="meet-icon">📅</span>
                      <div className="meet-info">
                        <div className="meet-title">{message.meetTitle || "Meeting"}</div>
                        {message.meetScheduledAt && (
                          <div className="meet-time">
                            🕐 {new Date(message.meetScheduledAt).toLocaleString()}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="meet-actions">
                      <button className="meet-join-btn" onClick={handleJoinMeet} type="button">
                        🎥 Join Meeting
                      </button>
                      {!isMine && myInviteStatus && (
                        <div className="meet-response">
                          {myInviteStatus === 'pending' && (
                            <div className="meet-response-btns">
                              <button 
                                className="accept-btn"
                                onClick={() => handleMeetResponse('accepted')}
                                type="button"
                              >
                                ✓ Accept
                              </button>
                              <button 
                                className="decline-btn"
                                onClick={() => handleMeetResponse('declined')}
                                type="button"
                              >
                                ✕ Decline
                              </button>
                            </div>
                          )}
                          {myInviteStatus === 'accepted' && (
                            <span className="invite-status accepted">✓ Accepted</span>
                          )}
                          {myInviteStatus === 'declined' && (
                            <span className="invite-status declined">✕ Declined</span>
                          )}
                          {myInviteStatus === 'attended' && (
                            <span className="invite-status attended">✓ Attended</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Text Content */}
                {message.text && !isMeetMessage && (
                  <div className="waBubbleText">{message.text}</div>
                )}
              </>
            )}
            
            {/* Footer */}
            <div className="waBubbleFooter">
              {message.isEdited && !isDeleted && <span className="edited-label">edited</span>}
              <span className="waTime">{time}</span>
              {isMine && !isDeleted && <span className="waStatus">✓✓</span>}
            </div>
          </div>

          {/* Reactions Display - OUTSIDE BUBBLE (WhatsApp Style) */}
          {hasReactions && !isDeleted && (
            <div className={`reactions-outside ${isMine ? "mine" : "theirs"}`}>
              {reactions.ok > 0 && (
                <span 
                  className={`reaction-pill ${userReaction === 'ok' ? 'mine' : ''}`}
                  onClick={() => handleReaction('ok')}
                >
                  👍 {reactions.ok}
                </span>
              )}
              {reactions.not_ok > 0 && (
                <span 
                  className={`reaction-pill ${userReaction === 'not_ok' ? 'mine' : ''}`}
                  onClick={() => handleReaction('not_ok')}
                >
                  👎 {reactions.not_ok}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <div className="edit-modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="edit-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Edit Message</h3>
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              rows={4}
              autoFocus
            />
            <div className="edit-modal-actions">
              <button 
                className="cancel-btn"
                onClick={() => setShowEditModal(false)}
                disabled={isEditing}
                type="button"
              >
                Cancel
              </button>
              <button 
                className="save-btn"
                onClick={handleEdit}
                disabled={isEditing || !editContent.trim()}
                type="button"
              >
                {isEditing ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}