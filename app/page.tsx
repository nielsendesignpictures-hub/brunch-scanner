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

  console.log(data)

  setResult(data)
} catch (err) {
  console.error(err)

  setResult({
    error: 'Noget gik galt',
  })
}

setLoading(false)

  return (
    <main className="min-h-screen bg-black text-white p-8">
      <h1 className="text-5xl font-bold mb-10">
        Brunch Scanner
      </h1>

      <input
        type="file"
        accept="image/*"
        multiple
        onChange={(e) => {
          setFiles(e.target.files)
        }}
      />

      <button
        onClick={upload}
        className="bg-white text-black px-6 py-3 rounded-xl mt-6 block"
      >
        Upload billeder
      </button>

      {loading && (
        <p className="mt-6">Analyserer billeder...</p>
      )}

      {result && (
        <pre className="mt-8 bg-zinc-900 p-4 rounded-xl overflow-auto">
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </main>
  )
}
