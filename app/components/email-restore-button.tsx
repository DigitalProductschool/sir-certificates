import { useState } from "react";
import { useFetcher } from "react-router";

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";

export function EmailRestoreButton({
  resetAction,
}: {
  resetAction: string;
}) {
  const [confirming, setConfirming] = useState(false);
  const fetcher = useFetcher();

  return (
    <>
      <fetcher.Form
        method="post"
        action={resetAction}
        onSubmit={(event) => {
          event.preventDefault();
          setConfirming(true);
        }}
      >
        <Button type="submit" variant="ghost" size="sm">
          Restore default
        </Button>
      </fetcher.Form>

      <Dialog open={confirming} onOpenChange={setConfirming}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restore default template?</DialogTitle>
            <DialogDescription>
              Your customisation will be permanently deleted and the default
              will be used instead.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              onClick={() => {
                fetcher.submit(null, { method: "post", action: resetAction });
                setConfirming(false);
              }}
            >
              Restore default
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
