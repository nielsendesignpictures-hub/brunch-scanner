"use client";

import { useRef, useState } from "react";

type ScanResult = {
  file: string;
  items: string[];
  count: number;
};

type Totals = {
  [key: string]: number;
};

const MENU_ITEMS = [
  { name: "Røræg", x: 92, y: 430 },
  { name: "Spejlæg", x: 92, y: 530 },
  { name: "Modnet Havarti ost", x: 92, y: 635 },
  { name: "Hjemmelavet blåbæryoghurt", x: 92, y: 740 },
  { name: "Hjemmelavet chiagrød", x: 92, y: 860 },

  { name: "Avocado og hytteost", x: 92, y: 1120 },
  { name: "Eksotisk frugtskål", x: 92, y: 1220 },
  { name: "Smashed peas med forårsmynte", x: 92, y: 1320 },

  { name: "Pain au chocolat fra Meyers", x: 92, y: 1660 },
  { name: "Øko. smørcroissant fra Meyers", x: 92, y: 1760 },
  { name: "Mariagertoba-toast", x: 92, y: 1860 },

  { name: "Rösti", x: 620, y: 440 },
  { name: "Hjemmelavet hønsesalat", x: 620, y: 560 },
  { name: "Crispy chicken", x: 620, y: 690 },
  { name: "2 brunchpølser", x: 620, y: 820 },
  { name: "Koldrøget laks", x: 620, y: 960 },

  { name: "Lun rabarber crumble", x: 620, y: 1280 },
  { name: "Øllebrød med let vaniljeskum", x: 620, y: 1410 },
  { name: "2 amerikanske pandekager", x: 620, y: 1550 },
];

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [results, setResults] = useState<ScanResult[]>([]);
  const [totals, setTotals] = useState<Totals>({});
  const [loading, setLoading] = useState(false);

  const processFiles = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = Array.from(e.target.files || []);

    if (!files.length) return;

    setLoading(true);

    const allResults: ScanResult[] = [];
    const totalMap: Totals = {};

    for (const file of files) {
      const result = await scanImage(file);

      allResults.push(result);

      result.items.forEach((item) => {
        totalMap[item] = (totalMap[item] || 0) + 1;
      });

      setResults([...allResults]);
      setTotals({ ...totalMap });
    }

    setLoading(false);
  };

  const scanImage = async (
    file: File
  ): Promise<ScanResult> => {
    return new Promise((resolve) => {
      const img = new Image();

      img.onload = () => {
        const canvas = canvasRef.current;

        if (!canvas) {
          resolve({
            file: file.name,
            items: [],
            count: 0,
          });

          return;
        }

        const ctx = canvas.getContext("2d");

        if (!ctx) {
          resolve({
            file: file.name,
            items: [],
            count: 0,
          });

          return;
        }

        // FAST FORMAT
        const WIDTH = 1000;
        const HEIGHT = 2100;

        canvas.width = WIDTH;
        canvas.height = HEIGHT;

        // SORT BAGGRUND
        ctx.fillStyle = "black";
        ctx.fillRect(0, 0, WIDTH, HEIGHT);

        // AUTO CENTER CROP
        const imgRatio = img.width / img.height;
        const targetRatio = WIDTH / HEIGHT;

        let drawWidth = WIDTH;
        let drawHeight = HEIGHT;
        let offsetX = 0;
        let offsetY = 0;

        if (imgRatio > targetRatio) {
          drawHeight = HEIGHT;
          drawWidth = img.width * (HEIGHT / img.height);
          offsetX = -(drawWidth - WIDTH) / 2;
        } else {
          drawWidth = WIDTH;
          drawHeight = img.height * (WIDTH / img.width);
          offsetY = -(drawHeight - HEIGHT) / 2;
        }

        ctx.drawImage(
          img,
          offsetX,
          offsetY,
          drawWidth,
          drawHeight
        );

        const selected: string[] = [];

        MENU_ITEMS.forEach((item) => {
          // SCAN KUN INDERSIDE AF CHECKBOX
          const scanX = item.x + 8;
          const scanY = item.y + 8;
          const scanSize = 28;

          const imageData = ctx.getImageData(
            scanX,
            scanY,
            scanSize,
            scanSize
          );

          let inkPixels = 0;
          let diagonalPixels = 0;

          for (let y = 0; y < scanSize; y++) {
            for (let x = 0; x < scanSize; x++) {
              const i =
                (y * scanSize + x) * 4;

              const r = imageData.data[i];
              const g = imageData.data[i + 1];
              const b = imageData.data[i + 2];

              const brightness =
                (r + g + b) / 3;

              const isBlue =
                b > r + 25 &&
                b > g + 25 &&
                b > 70;

              const isDark =
                brightness < 90;

              if (isBlue || isDark) {
                inkPixels++;

                // DETECT X SHAPE
                const diag1 =
                  Math.abs(x - y) < 4;

                const diag2 =
                  Math.abs(
                    x - (scanSize - y)
                  ) < 4;

                if (diag1 || diag2) {
                  diagonalPixels++;
                }
              }
            }
          }

          const checked =
            inkPixels > 35 &&
            diagonalPixels > 10;

          // DEBUG BOXES
          ctx.strokeStyle = checked
            ? "#00ff00"
            : "#ff0000";

          ctx.lineWidth = checked ? 5 : 2;

          ctx.strokeRect(
            item.x,
            item.y,
            40,
            40
          );

          if (checked) {
            selected.push(item.name);
          }
        });

        resolve({
          file: file.name,
          items: selected,
          count: selected.length,
        });
      };

      img.src = URL.createObjectURL(file);
    });
  };

  const totalOrders = results.length;

  const totalItems = Object.values(
    totals
  ).reduce((a, b) => a + b, 0);

  return (
    <main
      style={{
        background: "#000",
        color: "#fff",
        minHeight: "100vh",
        padding: 20,
        fontFamily:
          "-apple-system, sans-serif",
      }}
    >
      <h1
        style={{
          fontSize: 52,
          marginBottom: 10,
        }}
      >
        Brunch Scanner
      </h1>

      <div
        style={{
          border:
            "6px solid #00ff88",
          borderRadius: 30,
          padding: 25,
          marginBottom: 30,
        }}
      >
        <h2>Guide</h2>

        <ul
          style={{
            lineHeight: 1.8,
          }}
        >
          <li>
            Hold menuen lodret
          </li>

          <li>
            Fyld næsten hele billedet
          </li>

          <li>
            God belysning giver bedst
            resultat
          </li>

          <li>
            Du kan vælge mange billeder
            på én gang
          </li>
        </ul>

        <input
          type="file"
          multiple
          accept="image/*"
          onChange={processFiles}
          style={{
            marginTop: 20,
            fontSize: 18,
          }}
        />
      </div>

      {loading && (
        <div
          style={{
            fontSize: 28,
            marginBottom: 20,
          }}
        >
          Scanner billeder...
        </div>
      )}

      <canvas
        ref={canvasRef}
        style={{
          width: "100%",
          borderRadius: 24,
          background: "#111",
          marginBottom: 40,
        }}
      />

      {results.length > 0 && (
        <div
          style={{
            background: "#111",
            padding: 25,
            borderRadius: 24,
            marginBottom: 40,
          }}
        >
          <h2
            style={{
              fontSize: 38,
            }}
          >
            Samlet opsummering
          </h2>

          <div
            style={{
              marginTop: 20,
              display: "grid",
              gap: 14,
            }}
          >
            <div>
              📄 Sedler scannet:{" "}
              {totalOrders}
            </div>

            <div>
              🍽️ Totale elementer:{" "}
              {totalItems}
            </div>
          </div>

          <div
            style={{
              marginTop: 30,
              display: "grid",
              gap: 12,
            }}
          >
            {Object.entries(totals)
              .sort((a, b) => b[1] - a[1])
              .map(([item, count]) => (
                <div
                  key={item}
                  style={{
                    background: "#1d1d1d",
                    padding: 14,
                    borderRadius: 14,
                    display: "flex",
                    justifyContent:
                      "space-between",
                    fontSize: 20,
                  }}
                >
                  <span>{item}</span>

                  <strong>{count}</strong>
                </div>
              ))}
          </div>
        </div>
      )}

      {results.map((result, i) => (
        <div
          key={i}
          style={{
            background: "#111",
            borderRadius: 24,
            padding: 24,
            marginBottom: 24,
          }}
        >
          <h2>{result.file}</h2>

          <h3>
            Fundet {result.count}{" "}
            elementer
          </h3>

          <div
            style={{
              display: "grid",
              gap: 10,
              marginTop: 20,
            }}
          >
            {result.items.map((item) => (
              <div
                key={item}
                style={{
                  background: "#1f1f1f",
                  padding: 14,
                  borderRadius: 14,
                  fontSize: 20,
                }}
              >
                ✅ {item}
              </div>
            ))}
          </div>
        </div>
      ))}
    </main>
  );
}
