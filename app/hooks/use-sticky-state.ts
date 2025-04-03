import { useState, useEffect } from "react";

/**
 * Custom hook that preserves state in localStorage and handles SSR safely
 * @param key The key to store the value in localStorage
 * @param initialValue The initial value to use
 * @returns Array containing the current value and an update function
 */
function useStickyState<T>(
	key: string,
	initialValue: T,
): [T, (value: T | ((prevValue: T) => T)) => void] {
	// Track if component has mounted to prevent hydration mismatches
	const [hasMounted, setHasMounted] = useState(false);

	// Initialize state with initial value
	const [storedValue, setStoredValue] = useState<T>(() => initialValue);

	useEffect(() => {
		setHasMounted(true);
	}, []);

	// Only load from localStorage after mount
	useEffect(() => {
		if (!hasMounted) return;

		try {
			const item = window.localStorage.getItem(key);
			if (item !== null) {
				setStoredValue(JSON.parse(item));
			}
		} catch (error) {
			console.error(`Error loading ${key} from localStorage:`, error);
		}
	}, [key, hasMounted]);

	// Save to localStorage whenever value changes
	useEffect(() => {
		if (!hasMounted) return;

		try {
			window.localStorage.setItem(key, JSON.stringify(storedValue));
		} catch (error) {
			console.error(`Error saving ${key} to localStorage:`, error);
		}
	}, [key, storedValue, hasMounted]);

	// Custom setter that supports both direct values and update functions
	const setValue = (value: T | ((prevValue: T) => T)) => {
		setStoredValue((prevValue) => {
			const newValue =
				typeof value === "function"
					? (value as (prev: T) => T)(prevValue)
					: value;
			return newValue;
		});
	};

	// Only return storedValue if mounted to prevent hydration mismatches
	return [hasMounted ? storedValue : initialValue, setValue];
}

export { useStickyState };

export default useStickyState;
