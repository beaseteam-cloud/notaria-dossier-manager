import { useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

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
        console.error('Erreur de connexion:', error.message);
        return { error };
      }
      
      return { error: null };
    } catch (error: any) {
      console.error('Erreur de connexion:', error.message);
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
        console.error('Erreur d\'inscription:', error.message);
        return { error };
      }
      
      console.log('Compte créé - Vérifiez votre email pour confirmer votre compte.');
      
      return { error: null };
    } catch (error: any) {
      console.error('Erreur d\'inscription:', error.message);
      return { error };
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('Erreur de déconnexion:', error.message);
        return { error };
      }
      
      setUser(null);
      setSession(null);
      setProfile(null);
      
      return { error: null };
    } catch (error: any) {
      console.error('Erreur de déconnexion:', error.message);
      return { error };
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