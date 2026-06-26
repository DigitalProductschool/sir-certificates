import { useRef, useState } from "react";
import { useRevalidator } from "react-router";

import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Progress } from "~/components/ui/progress";
import { useToast } from "~/hooks/use-toast";

type Cert = {
  id: number;
  uuid: string;
  publishedAt: Date | null;
  notifiedAt: Date | null;
};

type BatchActionDialogProps = {
  certificates: Cert[];
  triggerIcon?: React.ReactNode;
  triggerLabel: string;
  title: string;
  description: string;
  actionLabel: string;
  progressLabel: string;
  allDoneMessage: string;
  toastTitle: string;
  filterFn: (cert: Cert) => boolean;
  getEndpoint: (cert: Cert) => string;
};

export function BatchActionDialog({
  certificates,
  triggerIcon,
  triggerLabel,
  title,
  description,
  actionLabel,
  progressLabel,
  allDoneMessage,
  toastTitle,
  filterFn,
  getEndpoint,
}: BatchActionDialogProps) {
  const { toast } = useToast();
  const revalidator = useRevalidator();

  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const isRunningRef = useRef(false);
  const cursorRef = useRef(0);

  const handleOpenChange = (willBeOpen: boolean) => {
    if (willBeOpen) {
      setDone(0);
      setIsComplete(false);
      setIsRunning(false);
      isRunningRef.current = false;
      cursorRef.current = 0;
    } else {
      isRunningRef.current = false;
      revalidator.revalidate();
    }
    setOpen(willBeOpen);
  };

  const pending = certificates.filter(filterFn);
  const initialDone = certificates.length - pending.length;
  const totalDone = initialDone + done;
  const progress =
    certificates.length > 0 ? (totalDone / certificates.length) * 100 : 0;
  const allDone = certificates.length > 0 && pending.length === 0;

  const handleStart = async () => {
    if (isRunningRef.current || pending.length === 0) return;
    
    setIsRunning(true);
    isRunningRef.current = true;

    const workers = Array.from(
      { length: Math.min(4, pending.length - cursorRef.current) },
      async () => {
        while (isRunningRef.current) {
          const index = cursorRef.current++;
          if (index >= pending.length) return;
          try {
            const res = await fetch(getEndpoint(pending[index]), {
              method: "POST",
              credentials: "same-origin",
            });
            if (res.ok) setDone((d) => d + 1);
          } catch {
            // skip failed items
          }
        }
      },
    );

    await Promise.all(workers);

    setIsRunning(false);
    isRunningRef.current = false;

    if (cursorRef.current >= pending.length) {
      setIsComplete(true);
      toast({ title: toastTitle });
      revalidator.revalidate();
    }
  };

  const handlePause = () => {
    isRunningRef.current = false;
    revalidator.revalidate();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline">
          {triggerIcon}
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2 min-h-10 justify-center">
          {certificates.length > 0 && (
            <>
              <Progress value={progress} />
              <p className="text-sm text-muted-foreground">
                {allDone
                  ? allDoneMessage
                  : `${totalDone} of ${certificates.length} ${progressLabel}`}
              </p>
            </>
          )}
        </div>

        <DialogFooter>
          {isComplete || allDone ? (
            <DialogClose asChild>
              <Button>Done</Button>
            </DialogClose>
          ) : isRunning ? (
            <Button variant="outline" onClick={handlePause}>
              Pause
            </Button>
          ) : (
            <Button onClick={handleStart} disabled={pending.length === 0}>
              {done > 0 ? "Resume" : actionLabel}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
