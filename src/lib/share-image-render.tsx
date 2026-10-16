import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { fitShareTitle, SHARE_IMAGE_SIZE, type ShareBadgeTone, type ShareCardContent } from "@/lib/share-image";

// Satori has no synthetic bold, so both weights are bundled (Geist, SIL OFL — see src/assets/fonts/OFL.txt).
const [geistRegular, geistBold, logoBase64, backgroundBase64] = await Promise.all([
  readFile(join(process.cwd(), "src/assets/fonts/Geist-Regular.ttf")),
  readFile(join(process.cwd(), "src/assets/fonts/Geist-Bold.ttf")),
  readFile(join(process.cwd(), "public/LitterLink_logo-horizontal.png"), "base64"),
  readFile(join(process.cwd(), "public/images/litter-picking-background.jpg"), "base64"),
]);
const logoSrc = `data:image/png;base64,${logoBase64}`;
const backgroundSrc = `data:image/jpeg;base64,${backgroundBase64}`;

// Keeps the text column solid white, then fades so the photo shows through on the right.
const BACKGROUND_OVERLAY =
  "linear-gradient(90deg, #ffffff 0%, #ffffff 45%, rgba(255,255,255,0.9) 60%, rgba(255,255,255,0.5) 74%, rgba(255,255,255,0) 90%)";

const DOMAIN = "litterlink.co.uk";
const BRAND = "#16a34a";
const ACCENT = "#3742c8";
const INK = "#0f1f3d";
const MUTED = "#334155";

const BADGE_COLOURS: Record<ShareBadgeTone, { background: string; color: string }> = {
  brand: { background: "#dcfce7", color: "#166534" },
  neutral: { background: "#e2e8f0", color: "#334155" },
  warning: { background: "#fef3c7", color: "#92400e" },
  danger: { background: "#fee2e2", color: "#991b1b" },
};

// Lucide icon geometry (ISC licence) — Satori can't render lucide-react components or React fragments.
const ICON_SHAPES = {
  pin: [
    <path key="a" d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" />,
    <circle key="b" cx="12" cy="10" r="3" />,
  ],
  calendar: [
    <path key="a" d="M8 2v4" />,
    <path key="b" d="M16 2v4" />,
    <rect key="c" width="18" height="18" x="3" y="4" rx="2" />,
    <path key="d" d="M3 10h18" />,
  ],
  users: [
    <path key="a" d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />,
    <circle key="b" cx="9" cy="7" r="4" />,
    <path key="c" d="M22 21v-2a4 4 0 0 0-3-3.87" />,
    <path key="d" d="M16 3.13a4 4 0 0 1 0 7.75" />,
  ],
};

function DetailIcon({ icon }: { icon: keyof typeof ICON_SHAPES }) {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 24 24"
      fill="none"
      stroke={BRAND}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {ICON_SHAPES[icon]}
    </svg>
  );
}

/** Branded 1200×630 share card shared by event and group pages. */
export function renderShareImage({ badge, title, details, host }: ShareCardContent): ImageResponse {
  const fitted = fitShareTitle(title);
  const badgeColours = BADGE_COLOURS[badge.tone];

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          position: "relative",
          padding: "44px 64px 0",
          background: "#ffffff",
          fontFamily: "Geist",
          color: INK,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- Satori only renders plain <img> */}
        <img
          src={backgroundSrc}
          width={SHARE_IMAGE_SIZE.width}
          height={SHARE_IMAGE_SIZE.height}
          alt=""
          style={{ position: "absolute", top: 0, left: 0, objectFit: "cover" }}
        />
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, background: BACKGROUND_OVERLAY }} />

        {/* eslint-disable-next-line @next/next/no-img-element -- Satori only renders plain <img> */}
        <img src={logoSrc} width={256} height={64} alt="" />

        <div
          style={{ display: "flex", flexDirection: "column", flexGrow: 1, marginTop: 26, paddingBottom: 24, maxWidth: 820 }}
        >
          <div style={{ display: "flex" }}>
            <div
              style={{
                display: "flex",
                padding: "8px 18px",
                borderRadius: 999,
                fontSize: 22,
                fontWeight: 700,
                letterSpacing: 1.5,
                textTransform: "uppercase",
                ...badgeColours,
              }}
            >
              {badge.label}
            </div>
          </div>

          <div
            style={{
              display: "block",
              marginTop: 16,
              fontSize: fitted.fontSize,
              fontWeight: 700,
              lineHeight: 1.1,
              letterSpacing: -1,
              lineClamp: 4,
            }}
          >
            {fitted.text}
          </div>

          <div style={{ display: "flex", flexDirection: "column", marginTop: 22, gap: 10 }}>
            {details.map((detail) => (
              <div
                key={detail.icon}
                style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 30, color: MUTED }}
              >
                <DetailIcon icon={detail.icon} />
                <div style={{ display: "block", lineClamp: 1 }}>{detail.text}</div>
              </div>
            ))}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "20px 0 26px",
            borderTop: "2px solid #e2e8f0",
            fontSize: 28,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14, color: MUTED, maxWidth: 820 }}>
            {host && <DetailIcon icon="users" />}
            {host && <div style={{ display: "block", lineClamp: 1, fontWeight: 700, color: INK }}>{host}</div>}
          </div>
          <div
            style={{
              display: "flex",
              padding: "6px 18px",
              borderRadius: 999,
              background: "rgba(255,255,255,0.88)",
              color: INK,
            }}
          >
            {DOMAIN}
          </div>
        </div>

        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            height: 10,
            background: `linear-gradient(90deg, ${BRAND}, ${ACCENT})`,
          }}
        />
      </div>
    ),
    {
      ...SHARE_IMAGE_SIZE,
      fonts: [
        { name: "Geist", data: geistRegular, weight: 400, style: "normal" },
        { name: "Geist", data: geistBold, weight: 700, style: "normal" },
      ],
    }
  );
}
