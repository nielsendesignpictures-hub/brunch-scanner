'use client'

import { useState } from 'react'

export default function Home() {
  const [file, setFile] = useState<File | null>(null)
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
    <main className="min-h-screen p-10">
      <h1 className="text-3xl font-bold mb-6">
        Brunch Scanner
      </h1>

      <input
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(e) => {
          if (e.target.files?.[0]) {
            setFile(e.target.files[0])
          }
        }}
      />

      <button
        onClick={upload}
        className="bg-black text-white px-4 py-2 rounded mt-4"
      >
        Upload
      </button>

      {loading && <p className="mt-4">Analyserer...</p>}

      {result && (
        <pre className="mt-6 bg-gray-100 p-4 rounded">
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </main>
  )
}