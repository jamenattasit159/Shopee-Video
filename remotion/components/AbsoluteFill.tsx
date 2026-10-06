import React from "react";

export const AbsoluteFill: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  style,
  children,
  ...props
}) => {
  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
};
