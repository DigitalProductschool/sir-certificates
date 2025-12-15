export function meta() {
  return [
    { title: `Nothing here` },
    {
      name: "description",
      content:
        "Looks like you've been trying to go to a part of this website that doesn't exist.",
    },
  ];
}

export default function NotFound() {
  return (
    <div className="flex flex-col min-h-screen w-full p-16 gap-4">
      <h1 className="text-5xl font-bold">Nothing here.</h1>

      <p className="max-w-[70ch] text-balance">
        It looks like you&apos;ve been trying to go to a part of this website that
        doesn&apos;t exist. If you believe there should be something here, please
        contact support.
      </p>
    </div>
  );
}
