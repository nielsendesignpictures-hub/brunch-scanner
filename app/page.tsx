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
        error: 'Noget gik galt',
      })
    }

    setLoading(false)
  }

  return (
    <main className="min-h-screen bg-black text-white p-6">
      <h1 className="text-5xl font-bold mb-10">
        Brunch Scanner
      </h1>

      <div className="bg-zinc-900 p-6 rounded-3xl">
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => {
            setFiles(e.target.files)
          }}
          className="mb-6"
        />

        {files && (
          <p className="mb-4 text-zinc-400">
            {files.length} billeder valgt
          </p>
        )}

        <button
          onClick={upload}
          className="bg-white text-black px-6 py-4 rounded-2xl w-full text-xl font-semibold"
        >
          Upload billeder
        </button>
      </div>

      {loading && (
        <div className="mt-8">
          <p className="text-xl">
            Scanner billeder...
          </p>
        </div>
      )}

      {result && (
<div className="mt-10">
  <pre className="bg-zinc-900 p-4 rounded-2xl overflow-auto">
    {JSON.stringify(result, null, 2)}
  </pre>
</div>
      )}
    </main>
  )
}
