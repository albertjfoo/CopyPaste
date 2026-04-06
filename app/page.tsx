import Link from 'next/link'

export default function LandingPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8 bg-orange-50">
      <div className="max-w-sm w-full flex flex-col items-center gap-8">

        {/* Hero */}
        <div className="text-center">
          <div className="text-7xl mb-4">📸</div>
          <h1 className="text-5xl font-black text-orange-600 tracking-tight leading-tight">
            Film it.<br />Print it.
          </h1>
          <p className="mt-4 text-2xl text-gray-600 leading-relaxed">
            Point your camera at <strong>any object</strong> and get an exact 3D printed copy delivered to your door.
          </p>
        </div>

        {/* How it works */}
        <div className="w-full space-y-3 text-lg text-gray-700">
          <div className="flex items-center gap-4 bg-white rounded-2xl p-4 shadow-sm">
            <span className="text-3xl">📹</span>
            <div>
              <p className="font-bold">Film your object</p>
              <p className="text-gray-400 text-base">Walk slowly around it — 15 seconds is enough</p>
            </div>
          </div>
          <div className="flex items-center gap-4 bg-white rounded-2xl p-4 shadow-sm">
            <span className="text-3xl">🤖</span>
            <div>
              <p className="font-bold">We build the 3D copy</p>
              <p className="text-gray-400 text-base">AI recreates it in full 3D — takes about 2 minutes</p>
            </div>
          </div>
          <div className="flex items-center gap-4 bg-white rounded-2xl p-4 shadow-sm">
            <span className="text-3xl">📦</span>
            <div>
              <p className="font-bold">Pick a material &amp; ship it</p>
              <p className="text-gray-400 text-base">Choose from plastic, wood, metal and more</p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <Link href="/record" className="w-full">
          <button className="w-full bg-orange-500 hover:bg-orange-600 active:scale-95 transition-all text-white text-4xl font-black py-8 rounded-3xl shadow-xl">
            Make a Copy →
          </button>
        </Link>

        <p className="text-sm text-gray-400 text-center">
          Works best in good light with the object on a plain surface
        </p>
      </div>
    </main>
  )
}
