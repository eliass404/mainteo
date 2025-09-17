import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Download, BarChart, PieChart, TrendingUp, Clock, Wrench, MessageCircle } from 'lucide-react';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, PieChart as RechartsPieChart, Cell, Pie, LineChart, Line } from 'recharts';
import { useToast } from '@/hooks/use-toast';

interface TechnicianProfile {
  user_id: string;
  username: string;
  email: string;
}

interface AnalyticsData {
  id: string;
  technician_id: string;
  machine_id: string;
  session_start: string;
  session_end: string;
  questions_count: number;
  interaction_quality: string;
  created_at: string;
  updated_at: string;
}

interface AggregatedStats {
  technician_id: string;
  username: string;
  avgInterventionTime: number;
  machinesWorked: number;
  totalQuestions: number;
  qualityScore: string;
  qualityDistribution: {
    bien: number;
    passable: number;
    mauvais: number;
  };
}

const COLORS = {
  bien: 'hsl(var(--chart-1))',
  passable: 'hsl(var(--chart-2))',
  mauvais: 'hsl(var(--chart-3))'
};

export const AnalyticsDashboard: React.FC = () => {
  const [technicians, setTechnicians] = useState<TechnicianProfile[]>([]);
  const [selectedTechnician, setSelectedTechnician] = useState<string>('');
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData[]>([]);
  const [aggregatedStats, setAggregatedStats] = useState<AggregatedStats | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Charger la liste des techniciens
  useEffect(() => {
    loadTechnicians();
  }, []);

  // Charger les données quand un technicien est sélectionné
  useEffect(() => {
    if (selectedTechnician) {
      loadAnalyticsData();
    }
  }, [selectedTechnician]);

  const loadTechnicians = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, username, email')
        .eq('role', 'technicien')
        .order('username');

      if (error) throw error;
      setTechnicians(data || []);
    } catch (error) {
      console.error('Erreur chargement techniciens:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les techniciens",
        variant: "destructive"
      });
    }
  };

  const loadAnalyticsData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('technician_analytics')
        .select('*')
        .eq('technician_id', selectedTechnician)
        .not('session_end', 'is', null)
        .order('session_start', { ascending: false });

      if (error) throw error;
      
      setAnalyticsData((data || []) as AnalyticsData[]);
      calculateAggregatedStats((data || []) as AnalyticsData[]);
    } catch (error) {
      console.error('Erreur chargement analytics:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les données analytiques",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateAggregatedStats = (data: AnalyticsData[]) => {
    if (data.length === 0) {
      setAggregatedStats(null);
      return;
    }

    const selectedTechnicianData = technicians.find(t => t.user_id === selectedTechnician);
    if (!selectedTechnicianData) return;

    // Calculer le temps moyen d'intervention
    const interventionTimes = data.map(session => {
      const start = new Date(session.session_start);
      const end = new Date(session.session_end);
      return (end.getTime() - start.getTime()) / (1000 * 60); // en minutes
    });
    
    const avgInterventionTime = interventionTimes.reduce((sum, time) => sum + time, 0) / interventionTimes.length;

    // Machines uniques travaillées
    const uniqueMachines = new Set(data.map(session => session.machine_id));
    const machinesWorked = uniqueMachines.size;

    // Total des questions
    const totalQuestions = data.reduce((sum, session) => sum + session.questions_count, 0);

    // Distribution de qualité
    const qualityDistribution = {
      bien: data.filter(s => s.interaction_quality === 'bien').length,
      passable: data.filter(s => s.interaction_quality === 'passable').length,
      mauvais: data.filter(s => s.interaction_quality === 'mauvais').length
    };

    // Score de qualité global
    const totalSessions = data.length;
    const qualityScore = qualityDistribution.bien > totalSessions * 0.6 ? 'bien' :
                        qualityDistribution.bien + qualityDistribution.passable > totalSessions * 0.7 ? 'passable' : 'mauvais';

    setAggregatedStats({
      technician_id: selectedTechnician,
      username: selectedTechnicianData.username,
      avgInterventionTime: Math.round(avgInterventionTime),
      machinesWorked,
      totalQuestions,
      qualityScore,
      qualityDistribution
    });
  };

  const prepareTimeChartData = () => {
    const last30Days = analyticsData.slice(0, 10).map((session, index) => {
      const start = new Date(session.session_start);
      const end = new Date(session.session_end);
      const duration = (end.getTime() - start.getTime()) / (1000 * 60);
      
      return {
        session: `Session ${analyticsData.length - index}`,
        duree: Math.round(duration),
        date: start.toLocaleDateString('fr-FR')
      };
    }).reverse();

    return last30Days;
  };

  const prepareMachinesChartData = () => {
    const machineCount = analyticsData.reduce((acc, session) => {
      acc[session.machine_id] = (acc[session.machine_id] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(machineCount).map(([machineId, count]) => ({
      machine: machineId.substring(0, 8) + '...',
      interventions: count
    }));
  };

  const prepareQualityChartData = () => {
    if (!aggregatedStats) return [];
    
    return [
      { name: 'Bien', value: aggregatedStats.qualityDistribution.bien, fill: COLORS.bien },
      { name: 'Passable', value: aggregatedStats.qualityDistribution.passable, fill: COLORS.passable },
      { name: 'Mauvais', value: aggregatedStats.qualityDistribution.mauvais, fill: COLORS.mauvais }
    ].filter(item => item.value > 0);
  };

  const exportData = () => {
    if (!aggregatedStats || analyticsData.length === 0) {
      toast({
        title: "Aucune donnée",
        description: "Sélectionnez un technicien avec des données",
        variant: "destructive"
      });
      return;
    }

    const csvContent = [
      ['Technicien', 'Temps moyen (min)', 'Machines travaillées', 'Questions posées', 'Note globale'],
      [
        aggregatedStats.username,
        aggregatedStats.avgInterventionTime.toString(),
        aggregatedStats.machinesWorked.toString(),
        aggregatedStats.totalQuestions.toString(),
        aggregatedStats.qualityScore
      ]
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics_${aggregatedStats.username}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Export réussi",
      description: "Données exportées en CSV"
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Analytics MAMAN</h2>
          <p className="text-muted-foreground">Tableau de bord analytique des interactions techniciens</p>
        </div>
        <Button onClick={exportData} disabled={!aggregatedStats}>
          <Download className="mr-2 h-4 w-4" />
          Exporter
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sélection du technicien</CardTitle>
          <CardDescription>Choisissez un technicien pour voir ses statistiques d'interaction avec MAMAN</CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={selectedTechnician} onValueChange={setSelectedTechnician}>
            <SelectTrigger className="w-[300px]">
              <SelectValue placeholder="Sélectionner un technicien..." />
            </SelectTrigger>
            <SelectContent>
              {technicians.map((tech) => (
                <SelectItem key={tech.user_id} value={tech.user_id}>
                  {tech.username} ({tech.email})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {loading && (
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-muted-foreground">Chargement des données...</p>
            </div>
          </CardContent>
        </Card>
      )}

      {aggregatedStats && !loading && (
        <>
          {/* Cartes de statistiques */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Temps moyen d'intervention</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{aggregatedStats.avgInterventionTime} min</div>
                <p className="text-xs text-muted-foreground">Par session avec MAMAN</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Machines travaillées</CardTitle>
                <Wrench className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{aggregatedStats.machinesWorked}</div>
                <p className="text-xs text-muted-foreground">Machines différentes</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Questions posées</CardTitle>
                <MessageCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{aggregatedStats.totalQuestions}</div>
                <p className="text-xs text-muted-foreground">Total des interactions</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Note globale</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold capitalize ${
                  aggregatedStats.qualityScore === 'bien' ? 'text-green-600' :
                  aggregatedStats.qualityScore === 'passable' ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {aggregatedStats.qualityScore}
                </div>
                <p className="text-xs text-muted-foreground">Qualité des interactions</p>
              </CardContent>
            </Card>
          </div>

          {/* Graphiques */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart className="h-5 w-5" />
                  Temps d'intervention par session
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={{
                    duree: {
                      label: "Durée (min)",
                      color: "hsl(var(--chart-1))",
                    },
                  }}
                  className="h-[300px]"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsBarChart data={prepareTimeChartData()}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="session" />
                      <YAxis />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="duree" fill="var(--color-duree)" />
                    </RechartsBarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  Qualité des interactions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={{
                    bien: { label: "Bien", color: "hsl(var(--chart-1))" },
                    passable: { label: "Passable", color: "hsl(var(--chart-2))" },
                    mauvais: { label: "Mauvais", color: "hsl(var(--chart-3))" },
                  }}
                  className="h-[300px]"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={prepareQualityChartData()}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {prepareQualityChartData().map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <ChartTooltip content={<ChartTooltipContent />} />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Machines travaillées</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={{
                  interventions: {
                    label: "Interventions",
                    color: "hsl(var(--chart-2))",
                  },
                }}
                className="h-[300px]"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsBarChart data={prepareMachinesChartData()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="machine" />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="interventions" fill="var(--color-interventions)" />
                  </RechartsBarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>
        </>
      )}

      {!loading && selectedTechnician && analyticsData.length === 0 && (
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <div className="text-center">
              <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold">Aucune donnée disponible</h3>
              <p className="text-muted-foreground">Ce technicien n'a pas encore d'interactions avec MAMAN</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};