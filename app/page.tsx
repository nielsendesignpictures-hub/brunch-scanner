"use client";

import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    cv: any;
  }
}

type Result = {
  file: string;
  count: number;
  items: string[];
};

const ITEMS = [
  { name: "Røræg", x: 55, y: 355 },
  { name: "Spejlæg", x: 55, y: 445 },
  { name: "Modnet Havarti ost", x: 55, y: 540 },
  { name: "Hjemmelavet blåbæryoghurt", x: 55, y: 635 },
  { name: "Hjemmelavet chiagrød", x: 55, y: 760 },

  { name: "Avocado og hytteost", x: 55, y: 980 },
  { name: "Eksotisk frugtskål", x: 55, y: 1070 },
  { name: "Smashed peas med forårsmynte", x: 55, y: 1165 },

  { name: "Pain au chocolat fra Meyers", x: 55, y: 1450 },
  { name: "Øko. smørcroissant fra Meyers", x: 55, y: 1540 },
  { name: "Mariagertoba-toast", x: 55, y: 1635 },

  { name: "Rösti", x: 520, y: 380 },
  { name: "Hjemmelavet hønsesalat", x: 520, y: 490 },
  { name: "Crispy chicken", x: 520, y: 605 },
  { name: "2 brunchpølser", x: 520, y: 720 },
  { name: "Koldrøget laks", x: 520, y: 840 },

  { name: "Lun rabarber crumble", x: 520, y: 1120 },
  { name: "Øllebrød med let vaniljeskum", x: 520, y: 1235 },
  { name: "2 amerikanske pandekager", x: 520, y: 1355 },
];

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const [opencvReady, setOpencvReady] = useState(false);

  useEffect(() => {
    const existing = document.getElementById("opencv-script");

    if (existing) {
      setOpencvReady(true);
      return;
    }

    const script = document.createElement("script");

    script.id = "opencv-script";
    script.src = "https://docs.opencv.org/4.x/opencv.js";
    script.async = true;

    script.onload = () => {
      setOpencvReady(true);
    };

    document.body.appendChild(script);
  }, []);

  const processFiles = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = Array.from(e.target.files || []);

    if (!files.length) return;

    setLoading(true);

    const tempResults: Result[] = [];

    for (const file of files) {
      const result = await scanImage(file);

      tempResults.push(result);

      setResults([...tempResults]);
    }

    setLoading(false);
  };

  const scanImage = async (
    file: File
  ): Promise<Result> => {
    return new Promise((resolve) => {
      const img = new Image();

      img.onload = async () => {
        const canvas = canvasRef.current;

        if (!canvas) {
          resolve({
            file: file.name,
            count: 0,
            items: [],
          });

          return;
        }

        const ctx = canvas.getContext("2d");

        if (!ctx) {
          resolve({
            file: file.name,
            count: 0,
            items: [],
          });

          return;
        }

        const WIDTH = 1000;
        const HEIGHT = 1800;

        canvas.width = WIDTH;
        canvas.height = HEIGHT;

        ctx.drawImage(
          img,
          0,
          0,
          WIDTH,
          HEIGHT
        );

        try {
          if (window.cv) {
            const cv = window.cv;

            const src = cv.imread(canvas);

            const gray = new cv.Mat();

            cv.cvtColor(
              src,
              gray,
              cv.COLOR_RGBA2GRAY
            );

            const blur = new cv.Mat();

            cv.GaussianBlur(
              gray,
              blur,
              new cv.Size(5, 5),
              0
            );

            const edges = new cv.Mat();

            cv.Canny(
              blur,
              edges,
              75,
              200
            );

            const contours = new cv.MatVector();
            const hierarchy = new cv.Mat();

            cv.findContours(
              edges,
              contours,
              hierarchy,
              cv.RETR_EXTERNAL,
              cv.CHAIN_APPROX_SIMPLE
            );

            let biggest = null;
            let maxArea = 0;

            for (
              let i = 0;
              i < contours.size();
              i++
            ) {
              const cnt = contours.get(i);

              const area =
                cv.contourArea(cnt);

              if (area < 100000)
                continue;

              const peri =
                cv.arcLength(cnt, true);

              const approx = new cv.Mat();

              cv.approxPolyDP(
                cnt,
                approx,
                0.02 * peri,
                true
              );

              if (approx.rows === 4) {
                if (area > maxArea) {
                  biggest = approx;
                  maxArea = area;
                }
              }
            }

            if (biggest) {
              const pts = [];

              for (let i = 0; i < 4; i++) {
                pts.push({
                  x: biggest.data32S[i * 2],
                  y:
                    biggest.data32S[
                      i * 2 + 1
                    ],
                });
              }

              pts.sort((a, b) => a.y - b.y);

              const top = pts
                .slice(0, 2)
                .sort((a, b) => a.x - b.x);

              const bottom = pts
                .slice(2, 4)
                .sort((a, b) => a.x - b.x);

              const ordered = [
                top[0],
                top[1],
                bottom[1],
                bottom[0],
              ];

              const srcTri =
                cv.matFromArray(
                  4,
                  1,
                  cv.CV_32FC2,
                  [
                    ordered[0].x,
                    ordered[0].y,

                    ordered[1].x,
                    ordered[1].y,

                    ordered[2].x,
                    ordered[2].y,

                    ordered[3].x,
                    ordered[3].y,
                  ]
                );

              const dstTri =
                cv.matFromArray(
                  4,
                  1,
                  cv.CV_32FC2,
                  [
                    0,
                    0,

                    WIDTH,
                    0,

                    WIDTH,
                    HEIGHT,

                    0,
                    HEIGHT,
                  ]
                );

              const M =
                cv.getPerspectiveTransform(
                  srcTri,
                  dstTri
                );

              const dst = new cv.Mat();

              cv.warpPerspective(
                src,
                dst,
                M,
                new cv.Size(
                  WIDTH,
                  HEIGHT
                )
              );

              cv.imshow(canvas, dst);

              src.delete();
              gray.delete();
              blur.delete();
              edges.delete();
              contours.delete();
              hierarchy.delete();
              dst.delete();
            }
          }
        } catch (e) {
          console.log("opencv fallback", e);
        }

        const selected: string[] = [];

        ITEMS.forEach((item) => {
          const boxSize = 38;

          const imageData =
            ctx.getImageData(
              item.x + 6,
              item.y + 6,
              24,
              24
            );

          let inkPixels = 0;

          let diagonalHits = 0;

          for (
            let y = 0;
            y < 24;
            y++
          ) {
            for (
              let x = 0;
              x < 24;
              x++
            ) {
              const i =
                (y * 24 + x) * 4;

              const r =
                imageData.data[i];
              const g =
                imageData.data[i + 1];
              const b =
                imageData.data[i + 2];

              const brightness =
                (r + g + b) / 3;

              const isBlue =
                b > r + 20 &&
                b > g + 20 &&
                b > 60;

              const isDark =
                brightness < 90;

              if (isBlue || isDark) {
                inkPixels++;

                // diagonal X detection
                if (
                  Math.abs(x - y) < 4 ||
                  Math.abs(
                    x - (24 - y)
                  ) < 4
                ) {
                  diagonalHits++;
                }
              }
            }
          }

          const checked =
            inkPixels > 30 &&
            diagonalHits > 8;

          ctx.strokeStyle = checked
            ? "#00ff00"
            : "#ff0000";

          ctx.lineWidth = checked
            ? 4
            : 2;

          ctx.strokeRect(
            item.x,
            item.y,
            boxSize,
            boxSize
          );

          if (checked) {
            selected.push(item.name);
          }
        });

        resolve({
          file: file.name,
          count: selected.length,
          items: selected,
        });
      };

      img.src = URL.createObjectURL(file);
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
          fontSize: 50,
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
        <h2>Upload brunch billeder</h2>

        <p>
          Kamera, galleri og multi-upload
          virker
        </p>

        <input
          type="file"
          multiple
          accept="image/*"
          onChange={processFiles}
          style={{
            fontSize: 18,
            marginTop: 10,
          }}
        />
      </div>

      {!opencvReady && (
        <div
          style={{
            marginBottom: 20,
            color: "#ffcc00",
          }}
        >
          Loader OpenCV...
        </div>
      )}

      {loading && (
        <div
          style={{
            marginBottom: 20,
            fontSize: 24,
          }}
        >
          Scanner billeder...
        </div>
      )}

      <canvas
        ref={canvasRef}
        style={{
          width: "100%",
          borderRadius: 25,
          background: "#111",
          marginBottom: 30,
        }}
      />

      {results.map((result, i) => (
        <div
          key={i}
          style={{
            background: "#111",
            borderRadius: 25,
            padding: 25,
            marginBottom: 25,
          }}
        >
          <h2>{result.file}</h2>

          <h3>
            Fundet {result.count} elementer
          </h3>

          <div
            style={{
              display: "grid",
              gap: 12,
              marginTop: 20,
            }}
          >
            {result.items.map((item) => (
              <div
                key={item}
                style={{
                  background: "#1f1f1f",
                  padding: 16,
                  borderRadius: 14,
                  fontSize: 22,
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
