import { type ReactNode } from "react";
import { Label } from "~/components/ui/label";
import { Input } from "~/components/ui/input";

interface FormFieldProps extends React.ComponentProps<"input"> {
	label: string;
	error?: string;
	hint?: ReactNode;
}

export function FormField({
	id,
	label,
	error = "",
	hint,
	...props
}: FormFieldProps) {
	return (
		<div className="grid gap-2">
			<div className="flex items-center">
				<Label htmlFor={id}>{label}</Label>
				{hint}
			</div>

			<div className="grid gap-1">
				<Input id={id} {...props} />
				{error !== "" && (
					<div className="text-xs font-semibold text-red-500 w-full">
						{error}
					</div>
				)}
			</div>
		</div>
	);
}
