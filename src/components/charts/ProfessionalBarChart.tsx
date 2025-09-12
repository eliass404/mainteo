import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Cell } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartConfig } from "@/components/ui/chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ProfessionalBarChartProps {
  data: Array<{
    name: string;
    value: number;
    color?: string;
  }>;
  title?: string;
  description?: string;
  height?: number;
  showGradient?: boolean;
  showAnimation?: boolean;
}

export const ProfessionalBarChart = ({ 
  data, 
  title, 
  description, 
  height = 300,
  showGradient = true,
  showAnimation = true 
}: ProfessionalBarChartProps) => {
  const config: ChartConfig = data.reduce((acc, item, index) => {
    acc[item.name] = {
      label: item.name,
      color: item.color || `hsl(var(--chart-${(index % 5) + 1}))`,
    };
    return acc;
  }, {} as ChartConfig);

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
            <BarChart
              data={data}
              margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
              barCategoryGap="20%"
            >
              <defs>
                {showGradient && data.map((item, index) => (
                  <linearGradient 
                    key={`gradient-${index}`} 
                    id={`barGradient-${index}`} 
                    x1="0" 
                    y1="0" 
                    x2="0" 
                    y2="1"
                  >
                    <stop 
                      offset="0%" 
                      stopColor={item.color || `hsl(var(--chart-${(index % 5) + 1}))`} 
                      stopOpacity={0.9}
                    />
                    <stop 
                      offset="100%" 
                      stopColor={item.color || `hsl(var(--chart-${(index % 5) + 1}))`} 
                      stopOpacity={0.3}
                    />
                  </linearGradient>
                ))}
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
                content={<ChartTooltipContent hideLabel />}
                cursor={{ 
                  fill: 'hsl(var(--primary))', 
                  opacity: 0.1, 
                  radius: 8 
                }}
              />
              <Bar 
                dataKey="value" 
                radius={[8, 8, 0, 0]}
                strokeWidth={2}
                stroke="hsl(var(--border))"
                animationDuration={showAnimation ? 1000 : 0}
                animationBegin={showAnimation ? 200 : 0}
              >
                {data.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={showGradient 
                      ? `url(#barGradient-${index})` 
                      : entry.color || `hsl(var(--chart-${(index % 5) + 1}))`
                    }
                    className="hover:brightness-110 transition-all duration-300 cursor-pointer"
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
};