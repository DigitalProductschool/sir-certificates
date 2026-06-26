import type { Certificate } from "~/generated/prisma/client";

import { useState } from "react";
import { Link } from "react-router";
import {
	BadgeCheck,
	ChevronDown,
	ExternalLink,
	Loader2,
	RefreshCw,
	SendIcon,
	Settings,
	Trash2Icon,
} from "lucide-react";
import { Button } from "./ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { AsyncAction } from "./async-action";

export function CertificateMenu({
	certificate,
	programId,
	view,
}: {
	certificate: Certificate;
	programId: string;
	view: "table" | "grid";
}) {
	const [open, setOpen] = useState(false);

	return (
		<DropdownMenu modal={false} open={open} onOpenChange={setOpen}>
			<DropdownMenuTrigger asChild>
				<Button variant="ghost" size="icon-sm" className="w-8">
					<ChevronDown />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end">
				<DropdownMenuGroup>
					<DropdownMenuItem asChild>
						<Link
							to={`/view/${certificate.uuid}`}
							className="flex items-center gap-2"
							aria-label="Preview public page"
						>
							<ExternalLink className="size-4" /> Preview
						</Link>
					</DropdownMenuItem>
				</DropdownMenuGroup>

				<DropdownMenuSeparator />

				<DropdownMenuGroup>
					<DropdownMenuItem asChild>
						<Link
							className="flex items-center gap-2"
							to={`/org/program/${programId}/batch/${certificate.batchId}/certificates/${certificate.id}/edit`}
							state={{ view }}
							aria-label="Edit certificate"
							preventScrollReset
						>
							<Settings className="size-4" />
							Edit
						</Link>
					</DropdownMenuItem>
					<DropdownMenuItem onSelect={(e) => e.preventDefault()}>
						<AsyncAction
							action={`/org/program/${programId}/batch/${certificate.batchId}/certificates/${certificate.id}/refresh`}
							onSuccess={() => setOpen(false)}
						>
							{(isPending) => (
								<button
									type="submit"
									disabled={isPending}
									className="flex items-center gap-2"
								>
									{isPending ? (
										<Loader2 className="size-4 animate-spin" />
									) : (
										<RefreshCw className="size-4" />
									)}
									Refresh
								</button>
							)}
						</AsyncAction>
					</DropdownMenuItem>
				</DropdownMenuGroup>

				<DropdownMenuSeparator />

				<DropdownMenuGroup>
					{!certificate.publishedAt && (
						<DropdownMenuItem onSelect={(e) => e.preventDefault()}>
							<AsyncAction
								action={`/org/program/${programId}/batch/${certificate.batchId}/certificates/${certificate.id}/publish`}
								onSuccess={() => setOpen(false)}
							>
								{(isPending) => (
									<button
										type="submit"
										disabled={isPending}
										className="flex items-center gap-2"
									>
										{isPending ? (
											<Loader2 className="size-4 animate-spin" />
										) : (
											<BadgeCheck className="size-4" />
										)}
										Publish
									</button>
								)}
							</AsyncAction>
						</DropdownMenuItem>
					)}

					<DropdownMenuItem onSelect={(e) => e.preventDefault()}>
						<AsyncAction
							action={`/cert/${certificate.uuid}/notify`}
							onSuccess={() => setOpen(false)}
						>
							{(isPending) => (
								<button
									type="submit"
									disabled={isPending}
									className="flex items-center gap-2"
								>
									{isPending ? (
										<Loader2 className="size-4 animate-spin" />
									) : (
										<SendIcon className="size-4" />
									)}
									{certificate.notifiedAt ? "Resend" : "Send"}
								</button>
							)}
						</AsyncAction>
					</DropdownMenuItem>
				</DropdownMenuGroup>

				<DropdownMenuSeparator />

				<DropdownMenuGroup>
					<DropdownMenuItem
						variant="destructive"
						onSelect={(e) => e.preventDefault()}
					>
						<AsyncAction
							action={`/org/program/${programId}/batch/${certificate.batchId}/certificates/${certificate.id}/delete`}
						>
							{(isPending) => (
								<button
									type="submit"
									disabled={isPending}
									className="flex items-center gap-2"
								>
									{isPending ? (
										<Loader2 className="size-4 animate-spin" />
									) : (
										<Trash2Icon className="size-4" />
									)}
									Delete
								</button>
							)}
						</AsyncAction>
					</DropdownMenuItem>
				</DropdownMenuGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
