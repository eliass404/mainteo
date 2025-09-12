import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartConfig } from "@/components/ui/chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ProfessionalPieChartProps {
  data: Array<{
    name: string;
    value: number;
    color?: string;
  }>;
  title?: string;
  description?: string;
  height?: number;
  showLegend?: boolean;
  showAnimation?: boolean;
  innerRadius?: number;
  outerRadius?: number;
}

const COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

export const ProfessionalPieChart = ({ 
  data, 
  title, 
  description, 
  height = 300,
  showLegend = true,
  showAnimation = true,
  innerRadius = 0,
  outerRadius = 80
}: ProfessionalPieChartProps) => {
  const config: ChartConfig = data.reduce((acc, item, index) => {
    acc[item.name] = {
      label: item.name,
      color: item.color || COLORS[index % COLORS.length],
    };
    return acc;
  }, {} as ChartConfig);

  const CustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    if (percent < 0.05) return null; // Don't show labels for slices smaller than 5%

    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        fontSize={12}
        fontWeight={600}
        filter="url(#textShadow)"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

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
            <PieChart>
              <defs>
                {data.map((item, index) => (
                  <linearGradient 
                    key={`gradient-${index}`} 
                    id={`pieGradient-${index}`} 
                    x1="0" 
                    y1="0" 
                    x2="1" 
                    y2="1"
                  >
                    <stop 
                      offset="0%" 
                      stopColor={item.color || COLORS[index % COLORS.length]} 
                      stopOpacity={1}
                    />
                    <stop 
                      offset="100%" 
                      stopColor={item.color || COLORS[index % COLORS.length]} 
                      stopOpacity={0.7}
                    />
                  </linearGradient>
                ))}
                <filter id="pieShadow" x="-50%" y="-50%" width="200%" height="200%">
                  <feDropShadow dx="2" dy="4" stdDeviation="4" floodOpacity="0.3"/>
                </filter>
                <filter id="textShadow">
                  <feDropShadow dx="1" dy="1" stdDeviation="1" floodOpacity="0.8"/>
                </filter>
              </defs>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={CustomLabel}
                outerRadius={outerRadius}
                innerRadius={innerRadius}
                fill="#8884d8"
                dataKey="value"
                animationBegin={showAnimation ? 0 : undefined}
                animationDuration={showAnimation ? 1000 : 0}
                filter="url(#pieShadow)"
              >
                {data.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={`url(#pieGradient-${index})`}
                    stroke="hsl(var(--background))"
                    strokeWidth={3}
                    className="hover:brightness-110 transition-all duration-300 cursor-pointer"
                  />
                ))}
              </Pie>
              <ChartTooltip 
                content={<ChartTooltipContent hideLabel />}
              />
              {showLegend && (
                <Legend 
                  verticalAlign="bottom" 
                  height={36}
                  iconType="circle"
                  wrapperStyle={{
                    paddingTop: '20px',
                    fontSize: '14px',
                    fontWeight: '500'
                  }}
                />
              )}
            </PieChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
};