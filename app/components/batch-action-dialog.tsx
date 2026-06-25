import { useEffect, useRef, useState } from "react";
import { useFetcher } from "react-router";

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
  publishedAt: string | null;
  notifiedAt: string | null;
};

type BatchActionDialogProps = {
  programId: string;
  batchId: string;
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
  programId,
  batchId,
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
  const fetcher = useFetcher();
  const { toast } = useToast();

  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const isRunningRef = useRef(false);
  const cursorRef = useRef(0);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (open) {
      fetcher.load(`/org/program/${programId}/batch/${batchId}/certificates`);
      setDone(0);
      setIsComplete(false);
      setIsRunning(false);
      isRunningRef.current = false;
      cursorRef.current = 0;
    } else {
      isRunningRef.current = false;
    }
  }, [open]);

  const certs: Cert[] = (fetcher.data as { certificates?: Cert[] })?.certificates ?? [];
  const pending = certs.filter(filterFn);
  const initialDone = certs.length - pending.length;
  const totalDone = initialDone + done;
  const progress = certs.length > 0 ? (totalDone / certs.length) * 100 : 0;
  const allDone = certs.length > 0 && pending.length === 0;

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
    }
  };

  const handlePause = () => {
    isRunningRef.current = false;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">{triggerLabel}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2 min-h-10 justify-center">
          {fetcher.state === "loading" ? (
            <p className="text-sm text-muted-foreground">Loading certificates…</p>
          ) : certs.length > 0 ? (
            <>
              <Progress value={progress} />
              <p className="text-sm text-muted-foreground">
                {allDone
                  ? allDoneMessage
                  : `${totalDone} of ${certs.length} ${progressLabel}`}
              </p>
            </>
          ) : null}
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
            <Button
              onClick={handleStart}
              disabled={fetcher.state === "loading" || pending.length === 0}
            >
              {done > 0 ? "Resume" : actionLabel}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
