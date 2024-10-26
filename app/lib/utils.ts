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
