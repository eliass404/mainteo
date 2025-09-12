import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProfessionalBarChart } from "./ProfessionalBarChart";
import { ProfessionalLineChart } from "./ProfessionalLineChart";
import { ProfessionalPieChart } from "./ProfessionalPieChart";
import { TrendingUp, Activity, AlertTriangle, CheckCircle } from "lucide-react";

interface DashboardAnalyticsProps {
  machineData?: any[];
  interventionData?: any[];
}

export const DashboardAnalytics = ({ machineData = [], interventionData = [] }: DashboardAnalyticsProps) => {
  // Sample data for demonstration - replace with real data
  const performanceData = [
    { name: 'Lun', value: 85 },
    { name: 'Mar', value: 92 },
    { name: 'Mer', value: 78 },
    { name: 'Jeu', value: 95 },
    { name: 'Ven', value: 88 },
    { name: 'Sam', value: 82 },
    { name: 'Dim', value: 90 },
  ];

  const machineStatusData = [
    { name: 'Opérationnelles', value: 12, color: 'hsl(var(--success))' },
    { name: 'Maintenance', value: 3, color: 'hsl(var(--warning))' },
    { name: 'En panne', value: 1, color: 'hsl(var(--destructive))' },
    { name: 'Hors ligne', value: 2, color: 'hsl(var(--muted))' },
  ];

  const interventionTrendData = [
    { name: 'Jan', value: 15 },
    { name: 'Fév', value: 23 },
    { name: 'Mar', value: 18 },
    { name: 'Avr', value: 12 },
    { name: 'Mai', value: 28 },
    { name: 'Jun', value: 22 },
  ];

  const departmentData = [
    { name: 'Production', value: 8, color: 'hsl(var(--chart-1))' },
    { name: 'Maintenance', value: 5, color: 'hsl(var(--chart-2))' },
    { name: 'Qualité', value: 3, color: 'hsl(var(--chart-3))' },
    { name: 'Logistique', value: 2, color: 'hsl(var(--chart-4))' },
  ];

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="glass-card border-tech hover-glow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Performance Globale</p>
                <p className="text-3xl font-bold text-success">92%</p>
                <div className="flex items-center gap-1 mt-1">
                  <TrendingUp className="w-4 h-4 text-success" />
                  <span className="text-xs text-success">+5.2% ce mois</span>
                </div>
              </div>
              <div className="p-3 bg-success/10 rounded-full">
                <Activity className="w-6 h-6 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-tech hover-glow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Machines Actives</p>
                <p className="text-3xl font-bold text-primary">15/18</p>
                <div className="flex items-center gap-1 mt-1">
                  <CheckCircle className="w-4 h-4 text-success" />
                  <span className="text-xs text-muted-foreground">83% opérationnelles</span>
                </div>
              </div>
              <div className="p-3 bg-primary/10 rounded-full">
                <CheckCircle className="w-6 h-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-tech hover-glow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Interventions</p>
                <p className="text-3xl font-bold text-warning">8</p>
                <div className="flex items-center gap-1 mt-1">
                  <AlertTriangle className="w-4 h-4 text-warning" />
                  <span className="text-xs text-muted-foreground">En cours</span>
                </div>
              </div>
              <div className="p-3 bg-warning/10 rounded-full">
                <AlertTriangle className="w-6 h-6 text-warning" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-tech hover-glow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Temps Moyen</p>
                <p className="text-3xl font-bold text-foreground">2.4h</p>
                <div className="flex items-center gap-1 mt-1">
                  <TrendingUp className="w-4 h-4 text-destructive rotate-180" />
                  <span className="text-xs text-destructive">-12% vs mois dernier</span>
                </div>
              </div>
              <div className="p-3 bg-muted/20 rounded-full">
                <Activity className="w-6 h-6 text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ProfessionalLineChart
          data={performanceData}
          title="Performance Hebdomadaire"
          description="Efficacité moyenne des machines par jour"
          height={350}
          showArea={true}
          color="hsl(var(--success))"
        />

        <ProfessionalPieChart
          data={machineStatusData}
          title="État des Machines"
          description="Répartition du statut des machines"
          height={350}
          innerRadius={60}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ProfessionalBarChart
          data={interventionTrendData}
          title="Tendance des Interventions"
          description="Nombre d'interventions par mois"
          height={350}
        />

        <ProfessionalBarChart
          data={departmentData}
          title="Machines par Département"
          description="Distribution des machines par service"
          height={350}
        />
      </div>

      {/* Additional Chart Row */}
      <div className="grid grid-cols-1 gap-6">
        <ProfessionalLineChart
          data={[
            { name: '00:00', value: 65 },
            { name: '04:00', value: 45 },
            { name: '08:00', value: 85 },
            { name: '12:00', value: 92 },
            { name: '16:00', value: 88 },
            { name: '20:00', value: 75 },
          ]}
          title="Performance en Temps Réel"
          description="Utilisation des machines aujourd'hui"
          height={300}
          showArea={true}
          color="hsl(var(--primary))"
        />
      </div>
    </div>
  );
};