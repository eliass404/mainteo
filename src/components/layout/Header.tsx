import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Building2, LogOut, Settings, User, Bell, Bot, FileText } from "lucide-react";

interface HeaderProps {
  user: {
    role: 'admin' | 'technicien';
    username: string;
    user_id: string;
    email?: string;
  };
  onLogout: () => void;
  onNavigate: (page: string) => void;
}

export const Header = ({ user, onLogout, onNavigate }: HeaderProps) => {
  const roleLabel = user.role === 'admin' ? 'Administrateur' : 'Technicien';
  const roleColor = user.role === 'admin' ? 'destructive' : 'secondary';

  return (
    <header className="bg-white border-b border-border shadow-card">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-primary p-2 rounded-lg">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">IndustrialCare</h1>
              <p className="text-sm text-muted-foreground">Gestion & Maintenance</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-3 p-2">
                <Avatar className="w-8 h-8">
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {user.username.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="text-left">
                  <p className="text-sm font-medium">{user.username}</p>
                  <Badge variant={roleColor} className="text-xs">
                    {roleLabel}
                  </Badge>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-card border border-border">
              {user.role === 'technicien' && (
                <>
                  <DropdownMenuItem className="cursor-pointer" onClick={() => onNavigate('ai-assistant')}>
                    <Bot className="w-4 h-4 mr-2" />
                    Assistant IA
                  </DropdownMenuItem>
                  <DropdownMenuItem className="cursor-pointer" onClick={() => onNavigate('intervention-report')}>
                    <FileText className="w-4 h-4 mr-2" />
                    Rapport d'intervention
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem className="cursor-pointer" onClick={() => onNavigate('profile')}>
                <User className="w-4 h-4 mr-2" />
                Profil
              </DropdownMenuItem>
              {user.role === 'admin' && (
                <DropdownMenuItem className="cursor-pointer" onClick={() => onNavigate('settings')}>
                  <Settings className="w-4 h-4 mr-2" />
                  Paramètres
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="cursor-pointer text-destructive focus:text-destructive"
                onClick={onLogout}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Déconnexion
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};