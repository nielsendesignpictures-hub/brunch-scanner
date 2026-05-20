"use client";

import { useRef, useState } from "react";

type ScanResult = {
  file: string;
  items: string[];
  count: number;
};

type TotalMap = {
  [key: string]: number;
};

const CHECKBOXES = [
  { name: "Røræg", x: 60, y: 385 },
  { name: "Spejlæg", x: 60, y: 485 },
  { name: "Modnet Havarti ost", x: 60, y: 590 },
  { name: "Hjemmelavet blåbæryoghurt", x: 60, y: 700 },
  { name: "Hjemmelavet chiagrød", x: 60, y: 820 },

  { name: "Avocado og hytteost", x: 60, y: 1090 },
  { name: "Eksotisk frugtskål", x: 60, y: 1190 },
  { name: "Smashed peas med forårsmynte", x: 60, y: 1290 },

  { name: "Pain au chocolat fra Meyers", x: 60, y: 1640 },
  { name: "Øko. smørcroissant fra Meyers", x: 60, y: 1740 },
  { name: "Mariagertoba-toast", x: 60, y: 1840 },

  { name: "Rösti", x: 540, y: 390 },
  { name: "Hjemmelavet hønsesalat", x: 540, y: 510 },
  { name: "Crispy chicken", x: 540, y: 640 },
  { name: "2 brunchpølser", x: 540, y: 780 },
  { name: "Koldrøget laks", x: 540, y: 930 },

  { name: "Lun rabarber crumble", x: 540, y: 1250 },
  { name: "Øllebrød med let vaniljeskum", x: 540, y: 1390 },
  { name: "2 amerikanske pandekager", x: 540, y: 1530 },
];

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [results, setResults] = useState<
    ScanResult[]
  >([]);

  const [totals, setTotals] =
    useState<TotalMap>({});

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
    const totalMap: TotalMap = {};

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
    return new Promise(async (resolve) => {
      const img = new Image();

      const template = new Image();

      template.src = "/template.jpg";

      await template.decode();

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

        const WIDTH = 1000;
        const HEIGHT = 2000;

        canvas.width = WIDTH;
        canvas.height = HEIGHT;

        // DRAW USER IMAGE
        ctx.drawImage(
          img,
          0,
          0,
          WIDTH,
          HEIGHT
        );

        const userData =
          ctx.getImageData(
            0,
            0,
            WIDTH,
            HEIGHT
          );

        // DRAW TEMPLATE
        ctx.clearRect(
          0,
          0,
          WIDTH,
          HEIGHT
        );

        ctx.drawImage(
          template,
          0,
          0,
          WIDTH,
          HEIGHT
        );

        const templateData =
          ctx.getImageData(
            0,
            0,
            WIDTH,
            HEIGHT
          );

        // DRAW USER AGAIN
        ctx.clearRect(
          0,
          0,
          WIDTH,
          HEIGHT
        );

        ctx.putImageData(userData, 0, 0);

        const selected: string[] = [];

        CHECKBOXES.forEach((box) => {
          const size = 34;

          const userBox =
            ctx.getImageData(
              box.x,
              box.y,
              size,
              size
            );

          // TEMPLATE BOX
          const templateCanvas =
            document.createElement(
              "canvas"
            );

          templateCanvas.width = WIDTH;
          templateCanvas.height =
            HEIGHT;

          const tctx =
            templateCanvas.getContext(
              "2d"
            );

          if (!tctx) return;

          tctx.drawImage(
            template,
            0,
            0,
            WIDTH,
            HEIGHT
          );

          const templateBox =
            tctx.getImageData(
              box.x,
              box.y,
              size,
              size
            );

          let difference = 0;

          for (
            let i = 0;
            i < userBox.data.length;
            i += 4
          ) {
            const ur =
              userBox.data[i];
            const ug =
              userBox.data[i + 1];
            const ub =
              userBox.data[i + 2];

            const tr =
              templateBox.data[i];
            const tg =
              templateBox.data[i + 1];
            const tb =
              templateBox.data[i + 2];

            const diff =
              Math.abs(ur - tr) +
              Math.abs(ug - tg) +
              Math.abs(ub - tb);

            difference += diff;
          }

          const checked =
            difference > 50000;

          ctx.strokeStyle = checked
            ? "#00ff00"
            : "#ff0000";

          ctx.lineWidth = checked ? 5 : 2;

          ctx.strokeRect(
            box.x,
            box.y,
            size,
            size
          );

          if (checked) {
            selected.push(box.name);
          }
        });

        resolve({
          file: file.name,
          items: selected,
          count: selected.length,
        });
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
          borderRadius: 24,
          padding: 24,
          marginBottom: 30,
        }}
      >
        <h2>Upload brunch billeder</h2>

        <p>
          Brug samme afstand og framing
          hver gang
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
          borderRadius: 20,
          background: "#111",
          marginBottom: 40,
        }}
      />

      {results.length > 0 && (
        <div
          style={{
            background: "#111",
            borderRadius: 24,
            padding: 24,
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
              marginTop: 20,
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
                    background:
                      "#1f1f1f",
                    padding: 14,
                    borderRadius: 14,
                    display: "flex",
                    justifyContent:
                      "space-between",
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
    </main>
  );
}
