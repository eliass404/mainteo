import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartConfig } from "@/components/ui/chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ProfessionalLineChartProps {
  data: Array<{
    name: string;
    value: number;
    [key: string]: any;
  }>;
  title?: string;
  description?: string;
  height?: number;
  showArea?: boolean;
  showGradient?: boolean;
  showAnimation?: boolean;
  color?: string;
  lineWidth?: number;
}

export const ProfessionalLineChart = ({ 
  data, 
  title, 
  description, 
  height = 300,
  showArea = false,
  showGradient = true,
  showAnimation = true,
  color = "hsl(var(--primary))",
  lineWidth = 3
}: ProfessionalLineChartProps) => {
  const config: ChartConfig = {
    value: {
      label: "Valeur",
      color: color,
    },
  };

  const ChartComponent = showArea ? AreaChart : LineChart;

  return (
    <Card className="glass-card border-tech">
      {(title || description) && (
        <CardHeader className="pb-4">
          {title && (
            <CardTitle className="text-xl font-semibold bg-gradient-primary bg-clip-text text-transparent">
              {title}
            </CardTitle>
          )}
          {description && (
            <p className="text-muted-foreground text-sm">{description}</p>
          )}
        </CardHeader>
      )}
      <CardContent>
        <ChartContainer config={config} className={`min-h-[${height}px]`}>
          <ResponsiveContainer width="100%" height={height}>
            <ChartComponent
              data={data}
              margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
            >
              <defs>
                {showGradient && (
                  <linearGradient id="lineGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity={0.8} />
                    <stop offset="100%" stopColor={color} stopOpacity={0.1} />
                  </linearGradient>
                )}
                <filter id="glow">
                  <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                  <feMerge> 
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>
              <CartesianGrid 
                strokeDasharray="3 3" 
                stroke="hsl(var(--border))" 
                opacity={0.3}
                strokeWidth={1}
              />
              <XAxis 
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ 
                  fontSize: 12, 
                  fill: 'hsl(var(--foreground))', 
                  fontWeight: 500 
                }}
                dy={10}
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{ 
                  fontSize: 12, 
                  fill: 'hsl(var(--muted-foreground))', 
                  fontWeight: 500 
                }}
                dx={-10}
              />
              <ChartTooltip 
                content={<ChartTooltipContent />}
                cursor={{ 
                  stroke: color, 
                  strokeWidth: 2, 
                  strokeDasharray: "5 5",
                  opacity: 0.7 
                }}
              />
              
              {showArea ? (
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={color}
                  strokeWidth={lineWidth}
                  fill={showGradient ? "url(#lineGradient)" : color}
                  fillOpacity={showGradient ? 1 : 0.3}
                  filter="url(#glow)"
                  animationDuration={showAnimation ? 1500 : 0}
                  animationBegin={showAnimation ? 300 : 0}
                />
              ) : (
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke={color}
                  strokeWidth={lineWidth}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  filter="url(#glow)"
                  dot={{ 
                    fill: color, 
                    strokeWidth: 2, 
                    stroke: 'hsl(var(--background))',
                    r: 6,
                    className: "hover:r-8 transition-all duration-300 cursor-pointer"
                  }}
                  activeDot={{ 
                    r: 8, 
                    fill: color,
                    strokeWidth: 3,
                    stroke: 'hsl(var(--background))',
                    filter: "url(#glow)"
                  }}
                  animationDuration={showAnimation ? 1500 : 0}
                  animationBegin={showAnimation ? 300 : 0}
                />
              )}
            </ChartComponent>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
};