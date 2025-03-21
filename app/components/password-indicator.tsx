import { ZXCVBNResult } from "zxcvbn";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "~/components/ui/tooltip";

import { SquareAsterisk } from "lucide-react";

interface PasswordIndicatorProps {
	passwordStrength?: ZXCVBNResult;
}

const scoreToColor = [
	"bg-red-500",
	"bg-red-500",
	"bg-orange-500",
	"bg-yellow-500",
	"bg-green-500",
];

export function PasswordIndicator({
	passwordStrength,
}: PasswordIndicatorProps) {
	const score = passwordStrength ? passwordStrength.score : -1;

	const segments = [];
	for (let i = 0; i < scoreToColor.length; i++) {
		segments.push(
			<div
				key={i}
				className={`flex-1 h-2 ${score < i ? "bg-slate-400" : scoreToColor[score]} rounded-lg`}
			></div>,
		);
	}

	const hasTips =
		score >= 0 &&
		(passwordStrength?.feedback?.warning !== "" ||
			passwordStrength?.feedback?.suggestions.length > 0);

	return (
		<TooltipProvider delayDuration={0}>
			<div className="flex items-center h-8 gap-1">
				{segments}
				<div className="flex-1 flex justify-end">
					{hasTips ? (
						<Tooltip>
							<TooltipTrigger disabled={!hasTips}>
								<SquareAsterisk />
							</TooltipTrigger>
							<TooltipContent side="right" className="max-w-64">
								<b>Tips to improve your password:</b>
								<br />
								<p>
									{passwordStrength?.feedback?.warning &&
										passwordStrength?.feedback?.warning +
											"."}
								</p>
								<p>
									{passwordStrength?.feedback?.suggestions.join(
										" ",
									)}
								</p>
							</TooltipContent>
						</Tooltip>
					) : (
						<SquareAsterisk className="text-slate-300" />
					)}
				</div>
			</div>
		</TooltipProvider>
	);
}
