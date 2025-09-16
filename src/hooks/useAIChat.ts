import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

interface ChatMessage {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
  created_at?: string;
  machine_id?: string;
  status?: 'sending' | 'sent' | 'error';
}

export const useAIChat = () => {
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [currentMachineId, setCurrentMachineId] = useState<string | null>(null);
  const { toast } = useToast();
  const { profile } = useAuth();
  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages, scrollToBottom]);

  // Real-time subscription for chat updates
  useEffect(() => {
    if (!currentMachineId) return;

    const channel = supabase
      .channel(`chat-${currentMachineId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `machine_id=eq.${currentMachineId}`
        },
        (payload) => {
          const newMessage = payload.new as ChatMessage;
          setChatMessages(prev => {
            // Prevent duplicates by checking both id and content
            const exists = prev.some(msg => 
              msg.id === newMessage.id || 
              (msg.content === newMessage.content && 
               msg.role === newMessage.role && 
               Math.abs(new Date(msg.created_at).getTime() - new Date(newMessage.created_at).getTime()) < 5000)
            );
            if (exists) return prev;
            
            // Only add messages that are newer than the last message we have
            const lastMessage = prev[prev.length - 1];
            if (lastMessage && new Date(newMessage.created_at) <= new Date(lastMessage.created_at)) {
              return prev;
            }
            
            return [...prev, newMessage];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentMachineId]);

  const loadChatHistory = useCallback(async (machineId: string) => {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('id, role, content, created_at, machine_id')
        .eq('machine_id', machineId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error loading chat history:', error);
        return [];
      }

      const msgs = (data as ChatMessage[]) || [];
      
      // Remove duplicates based on content and timing for robustness
      const uniqueMessages = msgs.filter((msg, index, arr) => {
        return !arr.slice(0, index).some(prevMsg => 
          prevMsg.id === msg.id || 
          (prevMsg.content === msg.content && 
           prevMsg.role === msg.role && 
           Math.abs(new Date(prevMsg.created_at).getTime() - new Date(msg.created_at).getTime()) < 5000)
        );
      });
      
      setChatMessages(uniqueMessages);
      
      // Cache in localStorage with debouncing
      try { 
        localStorage.setItem(`aiChat.messages.${machineId}`, JSON.stringify(uniqueMessages)); 
      } catch (_) {}
      
      return uniqueMessages;
    } catch (error) {
      console.error('Error loading chat history:', error);
      return [];
    }
  }, []);

  const saveMessageToDatabase = useCallback(async (message: ChatMessage, machineId: string) => {
    if (!profile?.user_id) return null;
    
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .insert({
          role: message.role,
          content: message.content,
          machine_id: machineId,
          technician_id: profile.user_id,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error saving message:', error);
      return null;
    }
  }, [profile?.user_id]);

  const sendMessage = useCallback(async (message: string, machineId: string) => {
    if (!message.trim() || isLoading) return;

    // Cancel any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setIsLoading(true);
    setIsTyping(false);
    
    // Create optimistic user message
    const tempUserMessage: ChatMessage = { 
      id: `temp-${Date.now()}`,
      role: 'user', 
      content: message,
      status: 'sending',
      created_at: new Date().toISOString()
    };

    // Add user message to UI immediately with animation
    setChatMessages(prev => {
      const updated = [...prev, tempUserMessage];
      try {
        localStorage.setItem(`aiChat.messages.${machineId}`, JSON.stringify(updated));
      } catch (_) {}
      return updated;
    });

    try {
      // Save user message to database
      const savedUserMessage = await saveMessageToDatabase(tempUserMessage, machineId);
      
      // Update message status to sent
      setChatMessages(prev => prev.map(msg => 
        msg.id === tempUserMessage.id 
          ? { ...msg, status: 'sent', id: savedUserMessage?.id || msg.id }
          : msg
      ));

      // Show typing indicator
      setIsTyping(true);

      // Call AI assistant with abort signal
      const { data, error } = await supabase.functions.invoke('ai-assistant', {
        body: { message, machineId }
      });

      setIsTyping(false);

      if (error) throw error;

      // Create assistant response with smooth reveal
      const assistantMessage: ChatMessage = { 
        id: `assistant-${Date.now()}`,
        role: 'assistant', 
        content: data.message || data.fallbackMessage,
        created_at: new Date().toISOString()
      };

      // Save assistant message to database
      const savedAssistantMessage = await saveMessageToDatabase(assistantMessage, machineId);

      // Add assistant response with animation
      setChatMessages(prev => {
        const updated = [...prev, { ...assistantMessage, id: savedAssistantMessage?.id || assistantMessage.id }];
        try {
          localStorage.setItem(`aiChat.messages.${machineId}`, JSON.stringify(updated));
        } catch (_) {}
        return updated;
      });

      if (data.machineInfo) {
        console.log('Machine info:', data.machineInfo);
      }

    } catch (error: any) {
      setIsTyping(false);
      
      if (error.name === 'AbortError') {
        return; // Request was cancelled
      }

      console.error('Error sending message:', error);
      
      // Mark user message as error
      setChatMessages(prev => prev.map(msg => 
        msg.id === tempUserMessage.id 
          ? { ...msg, status: 'error' }
          : msg
      ));

      // Add error message
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: "❌ Désolé, je rencontre des difficultés techniques. Veuillez réessayer dans quelques instants.",
        created_at: new Date().toISOString()
      };
      
      setChatMessages(prev => {
        const updated = [...prev, errorMessage];
        try {
          localStorage.setItem(`aiChat.messages.${machineId}`, JSON.stringify(updated));
        } catch (_) {}
        return updated;
      });

      toast({
        title: "Erreur de connexion",
        description: "Impossible de contacter l'assistant IA. Vérifiez votre connexion.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  }, [isLoading, saveMessageToDatabase, toast]);

  const clearChat = useCallback(() => {
    setChatMessages([]);
    try {
      if (currentMachineId) localStorage.removeItem(`aiChat.messages.${currentMachineId}`);
    } catch (_) {}
  }, [currentMachineId]);

  const deleteChatForMachine = useCallback(async (machineId: string) => {
    try {
      // Delete all chat messages from database for this machine
      const { error } = await supabase
        .from('chat_messages')
        .delete()
        .eq('machine_id', machineId);

      if (error) throw error;

      // Clear localStorage for this machine
      try {
        localStorage.removeItem(`aiChat.messages.${machineId}`);
      } catch (_) {}
      
      // If this is the current machine, also clear the current chat
      if (currentMachineId === machineId) {
        setChatMessages([]);
      }

      return { success: true };
    } catch (error) {
      console.error('Error deleting chat:', error);
      return { success: false, error };
    }
  }, [currentMachineId]);

  const initializeChat = useCallback(async (machineId: string, machineName: string, options?: { reset?: boolean }) => {
    // Cancel any pending operations
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    setIsLoading(true);
    setIsTyping(false);
    setCurrentMachineId(machineId);

    // Check if we should force reset
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
      
      // Show initialization sequence
      setChatMessages([{
        id: 'init-loading',
        role: 'assistant',
        content: '🔄 **Initialisation de MAIA...**\n\nConnexion à la machine **' + machineName + '**\nAnalyse des documents techniques...',
        created_at: new Date().toISOString()
      }]);

      // Smooth transition to welcome message
      setTimeout(() => {
        const welcomeMessage = {
          id: 'welcome',
          role: 'assistant' as const,
          content: `✅ **MAIA** est maintenant connectée à la machine **${machineName}**.\n\n🤖 Je suis votre assistante IA spécialisée en maintenance industrielle. J'ai analysé les documents techniques disponibles pour cette machine.\n\n💡 **Comment puis-je vous aider ?**\n- 🔧 Diagnostic de pannes\n- 🛠️ Procédures de maintenance\n- 📦 Identification de pièces détachées\n- ⚠️ Consignes de sécurité\n\nN'hésitez pas à me décrire le problème ou à me poser vos questions !`,
          created_at: new Date().toISOString()
        };
        
        setChatMessages([welcomeMessage]);
        try { 
          localStorage.setItem(`aiChat.messages.${machineId}`, JSON.stringify([welcomeMessage])); 
        } catch (_) {}
        setIsLoading(false);
      }, 1500);
      return;
    }

    // Try to load from cache first for instant loading
    try {
      const cached = localStorage.getItem(`aiChat.messages.${machineId}`);
      if (cached) {
        const cachedMessages = JSON.parse(cached);
        // Remove duplicates from cached messages too
        const uniqueCachedMessages = cachedMessages.filter((msg, index, arr) => {
          return !arr.slice(0, index).some(prevMsg => 
            prevMsg.id === msg.id || 
            (prevMsg.content === msg.content && 
             prevMsg.role === msg.role && 
             Math.abs(new Date(prevMsg.created_at).getTime() - new Date(msg.created_at).getTime()) < 5000)
          );
        });
        setChatMessages(uniqueCachedMessages);
        setIsLoading(false);
        
        // Refresh from database in background but merge intelligently
        setTimeout(() => {
          loadChatHistory(machineId);
        }, 100);
        return;
      }
    } catch (_) {}

    // Load from database
    const messages = await loadChatHistory(machineId);

    // If no existing messages, show welcome
    if (messages.length === 0) {
      setChatMessages([{
        id: 'init-loading',
        role: 'assistant',
        content: '🔄 **Initialisation de MAIA...**\n\nConnexion à la machine **' + machineName + '**\nAnalyse des documents techniques...',
        created_at: new Date().toISOString()
      }]);

      setTimeout(() => {
        const welcomeMessage = {
          id: 'welcome',
          role: 'assistant' as const,
          content: `✅ **MAIA** est maintenant connectée à la machine **${machineName}**.\n\n🤖 Je suis votre assistante IA spécialisée en maintenance industrielle. J'ai analysé les documents techniques disponibles pour cette machine.\n\n💡 **Comment puis-je vous aider ?**\n- 🔧 Diagnostic de pannes\n- 🛠️ Procédures de maintenance\n- 📦 Identification de pièces détachées\n- ⚠️ Consignes de sécurité\n\nN'hésitez pas à me décrire le problème ou à me poser vos questions !`,
          created_at: new Date().toISOString()
        };
        
        setChatMessages([welcomeMessage]);
        try { 
          localStorage.setItem(`aiChat.messages.${machineId}`, JSON.stringify([welcomeMessage])); 
        } catch (_) {}
        setIsLoading(false);
      }, 1500);
    } else {
      setIsLoading(false);
    }
  }, [loadChatHistory]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    chatMessages,
    isLoading,
    isTyping,
    sendMessage,
    clearChat,
    deleteChatForMachine,
    initializeChat,
    loadChatHistory,
    messagesEndRef,
    scrollToBottom
  };
};