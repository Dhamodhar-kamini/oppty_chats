import React from "react";

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function MessageBubble({ message }) {
  const mine = message.sender === "me";

  return (
    <div className={`bubbleRow ${mine ? "mine" : "theirs"}`}>
      <div className={`bubble ${mine ? "mine" : "theirs"}`}>
        <div className="bubbleText">{message.text}</div>
        <div className="bubbleMeta">{formatTime(message.createdAt)}</div>
      </div>
    </div>
  );
}