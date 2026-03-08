// src/components/LyricsEditor.tsx
"use client";

import { useRef, useEffect, useCallback } from "react";
import { diffWords } from 'diff';

interface LyricsEditorProps {
    value: string;
    originalValue: string;
    className?: string;
    onChange: (text: string) => void;
    onKeyDown?: (e: React.KeyboardEvent<HTMLDivElement>) => void;
}

// Get the total character offset of the cursor from the start of the element
function getCursorOffset(el: HTMLElement): number {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return 0;

    const range = selection.getRangeAt(0);
    const preRange = document.createRange();
    preRange.setStart(el, 0);
    preRange.setEnd(range.startContainer, range.startOffset);
    return preRange.toString().length;
}

// Restore cursor to a specific character offset from the start of the element
function restoreCursorOffset(el: HTMLElement, offset: number) {
    const selection = window.getSelection();
    if (!selection) return;

    let remaining = offset;
    let found = false;

    function walk(node: Node, sel: Selection): void {
        if (found) return;
    
        if (node.nodeType === Node.TEXT_NODE) {
            const len = node.textContent?.length ?? 0;
            if (remaining <= len) {
                const range = document.createRange();
                range.setStart(node, remaining);
                range.collapse(true);
                sel.removeAllRanges();
                sel.addRange(range);
                found = true;
            } else {
                remaining -= len;
            }
        } else {
            node.childNodes.forEach(child => walk(child, sel));
        }
    }
    
    walk(el, selection);

    // Fallback: place cursor at end if offset exceeds content
    if (!found) {
        const range = document.createRange();
        range.selectNodeContents(el);
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
    }
}

function buildHighlightedHTML(current: string, original: string): string {
    const changes = diffWords(original, current);

    return changes
        .filter(part => !part.removed) // skip removed parts (they're gone from current)
        .map(part => {
            const escaped = escapeHtml(part.value).replace(/\n/g, "<br>");
            if (part.added) {
                // This word exists in current but not original = changed
                return `<span style="color:#ef4444;font-weight:500">${escaped}</span>`;
            }
            return escaped; // unchanged
        })
        .join("");
}

function escapeHtml(str: string): string {
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}

export default function LyricsEditor({
    value,
    originalValue,
    className,
    onChange,
    onKeyDown,
}: LyricsEditorProps) {
    const editorRef = useRef<HTMLDivElement>(null);
    // Track whether the change came from inside the editor (user typing)
    // vs outside (undo, reset, replace-all)
    const isInternalChange = useRef(false);
    const hasSetInitial = useRef(false); // ADD THIS
    // When `value` changes externally (undo/reset/replace-all), rewrite the DOM
    useEffect(() => {
        const el = editorRef.current;
        if (!el) return;
    
        // Skip if this was triggered by user typing
        if (isInternalChange.current) {
            isInternalChange.current = false;
            return;
        }
    
        // Skip if value is empty (not loaded yet)
        if (!value) return;
    
        // Always rewrite on external value change (covers initial load + undo/reset/restore)
        el.innerHTML = buildHighlightedHTML(value, originalValue);
        hasSetInitial.current = true;
    }, [value, originalValue]);

    const handleInput = useCallback(() => {
        const el = editorRef.current;
        if (!el) return;

        // 1. Save cursor position as a plain character offset
        const offset = getCursorOffset(el);

        // 2. Read the plain text the user typed
        const plainText = el.innerText;

        // 3. Rewrite innerHTML with highlights
        el.innerHTML = buildHighlightedHTML(plainText, originalValue);

        // 4. Restore cursor to exact same character position
        restoreCursorOffset(el, offset);

        // 5. Tell React about the new text (mark as internal so useEffect skips it)
        isInternalChange.current = true;
        onChange(plainText);
    }, [originalValue, onChange]);

    return (
        <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            className={className}
            onInput={handleInput}
            onKeyDown={onKeyDown}
        />
    );
}
