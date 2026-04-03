import React, { useEffect, useRef, useState } from "react";

function formatTime(ts) {
  const value = Number(ts);
  if (!Number.isFinite(value)) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function isPlainLink(text) {
  return typeof text === "string" && /^https?:\/\//i.test(text);
}

function ReplySnippet({ replyTo }) {
  if (!replyTo) return null;

  return (
    <div className="waReplySnippet">
      <div className="waReplyBar" />
      <div className="waReplyBody">
        <div className="waReplyTitle">{replyTo.sender === "me" ? "You" : "Reply"}</div>
        <div className="waReplyMessage">
          {replyTo.type === "image"
            ? `🖼 ${replyTo.fileName || "Photo"}`
            : replyTo.type === "document"
            ? `📄 ${replyTo.fileName || "Document"}`
            : replyTo.text || "Message"}
        </div>
      </div>
    </div>
  );
}

export default function MessageBubble({
  message,
  onReply,
  onDeleteForMe,
  onDeleteForAll,
  canDeleteForAll,
}) {
  const isMine = message.sender === "me";
  const [showMenu, setShowMenu] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    const handleOutside = (event) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target)) {
        setShowMenu(false);
      }
    };

    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  const displayContent = () => {
    if (message.type === "image") {
      return (
        <div className="waAttachmentWrap">
          <img
            src={message.fileUrl}
            alt={message.fileName || "Uploaded image"}
            className="chatAttachmentImage"
          />
          {message.fileName ? (
            <div className="chatAttachmentName">{message.fileName}</div>
          ) : null}
        </div>
      );
    }

    if (message.type === "document") {
      return (
        <a
          href={message.fileUrl || "#"}
          target="_blank"
          rel="noreferrer"
          className="chatDocumentCard"
        >
          <div className="chatDocumentIcon">📄</div>
          <div className="chatDocumentInfo">
            <div className="chatDocumentName">{message.fileName || "Document"}</div>
            <div className="chatDocumentSubtext">Open document</div>
          </div>
        </a>
      );
    }

    if (!message.deletedForAll && isPlainLink(message.text)) {
      return (
        <a
          href={message.text}
          target="_blank"
          rel="noreferrer"
          className="chatLinkPreview"
        >
          {message.displayText ?? message.text}
        </a>
      );
    }

    return (
      <div className={`waBubbleText ${message.deletedForAll ? "deleted" : ""}`}>
        {message.displayText ?? message.text ?? ""}
      </div>
    );
  };

  return (
    <div className={`waRow ${isMine ? "mine" : "theirs"}`}>
      <div className="waBubbleContainer" ref={wrapRef}>
        <div className={`waBubble ${isMine ? "mine" : "theirs"}`}>
          <button
            type="button"
            className="waBubbleMenuBtn"
            aria-label="Message options"
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu((prev) => !prev);
            }}
          >
            ▾
          </button>

          <ReplySnippet replyTo={message.replyTo} />

          {displayContent()}

          <div className="waBubbleFooter">
            <span className="waTime">{formatTime(message.createdAt)}</span>
          </div>
        </div>

        {showMenu && (
          <div className={`waBubbleMenu ${isMine ? "mine" : "theirs"}`}>
            <button
              type="button"
              className="waBubbleMenuItem"
              onClick={() => {
                onReply?.();
                setShowMenu(false);
              }}
            >
              Reply
            </button>

            <button
              type="button"
              className="waBubbleMenuItem"
              onClick={() => {
                onDeleteForMe?.();
                setShowMenu(false);
              }}
            >
              Delete for me
            </button>

            {canDeleteForAll && !message.deletedForAll && (
              <button
                type="button"
                className="waBubbleMenuItem danger"
                onClick={() => {
                  onDeleteForAll?.();
                  setShowMenu(false);
                }}
              >
                Delete for all
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}