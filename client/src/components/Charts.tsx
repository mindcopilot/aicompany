interface SparklineProps { data: number[]; w?: number; h?: number; color?: string; fill?: boolean; }
export function Sparkline({ data, w = 100, h = 28, color = "currentColor", fill = true }: SparklineProps) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const step = w / (data.length - 1);
  const pts = data.map((v, i) => [i * step, h - 2 - ((v - min) / range) * (h - 4)] as [number, number]);
  const line = pts.map((p, i) => (i === 0 ? `M${p[0]},${p[1]}` : `L${p[0]},${p[1]}`)).join(" ");
  const area = line + ` L${w},${h} L0,${h} Z`;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: "block" }}>
      {fill && <path d={area} fill={color} fillOpacity={0.08} />}
      <path d={line} fill="none" stroke={color} strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

interface LineSeries { name: string; color: string; data: number[]; dots?: boolean; fill?: boolean; }
interface LineChartProps { series: LineSeries[]; height?: number; labels?: string[]; showAxis?: boolean; }
export function LineChart({ series, height = 220, labels = [], showAxis = true }: LineChartProps) {
  const w = 800;
  const h = height;
  const padL = 40, padR = 16, padT = 16, padB = showAxis ? 28 : 12;
  const allVals = series.flatMap(s => s.data);
  const max = Math.max(...allVals);
  const min = Math.min(0, Math.min(...allVals));
  const range = max - min || 1;
  const n = series[0]?.data.length ?? 0;
  const xStep = n > 1 ? (w - padL - padR) / (n - 1) : 0;
  const yFor = (v: number) => padT + (1 - (v - min) / range) * (h - padT - padB);

  const gridY = 4;
  const gridLines = Array.from({ length: gridY + 1 }, (_, i) => {
    const v = min + (range * i) / gridY;
    return { y: yFor(v), label: formatNum(v) };
  });

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="chart-svg" preserveAspectRatio="none">
      {gridLines.map((g, i) => (
        <g key={i}>
          <line x1={padL} y1={g.y} x2={w - padR} y2={g.y} className="chart-gridline" />
          {showAxis && <text x={padL - 6} y={g.y + 3} textAnchor="end" className="chart-axis-label">{g.label}</text>}
        </g>
      ))}
      {showAxis && labels.map((lab, i) => (
        <text key={i} x={padL + i * xStep} y={h - 8} textAnchor="middle" className="chart-axis-label">{lab}</text>
      ))}
      {series.map((s, idx) => {
        const pts = s.data.map((v, i) => [padL + i * xStep, yFor(v)] as [number, number]);
        const path = pts.map((p, i) => (i === 0 ? `M${p[0]},${p[1]}` : `L${p[0]},${p[1]}`)).join(" ");
        const last = pts[pts.length - 1];
        const first = pts[0];
        const area = last && first ? path + ` L${last[0]},${yFor(min)} L${first[0]},${yFor(min)} Z` : path;
        return (
          <g key={idx}>
            {s.fill !== false && <path d={area} fill={s.color} fillOpacity={0.06} />}
            <path d={path} fill="none" stroke={s.color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
            {s.dots && pts.map((p, i) => (
              <circle key={i} cx={p[0]} cy={p[1]} r={2.5} fill="#fff" stroke={s.color} strokeWidth={1.5} />
            ))}
          </g>
        );
      })}
    </svg>
  );
}

interface BarChartProps { data: number[]; height?: number; labels?: string[]; color?: string; }
export function BarChart({ data, height = 180, labels = [], color }: BarChartProps) {
  const w = 800;
  const h = height;
  const padL = 36, padR = 16, padT = 16, padB = 26;
  const max = Math.max(...data) || 1;
  const xStep = (w - padL - padR) / data.length;
  const barW = xStep * 0.55;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="chart-svg" preserveAspectRatio="none">
      {[0, 0.25, 0.5, 0.75, 1].map((p, i) => {
        const y = padT + (1 - p) * (h - padT - padB);
        const v = max * p;
        return (
          <g key={i}>
            <line x1={padL} y1={y} x2={w - padR} y2={y} className="chart-gridline" />
            <text x={padL - 6} y={y + 3} textAnchor="end" className="chart-axis-label">{formatNum(v)}</text>
          </g>
        );
      })}
      {data.map((v, i) => {
        const barH = (v / max) * (h - padT - padB);
        const x = padL + i * xStep + (xStep - barW) / 2;
        const y = h - padB - barH;
        return (
          <g key={i}>
            <rect x={x} y={y} width={barW} height={barH} fill={color || "currentColor"} rx={3} />
            {labels[i] && <text x={x + barW / 2} y={h - 8} textAnchor="middle" className="chart-axis-label">{labels[i]}</text>}
          </g>
        );
      })}
    </svg>
  );
}

