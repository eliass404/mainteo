import { LoginForm } from '@/components/auth/LoginForm';
import { Header } from '@/components/layout/Header';
import { AdminDashboard } from '@/components/admin/AdminDashboard';
import { TechnicianDashboard } from '@/components/technician/TechnicianDashboard';
import { useAuth } from '@/hooks/useAuth';

const Index = () => {
  const { user, profile, loading, signOut } = useAuth();

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

  return (
    <div className="min-h-screen bg-background">
      <Header user={profile} onLogout={handleLogout} />
      <main>
        {profile.role === 'admin' ? (
          <AdminDashboard />
        ) : (
          <TechnicianDashboard />
        )}
      </main>
    </div>
  );
};

export default Index;
