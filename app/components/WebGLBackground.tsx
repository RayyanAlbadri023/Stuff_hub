"use client";

import { useRef, useMemo, useState, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

function ParticleCloud() {
  const pointsRef = useRef<THREE.Points>(null);

  const count = 3000;

  const [positions, colors] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const color = new THREE.Color();

    for (let i = 0; i < count; i++) {
      // Abstract galaxy/brain-like shape — same distribution as ebanah.com
      const r = 25 * Math.random() + 2;
      const theta = 2 * Math.PI * Math.random();
      const phi = Math.acos(2 * Math.random() - 1);

      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta) * 0.4; // flatter on Y
      const z = r * Math.cos(phi);

      pos[i * 3] = x;
      pos[i * 3 + 1] = y;
      pos[i * 3 + 2] = z;

      const isRed = Math.random() > 0.4;
      color.set(isRed ? "#F33615" : "#DBFA00");

      // Randomly make some particles white to add depth
      if (Math.random() > 0.9) color.set("#ffffff");

      col[i * 3] = color.r;
      col[i * 3 + 1] = color.g;
      col[i * 3 + 2] = color.b;
    }
    return [pos, col];
  }, []);

  useFrame((state) => {
    if (!pointsRef.current) return;
    const time = state.clock.elapsedTime;

    // Slow rotation
    pointsRef.current.rotation.y = time * 0.05;

    // Interactive mouse movement (adds organic feel)
    pointsRef.current.rotation.x += (state.pointer.y * 0.3 - pointsRef.current.rotation.x) * 0.05;
    pointsRef.current.rotation.z += (state.pointer.x * 0.3 - pointsRef.current.rotation.z) * 0.05;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.12} vertexColors transparent opacity={0.8} sizeAttenuation blending={THREE.AdditiveBlending} />
    </points>
  );
}

/**
 * Ebanah.com's animated particle-cloud background (brand red/yellow points
 * drifting over the near-black brand background). Renders only on the
 * client, and falls back to a plain dark background for users who asked
 * their OS to reduce motion.
 */
export default function WebGLBackground({ className = "" }: { className?: string }) {
  const [mounted, setMounted] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    setMounted(true);
    setReducedMotion(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  if (!mounted || reducedMotion) {
    return <div className={`absolute inset-0 z-0 bg-[#030405] ${className}`} aria-hidden />;
  }

  return (
    <div aria-hidden className={`absolute inset-0 z-0 ${className}`}>
      <Canvas camera={{ position: [0, 5, 20], fov: 60 }} dpr={[1, 1.75]}>
        <color attach="background" args={["#030405"]} />
        <fog attach="fog" args={["#030405", 10, 40]} />
        <ParticleCloud />
      </Canvas>
    </div>
  );
}
