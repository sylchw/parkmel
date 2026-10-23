import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <h1 className="text-4xl font-bold text-primary-600">ParkMel</h1>
      <p className="mt-4 max-w-md text-center text-lg">
        Find free parking in Melbourne&apos;s target suburbs. Community-verified
        parking rules and restrictions.
      </p>
      <div className="mt-8 flex gap-4">
        <Link
          href="/search"
          className="rounded-lg bg-primary-600 px-6 py-3 text-white hover:bg-primary-700"
        >
          Search for Parking
        </Link>
        <Link
          href="/about"
          className="rounded-lg border border-primary-600 px-6 py-3 text-primary-600 hover:bg-primary-50"
        >
          Learn More
        </Link>
      </div>
    </main>
  );
}