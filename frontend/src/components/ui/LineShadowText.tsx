import React from "react"

interface LineShadowTextProps extends React.HTMLAttributes<HTMLElement> {
  shadowColor?: string
  children: string
}

export function LineShadowText({
  children,
  shadowColor = "rgba(52, 152, 219, 0.6)",
  className = "",
  ...props
}: LineShadowTextProps) {
  return (
    <span
      className={`line-shadow-text ${className}`}
      style={{ "--shadow-color": shadowColor } as React.CSSProperties}
      data-text={children}
      {...props}
    >
      {children}
    </span>
  )
}
