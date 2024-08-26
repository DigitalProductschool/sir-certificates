import { useEffect, useState } from "react";
import { Label } from "~/components/ui/label";
import { Input } from "~/components/ui/input";

interface FormFieldProps {
	htmlFor: string;
	label: string;
	type?: string;
	value: any;
	onChange?: (...args: any) => any;
	error?: string;
	hint?: any;
}

export function FormField({
	htmlFor,
	label,
	type = "text",
	value,
	onChange = () => {},
	error = "",
	hint,
}: FormFieldProps) {
	const [errorText, setErrorText] = useState(error);

	useEffect(() => {
		setErrorText(error);
	}, [error]);

	return (
		<div className="grid gap-2">
			<div className="flex items-center">
				<Label htmlFor={htmlFor}>{label}</Label>
				{hint}
			</div>

			<Input
				onChange={(e) => {
					onChange(e);
					setErrorText("");
				}}
				type={type}
				id={htmlFor}
				name={htmlFor}
				value={value}
			/>
			<div className="text-xs font-semibold text-center tracking-wide text-red-500 w-full">
				{errorText || ""}
			</div>
		</div>
	);
}
