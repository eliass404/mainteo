import { useState } from 'react';
import { LoginForm } from '@/components/auth/LoginForm';
import { Header } from '@/components/layout/Header';
import { AdminDashboard } from '@/components/admin/AdminDashboard';
import { AIAssistant } from '@/components/technician/AIAssistant';
import { InterventionReport } from '@/components/technician/InterventionReport';
import { Settings } from './Settings';
import { Profile } from './Profile';
import { useAuth } from '@/hooks/useAuth';

const Index = () => {
  const { user, profile, loading, signOut } = useAuth();
  const [currentPage, setCurrentPage] = useState(() => {
    // Set default page based on user role
    return profile?.role === 'admin' ? 'dashboard' : 'ai-assistant';
  });
  const [dashboardKey, setDashboardKey] = useState(0);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!user || !profile) {
    return <LoginForm />;
  }

  const handleLogout = async () => {
    await signOut();
  };

  const handleNavigate = (page: string) => {
    setCurrentPage(page);
    // Ne pas remonter le dashboard si on navigue vers le dashboard
    if (page !== 'dashboard') {
      // Préserver l'état du dashboard en ne changeant pas la clé
    }
  };

  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'settings':
        return <Settings onNavigate={handleNavigate} />;
      case 'profile':
        return <Profile user={profile} onNavigate={handleNavigate} />;
      case 'ai-assistant':
        return <AIAssistant />;
      case 'intervention-report':
        return <InterventionReport />;
      case 'dashboard':
      default:
        // Only admin has dashboard access
        if (profile.role === 'admin') {
          return (
            <div key={dashboardKey}>
              <AdminDashboard />
            </div>
          );
        } else {
          // Redirect technicians to AI Assistant
          return <AIAssistant />;
        }
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header user={profile} onLogout={handleLogout} onNavigate={handleNavigate} />
      <main>
        {renderCurrentPage()}
      </main>
    </div>
  );
};

export default Index;
