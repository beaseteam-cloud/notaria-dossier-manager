export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          dossier_id: string | null
          id: string
          ip_address: unknown | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          dossier_id?: string | null
          id?: string
          ip_address?: unknown | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          dossier_id?: string | null
          id?: string
          ip_address?: unknown | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "dossiers"
            referencedColumns: ["id"]
          },
        ]
      }
      documents_attendus_modeles: {
        Row: {
          created_at: string
          description: string | null
          etape_modele_id: string
          id: string
          nom: string
          obligatoire: boolean
          origine: Database["public"]["Enums"]["document_origine"]
        }
        Insert: {
          created_at?: string
          description?: string | null
          etape_modele_id: string
          id?: string
          nom: string
          obligatoire?: boolean
          origine?: Database["public"]["Enums"]["document_origine"]
        }
        Update: {
          created_at?: string
          description?: string | null
          etape_modele_id?: string
          id?: string
          nom?: string
          obligatoire?: boolean
          origine?: Database["public"]["Enums"]["document_origine"]
        }
        Relationships: [
          {
            foreignKeyName: "documents_attendus_modeles_etape_modele_id_fkey"
            columns: ["etape_modele_id"]
            isOneToOne: false
            referencedRelation: "etapes_modeles"
            referencedColumns: ["id"]
          },
        ]
      }
      documents_dossiers: {
        Row: {
          created_at: string
          date_upload: string
          description: string | null
          document_attendu_modele_id: string | null
          dossier_id: string
          etape_dossier_id: string | null
          fichier_nom: string | null
          fichier_url: string | null
          id: string
          nom: string
          taille_fichier: number | null
          type_mime: string | null
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          date_upload?: string
          description?: string | null
          document_attendu_modele_id?: string | null
          dossier_id: string
          etape_dossier_id?: string | null
          fichier_nom?: string | null
          fichier_url?: string | null
          id?: string
          nom: string
          taille_fichier?: number | null
          type_mime?: string | null
          uploaded_by: string
        }
        Update: {
          created_at?: string
          date_upload?: string
          description?: string | null
          document_attendu_modele_id?: string | null
          dossier_id?: string
          etape_dossier_id?: string | null
          fichier_nom?: string | null
          fichier_url?: string | null
          id?: string
          nom?: string
          taille_fichier?: number | null
          type_mime?: string | null
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_dossiers_document_attendu_modele_id_fkey"
            columns: ["document_attendu_modele_id"]
            isOneToOne: false
            referencedRelation: "documents_attendus_modeles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_dossiers_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "dossiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_dossiers_etape_dossier_id_fkey"
            columns: ["etape_dossier_id"]
            isOneToOne: false
            referencedRelation: "etapes_dossiers"
            referencedColumns: ["id"]
          },
        ]
      }
      dossier_participants: {
        Row: {
          created_at: string
          dossier_id: string
          id: string
          note_mission: string | null
          role_dossier: string
          user_id: string
        }
        Insert: {
          created_at?: string
          dossier_id: string
          id?: string
          note_mission?: string | null
          role_dossier: string
          user_id: string
        }
        Update: {
          created_at?: string
          dossier_id?: string
          id?: string
          note_mission?: string | null
          role_dossier?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dossier_participants_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "dossiers"
            referencedColumns: ["id"]
          },
        ]
      }
      dossiers: {
        Row: {
          client_adresse: string | null
          client_email: string | null
          client_nom: string
          client_prenom: string | null
          client_telephone: string | null
          created_at: string
          created_by: string
          date_creation: string
          date_depot_capital: string | null
          date_fin: string | null
          date_note_frais: string | null
          date_provisions: string | null
          date_reglement_partiel: string | null
          date_reglement_solde: string | null
          description: string | null
          etape_courante_id: string | null
          id: string
          montant_depot_capital: number | null
          montant_frais: number | null
          montant_provisions: number | null
          montant_reglement_partiel: number | null
          montant_solde: number | null
          nom: string
          notes_retard: string | null
          pourcentage_completion: number | null
          procedure_modele_id: string
          situation_fiscale: string | null
          status: Database["public"]["Enums"]["dossier_status"]
          updated_at: string
        }
        Insert: {
          client_adresse?: string | null
          client_email?: string | null
          client_nom: string
          client_prenom?: string | null
          client_telephone?: string | null
          created_at?: string
          created_by: string
          date_creation?: string
          date_depot_capital?: string | null
          date_fin?: string | null
          date_note_frais?: string | null
          date_provisions?: string | null
          date_reglement_partiel?: string | null
          date_reglement_solde?: string | null
          description?: string | null
          etape_courante_id?: string | null
          id?: string
          montant_depot_capital?: number | null
          montant_frais?: number | null
          montant_provisions?: number | null
          montant_reglement_partiel?: number | null
          montant_solde?: number | null
          nom: string
          notes_retard?: string | null
          pourcentage_completion?: number | null
          procedure_modele_id: string
          situation_fiscale?: string | null
          status?: Database["public"]["Enums"]["dossier_status"]
          updated_at?: string
        }
        Update: {
          client_adresse?: string | null
          client_email?: string | null
          client_nom?: string
          client_prenom?: string | null
          client_telephone?: string | null
          created_at?: string
          created_by?: string
          date_creation?: string
          date_depot_capital?: string | null
          date_fin?: string | null
          date_note_frais?: string | null
          date_provisions?: string | null
          date_reglement_partiel?: string | null
          date_reglement_solde?: string | null
          description?: string | null
          etape_courante_id?: string | null
          id?: string
          montant_depot_capital?: number | null
          montant_frais?: number | null
          montant_provisions?: number | null
          montant_reglement_partiel?: number | null
          montant_solde?: number | null
          nom?: string
          notes_retard?: string | null
          pourcentage_completion?: number | null
          procedure_modele_id?: string
          situation_fiscale?: string | null
          status?: Database["public"]["Enums"]["dossier_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dossiers_procedure_modele_id_fkey"
            columns: ["procedure_modele_id"]
            isOneToOne: false
            referencedRelation: "procedure_modeles"
            referencedColumns: ["id"]
          },
        ]
      }
      etapes_dossiers: {
        Row: {
          assignee_id: string | null
          created_at: string
          date_debut: string | null
          date_fin_prevue: string | null
          date_fin_reelle: string | null
          description: string | null
          dossier_id: string
          etape_modele_id: string
          id: string
          nom: string
          notes: string | null
          ordre: number
          status: string
          updated_at: string
        }
        Insert: {
          assignee_id?: string | null
          created_at?: string
          date_debut?: string | null
          date_fin_prevue?: string | null
          date_fin_reelle?: string | null
          description?: string | null
          dossier_id: string
          etape_modele_id: string
          id?: string
          nom: string
          notes?: string | null
          ordre: number
          status?: string
          updated_at?: string
        }
        Update: {
          assignee_id?: string | null
          created_at?: string
          date_debut?: string | null
          date_fin_prevue?: string | null
          date_fin_reelle?: string | null
          description?: string | null
          dossier_id?: string
          etape_modele_id?: string
          id?: string
          nom?: string
          notes?: string | null
          ordre?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "etapes_dossiers_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "dossiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "etapes_dossiers_etape_modele_id_fkey"
            columns: ["etape_modele_id"]
            isOneToOne: false
            referencedRelation: "etapes_modeles"
            referencedColumns: ["id"]
          },
        ]
      }
      etapes_modeles: {
        Row: {
          created_at: string
          delai_prevu: number | null
          delai_rappel: number | null
          description: string | null
          id: string
          montant_paiement: number | null
          nature: Database["public"]["Enums"]["etape_nature"]
          nom: string
          ordre: number
          procedure_modele_id: string
          rappel_automatique: boolean
          role_responsable: Database["public"]["Enums"]["user_role"] | null
        }
        Insert: {
          created_at?: string
          delai_prevu?: number | null
          delai_rappel?: number | null
          description?: string | null
          id?: string
          montant_paiement?: number | null
          nature?: Database["public"]["Enums"]["etape_nature"]
          nom: string
          ordre: number
          procedure_modele_id: string
          rappel_automatique?: boolean
          role_responsable?: Database["public"]["Enums"]["user_role"] | null
        }
        Update: {
          created_at?: string
          delai_prevu?: number | null
          delai_rappel?: number | null
          description?: string | null
          id?: string
          montant_paiement?: number | null
          nature?: Database["public"]["Enums"]["etape_nature"]
          nom?: string
          ordre?: number
          procedure_modele_id?: string
          rappel_automatique?: boolean
          role_responsable?: Database["public"]["Enums"]["user_role"] | null
        }
        Relationships: [
          {
            foreignKeyName: "etapes_modeles_procedure_modele_id_fkey"
            columns: ["procedure_modele_id"]
            isOneToOne: false
            referencedRelation: "procedure_modeles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          dossier_id: string | null
          id: string
          lu: boolean
          message: string
          titre: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          dossier_id?: string | null
          id?: string
          lu?: boolean
          message: string
          titre: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          dossier_id?: string | null
          id?: string
          lu?: boolean
          message?: string
          titre?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "dossiers"
            referencedColumns: ["id"]
          },
        ]
      }
      procedure_modeles: {
        Row: {
          actif: boolean
          created_at: string
          created_by: string
          description: string | null
          id: string
          nom: string
          updated_at: string
        }
        Insert: {
          actif?: boolean
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          nom: string
          updated_at?: string
        }
        Update: {
          actif?: boolean
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          nom?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          actif: boolean
          created_at: string
          email: string
          id: string
          nom: string
          prenom: string
          role: Database["public"]["Enums"]["user_role"]
          telephone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          actif?: boolean
          created_at?: string
          email: string
          id?: string
          nom: string
          prenom: string
          role?: Database["public"]["Enums"]["user_role"]
          telephone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          actif?: boolean
          created_at?: string
          email?: string
          id?: string
          nom?: string
          prenom?: string
          role?: Database["public"]["Enums"]["user_role"]
          telephone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_current_profile_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_user_role: {
        Args: { user_uuid: string }
        Returns: Database["public"]["Enums"]["user_role"]
      }
    }
    Enums: {
      document_origine: "interne" | "externe"
      dossier_status: "en_cours" | "termine" | "suspendu"
      etape_nature:
        | "interne"
        | "externe"
        | "paiement_intermediaire"
        | "paiement_final"
      user_role: "admin" | "collaborateur" | "clerc"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      document_origine: ["interne", "externe"],
      dossier_status: ["en_cours", "termine", "suspendu"],
      etape_nature: [
        "interne",
        "externe",
        "paiement_intermediaire",
        "paiement_final",
      ],
      user_role: ["admin", "collaborateur", "clerc"],
    },
  },
} as const
