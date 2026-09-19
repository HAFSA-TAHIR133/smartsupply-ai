"use client";
import React from "react";
import { cn } from "@/lib/utils";

export const BentoGrid = ({ className, children }) => {
  return (
    <div
      className={cn(
        "grid grid-cols-1 md:grid-cols-3 gap-4 max-w-7xl mx-auto",
        className
      )}
    >
      {children}
    </div>
  );
};

export const BentoGridItem = ({
  className,
  title,
  description,
  header,
  icon,
  children,
}) => {
  return (
    <div
      className={cn(
        "row-span-1 rounded-2xl group/bento hover:shadow-2xl transition duration-300 p-5 bg-zinc-950/80 border border-zinc-800/80 hover:border-indigo-500/50 justify-between flex flex-col space-y-4 backdrop-blur-xl relative overflow-hidden",
        className
      )}
    >
      {header}
      <div className="group-hover/bento:translate-x-1 transition duration-200">
        {icon}
        <div className="font-bold text-white mb-1 text-sm mt-2">
          {title}
        </div>
        <div className="font-normal text-xs text-zinc-400">
          {description}
        </div>
      </div>
      {children}
    </div>
  );
};
