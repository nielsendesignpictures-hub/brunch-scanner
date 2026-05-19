"use client";

import { useRef, useState } from "react";

declare global {
  interface Window {
    cv: any;
  }
}

type ScanResult = {
  file: string;
  items: string[];
  count: number;
};

const MENU_NAMES = [
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
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [results, setResults] = useState<
    ScanResult[]
  >([]);

  const [totals, setTotals] = useState<{
    [key: string]: number;
  }>({});

  const [loading, setLoading] =
    useState(false);

  const processFiles = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = Array.from(
      e.target.files || []
    );

    if (!files.length) return;

    setLoading(true);

    const allResults: ScanResult[] = [];

    const totalMap: {
      [key: string]: number;
    } = {};

    for (const file of files) {
      const result = await scanImage(file);

      allResults.push(result);

      result.items.forEach((item) => {
        totalMap[item] =
          (totalMap[item] || 0) + 1;
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

        const ctx =
          canvas.getContext("2d");

        if (!ctx) {
          resolve({
            file: file.name,
            items: [],
            count: 0,
          });

          return;
        }

        const WIDTH = 1200;
        const HEIGHT = 2200;

        canvas.width = WIDTH;
        canvas.height = HEIGHT;

        ctx.fillStyle = "black";
        ctx.fillRect(
          0,
          0,
          WIDTH,
          HEIGHT
        );

        // normalize image
        const ratio =
          img.width / img.height;

        let drawWidth = WIDTH;
        let drawHeight =
          WIDTH / ratio;

        if (drawHeight < HEIGHT) {
          drawHeight = HEIGHT;
          drawWidth = HEIGHT * ratio;
        }

        const offsetX =
          (WIDTH - drawWidth) / 2;

        const offsetY =
          (HEIGHT - drawHeight) / 2;

        ctx.drawImage(
          img,
          offsetX,
          offsetY,
          drawWidth,
          drawHeight
        );

        try {
          const cv = window.cv;

          if (!cv) {
            resolve({
              file: file.name,
              items: [],
              count: 0,
            });

            return;
          }

          const src = cv.imread(canvas);

          const gray = new cv.Mat();

          cv.cvtColor(
            src,
            gray,
            cv.COLOR_RGBA2GRAY
          );

          const thresh =
            new cv.Mat();

          cv.adaptiveThreshold(
            gray,
            thresh,
            255,
            cv.ADAPTIVE_THRESH_GAUSSIAN_C,
            cv.THRESH_BINARY_INV,
            11,
            2
          );

          const contours =
            new cv.MatVector();

          const hierarchy =
            new cv.Mat();

          cv.findContours(
            thresh,
            contours,
            hierarchy,
            cv.RETR_TREE,
            cv.CHAIN_APPROX_SIMPLE
          );

          const boxes: {
            x: number;
            y: number;
            w: number;
            h: number;
          }[] = [];

          for (
            let i = 0;
            i < contours.size();
            i++
          ) {
            const cnt =
              contours.get(i);

            const rect =
              cv.boundingRect(cnt);

            const ratio =
              rect.w / rect.h;

            const area =
              rect.w * rect.h;

            // checkbox filter
            const isSquare =
              ratio > 0.8 &&
              ratio < 1.2;

            const validSize =
              area > 300 &&
              area < 2500;

            if (
              isSquare &&
              validSize
            ) {
              boxes.push(rect);
            }
          }

          // remove duplicates
          const filtered =
            boxes.filter(
              (box, index, self) => {
                return (
                  index ===
                  self.findIndex(
                    (b) =>
                      Math.abs(
                        b.x - box.x
                      ) < 10 &&
                      Math.abs(
                        b.y - box.y
                      ) < 10
                  )
                );
              }
            );

          // sort top->bottom
          filtered.sort((a, b) => {
            if (
              Math.abs(a.y - b.y) <
              40
            ) {
              return a.x - b.x;
            }

            return a.y - b.y;
          });

          // keep likely menu checkboxes
          const finalBoxes =
            filtered.slice(0, 25);

          const selected: string[] = [];

          finalBoxes.forEach(
            (box, index) => {
              const inner =
                ctx.getImageData(
                  box.x + 5,
                  box.y + 5,
                  box.w - 10,
                  box.h - 10
                );

              let dark = 0;
              let diagonal = 0;

              const size =
                box.w - 10;

              for (
                let y = 0;
                y < size;
                y++
              ) {
                for (
                  let x = 0;
                  x < size;
                  x++
                ) {
                  const i =
                    (y * size + x) *
                    4;

                  const r =
                    inner.data[i];

                  const g =
                    inner.data[i + 1];

                  const b =
                    inner.data[i + 2];

                  const brightness =
                    (r + g + b) /
                    3;

                  const isBlue =
                    b > r + 20 &&
                    b > g + 20 &&
                    b > 70;

                  const isDark =
                    brightness < 90;

                  if (
                    isBlue ||
                    isDark
                  ) {
                    dark++;

                    const d1 =
                      Math.abs(
                        x - y
                      ) < 4;

                    const d2 =
                      Math.abs(
                        x -
                          (size - y)
                      ) < 4;

                    if (d1 || d2) {
                      diagonal++;
                    }
                  }
                }
              }

              const checked =
                dark > 40 &&
                diagonal > 8;

              ctx.strokeStyle =
                checked
                  ? "#00ff00"
                  : "#ff0000";

              ctx.lineWidth =
                checked ? 5 : 2;

              ctx.strokeRect(
                box.x,
                box.y,
                box.w,
                box.h
              );

              if (
                checked &&
                MENU_NAMES[index]
              ) {
                selected.push(
                  MENU_NAMES[index]
                );
              }
            }
          );

          resolve({
            file: file.name,
            items: selected,
            count: selected.length,
          });
        } catch (err) {
          console.log(err);

          resolve({
            file: file.name,
            items: [],
            count: 0,
          });
        }
      };

      img.src =
        URL.createObjectURL(file);
    });
  };

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
          fontSize: 48,
          marginBottom: 20,
        }}
      >
        Brunch Scanner
      </h1>

      <div
        style={{
          border:
            "5px solid #00ff88",
          borderRadius: 30,
          padding: 25,
          marginBottom: 30,
        }}
      >
        <h2>Upload billeder</h2>

        <p>
          Upload flere brunchkort på én
          gang
        </p>

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
          marginBottom: 40,
          background: "#111",
        }}
      />

      {results.length > 0 && (
        <div
          style={{
            background: "#111",
            borderRadius: 24,
            padding: 25,
            marginBottom: 40,
          }}
        >
          <h2
            style={{
              fontSize: 36,
            }}
          >
            Samlet optælling
          </h2>

          <div
            style={{
              display: "grid",
              gap: 12,
              marginTop: 20,
            }}
          >
            {Object.entries(totals)
              .sort((a, b) => b[1] - a[1])
              .map(([item, count]) => (
                <div
                  key={item}
                  style={{
                    background:
                      "#1f1f1f",
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

      {results.map((r, i) => (
        <div
          key={i}
          style={{
            background: "#111",
            borderRadius: 24,
            padding: 24,
            marginBottom: 24,
          }}
        >
          <h2>{r.file}</h2>

          <h3>
            Fundet {r.count} elementer
          </h3>

          <div
            style={{
              display: "grid",
              gap: 10,
              marginTop: 20,
            }}
          >
            {r.items.map((item) => (
              <div
                key={item}
                style={{
                  background:
                    "#1f1f1f",
                  padding: 14,
                  borderRadius: 14,
                }}
              >
                ✅ {item}
              </div>
            ))}
          </div>
        </div>
      ))}

      <script
        async
        src="https://docs.opencv.org/4.x/opencv.js"
      />
    </main>
  );
}
