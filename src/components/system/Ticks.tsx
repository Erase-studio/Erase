/**
 * Registration marks, the way a printer leaves them on a proof.
 *
 * Six pencil ticks on one fixed line across the middle of the screen, edge to
 * edge. They never move and they never react — which is the point: everything
 * else on the page slides past a rule that doesn't. It is the cheapest way to
 * make a screen read as composed rather than merely laid out.
 */
export function Ticks() {
  return (
    <div className="ticks" aria-hidden="true">
      {Array.from({ length: 6 }, (_, i) => (
        <i key={i} className="ticks__t" />
      ))}
    </div>
  );
}
