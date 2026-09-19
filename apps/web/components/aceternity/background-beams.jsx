"use client";
import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";

export const BackgroundBeams = ({ className = "" }) => {
  const [particles, setParticles] = useState([]);

  useEffect(() => {
    // Colors for variety and extra brightness
    const colors = [
      { bg: "bg-white", shadow: "shadow-[0_0_12px_#ffffff]" },
      { bg: "bg-indigo-300", shadow: "shadow-[0_0_14px_#818cf8]" },
      { bg: "bg-purple-300", shadow: "shadow-[0_0_14px_#c084fc]" },
      { bg: "bg-sky-200", shadow: "shadow-[0_0_10px_#38bdf8]" },
    ];

    // Generate 120 dense particles across the entire screen
    const generatedParticles = Array.from({ length: 120 }).map((_, i) => {
      // Vary sizes: 70% small/medium (1.5px - 4px), 30% large bright stars (5px - 8px)
      const isLarge = Math.random() > 0.7;
      const size = isLarge
        ? Math.random() * 3.5 + 4.5  // Large: 4.5px - 8px
        : Math.random() * 2.5 + 1.2; // Small/Medium: 1.2px - 3.7px

      const color = colors[Math.floor(Math.random() * colors.length)];

      return {
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size,
        colorClass: `${color.bg} ${color.shadow}`,
        duration: Math.random() * 5 + 3,
        delay: Math.random() * 4,
        yMove: Math.random() * 50 - 25,
        maxOpacity: isLarge ? 1 : Math.random() * 0.4 + 0.5,
      };
    });

    setParticles(generatedParticles);
  }, []);

  return (
    <div
      className={`fixed inset-0 w-full h-full pointer-events-none z-0 overflow-hidden bg-neutral-950 ${className}`}
    >
      {/* Brighter Ambient Background Glows */}
      <motion.div
        initial={{ opacity: 0.4 }}
        animate={{ opacity: [0.4, 0.8, 0.4] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-1/3 left-1/4 w-[600px] h-[600px] bg-indigo-500/25 rounded-full blur-[140px]"
      />
      <motion.div
        initial={{ opacity: 0.3 }}
        animate={{ opacity: [0.3, 0.7, 0.3] }}
        transition={{ duration: 7, repeat: Infinity, delay: 1.5, ease: "easeInOut" }}
        className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-purple-500/25 rounded-full blur-[140px]"
      />

      {/* 120 Dense Floating Particles & Glowing Stars */}
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className={`absolute rounded-full ${particle.colorClass}`}
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            width: `${particle.size}px`,
            height: `${particle.size}px`,
          }}
          initial={{ opacity: 0.2, scale: 0.8 }}
          animate={{
            opacity: [0.2, particle.maxOpacity, 0.2],
            scale: [0.7, 1.5, 0.7],
            y: [0, particle.yMove, 0],
          }}
          transition={{
            duration: particle.duration,
            repeat: Infinity,
            ease: "easeInOut",
            delay: particle.delay,
          }}
        />
      ))}
    </div>
  );
};