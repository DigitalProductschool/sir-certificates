export function H1({ children }: { children: React.ReactNode }) {
	return (
		<h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">
			{children}
		</h1>
	);
}

export function H2({ children }: { children: React.ReactNode }) {
	return (
		<h2 className="scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight first:mt-0">
			{children}
		</h2>
	);
}

export function H3({ children }: { children: React.ReactNode }) {
	return (
		<h3 className="scroll-m-20 text-2xl font-semibold tracking-tight">
			{children}
		</h3>
	);
}

/* 
	Better interface for extending classNames, but with TypeScipt errors.
	@todo talk to Nebo


import * as React from "react";
import { cn } from "~/lib/utils";

const H1 = React.forwardRef<
	HTMLHeadingElement,
	React.ComponentPropsWithoutRef<"h2">
>(({ className, ...props }, ref) => (
	<h2
		ref={ref}
		className={cn(
			"scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl",
			className,
		)}
		{...props}
	/>
));
H1.displayName = "H1";

const H2 = React.forwardRef<
	HTMLHeadingElement,
	React.ComponentPropsWithoutRef<"h2">
>(({ className, ...props }, ref) => (
	<h2
		ref={ref}
		className={cn(
			"scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight first:mt-0",
			className,
		)}
		{...props}
	/>
));
H2.displayName = "H2";

const H3 = React.forwardRef<
	HTMLHeadingElement,
	React.ComponentPropsWithoutRef<"h2">
>(({ className, ...props }, ref) => (
	<h2
		ref={ref}
		className={cn(
			"scroll-m-20 text-2xl font-semibold tracking-tight",
			className,
		)}
		{...props}
	/>
));
H3.displayName = "H3";

export { H1, H2, H3 };

*/
