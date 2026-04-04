import React, { useEffect, useRef, useState } from "react";

function formatTime(ts) {
  const value = Number(ts);
  if (!Number.isFinite(value)) return "";
  return new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function isPlainLink(text) {
  return typeof text === "string" && /^https?:\/\//i.test(text);
}

const QUICK_REACTIONS = ["❤️", "👍", "😂", "😮", "😢", "🙏"];

function ReplySnippet({ replyTo, onClick }) {
  if (!replyTo) return null;
  return (
    <div className="waReplySnippet" onClick={onClick} style={{ cursor: onClick ? "pointer" : "default" }}>
      <div className="waReplyBar" />
      <div className="waReplyBody">
        <div className="waReplyTitle">{replyTo.sender === "me" ? "You" : "Reply"}</div>
        <div className="waReplyMessage">
          {replyTo.type === "image" ? `🖼 ${replyTo.fileName || "Photo"}` : replyTo.type === "document" ? `📄 ${replyTo.fileName || "Document"}` : replyTo.text || "Message"}
        </div>
      </div>
    </div>
  );
}

export default function MessageBubble({
  message, onReply, onEdit, onForward, onDeleteForMe, onDeleteForAll, canDeleteForAll,
  onScrollToReply, onPreviewImage, onReaction, onStar, onPin,
  selectionMode, isSelected, onToggleSelect
}) {
  const isMine = message.sender === "me";
  const [showMenu, setShowMenu] = useState(false);
  const wrapRef = useRef(null);
  
  // Swipe to reply states
  const [swipeX, setSwipeX] = useState(0);
  const touchStartX = useRef(null);
  
  // Long press timer
  const longPressTimer = useRef(null);

  useEffect(() => {
    const handleOutside = (event) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target)) {
        setShowMenu(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  const handleTouchStart = (e) => {
    if (selectionMode) return;
    touchStartX.current = e.touches[0].clientX;
    
    longPressTimer.current = setTimeout(() => {
      setShowMenu(true);
      if (window.navigator && window.navigator.vibrate) navigator.vibrate(50);
    }, 500);
  };

  const handleTouchMove = (e) => {
    if (selectionMode || touchStartX.current === null) return;
    
    // Cancel long press if user is scrolling/swiping
    clearTimeout(longPressTimer.current);
    
    const deltaX = e.touches[0].clientX - touchStartX.current;
    if (deltaX > 0 && deltaX < 80) { // Only swipe right, max 80px
      setSwipeX(deltaX);
    }
  };

  const handleTouchEnd = () => {
    clearTimeout(longPressTimer.current);
    touchStartX.current = null;
    if (swipeX > 50 && !message.deletedForAll) {
      onReply?.();
      if (window.navigator && window.navigator.vibrate) navigator.vibrate(30);
    }
    setSwipeX(0);
  };

  const handleContextMenu = (e) => {
    e.preventDefault();
    if (!selectionMode) setShowMenu(true);
  };

  const handleBubbleClick = () => {
    if (selectionMode) {
      onToggleSelect?.();
    }
  };

  const displayContent = () => {
    if (message.type === "image") {
      return (
        <div className="waAttachmentWrap">
          <img src={message.fileUrl} alt={message.fileName || "Uploaded image"} className="chatAttachmentImage" onClick={(e) => { if(!selectionMode) onPreviewImage?.(message.fileUrl); }} style={{ cursor: selectionMode ? 'default' : "pointer" }} />
          {message.fileName ? <div className="chatAttachmentName">{message.fileName}</div> : null}
        </div>
      );
    }
    if (message.type === "document") {
      return (
        <a href={message.fileUrl || "#"} target="_blank" rel="noreferrer" className="chatDocumentCard" onClick={(e) => selectionMode && e.preventDefault()}>
          <div className="chatDocumentIcon">📄</div>
          <div className="chatDocumentInfo">
            <div className="chatDocumentName">{message.fileName || "Document"}</div>
            <div className="chatDocumentSubtext">Open document</div>
          </div>
        </a>
      );
    }
    if (!message.deletedForAll && isPlainLink(message.text)) {
      return <a href={message.text} target="_blank" rel="noreferrer" className="chatLinkPreview" onClick={(e) => selectionMode && e.preventDefault()}>{message.displayText ?? message.text}</a>;
    }
    return <div className={`waBubbleText ${message.deletedForAll ? "deleted" : ""}`}>{message.displayText ?? message.text ?? ""}</div>;
  };

  return (
    <div className={`waRow ${isMine ? "mine" : "theirs"} ${selectionMode && isSelected ? "selected" : ""}`}>
      {selectionMode && (
        <div className="waSelectionArea" onClick={onToggleSelect}>
          <div className={`waCheckbox ${isSelected ? "checked" : ""}`}>{isSelected && "✓"}</div>
        </div>
      )}

      <div className="waBubbleContainer" ref={wrapRef} onClick={handleBubbleClick}>
        
        {/* Swipe Reply Icon */}
        <div className="swipeReplyIcon" style={{ opacity: swipeX / 50, transform: `translateX(${swipeX - 40}px) scale(${Math.min(swipeX / 50, 1)})`}}>
          ↩
        </div>

        <div 
          className={`waBubble ${isMine ? "mine" : "theirs"}`}
          style={{ transform: `translateX(${swipeX}px)`, transition: swipeX === 0 ? "transform 0.2s ease" : "none" }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onContextMenu={handleContextMenu}
        >
          {!selectionMode && (
            <button type="button" className="waBubbleMenuBtn" aria-label="Message options" onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}>▾</button>
          )}

          <ReplySnippet replyTo={message.replyTo} onClick={(e) => { if(!selectionMode) onScrollToReply?.(message.replyTo.id); }} />
          {displayContent()}

          <div className="waBubbleFooter">
            {message.isStarred && <span className="waStarIcon">⭐</span>}
            {message.isEdited && <span className="waEdited">Edited</span>}
            <span className="waTime">{formatTime(message.createdAt)}</span>
            {isMine && !message.deletedForAll && <span className={`waStatus ${message.status || "sent"}`}>{message.status === 'sent' ? '✓' : '✓✓'}</span>}
          </div>

          {/* Render Reactions */}
          {message.reactions && message.reactions.length > 0 && (
            <div className="waReactionsDisplay">
              {message.reactions.map((emoji, i) => <span key={i} className="waReactionBadge">{emoji}</span>)}
            </div>
          )}
        </div>

        {showMenu && !selectionMode && (
          <div className={`waBubbleMenu ${isMine ? "mine" : "theirs"}`}>
            {!message.deletedForAll && (
              <div className="waQuickReactions">
                {QUICK_REACTIONS.map(emoji => (
                  <button key={emoji} type="button" className={`reactionBtn ${message.reactions?.includes(emoji) ? "active" : ""}`} onClick={() => { onReaction(emoji); setShowMenu(false); }}>{emoji}</button>
                ))}
              </div>
            )}
            
            <button type="button" className="waBubbleMenuItem" onClick={() => { onToggleSelect(); setShowMenu(false); }}>Select messages</button>

            {!message.deletedForAll && <button type="button" className="waBubbleMenuItem" onClick={() => { onReply?.(); setShowMenu(false); }}>Reply</button>}
            {!message.deletedForAll && isMine && message.type === 'text' && <button type="button" className="waBubbleMenuItem" onClick={() => { onEdit?.(); setShowMenu(false); }}>Edit</button>}
            {!message.deletedForAll && message.text && <button type="button" className="waBubbleMenuItem" onClick={() => { navigator.clipboard.writeText(message.text); setShowMenu(false); }}>Copy</button>}
            {!message.deletedForAll && <button type="button" className="waBubbleMenuItem" onClick={() => { onForward?.([message]); setShowMenu(false); }}>Forward</button>}
            
            {!message.deletedForAll && <button type="button" className="waBubbleMenuItem" onClick={() => { onStar(); setShowMenu(false); }}>{message.isStarred ? "Unstar" : "Star"}</button>}
            {!message.deletedForAll && <button type="button" className="waBubbleMenuItem" onClick={() => { onPin(); setShowMenu(false); }}>{message.isPinned ? "Unpin" : "Pin"}</button>}

            <button type="button" className="waBubbleMenuItem" onClick={() => { onDeleteForMe?.(); setShowMenu(false); }}>Delete for me</button>
            {canDeleteForAll && !message.deletedForAll && <button type="button" className="waBubbleMenuItem danger" onClick={() => { onDeleteForAll?.(); setShowMenu(false); }}>Delete for all</button>}
          </div>
        )}
      </div>
    </div>
  );
}