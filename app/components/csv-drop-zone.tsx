/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { useCSVReader } from "react-papaparse";

import { Import } from "lucide-react";
import { Button } from "~/components/ui/button";

export function CSVDropZone({ onData }: { onData: any }) {
  const { CSVReader } = useCSVReader();
  const [zoneHover, setZoneHover] = useState(false);

  // @todo investigate if the onClick from getRemoveFileProps can be propagated upwards to reset the import table

  return (
    <CSVReader
      config={{
        header: true,
      }}
      onUploadAccepted={(results: any) => {
        // @todo lower-case (or normalize) column headers (property names)
        onData(results.data);
        setZoneHover(false);
      }}
      onDragOver={(event: DragEvent) => {
        event.preventDefault();
        setZoneHover(true);
      }}
      onDragLeave={(event: DragEvent) => {
        event.preventDefault();
        setZoneHover(false);
      }}
    >
      {({ getRootProps, acceptedFile, getRemoveFileProps }: any) => (
        <div
          {...getRootProps()}
          className={`flex border ${zoneHover ? "border-black border-double" : "border-dashed"} p-8 gap-2 rounded-lg bg-card text-card-foreground items-center justify-center`}
        >
          {acceptedFile ? (
            <>
              {acceptedFile.name}{" "}
              <Button {...getRemoveFileProps()} size="sm" variant="outline">
                Remove
              </Button>
            </>
          ) : (
            <>
              <Import /> Drag and drop a CSV file here or click to select
            </>
          )}
        </div>
      )}
    </CSVReader>
  );
}
