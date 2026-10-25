/** Decorative scenery behind the platform: atmospheric top neon-green aura and ambient glow */
export function Backdrop() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[#040705]">
      {/* ========================================================= */}
      {/* TOP-LEFT 45° LIGHTING BEAM                                */}
      {/* Originates at screen corner (0,0), shoots along 45° ray  */}
      {/* Maximum strength in corner, progressively low in middle   */}
      {/* ========================================================= */}
      <div className="pointer-events-none fixed top-0 left-0 z-0">
        <div
          className="relative"
          style={{
            transformOrigin: "0 0",
            transform: "rotate(45deg)",
          }}
        >
          {/* Central high-intensity beam core */}
          <div
            className="absolute top-[-30px] left-0 w-[65vw] max-w-[560px] h-[60px]"
            style={{
              background:
                "linear-gradient(to right, rgba(46, 240, 75, 1) 0%, rgba(35, 230, 65, 0.85) 22%, rgba(31, 224, 58, 0.3) 55%, transparent 95%)",
              filter: "blur(16px)",
            }}
          />
          {/* Broad volumetric lighting cone */}
          <div
            className="absolute top-[-110px] left-0 w-[78vw] max-w-[680px] h-[220px]"
            style={{
              background:
                "radial-gradient(ellipse 70% 50% at 0% 50%, rgba(35, 240, 65, 0.9) 0%, rgba(31, 224, 58, 0.5) 28%, rgba(31, 224, 58, 0.12) 60%, transparent 80%)",
              filter: "blur(32px)",
            }}
          />
          {/* Secondary bright ray shaft */}
          <div
            className="absolute top-[-50px] left-0 w-[55vw] max-w-[480px] h-[100px]"
            style={{
              background:
                "linear-gradient(to right, rgba(80, 255, 110, 0.95) 0%, rgba(31, 224, 58, 0.55) 35%, transparent 80%)",
              filter: "blur(22px)",
            }}
          />
        </div>

        {/* Corner Apex Glow (Top-Left) */}
        <div
          className="absolute -top-14 -left-14 w-52 h-52 pointer-events-none"
          style={{
            background:
              "radial-gradient(circle at 35% 35%, rgba(65, 255, 100, 0.95) 0%, rgba(31, 224, 58, 0.65) 40%, transparent 72%)",
            filter: "blur(24px)",
          }}
        />
      </div>

      {/* ========================================================= */}
      {/* TOP-RIGHT 125° LIGHTING BEAM                               */}
      {/* Originates at screen corner (100%,0), shoots into screen */}
      {/* Maximum strength in corner, progressively low in middle   */}
      {/* ========================================================= */}
      <div className="pointer-events-none fixed top-0 right-0 z-0">
        <div
          className="relative"
          style={{
            transformOrigin: "0 0",
            transform: "rotate(135deg)",
          }}
        >
          {/* Central high-intensity beam core */}
          <div
            className="absolute top-[-30px] left-0 w-[65vw] max-w-[560px] h-[60px]"
            style={{
              background:
                "linear-gradient(to right, rgba(46, 240, 75, 1) 0%, rgba(35, 230, 65, 0.85) 22%, rgba(31, 224, 58, 0.3) 55%, transparent 95%)",
              filter: "blur(16px)",
            }}
          />
          {/* Broad volumetric lighting cone */}
          <div
            className="absolute top-[-110px] left-0 w-[78vw] max-w-[680px] h-[220px]"
            style={{
              background:
                "radial-gradient(ellipse 70% 50% at 0% 50%, rgba(35, 240, 65, 0.9) 0%, rgba(31, 224, 58, 0.5) 28%, rgba(31, 224, 58, 0.12) 60%, transparent 80%)",
              filter: "blur(32px)",
            }}
          />
          {/* Secondary bright ray shaft */}
          <div
            className="absolute top-[-50px] left-0 w-[55vw] max-w-[480px] h-[100px]"
            style={{
              background:
                "linear-gradient(to right, rgba(80, 255, 110, 0.95) 0%, rgba(31, 224, 58, 0.55) 35%, transparent 80%)",
              filter: "blur(22px)",
            }}
          />
        </div>

        {/* Corner Apex Glow (Top-Right) */}
        <div
          className="absolute -top-14 -right-14 w-52 h-52 pointer-events-none"
          style={{
            background:
              "radial-gradient(circle at 65% 35%, rgba(65, 255, 100, 0.95) 0%, rgba(31, 224, 58, 0.65) 40%, transparent 72%)",
            filter: "blur(24px)",
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
