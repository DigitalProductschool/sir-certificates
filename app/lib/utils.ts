import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function pickCapitalLetters(string: string) {
  let capitals = string.charAt(0);
  if (string.indexOf(" ") > 0) {
    capitals = capitals.concat(string.substr(string.indexOf(" ") + 1, 1));
  } else {
    capitals = capitals.concat(string.charAt(1));
  }
  return capitals.toUpperCase();
}

export function rgbToHex(rgbArray: number[]) {
  if (!Array.isArray(rgbArray) || rgbArray.length !== 3) {
    throw new Error("Color input must be an array of three numbers");
  }
  const hexValues = rgbArray.map((value) => {
    if (value < 0 || value > 1) {
      throw new Error("All color values must be between 0 and 1");
    }
    const intVal = Math.floor(value * 255);
    return intVal.toString(16).padStart(2, "0");
  });
  return hexValues.join("");
}

export function hexToRgbArray(hexString: string): [number, number, number] {
  // Remove '#' prefix if present
  hexString = hexString.replace(/^#/, "");
  // Handle 3-digit hex codes
  if (hexString.length === 3) {
    hexString = hexString
      .split("")
      .map((c) => c + c)
      .join("");
  }
  if (hexString.length !== 6) {
    throw new Error("Invalid hex color string");
  }
  const rgbArray: [number, number, number] = [
    parseInt(hexString.slice(0, 2), 16) / 255,
    parseInt(hexString.slice(2, 4), 16) / 255,
    parseInt(hexString.slice(4, 6), 16) / 255,
  ];
  return rgbArray;
}

export function generateRandomId(length: number = 5) {
  return Array.from({ length }, () =>
    Math.floor(Math.random() * 16).toString(16),
  ).join("");
}
