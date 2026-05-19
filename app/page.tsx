 'use client'

import { useState } from 'react'

export default function Home() {

  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)

  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const upload = async () => {

    if (!file) return

    setLoading(true)

    const formData = new FormData()

    formData.append('image', file)

    const res = await fetch('/api/analyze', {
      method: 'POST',
      body: formData,
    })

    const data = await res.json()

    setResult(data)

    setLoading(false)
  }

  return (
    <main className="min-h-screen bg-black text-white p-6">

      <div className="max-w-md mx-auto">

        <h1 className="text-4xl font-bold mb-8">
          Brunch Scanner
        </h1>

        {/* FRAME */}
        <div className="relative w-full aspect-[3/4] border-4 border-green-500 rounded-3xl overflow-hidden bg-zinc-900">

          {preview ? (

            <img
              src={preview}
              alt="preview"
              className="absolute inset-0 w-full h-full object-cover"
            />

          ) : (

            <div className="absolute inset-0 flex items-center justify-center text-zinc-500">
              Intet billede valgt
            </div>

          )}

          <div className="absolute inset-0 border-[40px] border-black/40 rounded-3xl pointer-events-none" />

        </div>

        <label className="block mt-6">

          <span className="bg-white text-black rounded-2xl py-5 text-xl font-bold text-center block">
            📸 Tag billede
          </span>

          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {

              const selectedFile =
                e.target.files?.[0]

              if (!selectedFile) return

              setFile(selectedFile)

              const imageUrl =
                URL.createObjectURL(selectedFile)

              setPreview(imageUrl)

            }}
          />

        </label>

        <button
          onClick={upload}
          disabled={!file || loading}
          className="w-full mt-4 bg-green-500 text-black rounded-2xl py-5 text-xl font-bold disabled:opacity-40"
        >
          {loading
            ? 'Scanner...'
            : 'Start scanning'}
        </button>

        {result?.image && (

          <img
            src={result.image}
            alt="debug"
            className="w-full rounded-2xl mt-6"
          />

        )}

        {result?.totals && (

          <div className="mt-8 space-y-3">

            {Object.entries(result.totals)
              .filter(([_, count]) => Number(count) > 0)
              .map(([name, count]) => (

                <div
                  key={name}
                  className="bg-zinc-900 rounded-2xl p-4 flex justify-between"
                >
                  <span>{name}</span>

                  <span className="font-bold">
                    {count as number}
                  </span>
                </div>

              ))}

          </div>

        )}

      </div>

    </main>
  )
}
