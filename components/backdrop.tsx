/** Decorative scenery behind the platform: atmospheric top neon-green aura and ambient glow */
export function Backdrop() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[#040705]">
      {/* Top Center Emerald Radial Atmosphere (matches FluxChain hero glow) */}
      <div
        className="absolute -top-32 left-1/2 -translate-x-1/2 w-[120vw] max-w-[900px] h-[550px] opacity-75 blur-3xl pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(31, 224, 58, 0.28) 0%, rgba(16, 185, 129, 0.12) 35%, rgba(4, 7, 5, 0) 70%)",
        }}
      />

      {/* Top Left Volumetric Angled Glow (matches Neon Eco-Tech CO₂ graphic) */}
      <div
        className="absolute -top-24 -left-20 w-[480px] h-[480px] pointer-events-none opacity-60"
        style={{
          background:
            "radial-gradient(ellipse at 25% 25%, rgba(31, 224, 58, 0.45) 0%, rgba(16, 185, 129, 0.2) 35%, rgba(31, 224, 58, 0.05) 60%, transparent 80%)",
          filter: "blur(40px)",
        }}
      />
      {/* Top Right Volumetric Angled Glow (matches Neon Eco-Tech CO₂ graphic) */}
      <div
        className="absolute -top-24 -right-20 w-[480px] h-[480px] pointer-events-none opacity-60"
        style={{
          background:
            "radial-gradient(ellipse at 75% 25%, rgba(31, 224, 58, 0.45) 0%, rgba(16, 185, 129, 0.2) 35%, rgba(31, 224, 58, 0.05) 60%, transparent 80%)",
          filter: "blur(40px)",
        }}
      />

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
