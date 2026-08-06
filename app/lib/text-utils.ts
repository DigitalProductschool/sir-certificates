import { Parser as HtmlParser } from "htmlparser2";

// List of self-closing tags, used to filter validation issues and improve HTML pretty formatting
export const SELF_CLOSING = new Set([
	"area",
	"base",
	"br",
	"col",
	"embed",
	"hr",
	"img",
	"input",
	"link",
	"meta",
	"param",
	"source",
	"track",
	"wbr",
]);

export function prettyPrintHtml(html: string): string {
	const tokens = html
		.trim()
		.replace(/>\s+</g, "><")
		.split(/(<[^>]+>)/)
		.filter((token) => token.trim() !== "");

	let depth = 0;
	const lines: string[] = [];

	for (const token of tokens) {
		const isClosingTag = /^<\/\w/.test(token);
		const isOpeningTag = /^<\w/.test(token) && !isClosingTag;
		const tagName = token.match(/^<\/?(\w+)/)?.[1]?.toLowerCase();
		const isSelfClosing =
			isOpeningTag &&
			(/\/>$/.test(token) ||
				(tagName !== undefined && SELF_CLOSING.has(tagName)));

		if (isClosingTag) depth = Math.max(0, depth - 1);

		lines.push("  ".repeat(depth) + token.trim());

		if (isOpeningTag && !isSelfClosing) depth += 1;
	}

	return lines.join("\n");
}

// Check if HTML is well-formed and has matching open/close tags.
export function checkWellFormedHtml(html: string): string[] {
	const errors: string[] = [];
	const parser = new HtmlParser({
		onopentag(name, _attribs, isImplied) {
			if (isImplied) {
				errors.push(
					`A misplaced or unexpected closing tag required inserting a missing \`<${name}>\` opening tag`,
				);
			}
		},
		onclosetag(name, isImplied) {
			if (isImplied && !SELF_CLOSING.has(name)) {
				errors.push(`\`<${name}>\` is never closed`);
			}
		},
	});
	parser.end(html);
	return errors;
}
