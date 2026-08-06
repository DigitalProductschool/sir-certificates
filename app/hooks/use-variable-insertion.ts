import { useRef } from "react";

function useVariableInsertion<T extends HTMLInputElement | HTMLTextAreaElement>() {
	const fieldRef = useRef<T>(null);
	const cursorRef = useRef({ start: 0, end: 0 });
	const pendingCursorRef = useRef<number | null>(null);

	const trackCursor = () => {
		const el = fieldRef.current;
		if (el) {
			cursorRef.current = {
				start: el.selectionStart ?? el.value.length,
				end: el.selectionEnd ?? el.value.length,
			};
		}
	};

	// onBlur matters most here: clicking the dropdown trigger blurs the field
	// before onInsert runs, so the cursor position must already be captured.
	const trackingProps = {
		onSelect: trackCursor,
		onClick: trackCursor,
		onKeyUp: trackCursor,
		onBlur: trackCursor,
	};

	// Also writes the new value onto the field itself, since uncontrolled
	// callers (no onChange/value prop) have nothing else applying it. For
	// controlled callers this is redundant with their own state update, but
	// harmless — the DOM already matches by the time React re-renders.
	const insertAtCursor = (currentValue: string, placeholder: string): string => {
		const { start, end } = cursorRef.current;
		const text = currentValue.slice(0, start) + placeholder + currentValue.slice(end);
		pendingCursorRef.current = start + placeholder.length;

		const el = fieldRef.current;
		if (el) el.value = text;

		return text;
	};

	// Radix restores focus to the dropdown trigger on close by default, on its
	// own timing (after any close animation) — later than any rAF/timeout we
	// could race against. Call this from the dropdown's onCloseAutoFocus
	// (with the menu's default behavior prevented) instead, so our refocus is
	// the one that actually sticks.
	const restoreFocus = () => {
		const cursor = pendingCursorRef.current;
		if (cursor !== null) {
			fieldRef.current?.focus();
			fieldRef.current?.setSelectionRange(cursor, cursor);
			pendingCursorRef.current = null;
		}
	};

	return { fieldRef, trackingProps, insertAtCursor, restoreFocus };
}

export { useVariableInsertion };
