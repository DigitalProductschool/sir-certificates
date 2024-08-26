export function Layout({ children }: { children: React.ReactNode }) {
	return (
		<div className="h-screen w-full flex flex-col items-center justify-center px-4">
			{children}
		</div>
	);
}
