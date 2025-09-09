import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  created_at?: string;
}

export const useAIChat = () => {
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentMachineId, setCurrentMachineId] = useState<string | null>(null);
  const { toast } = useToast();

  const loadChatHistory = async (machineId: string) => {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('role, content, created_at')
        .eq('machine_id', machineId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error loading chat history:', error);
        return;
      }

      const msgs = (data as ChatMessage[]) || [];
      setChatMessages(msgs);
      try { localStorage.setItem(`aiChat.messages.${machineId}`, JSON.stringify(msgs)); } catch (_) {}
    } catch (error) {
      console.error('Error loading chat history:', error);
    }
  };

  const sendMessage = async (message: string, machineId: string) => {
    if (!message.trim()) return;

    setIsLoading(true);
    
    // Add user message to UI immediately
    const userMessage: ChatMessage = { role: 'user', content: message };
    setChatMessages(prev => {
      const updated = [...prev, userMessage];
      try {
        const key = `aiChat.messages.${currentMachineId || machineId}`;
        localStorage.setItem(key, JSON.stringify(updated));
      } catch (_) {}
      return updated;
    });

    try {
      const { data, error } = await supabase.functions.invoke('ai-assistant', {
        body: { message, machineId }
      });

      if (error) {
        throw error;
      }

      // Add assistant response to UI
      const assistantMessage: ChatMessage = { 
        role: 'assistant', 
        content: data.message || data.fallbackMessage 
      };
      setChatMessages(prev => {
        const updated = [...prev, assistantMessage];
        try {
          const key = `aiChat.messages.${currentMachineId || machineId}`;
          localStorage.setItem(key, JSON.stringify(updated));
        } catch (_) {}
        return updated;
      });

      if (data.machineInfo) {
        console.log('Machine info:', data.machineInfo);
      }

      // persist after assistant response is added above
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Add error message
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: "Désolé, je rencontre des difficultés techniques. Veuillez réessayer."
      };
      setChatMessages(prev => {
        const updated = [...prev, errorMessage];
        try {
          const key = `aiChat.messages.${currentMachineId || machineId}`;
          localStorage.setItem(key, JSON.stringify(updated));
        } catch (_) {}
        return updated;
      });

      toast({
        title: "Erreur",
        description: "Impossible de contacter l'assistant IA",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    setChatMessages([]);
    try {
      if (currentMachineId) localStorage.removeItem(`aiChat.messages.${currentMachineId}`);
    } catch (_) {}
  };

  const resetChatForMachine = (machineId: string) => {
    // Clear localStorage for this machine
    try {
      localStorage.removeItem(`aiChat.messages.${machineId}`);
    } catch (_) {}
    
    // If this is the current machine, also clear the current chat
    if (currentMachineId === machineId) {
      setChatMessages([]);
    }
  };

  const initializeChat = async (machineId: string, machineName: string, options?: { reset?: boolean }) => {
    setIsLoading(true);
    setCurrentMachineId(machineId);

    // Check if we should force reset (from options or a persisted flag)
    let forceReset = !!options?.reset;
    try {
      const resetFlag = localStorage.getItem(`aiChat.reset.${machineId}`);
      if (resetFlag === 'true') {
        forceReset = true;
        localStorage.removeItem(`aiChat.reset.${machineId}`);
      }
    } catch (_) {}

    if (forceReset) {
      try { localStorage.removeItem(`aiChat.messages.${machineId}`); } catch (_) {}
      // Show fresh welcome sequence without loading previous history
      setChatMessages([{
        role: 'assistant',
        content: `🔄 Initialisation de MAIA pour la machine ${machineName}...\n\nAnalyse des documents techniques en cours...`
      }]);
      setTimeout(() => {
        const welcome = [{
          role: 'assistant' as const,
          content: `✅ **MAIA** est maintenant connectée à la machine **${machineName}**.\n\n🤖 Je suis votre assistante IA spécialisée en maintenance industrielle. J'ai analysé les documents techniques disponibles pour cette machine.\n\n💡 **Comment puis-je vous aider ?**\n- Diagnostic de pannes\n- Procédures de maintenance\n- Identification de pièces détachées\n- Consignes de sécurité\n\nN'hésitez pas à me décrire le problème ou à me poser vos questions !`
        }];
        setChatMessages(welcome);
        try { localStorage.setItem(`aiChat.messages.${machineId}`, JSON.stringify(welcome)); } catch (_) {}
        setIsLoading(false);
      }, 1000);
      return;
    }

    // Try local cache first
    try {
      const saved = localStorage.getItem(`aiChat.messages.${machineId}`);
      if (saved) {
        setChatMessages(JSON.parse(saved));
        setIsLoading(false);
        return;
      }
    } catch (_) {}

    setChatMessages([]);

    // Add loading message
    setChatMessages([{
      role: 'assistant',
      content: `🔄 Initialisation de MAIA pour la machine ${machineName}...\n\nAnalyse des documents techniques en cours...`
    }]);

    // Load existing chat history
    await loadChatHistory(machineId);

    // If no existing messages, add welcome message
    const { data: existingMessages } = await supabase
      .from('chat_messages')
      .select('id')
      .eq('machine_id', machineId)
      .limit(1);

    if (!existingMessages || existingMessages.length === 0) {
      setTimeout(() => {
        setChatMessages(prev => {
          // Remove loading message and add welcome
          const filtered = prev.filter(msg => !msg.content.includes('🔄'));
          return [...filtered, {
            role: 'assistant',
            content: `✅ **MAIA** est maintenant connectée à la machine **${machineName}**.\n\n🤖 Je suis votre assistante IA spécialisée en maintenance industrielle. J'ai analysé les documents techniques disponibles pour cette machine.\n\n💡 **Comment puis-je vous aider ?**\n- Diagnostic de pannes\n- Procédures de maintenance\n- Identification de pièces détachées\n- Consignes de sécurité\n\nN'hésitez pas à me décrire le problème ou à me poser vos questions !`
          }];
        });
        setIsLoading(false);
      }, 2000);
    } else {
      // Remove loading message if we have existing chat
      setChatMessages(prev => prev.filter(msg => !msg.content.includes('🔄')));
      setIsLoading(false);
    }
  };

  return {
    chatMessages,
    isLoading,
    sendMessage,
    clearChat,
    resetChatForMachine,
    initializeChat,
    loadChatHistory,
  };
};