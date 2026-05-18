<div className="bg-zinc-900 rounded-3xl p-6">

  {/* KAMERA */}
  <label className="block mb-4">
    <span className="bg-white text-black rounded-2xl px-6 py-5 text-xl font-semibold block text-center">
      📸 Tag billede
    </span>

    <input
      type="file"
      accept="image/*"
      capture="environment"
      className="hidden"
      onChange={(e) => {
        setFiles(e.target.files)
      }}
    />
  </label>

  {/* MULTIPLE */}
  <label className="block">
    <span className="bg-zinc-800 border border-zinc-700 rounded-2xl px-6 py-5 text-xl font-semibold block text-center">
      🖼️ Vælg flere billeder
    </span>

    <input
      type="file"
      accept="image/*"
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
