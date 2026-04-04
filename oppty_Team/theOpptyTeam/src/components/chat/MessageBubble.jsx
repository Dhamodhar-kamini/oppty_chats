import React, { useEffect, useRef, useState } from "react";
import { useChats } from "../../context/ChatContext.jsx";

function formatTime(ts) {
  const value = Number(ts);
  if (!Number.isFinite(value)) return "";
  return new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

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
  onScrollToReply, onPreviewImage, onReaction, onStar, onPin, onVote,
  selectionMode, isSelected, onToggleSelect
}) {
  const { showToast } = useChats();
  const isMine = message.sender === "me";
  const wrapRef = useRef(null);
  
  // Menu Positioning State
  const [menuPos, setMenuPos] = useState({ visible: false, x: 0, y: 0 });
  const [showHoverReactions, setShowHoverReactions] = useState(false);
  const [swipeX, setSwipeX] = useState(0);
  const touchStartX = useRef(null);
  const longPressTimer = useRef(null);

  // Close menus when clicking outside
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

  // Close fixed menus on scroll to prevent floating
  useEffect(() => {
    const handleScroll = () => {
      if (menuPos.visible || showHoverReactions) {
        setMenuPos({ visible: false, x: 0, y: 0 });
        setShowHoverReactions(false);
      }
    };
    window.addEventListener('scroll', handleScroll, true); // true catches all scrolling containers
    return () => window.removeEventListener('scroll', handleScroll, true);
  }, [menuPos.visible, showHoverReactions]);

  // Handle System Messages gracefully
  if (message.type === "system") {
    return (
      <div className="waSystemMessageWrap animatedFadeIn">
        <div className="waSystemMessage">{message.text}</div>
      </div>
    );
  }

  // --- DYNAMIC POSITIONING LOGIC ---
  const openMenuAt = (clientX, clientY) => {
    let x = clientX;
    let y = clientY;
    
    // Approximate dimensions of the context menu
    const menuWidth = 220; 
    const menuHeight = 360; 

    // Prevent clipping on the right edge
    if (x + menuWidth > window.innerWidth) {
      x = window.innerWidth - menuWidth - 16;
    }
    // Prevent clipping on the bottom edge
    if (y + menuHeight > window.innerHeight) {
      y = window.innerHeight - menuHeight - 16;
    }

    setMenuPos({ visible: true, x, y });
  };

  // Interaction Handlers
  const handleTouchStart = (e) => {
    if (selectionMode) return;
    const touchX = e.touches[0].clientX;
    const touchY = e.touches[0].clientY;
    touchStartX.current = touchX;

    longPressTimer.current = setTimeout(() => {
      openMenuAt(touchX, touchY);
      if (window.navigator && window.navigator.vibrate) navigator.vibrate(50);
    }, 500);
  };

  const handleTouchMove = (e) => {
    if (selectionMode || touchStartX.current === null) return;
    clearTimeout(longPressTimer.current); // Cancel long press if swiping
    const deltaX = e.touches[0].clientX - touchStartX.current;
    if (deltaX > 0 && deltaX < 80) setSwipeX(deltaX); // Swipe right to reply
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
    if (!selectionMode && !message.deletedForAll) {
      openMenuAt(e.clientX, e.clientY);
    }
  };

  const handleChevronClick = (e) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    openMenuAt(rect.left, rect.bottom + 4);
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

    if (message.type === "poll") {
      const uniqueVoters = new Set();
      message.pollOptions.forEach(opt => opt.votedBy.forEach(id => uniqueVoters.add(id)));
      const totalVoters = uniqueVoters.size;

      return (
        <div className="waPollContainer">
          <div className="waPollQuestion">📊 {message.text}</div>
          <div className="waPollMultipleText">{message.allowMultiple ? "Select one or more" : "Select one"}</div>
          <div className="waPollOptionsList">
            {message.pollOptions.map((opt) => {
              const hasVoted = opt.votedBy.includes("me");
              const percent = totalVoters > 0 ? (opt.votedBy.length / totalVoters) * 100 : 0;
              
              return (
                <div key={opt.id} className="waPollOption" onClick={() => onVote(opt.id)}>
                  <div className="waPollOptionControl">
                    <div className={`waPollCheckbox ${message.allowMultiple ? 'square' : 'circle'} ${hasVoted ? 'active' : ''}`}>
                      {hasVoted && (message.allowMultiple ? '✓' : <div className="waPollRadioDot" />)}
                    </div>
                  </div>
                  <div className="waPollOptionBody">
                    <div className="waPollOptionHeader">
                      <span className="waPollOptionText">{opt.text}</span>
                      {opt.votedBy.length > 0 && <span className="waPollOptionCount">{opt.votedBy.length}</span>}
                    </div>
                    <div className="waPollProgressTrack">
                      <div className="waPollProgressFill" style={{ width: `${percent}%` }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="waPollFooter">{totalVoters} vote{totalVoters !== 1 ? 's' : ''}</div>
        </div>
      );
    }

    const urlMatch = message.text?.match(/https?:\/\/[^\s]+/i)?.[0];
    const hasLinkPreview = message.linkPreview && !message.deletedForAll && urlMatch;

    return (
      <div className={`waBubbleText ${message.deletedForAll ? "deleted" : ""}`}>
        {message.displayText ?? (
          urlMatch && !hasLinkPreview 
            ? <a href={urlMatch} target="_blank" rel="noreferrer" className="chatLinkPreview" onClick={(e) => selectionMode && e.preventDefault()}>{message.text}</a>
            : renderTextWithMentions(message.text)
        ) ?? ""}
        
        {hasLinkPreview && (
          <a href={urlMatch} target="_blank" rel="noreferrer" className="waLinkPreviewCard" onClick={(e) => selectionMode && e.preventDefault()}>
            <img src={message.linkPreview.imageUrl} alt="Preview" className="waLinkPreviewImage" />
            <div className="waLinkPreviewContent">
              <div className="waLinkPreviewTitle">{message.linkPreview.title}</div>
              <div className="waLinkPreviewDesc">{message.linkPreview.description}</div>
              <div className="waLinkPreviewDomain">{message.linkPreview.domain}</div>
            </div>
          </a>
        )}
      </div>
    );
  };

  const renderContextMenu = () => {
    if (!menuPos.visible || selectionMode) return null;
    
    // Fixed positioning breaks out of overflow containers natively
    const style = { 
      position: 'fixed', 
      top: menuPos.y, 
      left: menuPos.x, 
      margin: 0, 
      zIndex: 9999999 
    };

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

        {/* Hover Actions (Desktop) */}
        {!selectionMode && !message.deletedForAll && (
          <div className="waHoverActions">
            <button onClick={(e) => { e.stopPropagation(); setShowHoverReactions(!showHoverReactions); }} title="React">😀</button>
            <button onClick={(e) => { e.stopPropagation(); onReply?.(); }} title="Reply">↩</button>
            <button onClick={handleChevronClick} title="Menu">▾</button>
            
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
            <button type="button" className="waBubbleMenuBtn mobile-only" aria-label="Message options" onClick={handleChevronClick}>▾</button>
          )}

          {/* Group sender name */}
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

          {/* Reactions display */}
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