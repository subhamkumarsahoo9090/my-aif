export default function NotFound() {
  return (
    <main className="flex h-dvh items-center justify-center overflow-hidden bg-white px-4">
      <img
        src="/404.png"
        alt="Oops, page not found."
        className="h-auto max-h-[min(22rem,70vh)] w-auto max-w-[min(22rem,88vw)]"
      />
    </main>
  );
}
