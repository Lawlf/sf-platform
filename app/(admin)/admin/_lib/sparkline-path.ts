/** Builds an SVG polyline path mapping values to a w×h box (max=top, min=bottom). */
export function buildSparklinePath(values: number[], width: number, height: number): string {
  if (values.length === 0) return "";
  if (values.length === 1) return `M 0 ${height / 2} L ${width} ${height / 2}`;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const span = max - min || 1;
  const stepX = width / (values.length - 1);
  return values
    .map((v, i) => {
      const x = Math.round(i * stepX);
      const y = Math.round(((max - v) / span) * height);
      return `${i === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");
}
