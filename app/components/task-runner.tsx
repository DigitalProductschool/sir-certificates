/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from "react";
import { Play, Pause, ListRestart } from "lucide-react";
import { Button } from "~/components/ui/button";

import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogFooter,
	DialogTitle,
} from "~/components/ui/dialog";

type TaskRunnerProps = {
	items: Array<unknown>;
	itemLabel: string;
	startLabel?: string;
	pauseLabel?: string;
	confirmTitle: string;
	confirmDescription: string;
	onRunTask: (item: any, index: number) => Promise<unknown>;
	onFinish?: () => void;
	onReset?: () => void;
	onError?: (error: Error) => void;
	//tooltip?: unknown;
	parallel?: number;
};

export function TaskRunner({
	items,
	itemLabel,
	startLabel,
	pauseLabel,
	confirmTitle,
	confirmDescription,
	onRunTask,
	onFinish = () => {},
	onReset = () => {},
	onError = () => {},
	//tooltip = null,
	parallel = 4,
}: TaskRunnerProps) {
	const [current, setCurrent] = useState(0);
	const [done, setDone] = useState(0);
	const [pending, setPending] = useState(0);
	const [isRunning, setIsRunning] = useState(false);
	const [confirmOpen, setConfirmOpen] = useState(false);

	const onPlayPause = () => {
		if (!isRunning) {
			setConfirmOpen(true);
		} else {
			setIsRunning(false);
		}
	};

	const onConfirmPlay = () => {
		setConfirmOpen(false);
		setIsRunning(true);
	};

	const handleReset = () => {
		setIsRunning(false);
		setCurrent(0);
		setDone(0);
		setPending(0);
		if (onReset) onReset();
	};

	useEffect(() => {
		if (isRunning && current < items.length && pending < parallel) {
			onRunTask(items[current], current)
				.then(() => {
					setPending((pending) => (pending > 0 ? pending - 1 : 0));
					setDone((done) => done + 1);
				})
				.catch((error: Error) => {
					setIsRunning(false);
					if (onError) {
						onError(error);
					} else {
						console.error(error);
					}
				});

			setPending((pending) => pending + 1);
			setCurrent((current) => current + 1);
		}

		if (done === items.length) {
			setIsRunning(false);
			if (onFinish) onFinish();
		}
	}, [
		isRunning,
		onRunTask,
		current,
		items,
		pending,
		parallel,
		done,
		onError,
		onFinish,
	]);

	return (
		<div className="flex gap-2 items-center">
			<Button
				onClick={onPlayPause}
				disabled={items.length === 0 || done === items.length}
			>
				{isRunning ? (
					<>
						<Pause className="mr-2 h-4 w-4" />
						{pauseLabel ?? "Pause"}
					</>
				) : (
					<>
						<Play className="mr-2 h-4 w-4" />
						{startLabel ?? "Start"}
					</>
				)}
			</Button>
			<Button onClick={handleReset} variant="outline">
				<ListRestart className="mr-2 h-4 w-4" /> Reset
			</Button>
			<div className="grow"></div>
			<div className="text-sm">
				{items && `${done} of ${items.length} ${itemLabel} done`}{" "}
			</div>

			<Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>{confirmTitle}</DialogTitle>
						<DialogDescription>
							{confirmDescription}
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button onClick={onConfirmPlay}>
							Import Participants
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
