import React from "react";
export function Avatar({ person, large = false }) {
  return (
    <div
      className={`avatar tone-${person.name.charCodeAt(0) % 5} ${large ? "large" : ""}`}
      aria-hidden="true"
    >
      <span>{person.name[0]}</span>
      <i>✳</i>
    </div>
  );
}
