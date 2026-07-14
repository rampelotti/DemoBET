"use client";

/**
 * Partículas vermelhas discretas no fundo — leve, só CSS, sem canvas.
 * Fixo atrás do conteúdo (`-z-10`) para não interferir em cliques.
 */
export function ParticleBackground() {
  const particles = Array.from({ length: 72 }, (_, index) => ({
    id: index,
    left: `${(index * 13 + 5) % 100}%`,
    top: `${(index * 19 + 3) % 100}%`,
    size: 2 + (index % 4),
    delay: `${(index * 0.5) % 14}s`,
    duration: `${12 + (index % 10)}s`,
    opacity: 0.1 + (index % 6) * 0.035,
  }));

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {particles.map((particle) => (
        <span
          key={particle.id}
          className="particle-dot absolute rounded-full bg-primary"
          style={{
            left: particle.left,
            top: particle.top,
            width: particle.size,
            height: particle.size,
            opacity: particle.opacity,
            animationDelay: particle.delay,
            animationDuration: particle.duration,
          }}
        />
      ))}
    </div>
  );
}
