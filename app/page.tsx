'use client'

import { useState } from 'react'

export default function Home() {
  const [files, setFiles] = useState<FileList | null>(null)
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const upload = async () => {
    if (!files || files.length === 0) return

    setLoading(true)

    try {
      const formData = new FormData()

      for (let i = 0; i < files.length; i++) {
        formData.append('images', files[i])
      }

      const res = await fetch('/api/analyze', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()

      setResult(data)
    } catch (err) {
      setResult({
        success: false,
        error: String(err),
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
          <label className="block mb-4">
            <span className="bg-white text-black rounded-2xl px-6 py-5 text-xl font-semibold block text-center">
              📸 Tag billede
            </span>

            <input
              type="file"
              className="hidden"
              onChange={(e) => {
                setFiles(e.target.files)
              }}
            />
          </label>

          <label className="block">
            <span className="bg-zinc-800 border border-zinc-700 rounded-2xl px-6 py-5 text-xl font-semibold block text-center">
              🖼️ Vælg flere billeder
            </span>

            <input
              type="file"
              multiple
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

        {result && (
          <div className="mt-8 bg-zinc-900 rounded-2xl p-4 overflow-auto">
            <pre>
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </main>
  )
}
