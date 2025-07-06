import clsx from "clsx";
import { getImageData, useS3Upload } from "next-s3-upload";
import { useRef, useState, useTransition } from "react";
import Spinner from "./Spinner";

export function ImageUploader({
  onUpload,
}: {
  onUpload: ({
    url,
    width,
    height,
  }: {
    url: string;
    width: number;
    height: number;
  }) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const { uploadToS3 } = useS3Upload();
  const [pending, startTransition] = useTransition();

  async function handleUpload(file: File) {
    startTransition(async () => {
      const [result, data] = await Promise.all([
        uploadToS3(file),
        getImageData(file),
      ]);

      console.log(result.url);
      console.log(data);

      onUpload({
        url: result.url,
        width: data.width ?? 1024,
        height: data.height ?? 768,
      });
    });
  }

  return (
    <button
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        const data = e.dataTransfer;
        const file = data?.files?.[0];
        if (file) {
          handleUpload(file);
        }
      }}
      onDragEnter={() => setIsDragging(true)}
      onDragLeave={() => {
        setIsDragging(false);
      }}
      onClick={() => {
        fileInputRef.current?.click();
      }}
      className={clsx(
        isDragging && "text-gray-400",
        !isDragging && !pending && "text-gray-700 hover:text-gray-400",
        "relative flex aspect-[4/3] w-full cursor-pointer flex-col items-center justify-center rounded-xl bg-gray-900 focus-visible:text-gray-400 focus-visible:outline-none",
      )}
    >
      <svg
        className={clsx("absolute inset-0 transition-colors")}
        viewBox="0 0 400 300"
      >
        <rect
          x=".5"
          y=".5"
          width="399"
          height="299"
          rx="6"
          ry="6"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
          strokeDasharray="8,10"
        />
      </svg>

      {!pending ? (
        <>
          <div className="flex grow flex-col justify-center">
            <p className="text-xl text-white">Drop a photo</p>
            <p className="mt-1 text-gray-500">or click to upload</p>
          </div>

          <div className="pb-3">
            <p className="text-sm text-gray-500">
              Powered by <span className="text-white">Together.ai</span>
            </p>
          </div>
        </>
      ) : (
        <div className="text-white">
          <Spinner />
          <p className="mt-2 text-lg">Uploading...</p>
        </div>
      )}

      <input
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            handleUpload(file);
          }
        }}
        ref={fileInputRef}
      />
    </button>
  );
}
