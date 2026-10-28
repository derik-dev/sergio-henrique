import { ImageResponse } from "next/og";

export function generateStaticParams() {
  return [{ size: "192" }, { size: "512" }];
}

// Ícone do app (PWA / tela inicial): o mesmo desenho do logotipo, em PNG.
export async function GET(_req: Request, ctx: { params: Promise<{ size: string }> }) {
  const { size } = await ctx.params;
  const px = size === "192" ? 192 : 512;
  const u = px / 32;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#07090b", position: "relative" }}>
        <div
          style={{
            position: "absolute",
            left: 6 * u,
            top: 7 * u,
            width: 20 * u,
            height: 18 * u,
            border: `${1.6 * u}px solid #3ddc97`,
            borderRadius: 2 * u,
            display: "flex",
          }}
        />
        <div style={{ position: "absolute", left: 15.2 * u, top: 7 * u, width: 1.6 * u, height: 18 * u, background: "#3ddc97", display: "flex" }} />
        <div
          style={{
            position: "absolute",
            left: 12.8 * u,
            top: 12.8 * u,
            width: 6.4 * u,
            height: 6.4 * u,
            border: `${1.6 * u}px solid #3ddc97`,
            borderRadius: 9999,
            background: "#07090b",
            display: "flex",
          }}
        />
        <div style={{ position: "absolute", left: 19.9 * u, top: 10.4 * u, width: 3.2 * u, height: 3.2 * u, borderRadius: 9999, background: "#f3f6f4", display: "flex" }} />
      </div>
    ),
    { width: px, height: px },
  );
}
