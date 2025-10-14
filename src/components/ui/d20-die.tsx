"use client";

import { cn } from "@/lib/utils";

interface D20DieProps {
  value: number;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function D20Die({ value, className, size = "md" }: D20DieProps) {
  // Get size classes for testing
  const getSizeClasses = (size: "sm" | "md" | "lg") => {
    switch (size) {
      case "sm":
        return "w-8 h-8 text-xs";
      case "md":
        return "w-12 h-12 text-sm";
      case "lg":
        return "w-16 h-16 text-base";
      default:
        return "w-12 h-12 text-sm";
    }
  };

  // Get color classes for testing
  const getColorClasses = (roll: number) => {
    if (roll >= 19) {
      return "from-yellow-400 to-yellow-600"; // Critical success
    }
    if (roll >= 16) {
      return "from-green-400 to-green-600"; // High success
    }
    if (roll >= 11) {
      return "from-blue-400 to-blue-600"; // Medium success
    }
    if (roll >= 6) {
      return "from-orange-400 to-orange-600"; // Low success
    }
    return "from-red-400 to-red-600"; // Failure
  };

  const sizeConfig = {
    sm: {
      containerSize: 80,
      faceWidth: 40,
      faceHeight: 34.6,
      fontSize: "13px",
    },
    md: {
      containerSize: 120,
      faceWidth: 60,
      faceHeight: 51.9,
      fontSize: "15px",
    },
    lg: {
      containerSize: 160,
      faceWidth: 80,
      faceHeight: 69.3,
      fontSize: "18px",
    },
  };

  const config = sizeConfig[size];

  // Color based on luck value (1-20)
  const getColorStyle = (roll: number) => {
    if (roll >= 19) {
      return {
        "--face-color": "rgba(186 36 255 / 0.85)",
        "--text-color": "#3c2447",
      };
    }
    if (roll >= 16) {
      return {
        "--face-color": "rgba(34, 197, 94, 0.85)",
        "--text-color": "#14532d",
      };
    }
    if (roll >= 11) {
      return {
        "--face-color": "rgba(59 134 255 / 0.85)",
        "--text-color": "#1e3a8a",
      };
    }
    if (roll >= 6) {
      return {
        "--face-color": "rgba(251, 146, 60, 0.85)",
        "--text-color": "#9a3412",
      };
    }
    return {
      "--face-color": "rgba(239, 68, 68, 0.85)",
      "--text-color": "#991b1b",
    };
  };

  return (
    <div
      className={cn(
        "relative mx-auto bg-gradient-to-br",
        getSizeClasses(size),
        getColorClasses(value),
        className,
      )}
      style={{
        width: `${config.containerSize}px`,
        height: `${config.containerSize}px`,
        perspective: "800px",
        ...getColorStyle(value),
      }}
      title={`Luck Roll: ${value}/20`}
    >
      <div
        className="absolute w-full h-full transition-transform duration-500 ease-out cursor-pointer"
        style={{
          transformStyle: "preserve-3d",
          transform: `${getDieRotation(value)}`,
        }}
      >
        {/* Generate all 20 faces */}
        {Array.from({ length: 20 }, (_, i) => {
          const faceNumber = i + 1;
          const isTargetFace = faceNumber === value;
          const faceOpacity = isTargetFace ? 1 : 0.8; // Darken non-target faces
          const textOpacity = isTargetFace ? 1 : 0.4; // Slightly darken text on non-target faces

          return (
            <div
              key={faceNumber}
              className="absolute font-bold"
              style={{
                left: "50%",
                top: "0",
                marginLeft: `-${config.faceWidth / 2}px`,
                width: "0",
                height: "0",
                borderLeft: `${config.faceWidth / 2}px solid transparent`,
                borderRight: `${config.faceWidth / 2}px solid transparent`,
                borderBottom: `${config.faceHeight}px solid var(--face-color)`,
                transformStyle: "preserve-3d",
                backfaceVisibility: "hidden",
                opacity: faceOpacity,
                ...getFaceTransform(faceNumber, config),
              }}
            >
              <span
                className="absolute font-bold text-center leading-none"
                style={{
                  top: `${config.faceHeight * 0.25}px`,
                  left: `-${config.faceWidth}px`,
                  width: `${config.faceWidth * 2}px`,
                  height: `${config.faceHeight}px`,
                  color: "var(--text-color)",
                  fontSize: config.fontSize,
                  lineHeight: `${config.faceHeight * 0.9}px`,
                  opacity: textOpacity,
                }}
              >
                {faceNumber}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Get the rotation for showing a specific face
function getDieRotation(face: number): string {
  // Direct mapping of each face to its rotation to bring it to the front
  // These rotations are the inverse of the face positioning transforms
  const rotations: Record<number, string> = {
    // Top faces (1-5)
    1: "rotateX(-60deg) rotateY(0deg)",
    2: "rotateX(-60deg) rotateY(72deg)",
    3: "rotateX(-60deg) rotateY(144deg)",
    4: "rotateX(-60deg) rotateY(216deg)",
    5: "rotateX(-60deg) rotateY(288deg)",

    // Upper ring (6-10) - need to flip and rotate to bring to front
    6: "rotateX(5deg) rotateZ(180deg) rotateY(0deg)",
    7: "rotateX(5deg) rotateZ(180deg) rotateY(72deg)",
    8: "rotateX(5deg) rotateZ(180deg) rotateY(144deg)",
    9: "rotateX(5deg) rotateZ(180deg) rotateY(216deg)",
    10: "rotateX(5deg) rotateZ(180deg) rotateY(288deg)",

    // Lower ring (11-15) - rotate to bring to front
    11: "rotateX(5deg) rotateY(-36deg)",
    12: "rotateX(5deg) rotateY(-108deg)",
    13: "rotateX(5deg) rotateY(-180deg)",
    14: "rotateX(5deg) rotateY(-252deg)",
    15: "rotateX(5deg) rotateY(-324deg)",

    // Bottom faces (16-20) - flip upside down and rotate
    16: "rotateX(-60deg) rotateZ(180deg) rotateY(324deg)",
    17: "rotateX(-60deg) rotateZ(180deg) rotateY(252deg)",
    18: "rotateX(-60deg) rotateZ(180deg) rotateY(180deg)",
    19: "rotateX(-60deg) rotateZ(180deg) rotateY(108deg)",
    20: "rotateX(-60deg) rotateZ(180deg) rotateY(36deg)",
  };

  return rotations[face] || "";
}

// Get the 3D transform for each face
function getFaceTransform(
  face: number,
  config: { faceWidth: number; faceHeight: number },
): React.CSSProperties {
  const sideAngle = 72; // 360/5
  const angle = 53;
  const ringAngle = -11;
  const translateZ = config.faceWidth * 0.335;
  const translateY = -config.faceHeight * 0.15;
  const translateRingZ = config.faceWidth * 0.75;
  const translateRingY = config.faceHeight * 0.78 + translateY;
  const translateLowerZ = translateZ;
  const translateLowerY = config.faceHeight * 0.78 + translateRingY;

  // Top faces (1-5)
  if (face >= 1 && face <= 5) {
    const angleMultiplier = face - 1;
    return {
      transform: `rotateY(${-sideAngle * angleMultiplier}deg) translateZ(${translateZ}px) translateY(${translateY}px) rotateX(${angle}deg)`,
    };
  }

  // Upper ring (6-10)
  if (face >= 6 && face <= 10) {
    const angleMultiplier = face - 6;
    return {
      transform: `rotateY(${-sideAngle * angleMultiplier}deg) translateZ(${translateRingZ}px) translateY(${translateRingY}px) rotateZ(180deg) rotateX(${ringAngle}deg)`,
    };
  }

  // Lower ring (11-15)
  if (face >= 11 && face <= 15) {
    const angleMultiplier = face - 11;
    return {
      transform: `rotateY(${sideAngle * angleMultiplier + sideAngle / 2}deg) translateZ(${translateRingZ}px) translateY(${translateRingY}px) rotateX(${ringAngle}deg)`,
    };
  }

  // Bottom faces (16-20)
  if (face >= 16 && face <= 20) {
    const angleMultiplier = face - 16;
    return {
      transform: `rotateY(${sideAngle * angleMultiplier + sideAngle / 2}deg) translateZ(${translateLowerZ}px) translateY(${translateLowerY}px) rotateZ(180deg) rotateX(${angle}deg)`,
    };
  }

  return {};
}
