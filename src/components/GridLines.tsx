/** Fixed editorial hairline columns — pure decoration */
export default function GridLines() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 hidden md:block">
      <div className="mx-auto flex h-full max-w-6xl justify-between px-6">
        {Array.from({ length: 5 }, (_, i) => (
          <span key={i} className="h-full w-px bg-line/60" />
        ))}
      </div>
    </div>
  );
}
