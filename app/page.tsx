"use client";

import { useRef, useState } from "react";

declare global {
  interface Window {
    cv: any;
  }
}

type ScanResult = {
  file: string;
  count: number;
  items: string[];
};

const BOXES = [
  { name: "Røræg", x: 70, y: 360 },
  { name: "Spejlæg", x: 70, y: 450 },
  { name: "Modnet Havarti ost", x: 70, y: 540 },
  { name: "Hjemmelavet blåbæryoghurt", x: 70, y: 640 },
  { name: "Hjemmelavet chiagrød", x: 70, y: 760 },

  { name: "Avocado og hytteost", x: 70, y: 980 },
  { name: "Eksotisk frugtskål", x: 70, y: 1080 },
  { name: "Smashed peas med forårsmynte", x: 70, y: 1180 },

  { name: "Pain au chocolat fra Meyers", x: 70, y: 1450 },
  { name: "Øko. smørcroissant fra Meyers", x: 70, y: 1550 },
  { name: "Mariagertoba-toast", x: 70, y: 1650 },

  { name: "Rösti", x: 600, y: 380 },
  { name: "Hjemmelavet hønsesalat", x: 600, y: 490 },
  { name: "Crispy chicken", x: 600, y: 610 },
  { name: "2 brunchpølser", x: 600, y: 730 },
  { name: "Koldrøget laks", x: 600, y: 850 },

  { name: "Lun rabarber crumble", x: 600, y: 1120 },
  { name: "Øllebrød med let vaniljeskum", x: 600, y: 1240 },
  { name: "2 amerikanske pandekager", x: 600, y: 1370 },
];

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [results, setResults] = useState<ScanResult[]>([]);
  const [loading, setLoading] = useState(false);

  const processImages = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = Array.from(e.target.files || []);

    if (!files.length) return;

    setLoading(true);

    const allResults: ScanResult[] = [];

    for (const file of files) {
      const result = await scanFile(file);

      allResults.push(result);

      setResults([...allResults]);
    }

    setLoading(false);
  };

  const scanFile = async (file: File): Promise<ScanResult> => {
    return new Promise((resolve) => {
      const img = new Image();

      img.onload = () => {
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

        const TARGET_WIDTH = 1000;
        const TARGET_HEIGHT = 1800;

        canvas.width = TARGET_WIDTH;
        canvas.height = TARGET_HEIGHT;

        ctx.drawImage(
          img,
          0,
          0,
          TARGET_WIDTH,
          TARGET_HEIGHT
        );

        try {
          const cv = window.cv;

          if (!cv) {
            throw new Error("OpenCV not loaded");
          }

          let src = cv.imread(canvas);

          let gray = new cv.Mat();

          cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);

          let blur = new cv.Mat();

          cv.GaussianBlur(
            gray,
            blur,
            new cv.Size(5, 5),
            0
          );

          let edges = new cv.Mat();

          cv.Canny(blur, edges, 75, 200);

          let contours = new cv.MatVector();
          let hierarchy = new cv.Mat();

          cv.findContours(
            edges,
            contours,
            hierarchy,
            cv.RETR_EXTERNAL,
            cv.CHAIN_APPROX_SIMPLE
          );

          let biggest = null;
          let maxArea = 0;

          for (let i = 0; i < contours.size(); i++) {
            const cnt = contours.get(i);

            const area = cv.contourArea(cnt);

            if (area < 100000) continue;

            const peri = cv.arcLength(cnt, true);

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
            const points = [];

            for (let i = 0; i < 4; i++) {
              points.push({
                x: biggest.data32S[i * 2],
                y: biggest.data32S[i * 2 + 1],
              });
            }

            points.sort((a, b) => a.y - b.y);

            const top = points.slice(0, 2);
            const bottom = points.slice(2, 4);

            top.sort((a, b) => a.x - b.x);
            bottom.sort((a, b) => a.x - b.x);

            const ordered = [
              top[0],
              top[1],
              bottom[1],
              bottom[0],
            ];

            const srcTri = cv.matFromArray(
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

            const dstTri = cv.matFromArray(
              4,
              1,
              cv.CV_32FC2,
              [
                0,
                0,

                TARGET_WIDTH,
                0,

                TARGET_WIDTH,
                TARGET_HEIGHT,

                0,
                TARGET_HEIGHT,
              ]
            );

            const M = cv.getPerspectiveTransform(
              srcTri,
              dstTri
            );

            const dst = new cv.Mat();

            cv.warpPerspective(
              src,
              dst,
              M,
              new cv.Size(
                TARGET_WIDTH,
                TARGET_HEIGHT
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
        } catch (err) {
          console.log("OpenCV fallback", err);
        }

        const found: string[] = [];

        BOXES.forEach((box) => {
          const imageData = ctx.getImageData(
            box.x,
            box.y,
            55,
            55
          );

          let darkPixels = 0;

          for (
            let i = 0;
            i < imageData.data.length;
            i += 4
          ) {
            const r = imageData.data[i];
            const g = imageData.data[i + 1];
            const b = imageData.data[i + 2];

            const brightness = (r + g + b) / 3;

            // detect kuglepen / blyant / mørke streger
            if (brightness < 140) {
              darkPixels++;
            }
          }

          // threshold
          if (darkPixels > 250) {
            found.push(box.name);

            // visual debug
            ctx.strokeStyle = "#00ff00";
            ctx.lineWidth = 4;

            ctx.strokeRect(
              box.x,
              box.y,
              55,
              55
            );
          } else {
            ctx.strokeStyle = "#ff0000";
            ctx.lineWidth = 2;

            ctx.strokeRect(
              box.x,
              box.y,
              55,
              55
            );
          }
        });

        resolve({
          file: file.name,
          count: found.length,
          items: found,
        });
      };

      img.src = URL.createObjectURL(file);
    });
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#000",
        color: "#fff",
        padding: 20,
        fontFamily: "sans-serif",
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
          border: "4px solid #00ff88",
          borderRadius: 24,
          padding: 20,
          marginBottom: 20,
        }}
      >
        <h2>Upload billeder</h2>

        <p>
          Du kan vælge mange billeder på én
          gang
        </p>

        <input
          type="file"
          multiple
          accept="image/*"
          onChange={processImages}
          style={{
            fontSize: 20,
            marginTop: 10,
          }}
        />
      </div>

      {loading && (
        <div
          style={{
            marginBottom: 20,
            fontSize: 22,
          }}
        >
          Scanner billeder...
        </div>
      )}

      <canvas
        ref={canvasRef}
        style={{
          width: "100%",
          borderRadius: 20,
          marginBottom: 30,
          background: "#111",
        }}
      />

      {results.map((r, index) => (
        <div
          key={index}
          style={{
            background: "#111",
            padding: 20,
            borderRadius: 20,
            marginBottom: 20,
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
              marginTop: 15,
            }}
          >
            {r.items.map((item) => (
              <div
                key={item}
                style={{
                  background: "#1f1f1f",
                  padding: 12,
                  borderRadius: 12,
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
