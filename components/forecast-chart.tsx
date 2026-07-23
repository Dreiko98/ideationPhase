import { ForecastEntry } from "@/lib/types";

type Point = ForecastEntry["daily_forecast"][number];

const WIDTH = 720;
const HEIGHT = 260;
const MARGIN = { top: 18, right: 18, bottom: 42, left: 58 };

function shortDate(value: string) {
  return new Intl.DateTimeFormat("en", { day: "numeric", month: "short" }).format(new Date(`${value}T12:00:00`));
}

export function ForecastChart({ data, variant }: { data: Point[]; variant: "band" | "bars" }) {
  if (!data.length) {
    return <div className="flex h-64 items-center justify-center rounded-xl bg-slate-50 text-sm text-slate-500">No forecast data available.</div>;
  }

  const innerWidth = WIDTH - MARGIN.left - MARGIN.right;
  const innerHeight = HEIGHT - MARGIN.top - MARGIN.bottom;
  const maxValue = Math.ceil(Math.max(...data.map((point) => point.upper)) / 50) * 50;
  const minValue = variant === "band" ? Math.max(0, Math.floor(Math.min(...data.map((point) => point.lower)) / 50) * 50) : 0;
  const range = Math.max(maxValue - minValue, 1);
  const x = (index: number) => MARGIN.left + (index / Math.max(data.length - 1, 1)) * innerWidth;
  const y = (value: number) => MARGIN.top + ((maxValue - value) / range) * innerHeight;
  const line = data.map((point, index) => `${index === 0 ? "M" : "L"}${x(index)},${y(point.litres)}`).join(" ");
  const area = [
    ...data.map((point, index) => `${index === 0 ? "M" : "L"}${x(index)},${y(point.upper)}`),
    ...[...data].reverse().map((point, reverseIndex) => {
      const index = data.length - 1 - reverseIndex;
      return `L${x(index)},${y(point.lower)}`;
    }),
    "Z"
  ].join(" ");
  const ticks = Array.from({ length: 5 }, (_, index) => minValue + ((maxValue - minValue) * index) / 4);
  const barWidth = Math.max(10, innerWidth / data.length - 8);

  return (
    <div className="h-72 w-full" data-testid={`forecast-${variant}-chart`}>
      <svg className="h-full w-full overflow-visible" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={variant === "band" ? "Fourteen-day water forecast with uncertainty range" : "Expected daily water consumption for the next fourteen days"}>
        {ticks.map((tick) => (
          <g key={tick}>
            <line x1={MARGIN.left} x2={WIDTH - MARGIN.right} y1={y(tick)} y2={y(tick)} stroke="#dbe4ee" strokeDasharray="4 4" />
            <text x={MARGIN.left - 10} y={y(tick) + 4} textAnchor="end" className="fill-slate-500 text-[11px]">{Math.round(tick)}</text>
          </g>
        ))}
        <text transform={`translate(14 ${MARGIN.top + innerHeight / 2}) rotate(-90)`} textAnchor="middle" className="fill-slate-500 text-[11px]">litres / day</text>

        {variant === "band" ? (
          <>
            <path d={area} fill="#e7effd" stroke="#a9c6f7" strokeWidth="1" />
            <path d={line} fill="none" stroke="#345cae" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
            {data.map((point, index) => (
              <circle key={point.date} cx={x(index)} cy={y(point.litres)} r="4" fill="#345cae" stroke="white" strokeWidth="2">
                <title>{`${shortDate(point.date)}: ${Math.round(point.litres)} L (likely range ${Math.round(point.lower)}–${Math.round(point.upper)} L)`}</title>
              </circle>
            ))}
          </>
        ) : (
          data.map((point, index) => {
            const date = new Date(`${point.date}T12:00:00`);
            const weekend = date.getDay() === 0 || date.getDay() === 6;
            return (
              <rect key={point.date} x={x(index) - barWidth / 2} y={y(point.litres)} width={barWidth} height={MARGIN.top + innerHeight - y(point.litres)} rx="5" fill={weekend ? "#a9c6f7" : "#345cae"}>
                <title>{`${shortDate(point.date)}: ${Math.round(point.litres)} litres${weekend ? " (weekend)" : ""}`}</title>
              </rect>
            );
          })
        )}

        {data.map((point, index) => index % 3 === 0 || index === data.length - 1 ? (
          <text key={point.date} x={x(index)} y={HEIGHT - 14} textAnchor="middle" className="fill-slate-500 text-[11px]">{shortDate(point.date)}</text>
        ) : null)}
      </svg>
    </div>
  );
}
