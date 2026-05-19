"use client";

import { useState } from "react";

const ITEMS = [
  "Røræg",
  "Spejlæg",
  "Modnet Havarti ost",
  "Hjemmelavet blåbæryoghurt",
  "Hjemmelavet chiagrød",

  "Avocado og hytteost",
  "Eksotisk frugtskål",
  "Smashed peas med forårsmynte",

  "Pain au chocolat fra Meyers",
  "Øko. smørcroissant fra Meyers",
  "Mariagertoba-toast",

  "Rösti",
  "Hjemmelavet hønsesalat",
  "Crispy chicken",
  "2 brunchpølser",
  "Koldrøget laks",

  "Lun rabarber crumble",
  "Øllebrød med let vaniljeskum",
  "2 amerikanske pandekager",
];

export default function Home() {
  const [selected, setSelected] = useState<string[]>([]);
  const [preview, setPreview] = useState("");

  const analyzeImage = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];

    if (!file) return;

    const url = URL.createObjectURL(file);

    setPreview(url);

    const img = new Image();
    img.src = url;

    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      if (!ctx) return;

      canvas.width = img.width;
      canvas.height = img.height;

      ctx.drawImage(img, 0, 0);

      // Checkbox koordinater
      // JUSTER DISSE efter dit billede
      const boxes = [
        { x: 70, y: 370 },
        { x: 70, y: 470 },
        { x: 70, y: 570 },
        { x: 70, y: 670 },
        { x: 70, y: 790 },

        { x: 70, y: 1030 },
        { x: 70, y: 1130 },
        { x: 70, y: 1230 },

        { x: 70, y: 1490 },
        { x: 70, y: 1590 },
        { x: 70, y: 1690 },

        { x: 620, y: 390 },
        { x: 620, y: 500 },
        { x: 620, y: 620 },
        { x: 620, y: 740 },
        { x: 620, y: 860 },

        { x: 620, y: 1140 },
        { x: 620, y: 1260 },
        { x: 620, y: 1400 },
      ];

      const found: string[] = [];

      boxes.forEach((box, index) => {
        const size = 40;

        const imageData = ctx.getImageData(
          box.x,
          box.y,
          size,
          size
        );

        let bluePixels = 0;

        for (let i = 0; i < imageData.data.length; i += 4) {
          const r = imageData.data[i];
          const g = imageData.data[i + 1];
          const b = imageData.data[i + 2];

          if (b > 100 && b > r + 20 && b > g + 20) {
            bluePixels++;
          }
        }

        if (bluePixels > 80) {
          found.push(ITEMS[index]);
        }
      });

      setSelected(found);
    };
  };

  return (
    <main
      style={{
        background: "black",
        color: "white",
        minHeight: "100vh",
        padding: 20,
      }}
    >
      <h1>Brunch Scanner</h1>

      <input
        type="file"
        accept="image/*"
        onChange={analyzeImage}
      />

      {preview && (
        <img
          src={preview}
          style={{
            width: "100%",
            marginTop: 20,
            borderRadius: 12,
          }}
        />
      )}

      <div style={{ marginTop: 30 }}>
        <h2>Valgte elementer ({selected.length})</h2>

        {selected.map((item) => (
          <div key={item}>✅ {item}</div>
        ))}
      </div>
    </main>
  );
}
