import React, { useEffect, useRef, useState } from "react";
import { useChats } from "../../context/ChatContext.jsx";

function formatTime(ts) {
  const value = Number(ts);
  if (!Number.isFinite(value)) return "";
  return new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function isPlainLink(text) { return typeof text === "string" && /^https?:\/\//i.test(text); }

const QUICK_REACTIONS = ["❤️", "👍", "😂", "😮", "😢", "🙏"];

function ReplySnippet({ replyTo, onClick }) {
  if (!replyTo) return null;
  return (
    <div className="waReplySnippet" onClick={onClick} style={{ cursor: onClick ? "pointer" : "default" }}>
      <div className="waReplyBar" />
      <div className="waReplyBody">
        <div className="waReplyTitle">{replyTo.senderName || "Reply"}</div>
        <div className="waReplyMessage">
          {replyTo.type === "image" ? `🖼 ${replyTo.fileName || "Photo"}` : replyTo.type === "document" ? `📄 ${replyTo.fileName || "Document"}` : replyTo.text || "Message"}
        </div>
      </div>
    </div>
  );
}

function renderTextWithMentions(text) {
  if (typeof text !== 'string') return text;
  const parts = text.split(/(@[a-zA-Z0-9_]+)/g);
  return parts.map((part, i) => 
    part.startsWith('@') ? <span key={i} className="waMention">{part}</span> : part
  );
}

export default function MessageBubble({
  message, onReply, onEdit, onForward, onDeleteForMe, onDeleteForAll, canDeleteForAll,
  onScrollToReply, onPreviewImage, onReaction, onStar, onPin,
  selectionMode, isSelected, onToggleSelect
}) {
  const { showToast } = useChats();
  const isMine = message.sender === "me";
  const wrapRef = useRef(null);
  
  // UX Polish: Desktop Context Menu
  const [menuPos, setMenuPos] = useState({ visible: false, x: 0, y: 0 });
  const [showHoverReactions, setShowHoverReactions] = useState(false);
  
  const [swipeX, setSwipeX] = useState(0);
  const touchStartX = useRef(null);
  const longPressTimer = useRef(null);

  useEffect(() => {
    const handleOutside = (event) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target)) {
        setMenuPos({ visible: false, x: 0, y: 0 });
        setShowHoverReactions(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  if (message.type === "system") {
    return (
      <div className="waSystemMessageWrap animatedFadeIn">
        <div className="waSystemMessage">{message.text}</div>
      </div>
    );
  }

  const handleTouchStart = (e) => {
    if (selectionMode) return;
    touchStartX.current = e.touches[0].clientX;
    longPressTimer.current = setTimeout(() => {
      setMenuPos({ visible: true, x: e.touches[0].clientX, y: e.touches[0].clientY });
      if (window.navigator && window.navigator.vibrate) navigator.vibrate(50);
    }, 500);
  };

  const handleTouchMove = (e) => {
    if (selectionMode || touchStartX.current === null) return;
    clearTimeout(longPressTimer.current);
    const deltaX = e.touches[0].clientX - touchStartX.current;
    if (deltaX > 0 && deltaX < 80) setSwipeX(deltaX);
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

  // UX Polish: Accurate Desktop Right-Click
  const handleContextMenu = (e) => {
    e.preventDefault();
    if (!selectionMode && !message.deletedForAll) {
      let x = e.clientX;
      let y = e.clientY;
      if (window.innerWidth - x < 200) x = window.innerWidth - 200;
      if (window.innerHeight - y < 350) y = window.innerHeight - 350;
      setMenuPos({ visible: true, x, y });
    }
  };

  const handleBubbleClick = () => {
    if (selectionMode) onToggleSelect?.();
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(message.text);
    showToast("Message copied to clipboard");
    setMenuPos({ visible: false, x: 0, y: 0 });
  };

  const displayContent = () => {
    if (message.type === "image") {
      return (
        <div className="waAttachmentWrap">
          <img src={message.fileUrl} alt={message.fileName || "Uploaded image"} className="chatAttachmentImage" onClick={() => { if(!selectionMode) onPreviewImage?.(message.fileUrl); }} style={{ cursor: selectionMode ? 'default' : "pointer" }} />
          {message.fileName && <div className="chatAttachmentName">{message.fileName}</div>}
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
    return <div className={`waBubbleText ${message.deletedForAll ? "deleted" : ""}`}>{message.displayText ?? renderTextWithMentions(message.text) ?? ""}</div>;
  };

  const renderContextMenu = () => {
    if (!menuPos.visible || selectionMode) return null;
    
    // Determine positioning. On mobile it might be relative, on desktop it's fixed.
    const isMobile = window.innerWidth <= 768;
    const style = isMobile ? {} : { position: 'fixed', top: menuPos.y, left: menuPos.x, margin: 0, zIndex: 10000 };

    return (
      <div className={`waBubbleMenu ${isMine ? "mine" : "theirs"}`} style={style} onClick={e => e.stopPropagation()}>
        {!message.deletedForAll && (
          <div className="waQuickReactions">
            {QUICK_REACTIONS.map(emoji => (
              <button key={emoji} type="button" className={`reactionBtn ${message.reactions?.includes(emoji) ? "active" : ""}`} onClick={() => { onReaction(emoji); setMenuPos({ visible: false, x:0, y:0 }); setShowHoverReactions(false); }}>{emoji}</button>
            ))}
          </div>
        )}
        
        <button type="button" className="waBubbleMenuItem" onClick={() => { onToggleSelect(); setMenuPos({ visible: false, x:0, y:0 }); }}>Select messages</button>
        {!message.deletedForAll && <button type="button" className="waBubbleMenuItem" onClick={() => { onReply?.(); setMenuPos({ visible: false, x:0, y:0 }); }}>Reply</button>}
        {!message.deletedForAll && isMine && message.type === 'text' && <button type="button" className="waBubbleMenuItem" onClick={() => { onEdit?.(); setMenuPos({ visible: false, x:0, y:0 }); }}>Edit</button>}
        {!message.deletedForAll && message.text && <button type="button" className="waBubbleMenuItem" onClick={handleCopy}>Copy</button>}
        {!message.deletedForAll && <button type="button" className="waBubbleMenuItem" onClick={() => { onForward?.([message]); setMenuPos({ visible: false, x:0, y:0 }); }}>Forward</button>}
        
        {!message.deletedForAll && <button type="button" className="waBubbleMenuItem" onClick={() => { onStar(); setMenuPos({ visible: false, x:0, y:0 }); showToast(message.isStarred ? "Unstarred" : "Message Starred"); }}>{message.isStarred ? "Unstar" : "Star"}</button>}
        {!message.deletedForAll && <button type="button" className="waBubbleMenuItem" onClick={() => { onPin(); setMenuPos({ visible: false, x:0, y:0 }); showToast(message.isPinned ? "Unpinned" : "Message Pinned"); }}>{message.isPinned ? "Unpin" : "Pin"}</button>}

        <button type="button" className="waBubbleMenuItem" onClick={() => { onDeleteForMe?.(); setMenuPos({ visible: false, x:0, y:0 }); }}>Delete for me</button>
        {canDeleteForAll && !message.deletedForAll && <button type="button" className="waBubbleMenuItem danger" onClick={() => { onDeleteForAll?.(); setMenuPos({ visible: false, x:0, y:0 }); }}>Delete for all</button>}
      </div>
    );
  };

  return (
    <div className={`waRow animatedFadeIn ${isMine ? "mine" : "theirs"} ${selectionMode && isSelected ? "selected" : ""}`}>
      {selectionMode && (
        <div className="waSelectionArea" onClick={onToggleSelect}>
          <div className={`waCheckbox ${isSelected ? "checked" : ""}`}>{isSelected && "✓"}</div>
        </div>
      )}

      <div className="waBubbleContainer" ref={wrapRef} onClick={handleBubbleClick}>
        <div className="swipeReplyIcon" style={{ opacity: swipeX / 50, transform: `translateX(${swipeX - 40}px) scale(${Math.min(swipeX / 50, 1)})`}}>↩</div>

        {/* UX Polish: Hover Actions (Desktop) */}
        {!selectionMode && !message.deletedForAll && (
          <div className="waHoverActions">
            <button onClick={(e) => { e.stopPropagation(); setShowHoverReactions(!showHoverReactions); }} title="React">😀</button>
            <button onClick={(e) => { e.stopPropagation(); onReply?.(); }} title="Reply">↩</button>
            <button onClick={(e) => { e.stopPropagation(); setMenuPos({ visible: true, x: e.clientX, y: e.clientY }); }} title="Menu">▾</button>
            
            {showHoverReactions && (
              <div className="waHoverReactionsMenu">
                 {QUICK_REACTIONS.map(emoji => (
                  <button key={emoji} onClick={(e) => { e.stopPropagation(); onReaction(emoji); setShowHoverReactions(false); }}>{emoji}</button>
                ))}
              </div>
            )}
          </div>
        )}

        <div 
          className={`waBubble ${isMine ? "mine" : "theirs"}`}
          style={{ transform: `translateX(${swipeX}px)`, transition: swipeX === 0 ? "transform 0.2s ease" : "none" }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onContextMenu={handleContextMenu}
        >
          {/* Mobile menu trigger */}
          {!selectionMode && (
            <button type="button" className="waBubbleMenuBtn mobile-only" aria-label="Message options" onClick={(e) => { e.stopPropagation(); setMenuPos({ visible: true, x: e.clientX, y: e.clientY }); }}>▾</button>
          )}

          {!isMine && message.senderName && !message.deletedForAll && (
             <div className="waSenderName">{message.senderName}</div>
          )}

          <ReplySnippet replyTo={message.replyTo} onClick={() => { if(!selectionMode) onScrollToReply?.(message.replyTo.id); }} />
          {displayContent()}

          <div className="waBubbleFooter">
            {message.isStarred && <span className="waStarIcon">⭐</span>}
            {message.isEdited && <span className="waEdited">Edited</span>}
            <span className="waTime">{formatTime(message.createdAt)}</span>
            {isMine && !message.deletedForAll && <span className={`waStatus ${message.status || "sent"}`}>{message.status === 'sent' ? '✓' : '✓✓'}</span>}
          </div>

          {message.reactions && message.reactions.length > 0 && (
            <div className="waReactionsDisplay">
              {message.reactions.map((emoji, i) => <span key={i} className="waReactionBadge">{emoji}</span>)}
            </div>
          )}
        </div>
        
        {renderContextMenu()}
      </div>
    </div>
  );
}