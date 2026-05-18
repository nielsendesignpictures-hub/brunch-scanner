'use client'

import { useState } from 'react'

export default function Home() {
  const [files, setFiles] = useState<FileList | null>(null)
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const upload = async () => {
    if (!files) return

    setLoading(true)

    const formData = new FormData()

    Array.from(files).forEach((file) => {
      formData.append('images', file)
    })

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()

      setResult(data)
    } catch (err) {
      setResult({
        success: false,
        error: 'Noget gik galt',
      })
    }

    setLoading(false)
  }

  return (
    <main className="min-h-screen bg-black text-white p-6">
      <div className="max-w-xl mx-auto">
        <h1 className="text-5xl font-bold mb-10">
          Brunch Scanner
        </h1>

        <div className="bg-zinc-900 rounded-3xl p-6">
          <label className="block">
            <span className="bg-white text-black rounded-2xl px-6 py-5 text-xl font-semibold block text-center">
              📸 Vælg brunchsedler
            </span>

            <input
              type="file"
              accept="image/*"
              multiple
              capture="environment"
              className="hidden"
              onChange={(e) => {
                setFiles(e.target.files)
              }}
            />
          </label>

          <div className="mt-5 text-zinc-400 text-lg">
            {files
              ? `${files.length} billeder valgt`
              : 'Ingen billeder valgt'}
          </div>

          <button
            onClick={upload}
            disabled={!files || loading}
            className="w-full mt-6 bg-green-500 text-black rounded-2xl py-5 text-xl font-bold disabled:opacity-40"
          >
            {loading
              ? 'Scanner sedler...'
              : 'Start scanning'}
          </button>
        </div>

        {result?.success && result?.totals && (
          <div className="mt-10">
            <div className="flex items-center gap-2 mb-6">
              <span className="text-3xl">✅</span>

              <h2 className="text-3xl font-bold">
                Totals
              </h2>
            </div>

            <div className="space-y-3">
              {Object.entries(result.totals)
                .filter(([_, count]) => Number(count) > 0)
                .map(([name, count]) => (
                  <div
                    key={name}
                    className="bg-zinc-900 rounded-2xl p-5 flex justify-between items-center"
                  >
                    <span className="text-lg">
                      {name}
                    </span>

                    <span className="text-2xl font-bold">
                      {count as number}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        )}

        {result?.success === false && (
          <div className="mt-8 bg-red-500/20 border border-red-500 rounded-2xl p-4">
            <p className="font-bold">
              Fejl ved scanning
            </p>

            <p className="text-sm mt-2 break-all">
              {result.error}
            </p>
          </div>
        )}
      </div>
    </main>
  )
}
