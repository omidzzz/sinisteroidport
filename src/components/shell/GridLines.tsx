/** Fixed editorial hairline columns — pure decoration */
export default function GridLines() {
  return (
    // HYPERDRIVE constellation rails — tilted warp lanes instead of
    // editorial columns. Each rail is a rotated hairline with glowing
    // star nodes sitting along it (pure decoration).
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 hidden overflow-hidden md:block"
    >
      <div className="constellation-rails mx-auto h-full max-w-7xl">
        {Array.from({ length: 4 }, (_, i) => (
          <span key={i} className="grid-rail">
            <i className="star-node" />
            <i className="star-node" style={{ top: "38%" }} />
            <i className="star-node" style={{ top: "72%" }} />
          </span>
        ))}
      </div>
    </div>
  );
}
