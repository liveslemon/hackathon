"use client";
import React, { useState } from "react";
import Image from "next/image";
import { cx } from "@/utils/cx";

export interface AvatarProps {
  src?: string | null;
  alt?: string;
  name?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({
  src,
  alt = "User avatar",
  name,
  size = "md",
  className,
}) => {
  const [imageError, setImageError] = useState(false);

  const sizes = {
    xs: "w-6 h-6 text-[10px]",
    sm: "w-8 h-8 text-xs",
    md: "w-10 h-10 text-sm",
    lg: "w-12 h-12 text-base",
    xl: "w-16 h-16 text-lg",
  };

  const getInitials = (n?: string) => {
    if (!n) return "U";
    const parts = n.trim().split(" ");
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return n.slice(0, 2).toUpperCase();
  };

  const hasImage = Boolean(src && !imageError);

  return (
    <div
      className={cx(
        "relative rounded-full overflow-hidden shrink-0 flex items-center justify-center font-bold select-none border border-border/80 bg-brand-subtle text-brand",
        sizes[size],
        className,
      )}
    >
      {hasImage ? (
        <Image
          src={src!}
          alt={alt}
          fill
          sizes="64px"
          className="object-cover"
          onError={() => setImageError(true)}
        />
      ) : (
        <span>{getInitials(name)}</span>
      )}
    </div>
  );
};
