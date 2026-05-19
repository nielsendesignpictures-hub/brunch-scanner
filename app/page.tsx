"use client";

import { useState } from "react";

export default function Home() {
  const [count, setCount] = useState<number | null>(null);
  const [preview, setPreview] = useState<string>("");

  const handleImage = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    setPreview(url);

    const img = new Image();
    img.src = url;

    img.onload = async () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      canvas.width = img.width;
      canvas.height = img.height;

      ctx?.drawImage(img, 0, 0);

      const imageData = ctx?.getImageData(
        0,
        0,
        canvas.width,
        canvas.height
      );

      if (!imageData) return;

      let bluePixels = 0;

      for (let i = 0; i < imageData.data.length; i += 4) {
        const r = imageData.data[i];
        const g = imageData.data[i + 1];
        const b = imageData.data[i + 2];

        // Finder blå kuglepen/farve
        if (b > 100 && b > r + 20 && b > g + 20) {
          bluePixels++;
        }
      }

      // grov estimering
      const estimatedChecks = Math.round(bluePixels / 1200);

      setCount(estimatedChecks);
    };
  };

  return (
    <main
      style={{
        padding: 20,
        color: "white",
        background: "black",
        minHeight: "100vh",
      }}
    >
      <h1>Brunch Scanner</h1>

      <input type="file" accept="image/*" onChange={handleImage} />

      {preview && (
        <img
          src={preview}
          style={{
            width: "100%",
            marginTop: 20,
            borderRadius: 10,
          }}
        />
      )}

      {count !== null && (
        <h2 style={{ marginTop: 20 }}>
          Valgte elementer: {count}
        </h2>
      )}
    </main>
  );
}
