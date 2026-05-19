"use client";

import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    cv: any;
  }
}

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

  const [results, setResults] = useState<any[]>([]);

  useEffect(() => {
    const script = document.createElement("script");

    script.src = "https://docs.opencv.org/4.x/opencv.js";

    script.async = true;

    document.body.appendChild(script);
  }, []);

  const processImage = async (
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

          canvas.width = img.width;
          canvas.height = img.height;

          ctx.drawImage(img, 0, 0);

          const cv = window.cv;

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
            cv.RETR_LIST,
            cv.CHAIN_APPROX_SIMPLE
          );

          let biggest = null;
          let maxArea = 0;

          for (let i = 0; i < contours.size(); i++) {
            let cnt = contours.get(i);

            let area = cv.contourArea(cnt);

            if (area > maxArea) {
              let peri = cv.arcLength(cnt, true);

              let approx = new cv.Mat();

              cv.approxPolyDP(
                cnt,
                approx,
                0.02 * peri,
                true
              );

              if (approx.rows === 4) {
                biggest = approx;
                maxArea = area;
              }
            }
          }

          if (!biggest) {
            resolve();
            return;
          }

          // warp perspective
          const dstWidth = 1000;
          const dstHeight = 1800;

          let srcTri = cv.matFromArray(4, 1, cv.CV_32FC2, [
            biggest.data32S[0],
            biggest.data32S[1],

            biggest.data32S[2],
            biggest.data32S[3],

            biggest.data32S[4],
            biggest.data32S[5],

            biggest.data32S[6],
            biggest.data32S[7],
          ]);

          let dstTri = cv.matFromArray(4, 1, cv.CV_32FC2, [
            0,
            0,

            dstWidth,
            0,

            dstWidth,
            dstHeight,

            0,
            dstHeight,
          ]);

          let M = cv.getPerspectiveTransform(
            srcTri,
            dstTri
          );

          let dst = new cv.Mat();

          cv.warpPerspective(
            src,
            dst,
            M,
            new cv.Size(dstWidth, dstHeight)
          );

          cv.imshow(canvas, dst);

          const found: string[] = [];

          BOXES.forEach((box) => {
            const imageData = ctx.getImageData(
              box.x,
              box.y,
              50,
              50
            );

            let blue = 0;

            for (
              let i = 0;
              i < imageData.data.length;
              i += 4
            ) {
              const r = imageData.data[i];
              const g = imageData.data[i + 1];
              const b = imageData.data[i + 2];

              if (
                b > 100 &&
                b > r + 20 &&
                b > g + 20
              ) {
                blue++;
              }
            }

            if (blue > 80) {
              found.push(box.name);
            }
          });

          allResults.push({
            file: file.name,
            count: found.length,
            items: found,
          });

          setResults([...allResults]);

          resolve();
        };

        img.src = url;
      });
    }
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
      <h1>Brunch Scanner AI</h1>

      <input
        type="file"
        multiple
        accept="image/*"
        capture="environment"
        onChange={processImage}
      />

      <canvas
        ref={canvasRef}
        style={{
          width: "100%",
          marginTop: 20,
          borderRadius: 12,
        }}
      />

      {results.map((r, i) => (
        <div
          key={i}
          style={{
            marginTop: 30,
            background: "#111",
            padding: 20,
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
