import React, { type PropsWithChildren } from "react";

type GlassCardProps = PropsWithChildren<{
  className?: string;
}>;

export function GlassCard(props: GlassCardProps): React.ReactElement {
  const { children, className } = props;

  const mergedClassName =
    className !== undefined && className.length > 0
      ? `glass-card-root glass-card ${className}`
      : "glass-card-root glass-card";

  return <section className={mergedClassName}>{children}</section>;
}

