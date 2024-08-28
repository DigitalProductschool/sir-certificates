export function Layout({
	children,
	type = "full",
}: {
	children: React.ReactNode;
	type: string;
}) {
	switch (type) {
		case "modal":
			return (
				<div className="h-screen w-full flex flex-col items-center justify-center px-4">
					{children}
				</div>
			);
		case "full":
		default:
			return (
				<div className="flex min-h-screen w-full flex-col bg-muted/40">
					{children}
				</div>
			);
	}
}
