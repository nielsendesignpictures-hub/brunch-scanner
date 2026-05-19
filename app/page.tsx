'use client'

import { useState } from 'react'

export default function Home() {
  const [file, setFile] = useState<File | null>(null)
  const [result, setResult] = useState<any>(null)

  const upload = async () => {
    if (!file) return

    const formData = new FormData()
    formData.append('images', file)

    const res = await fetch('/api/analyze', {
      method: 'POST',
      body: formData,
    })

    const data = await res.json()

    setResult(data)
  }

  return (
    <main className="min-h-screen bg-black text-white p-6">
      <h1 className="text-5xl font-bold mb-10">
        Brunch Scanner
      </h1>

      <input
        type="file"
        onChange={(e) => {
          if (e.target.files?.[0]) {
            setFile(e.target.files[0])
          }
        }}
      />

      <button
        onClick={upload}
        className="bg-green-500 text-black px-6 py-4 rounded-xl mt-6"
      >
        Start scanning
      </button>

      {result && (
        <pre className="mt-10">
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </main>
  )
}
