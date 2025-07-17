import { useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface Profile {
  id: string;
  user_id: string;
  email: string;
  nom: string;
  prenom: string;
  role: 'admin' | 'collaborateur' | 'clerc';
  telephone?: string;
  actif: boolean;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Fetch user profile
          setTimeout(async () => {
            try {
              const { data: profileData, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('user_id', session.user.id)
                .single();
              
              if (error) {
                console.error('Error fetching profile:', error);
              } else {
                setProfile(profileData);
              }
            } catch (error) {
              console.error('Error in profile fetch:', error);
            }
          }, 0);
        } else {
          setProfile(null);
        }
        
        setLoading(false);
      }
    );

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (!session) {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        toast({
          variant: "destructive",
          title: "Erreur de connexion",
          description: error.message,
        });
        return { error };
      }
      
      return { error: null };
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erreur de connexion",
        description: error.message,
      });
      return { error };
    }
  };

  const signUp = async (email: string, password: string, nom: string, prenom: string) => {
    try {
      const redirectUrl = `${window.location.origin}/`;
      
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            nom,
            prenom,
            role: 'clerc'
          }
        }
      });
      
      if (error) {
        toast({
          variant: "destructive",
          title: "Erreur d'inscription",
          description: error.message,
        });
        return { error };
      }
      
      toast({
        title: "Compte créé",
        description: "Vérifiez votre email pour confirmer votre compte.",
      });
      
      return { error: null };
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erreur d'inscription",
        description: error.message,
      });
      return { error };
    }
  };

  const signOut = async () => {
    try {
      // Force clear all auth state regardless of server response
      await supabase.auth.signOut({ scope: 'local' });
      
      // Clear local state
      setUser(null);
      setSession(null);
      setProfile(null);
      
      // Force clear any remaining auth data from localStorage
      localStorage.removeItem('sb-joygrdtepsicsduvbazm-auth-token');
      
      return { error: null };
    } catch (error: any) {
      // Always clear local state even if signOut fails
      setUser(null);
      setSession(null);
      setProfile(null);
      
      // Force clear localStorage
      localStorage.removeItem('sb-joygrdtepsicsduvbazm-auth-token');
      
      return { error: null };
    }
  };

  const isAdmin = profile?.role === 'admin';
  const isCollaborateur = profile?.role === 'collaborateur' || profile?.role === 'admin';

  return {
    user,
    session,
    profile,
    loading,
    signIn,
    signUp,
    signOut,
    isAdmin,
    isCollaborateur,
  };
}