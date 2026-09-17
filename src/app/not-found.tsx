import Link from "next/link";

export const metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <main id="main" className="grain frame flex min-h-svh flex-col justify-between py-10">
      <Link href="/" className="nav__mark self-start">
        Erase
      </Link>
      <div className="flex flex-col gap-8">
        <p className="t-label text-smudge">404</p>
        <h1 className="t-display text-[clamp(3.5rem,14vw,14rem)]">
          Already
          <br />
          erased.
        </h1>
        <p className="t-lede max-w-[34ch] text-smudge">
          This page doesn’t exist, or it did and we removed it. The homepage is still here.
        </p>
        <Link href="/" className="btn self-start">
          Back to the homepage <span className="btn-arrow">→</span>
        </Link>
      </div>
      <span />
    </main>
  );
}