interface DonutDatum { name: string; value: number; color: string; }
export function DonutChart({ data, size = 140, thickness = 18 }: { data: DonutDatum[]; size?: number; thickness?: number; }) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const cx = size / 2, cy = size / 2;
  const r = size / 2 - thickness / 2 - 4;
  let acc = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--bg-mute)" strokeWidth={thickness} />
      {data.map((d, i) => {
        const frac = d.value / total;
        const len = 2 * Math.PI * r * frac;
        const gap = 2 * Math.PI * r;
        const dash = `${len} ${gap - len}`;
        const rot = (acc / total) * 360 - 90;
        acc += d.value;
        return (
          <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={d.color} strokeWidth={thickness} strokeLinecap="butt" strokeDasharray={dash} transform={`rotate(${rot} ${cx} ${cy})`} />
        );
      })}
    </svg>
  );
}

export function RetentionCurve({ heights, height = 140 }: { heights: number[]; height?: number; }) {
  const w = 800;
  const h = height;
  const padL = 32, padR = 16, padT = 12, padB = 22;
  const xStep = (w - padL - padR) / (heights.length - 1);
  const yFor = (v: number) => padT + (1 - v / 100) * (h - padT - padB);
  const pts = heights.map((v, i) => [padL + i * xStep, yFor(v)] as [number, number]);
  const path = pts.map((p, i) => (i === 0 ? `M${p[0]},${p[1]}` : `L${p[0]},${p[1]}`)).join(" ");
  const last = pts[pts.length - 1];
  const first = pts[0];
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="chart-svg" preserveAspectRatio="none">
      {[0, 25, 50, 75, 100].map((p, i) => {
        const y = yFor(p);
        return (
          <g key={i}>
            <line x1={padL} y1={y} x2={w - padR} y2={y} className="chart-gridline" />
            <text x={padL - 6} y={y + 3} textAnchor="end" className="chart-axis-label">{p}%</text>
          </g>
        );
      })}
      {last && first && <path d={path + ` L${last[0]},${yFor(0)} L${first[0]},${yFor(0)} Z`} fill="var(--accent)" fillOpacity={0.06} />}
      <path d={path} fill="none" stroke="var(--accent)" strokeWidth={1.8} strokeLinecap="round" />
      {pts.map((p, i) => (
        <g key={i}>
          <circle cx={p[0]} cy={p[1]} r={3} fill="#fff" stroke="var(--accent)" strokeWidth={1.5} />
          <text x={p[0]} y={h - 6} textAnchor="middle" className="chart-axis-label">W{i}</text>
        </g>
      ))}
    </svg>
  );
}

function formatNum(v: number): string {
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(1) + "M";
  if (v >= 1000) return (v / 1000).toFixed(1) + "k";
  if (v < 1 && v > 0) return v.toFixed(2);
  return Math.round(v).toString();
}

export function HeatGrid({ rows = 7, cols = 24, intensity = [] }: { rows?: number; cols?: number; intensity?: number[][]; }) {
  const cell = 12;
  const gap = 2;
  return (
    <svg width={cols * (cell + gap)} height={rows * (cell + gap)}>
      {Array.from({ length: rows }).map((_, r) =>
        Array.from({ length: cols }).map((_, c) => {
          const v = intensity[r]?.[c] ?? 0;
          return (
            <rect key={`${r}-${c}`} x={c * (cell + gap)} y={r * (cell + gap)} width={cell} height={cell} rx={2}
              fill={`rgba(79,70,229,${0.06 + v * 0.85})`} />
          );
        })
      )}
    </svg>
  );
}
