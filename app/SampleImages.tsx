import Image from "next/image";

const sampleImages = [
  {
    url: "https://napkinsdev.s3.us-east-1.amazonaws.com/next-s3-uploads/39f8ea0e-000f-49bc-9f52-ed1cfb4e4230/free-photo-of-casual-man-working-on-laptop-in-cozy-cafe.jpeg",
    height: 1752,
    width: 986,
  },
  {
    url: "https://napkinsdev.s3.us-east-1.amazonaws.com/next-s3-uploads/4e742e29-ddbc-4493-b2a3-95c15d8d0a2c/image-(6).png",
    height: 1365,
    width: 2048,
  },
  {
    url: "https://napkinsdev.s3.us-east-1.amazonaws.com/next-s3-uploads/8dcc41ed-b7e4-473d-b30f-19c8790a4293/style_transfer_1.png",
    width: 1408,
    height: 792,
  },
];

export function SampleImages({
  onSelect,
}: {
  onSelect: ({
    url,
    width,
    height,
  }: {
    url: string;
    width: number;
    height: number;
  }) => void;
}) {
  return (
    <div className="rounded-xl bg-gray-900 p-4">
      <p className="text-gray-500">
        Nothing to upload?{" "}
        <span className="text-gray-300">Try a sample image:</span>
      </p>
      <div className="mt-3 flex gap-4 overflow-x-auto max-md:-mx-4 max-md:px-4 max-md:pb-4">
        {sampleImages.map((sample) => (
          <button
            key={sample.url}
            className="group relative shrink-0 cursor-pointer overflow-hidden rounded-lg bg-gray-700"
            onClick={() => {
              onSelect({
                url: sample.url,
                width: sample.width,
                height: sample.height,
              });
            }}
          >
            <Image
              src={sample.url}
              width={sample.width}
              height={sample.height}
              alt=""
              className="aspect-[4/3] w-[110px] object-contain"
            />

            <div className="absolute inset-px rounded-lg ring-1 ring-white/5 group-hover:ring-white/15" />
          </button>
        ))}
      </div>
    </div>
  );
}
