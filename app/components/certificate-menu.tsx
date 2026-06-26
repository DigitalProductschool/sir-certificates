import type { Certificate } from "~/generated/prisma/client";

import { Link } from "react-router";
import {
	BadgeCheck,
	ChevronDown,
	ExternalLink,
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
	return (
		<DropdownMenu modal={false}>
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
					<DropdownMenuItem>
						<AsyncAction
							action={`/org/program/${programId}/batch/${certificate.batchId}/certificates/${certificate.id}/refresh`}
						>
							<button
								type="submit"
								className="flex items-center gap-2"
							>
								<RefreshCw className="size-4" /> Refresh
							</button>
						</AsyncAction>
					</DropdownMenuItem>
				</DropdownMenuGroup>

				<DropdownMenuSeparator />

				<DropdownMenuGroup>
					{!certificate.publishedAt && (
						<DropdownMenuItem>
							<AsyncAction
								action={`/org/program/${programId}/batch/${certificate.batchId}/certificates/${certificate.id}/publish`}
							>
								<button
									type="submit"
									className="flex items-center gap-2"
								>
									<BadgeCheck className="size-4" /> Publish
								</button>
							</AsyncAction>
						</DropdownMenuItem>
					)}

					<DropdownMenuItem>
						<AsyncAction
							action={`/cert/${certificate.uuid}/notify`}
						>
							<button
								type="submit"
								className="flex items-center gap-2"
							>
								<SendIcon className="size-4" />{" "}
								{certificate.notifiedAt ? "Resend" : "Send"}
							</button>
						</AsyncAction>
					</DropdownMenuItem>
				</DropdownMenuGroup>

				<DropdownMenuSeparator />

				<DropdownMenuGroup>
					<DropdownMenuItem variant="destructive">
						<AsyncAction
							action={`/org/program/${programId}/batch/${certificate.batchId}/certificates/${certificate.id}/delete`}
						>
							<button
								type="submit"
								className="flex items-center gap-2"
							>
								<Trash2Icon className="size-4" /> Delete
							</button>
						</AsyncAction>
					</DropdownMenuItem>
				</DropdownMenuGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
