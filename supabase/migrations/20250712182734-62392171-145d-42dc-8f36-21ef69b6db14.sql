-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types
CREATE TYPE public.user_role AS ENUM ('admin', 'collaborateur', 'clerc');
CREATE TYPE public.etape_nature AS ENUM ('interne', 'externe');
CREATE TYPE public.document_origine AS ENUM ('interne', 'externe');
CREATE TYPE public.dossier_status AS ENUM ('en_cours', 'termine', 'suspendu');

-- Table des profils utilisateurs
CREATE TABLE public.profiles (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE,
    email TEXT NOT NULL,
    nom TEXT NOT NULL,
    prenom TEXT NOT NULL,
    role user_role NOT NULL DEFAULT 'clerc',
    telephone TEXT,
    actif BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table des modèles de procédures
CREATE TABLE public.procedure_modeles (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    nom TEXT NOT NULL,
    description TEXT,
    created_by UUID NOT NULL,
    actif BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table des étapes de modèles
CREATE TABLE public.etapes_modeles (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    procedure_modele_id UUID NOT NULL REFERENCES public.procedure_modeles(id) ON DELETE CASCADE,
    nom TEXT NOT NULL,
    description TEXT,
    ordre INTEGER NOT NULL,
    delai_prevu INTEGER, -- en jours
    role_responsable user_role,
    nature etape_nature NOT NULL DEFAULT 'interne',
    rappel_automatique BOOLEAN NOT NULL DEFAULT false,
    delai_rappel INTEGER DEFAULT 1, -- jours avant échéance
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table des documents attendus par étape
CREATE TABLE public.documents_attendus_modeles (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    etape_modele_id UUID NOT NULL REFERENCES public.etapes_modeles(id) ON DELETE CASCADE,
    nom TEXT NOT NULL,
    description TEXT,
    origine document_origine NOT NULL DEFAULT 'externe',
    obligatoire BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table des dossiers
CREATE TABLE public.dossiers (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    nom TEXT NOT NULL,
    procedure_modele_id UUID NOT NULL REFERENCES public.procedure_modeles(id),
    client_nom TEXT NOT NULL,
    client_prenom TEXT,
    client_telephone TEXT,
    client_email TEXT,
    client_adresse TEXT,
    description TEXT,
    status dossier_status NOT NULL DEFAULT 'en_cours',
    etape_courante_id UUID,
    pourcentage_completion INTEGER DEFAULT 0,
    date_creation TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    date_fin TIMESTAMP WITH TIME ZONE,
    created_by UUID NOT NULL,
    notes_retard TEXT,
    situation_fiscale TEXT,
    -- Suivi financier
    montant_frais DECIMAL(10,2),
    date_note_frais TIMESTAMP WITH TIME ZONE,
    montant_provisions DECIMAL(10,2),
    date_provisions TIMESTAMP WITH TIME ZONE,
    montant_reglement_partiel DECIMAL(10,2),
    date_reglement_partiel TIMESTAMP WITH TIME ZONE,
    montant_solde DECIMAL(10,2),
    date_reglement_solde TIMESTAMP WITH TIME ZONE,
    -- Pour constitutions de sociétés
    montant_depot_capital DECIMAL(10,2),
    date_depot_capital TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table des participants aux dossiers
CREATE TABLE public.dossier_participants (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    dossier_id UUID NOT NULL REFERENCES public.dossiers(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    role_dossier TEXT NOT NULL,
    note_mission TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table des étapes de dossiers (instances)
CREATE TABLE public.etapes_dossiers (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    dossier_id UUID NOT NULL REFERENCES public.dossiers(id) ON DELETE CASCADE,
    etape_modele_id UUID NOT NULL REFERENCES public.etapes_modeles(id),
    nom TEXT NOT NULL,
    description TEXT,
    ordre INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'en_attente', -- en_attente, en_cours, termine, bloque
    date_debut TIMESTAMP WITH TIME ZONE,
    date_fin_prevue TIMESTAMP WITH TIME ZONE,
    date_fin_reelle TIMESTAMP WITH TIME ZONE,
    assignee_id UUID,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table des documents de dossiers
CREATE TABLE public.documents_dossiers (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    dossier_id UUID NOT NULL REFERENCES public.dossiers(id) ON DELETE CASCADE,
    etape_dossier_id UUID REFERENCES public.etapes_dossiers(id),
    document_attendu_modele_id UUID REFERENCES public.documents_attendus_modeles(id),
    nom TEXT NOT NULL,
    description TEXT,
    fichier_url TEXT,
    fichier_nom TEXT,
    taille_fichier BIGINT,
    type_mime TEXT,
    uploaded_by UUID NOT NULL,
    date_upload TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table des notifications
CREATE TABLE public.notifications (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    dossier_id UUID REFERENCES public.dossiers(id),
    titre TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL, -- info, warning, error, reminder
    lu BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table des logs d'activité
CREATE TABLE public.activity_logs (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    dossier_id UUID REFERENCES public.dossiers(id),
    action TEXT NOT NULL,
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.procedure_modeles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.etapes_modeles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents_attendus_modeles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dossiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dossier_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.etapes_dossiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents_dossiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Create function to check user role
CREATE OR REPLACE FUNCTION public.get_user_role(user_uuid UUID)
RETURNS user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT role FROM public.profiles WHERE user_id = user_uuid;
$$;

-- RLS Policies for profiles
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage profiles" ON public.profiles FOR ALL TO authenticated USING (public.get_user_role(auth.uid()) = 'admin');

-- RLS Policies for procedure_modeles
CREATE POLICY "All authenticated users can view procedure models" ON public.procedure_modeles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins and collaborateurs can manage procedure models" ON public.procedure_modeles FOR ALL TO authenticated USING (public.get_user_role(auth.uid()) IN ('admin', 'collaborateur'));

-- RLS Policies for etapes_modeles
CREATE POLICY "All authenticated users can view etapes models" ON public.etapes_modeles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins and collaborateurs can manage etapes models" ON public.etapes_modeles FOR ALL TO authenticated USING (public.get_user_role(auth.uid()) IN ('admin', 'collaborateur'));

-- RLS Policies for documents_attendus_modeles
CREATE POLICY "All authenticated users can view documents attendus models" ON public.documents_attendus_modeles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins and collaborateurs can manage documents attendus models" ON public.documents_attendus_modeles FOR ALL TO authenticated USING (public.get_user_role(auth.uid()) IN ('admin', 'collaborateur'));

-- RLS Policies for dossiers
CREATE POLICY "Users can view dossiers they participate in" ON public.dossiers FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.dossier_participants 
    WHERE dossier_id = dossiers.id AND user_id = auth.uid()
  ) OR created_by = auth.uid() OR public.get_user_role(auth.uid()) = 'admin'
);
CREATE POLICY "Admins and collaborateurs can create dossiers" ON public.dossiers FOR INSERT TO authenticated WITH CHECK (public.get_user_role(auth.uid()) IN ('admin', 'collaborateur'));
CREATE POLICY "Users can update dossiers they participate in" ON public.dossiers FOR UPDATE TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.dossier_participants 
    WHERE dossier_id = dossiers.id AND user_id = auth.uid()
  ) OR created_by = auth.uid() OR public.get_user_role(auth.uid()) = 'admin'
);

-- RLS Policies for other tables
CREATE POLICY "Users can view participants of dossiers they access" ON public.dossier_participants FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.dossiers d
    WHERE d.id = dossier_id AND (
      EXISTS (SELECT 1 FROM public.dossier_participants dp WHERE dp.dossier_id = d.id AND dp.user_id = auth.uid()) 
      OR d.created_by = auth.uid() 
      OR public.get_user_role(auth.uid()) = 'admin'
    )
  )
);

CREATE POLICY "Admins and collaborateurs can manage participants" ON public.dossier_participants FOR ALL TO authenticated USING (public.get_user_role(auth.uid()) IN ('admin', 'collaborateur'));

CREATE POLICY "Users can view etapes of accessible dossiers" ON public.etapes_dossiers FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.dossiers d
    WHERE d.id = dossier_id AND (
      EXISTS (SELECT 1 FROM public.dossier_participants dp WHERE dp.dossier_id = d.id AND dp.user_id = auth.uid()) 
      OR d.created_by = auth.uid() 
      OR public.get_user_role(auth.uid()) = 'admin'
    )
  )
);

CREATE POLICY "Users can update etapes they are assigned to" ON public.etapes_dossiers FOR UPDATE TO authenticated USING (
  assignee_id = auth.uid() OR public.get_user_role(auth.uid()) IN ('admin', 'collaborateur')
);

CREATE POLICY "Users can view documents of accessible dossiers" ON public.documents_dossiers FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.dossiers d
    WHERE d.id = dossier_id AND (
      EXISTS (SELECT 1 FROM public.dossier_participants dp WHERE dp.dossier_id = d.id AND dp.user_id = auth.uid()) 
      OR d.created_by = auth.uid() 
      OR public.get_user_role(auth.uid()) = 'admin'
    )
  )
);

CREATE POLICY "Users can upload documents to accessible dossiers" ON public.documents_dossiers FOR INSERT TO authenticated WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.dossiers d
    WHERE d.id = dossier_id AND (
      EXISTS (SELECT 1 FROM public.dossier_participants dp WHERE dp.dossier_id = d.id AND dp.user_id = auth.uid()) 
      OR d.created_by = auth.uid() 
      OR public.get_user_role(auth.uid()) IN ('admin', 'collaborateur')
    )
  )
);

CREATE POLICY "Users can view their notifications" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "System can create notifications" ON public.notifications FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can update their notifications" ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Admins can view all activity logs" ON public.activity_logs FOR SELECT TO authenticated USING (public.get_user_role(auth.uid()) = 'admin');
CREATE POLICY "System can create activity logs" ON public.activity_logs FOR INSERT TO authenticated WITH CHECK (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_procedure_modeles_updated_at BEFORE UPDATE ON public.procedure_modeles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_dossiers_updated_at BEFORE UPDATE ON public.dossiers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_etapes_dossiers_updated_at BEFORE UPDATE ON public.etapes_dossiers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, nom, prenom, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'nom', 'Nom'),
    COALESCE(NEW.raw_user_meta_data ->> 'prenom', 'Prénom'),
    COALESCE((NEW.raw_user_meta_data ->> 'role')::user_role, 'clerc')
  );
  RETURN NEW;
END;
$$;

-- Trigger for new user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create storage bucket for documents
INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', false);

-- Storage policies
CREATE POLICY "Authenticated users can view documents" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'documents');
CREATE POLICY "Authenticated users can upload documents" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can update their documents" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete their documents" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);