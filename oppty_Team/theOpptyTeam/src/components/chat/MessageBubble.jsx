import React from "react";

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function isLink(text) {
  return /^https?:\/\//i.test(text || "");
}

export default function MessageBubble({ message }) {
  const isMine = message.sender === "me";

  return (
    <div className={`bubbleRow ${isMine ? "mine" : "theirs"}`}>
      <div className={`bubble ${isMine ? "mine" : "theirs"}`}>
        {message.type === "image" ? (
          <div className="attachmentBubble">
            <img
              src={message.fileUrl}
              alt={message.fileName || "Uploaded image"}
              className="chatAttachmentImage"
            />
            {message.fileName && (
              <div className="chatAttachmentName">{message.fileName}</div>
            )}
          </div>
        ) : message.type === "document" ? (
          <div className="attachmentBubble">
            <a
              href={message.fileUrl}
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
          </div>
        ) : isLink(message.text) ? (
          <a
            href={message.text}
            target="_blank"
            rel="noreferrer"
            className="chatLinkPreview"
          >
            {message.text}
          </a>
        ) : (
          <div className="bubbleText">{message.text}</div>
        )}

        <div className="bubbleMeta">{formatTime(message.createdAt)}</div>
      </div>
    </div>
  );
}