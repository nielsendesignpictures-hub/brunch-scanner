"use client";

import { useRef, useState } from "react";

const BOXES = [
  { name: "Røræg", x: 0.07, y: 0.20 },
  { name: "Spejlæg", x: 0.07, y: 0.26 },
  { name: "Modnet Havarti ost", x: 0.07, y: 0.32 },
  { name: "Hjemmelavet blåbæryoghurt", x: 0.07, y: 0.39 },
  { name: "Hjemmelavet chiagrød", x: 0.07, y: 0.46 },

  { name: "Avocado og hytteost", x: 0.07, y: 0.60 },
  { name: "Eksotisk frugtskål", x: 0.07, y: 0.66 },
  { name: "Smashed peas med forårsmynte", x: 0.07, y: 0.72 },

  { name: "Pain au chocolat fra Meyers", x: 0.07, y: 0.86 },
  { name: "Øko. smørcroissant fra Meyers", x: 0.07, y: 0.92 },
  { name: "Mariagertoba-toast", x: 0.07, y: 0.97 },

  { name: "Rösti", x: 0.58, y: 0.21 },
  { name: "Hjemmelavet hønsesalat", x: 0.58, y: 0.29 },
  { name: "Crispy chicken", x: 0.58, y: 0.37 },
  { name: "2 brunchpølser", x: 0.58, y: 0.45 },
  { name: "Koldrøget laks", x: 0.58, y: 0.53 },

  { name: "Lun rabarber crumble", x: 0.58, y: 0.70 },
  { name: "Øllebrød med let vaniljeskum", x: 0.58, y: 0.78 },
  { name: "2 amerikanske pandekager", x: 0.58, y: 0.86 },
];

export default function Home() {
  const [results, setResults] = useState<any[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const analyze = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = Array.from(e.target.files || []);

    const allResults = [];

    for (const file of files) {
      const img = new Image();

      const url = URL.createObjectURL(file);

      await new Promise<void>((resolve) => {
        img.onload = () => {
          const canvas = canvasRef.current;

          if (!canvas) return;

          const ctx = canvas.getContext("2d");

          if (!ctx) return;

          canvas.width = 1000;
          canvas.height = 1800;

          ctx.drawImage(img, 0, 0, 1000, 1800);

          const found: string[] = [];

          BOXES.forEach((box) => {
            const x = box.x * canvas.width;
            const y = box.y * canvas.height;

            const data = ctx.getImageData(x, y, 50, 50);

            let blue = 0;

            for (let i = 0; i < data.data.length; i += 4) {
              const r = data.data[i];
              const g = data.data[i + 1];
              const b = data.data[i + 2];

              if (b > 90 && b > r + 20 && b > g + 20) {
                blue++;
              }
            }

            if (blue > 100) {
              found.push(box.name);
            }
          });

          allResults.push({
            file: file.name,
            count: found.length,
            items: found,
          });

          resolve();
        };

        img.src = url;
      });
    }

    setResults(allResults);
  };

  return (
    <main
      style={{
        background: "#000",
        color: "#fff",
        minHeight: "100vh",
        padding: 20,
      }}
    >
      <h1>Brunch Scanner</h1>

      <div
        style={{
          border: "4px solid #00ff88",
          borderRadius: 20,
          padding: 20,
          marginBottom: 20,
        }}
      >
        <p>
          Placér brunchkortet indenfor rammen
        </p>

        <input
          type="file"
          multiple
          accept="image/*"
          capture="environment"
          onChange={analyze}
        />
      </div>

      <canvas
        ref={canvasRef}
        style={{ display: "none" }}
      />

      {results.map((r, i) => (
        <div
          key={i}
          style={{
            marginBottom: 30,
            padding: 20,
            background: "#111",
            borderRadius: 12,
          }}
        >
          <h2>{r.file}</h2>

          <h3>{r.count} elementer</h3>

          {r.items.map((item: string) => (
            <div key={item}>✅ {item}</div>
          ))}
        </div>
      ))}
    </main>
  );
}
