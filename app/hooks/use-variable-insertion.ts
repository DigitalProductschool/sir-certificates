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

	// onBlur is the most important
	const trackingProps = {
		onSelect: trackCursor,
		onClick: trackCursor,
		onKeyUp: trackCursor,
		onBlur: trackCursor,
	};

	// Important for uncontrolled inputs (without onChange/value prop)	
	const insertAtCursor = (currentValue: string, placeholder: string): string => {
		const { start, end } = cursorRef.current;
		const text = currentValue.slice(0, start) + placeholder + currentValue.slice(end);
		pendingCursorRef.current = start + placeholder.length;

		const el = fieldRef.current;
		if (el) el.value = text;

		return text;
	};

	// Specific for DropdownMenu: 
	// Radix restores focus to the dropdown trigger on close by default, on its
	// own timing (after any close animation). Use `restoreFocus` with `onCloseAutoFocus`
	// (with the menu's default behavior prevented)
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
