/** Decorative scenery behind the platform: atmospheric top neon-green aura and ambient glow */
export function Backdrop() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[#040705]">
      {/* ========================================================= */}
      {/* TOP-LEFT 45° LIGHTING BEAM (INTENSE & RADIANT)            */}
      {/* Originates at screen corner (0,0), shoots along 45° ray  */}
      {/* More intense corner lighting, progressively low in middle */}
      {/* ========================================================= */}
      <div className="pointer-events-none fixed top-0 left-0 z-0 opacity-70">
        <div
          className="relative"
          style={{
            transformOrigin: "0 0",
            transform: "rotate(45deg)",
          }}
        >
          {/* Central high-intensity beam core */}
          <div
            className="absolute top-[-28px] left-0 w-[62vw] max-w-[540px] h-[56px]"
            style={{
              background:
                "linear-gradient(to right, rgba(50, 245, 80, 0.9) 0%, rgba(35, 230, 65, 0.55) 25%, rgba(31, 224, 58, 0.16) 55%, transparent 88%)",
              filter: "blur(18px)",
            }}
          />
          {/* Broad volumetric lighting cone */}
          <div
            className="absolute top-[-100px] left-0 w-[76vw] max-w-[660px] h-[200px]"
            style={{
              background:
                "radial-gradient(ellipse 70% 50% at 0% 50%, rgba(35, 240, 65, 0.65) 0%, rgba(31, 224, 58, 0.28) 30%, transparent 75%)",
              filter: "blur(36px)",
            }}
          />
        </div>

        {/* Corner Apex Glow (Top-Left) */}
        <div
          className="absolute -top-14 -left-14 w-52 h-52 pointer-events-none"
          style={{
            background:
              "radial-gradient(circle at 35% 35%, rgba(65, 255, 100, 0.7) 0%, rgba(31, 224, 58, 0.32) 40%, transparent 70%)",
            filter: "blur(26px)",
          }}
        />
      </div>

      {/* ========================================================= */}
      {/* TOP-RIGHT 125° LIGHTING BEAM (INTENSE & RADIANT)          */}
      {/* Originates at screen corner (100%,0), shoots into screen */}
      {/* More intense corner lighting, progressively low in middle */}
      {/* ========================================================= */}
      <div className="pointer-events-none fixed top-0 right-0 z-0 opacity-70">
        <div
          className="relative"
          style={{
            transformOrigin: "0 0",
            transform: "rotate(135deg)",
          }}
        >
          {/* Central high-intensity beam core */}
          <div
            className="absolute top-[-28px] left-0 w-[62vw] max-w-[540px] h-[56px]"
            style={{
              background:
                "linear-gradient(to right, rgba(50, 245, 80, 0.9) 0%, rgba(35, 230, 65, 0.55) 25%, rgba(31, 224, 58, 0.16) 55%, transparent 88%)",
              filter: "blur(18px)",
            }}
          />
          {/* Broad volumetric lighting cone */}
          <div
            className="absolute top-[-100px] left-0 w-[76vw] max-w-[660px] h-[200px]"
            style={{
              background:
                "radial-gradient(ellipse 70% 50% at 0% 50%, rgba(35, 240, 65, 0.65) 0%, rgba(31, 224, 58, 0.28) 30%, transparent 75%)",
              filter: "blur(36px)",
            }}
          />
        </div>

        {/* Corner Apex Glow (Top-Right) */}
        <div
          className="absolute -top-14 -right-14 w-52 h-52 pointer-events-none"
          style={{
            background:
              "radial-gradient(circle at 65% 35%, rgba(65, 255, 100, 0.7) 0%, rgba(31, 224, 58, 0.32) 40%, transparent 70%)",
            filter: "blur(26px)",
          }}
        />
      </div>

      {/* Subtle Bottom Ambient Green Glow */}
      <div
        className="absolute -bottom-36 left-1/2 -translate-x-1/2 w-[80vw] max-w-[800px] h-[350px] opacity-25 blur-3xl pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(31, 224, 58, 0.2) 0%, transparent 70%)",
        }}
      />

      {/* Fine grid/texture overlay */}
      <div
        className="absolute inset-0 opacity-[0.025] pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.1) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />
    </div>
  );
}
