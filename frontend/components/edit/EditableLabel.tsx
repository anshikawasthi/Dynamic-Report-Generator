"use client";

import { useState, useRef } from "react";
import { Pencil } from "lucide-react";
import { useEditMode } from "@/components/a2ui/EditModeContext";

interface Props {
  /** The canonical key used to store the override (must be unique). */
  originalText: string;
  /** Optional default display text when no override exists. Defaults to originalText. */
  defaultText?: string;
  className?: string;
  /** Use a textarea instead of a single-line input (for long content). */
  multiline?: boolean;
}

/**
 * Renders a text label. In edit mode, clicking the label opens an inline
 * input so the FSM can rename it. The override is stored in
 * editState.fieldLabelOverrides keyed by originalText.
 */
export default function EditableLabel({ originalText, defaultText, className = "", multiline = false }: Props) {
  const { isEditMode, editState, onSetFieldLabel } = useEditMode();
  const [editing, setEditing] = useState(false);
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement & HTMLTextAreaElement>(null);

  const fallback = defaultText ?? originalText;
  const displayText = editState.fieldLabelOverrides[originalText] ?? fallback;

  const startEdit = () => {
    setInput(displayText);
    setEditing(true);
    setTimeout(() => inputRef.current?.select(), 0);
  };

  const confirm = () => {
    const trimmed = input.trim();
    if (trimmed) {
      onSetFieldLabel(originalText, trimmed);
    } else {
      // Empty → revert to original
      onSetFieldLabel(originalText, fallback);
    }
    setEditing(false);
  };

  const cancel = () => setEditing(false);

  if (!isEditMode) {
    return <span className={className}>{displayText}</span>;
  }

  if (editing) {
    if (multiline) {
      return (
        <textarea
          ref={inputRef as React.RefObject<HTMLTextAreaElement>}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") cancel();
            // Shift+Enter = newline; plain Enter = confirm
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); confirm(); }
          }}
          onBlur={confirm}
          autoFocus
          rows={3}
          className={`${className} w-full border border-amber-400 rounded bg-white/95 px-2 py-1 focus:outline-none resize-none text-sm text-gray-700 leading-relaxed`}
        />
      );
    }
    return (
      <input
        ref={inputRef as React.RefObject<HTMLInputElement>}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") confirm();
          if (e.key === "Escape") cancel();
        }}
        onBlur={confirm}
        autoFocus
        className={`${className} border-b border-amber-400 bg-transparent focus:outline-none w-20 min-w-0`}
        style={{ width: `${Math.max(input.length, 4)}ch` }}
      />
    );
  }

  return (
    <span
      className={`${className} group/label inline-flex items-center gap-0.5 cursor-pointer`}
      title="Click to rename"
      onClick={startEdit}
    >
      <span className="hover:text-amber-600 hover:underline decoration-dashed underline-offset-2 transition-colors">
        {displayText}
      </span>
      <Pencil className="w-2.5 h-2.5 text-gray-300 opacity-0 group-hover/label:opacity-100 transition-opacity shrink-0" />
    </span>
  );
}
