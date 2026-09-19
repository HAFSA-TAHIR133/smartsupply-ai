"use client";
import React from "react";
import { motion } from "framer-motion";

export const BackgroundBeams = ({ className = "" }) => {
  const paths = [
    "M-100 -100 L800 800",
    "M-50 -100 L850 850",
    "M0 -100 L900 900",
    "M50 -100 L950 950",
    "M100 -100 L1000 1000",
    "M150 -100 L1050 1050",
    "M200 -100 L1100 1100",
    "M250 -100 L1150 1150",
    "M300 -100 L1200 1200",
    "M350 -100 L1250 1250",
    "M400 -100 L1300 1300",
    "M450 -100 L1350 1350",
  ];

  return (
    <div
      className={`fixed inset-0 w-full h-full pointer-events-none z-0 overflow-hidden ${className}`}
      style={{
        WebkitMaskImage: "radial-gradient(ellipse at center, black 60%, transparent 100%)",
        maskImage: "radial-gradient(ellipse at center, black 60%, transparent 100%)",
      }}
    >
      {/* Background Glows */}
      <motion.div
        initial={{ opacity: 0.3 }}
        animate={{ opacity: [0.3, 0.7, 0.3] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-600/25 rounded-full blur-[130px]"
      />

      {/* Visible SVG Laser Beams */}
      <svg
        className="absolute inset-0 w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 1080 900"
        preserveAspectRatio="none"
      >
        {paths.map((path, idx) => (
          <motion.path
            key={`beam-path-${idx}`}
            d={path}
            stroke="url(#beam-gradient)"
            strokeWidth="2"
            initial={{ pathLength: 0, opacity: 0.2 }}
            animate={{
              pathLength: [0, 1, 0.8, 0],
              opacity: [0.2, 1, 0.6, 0.2],
            }}
            transition={{
              duration: 6 + (idx % 3) * 2,
              repeat: Infinity,
              ease: "easeInOut",
              delay: idx * 0.2,
            }}
          />
        ))}

        <defs>
          <linearGradient id="beam-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6366f1" stopOpacity="0" />
            <stop offset="50%" stopColor="#818cf8" stopOpacity="1" />
            <stop offset="100%" stopColor="#c084fc" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
};