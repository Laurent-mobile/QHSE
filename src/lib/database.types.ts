export type Json =
  | string
  | number
  | boolean
  | null
  | { [key]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string
          role: 'administrateur' | 'responsable_hse' | 'responsable_surete' | 'chef_site' | 'agent_securite' | 'employe' | 'direction'
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name: string
          role?: 'administrateur' | 'responsable_hse' | 'responsable_surete' | 'chef_site' | 'agent_securite' | 'employe' | 'direction'
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string
          role?: 'administrateur' | 'responsable_hse' | 'responsable_surete' | 'chef_site' | 'agent_securite' | 'employe' | 'direction'
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      sites: {
        Row: {
          id: string
          name: string
          code: string
          address: string | null
          city: string | null
          country: string
          manager_id: string | null
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          code: string
          address?: string | null
          city?: string | null
          country?: string
          manager_id?: string | null
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          code?: string
          address?: string | null
          city?: string | null
          country?: string
          manager_id?: string | null
          is_active?: boolean
          created_at?: string
        }
      }
      user_sites: {
        Row: {
          id: string
          user_id: string
          site_id: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          site_id: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          site_id?: string
          created_at?: string
        }
      }
      incidents: {
        Row: {
          id: string
          reference: string
          type: 'accident' | 'presque_accident' | 'incident' | 'situation_dangereuse'
          module: 'sst' | 'incendie' | 'surete' | 'environnement' | 'qualite'
          title: string
          description: string
          location: string
          incident_date: string
          severity: 'faible' | 'moyen' | 'grave' | 'critique'
          status: 'ouvert' | 'en_cours' | 'cloture'
          reporter_id: string
          site_id: string
          created_at: string
          updated_at: string
          signature: string | null;
    signature_date: string | null;
    signer_name: string | null;
        }
        Insert: {
          id?: string
          reference: string
          type: 'accident' | 'presque_accident' | 'incident' | 'situation_dangereuse'
          module: 'sst' | 'incendie' | 'surete' | 'environnement' | 'qualite'
          title: string
          description: string
          location: string
          incident_date: string
          severity?: 'faible' | 'moyen' | 'grave' | 'critique'
          status?: 'ouvert' | 'en_cours' | 'cloture'
          reporter_id: string
          site_id: string
          created_at?: string
          updated_at?: string
          signature?: string | null
          signature_date?: string | null
          signer_name?: string | null
        }
        Update: {
          id?: string
          reference?: string
          type?: 'accident' | 'presque_accident' | 'incident' | 'situation_dangereuse'
          module?: 'sst' | 'incendie' | 'surete' | 'environnement' | 'qualite'
          title?: string
          description?: string
          location?: string
          incident_date?: string
          severity?: 'faible' | 'moyen' | 'grave' | 'critique'
          status?: 'ouvert' | 'en_cours' | 'cloture'
          reporter_id?: string
          site_id?: string
          created_at?: string
          updated_at?: string
        }
      }
      epi: {
        Row: {
          id: string
          user_id: string
          equipment_type: string
          brand: string | null
          attribution_date: string
          expiry_date: string
          status: 'conforme' | 'a_verifier' | 'perime'
          site_id: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          equipment_type: string
          brand?: string | null
          attribution_date?: string
          expiry_date: string
          status?: 'conforme' | 'a_verifier' | 'perime'
          site_id: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          equipment_type?: string
          brand?: string | null
          attribution_date?: string
          expiry_date?: string
          status?: 'conforme' | 'a_verifier' | 'perime'
          site_id?: string
          created_at?: string
        }
      }
      formations: {
        Row: {
          id: string
          title: string
          type: 'sst' | 'incendie' | 'surete' | 'autre'
          reference: string
          date: string
          duration_hours: number
          trainer: string | null
          location: string | null
          max_participants: number | null
          status: 'planifiee' | 'en_cours' | 'terminee' | 'annulee'
          site_id: string
          created_at: string
        }
        Insert: {
          id?: string
          title: string
          type?: 'sst' | 'incendie' | 'surete' | 'autre'
          reference: string
          date: string
          duration_hours?: number
          trainer?: string | null
          location?: string | null
          max_participants?: number | null
          status?: 'planifiee' | 'en_cours' | 'terminee' | 'annulee'
          site_id: string
          created_at?: string
        }
        Update: {
          id?: string
          title?: string
          type?: 'sst' | 'incendie' | 'surete' | 'autre'
          reference?: string
          date?: string
          duration_hours?: number
          trainer?: string | null
          location?: string | null
          max_participants?: number | null
          status?: 'planifiee' | 'en_cours' | 'terminee' | 'annulee'
          site_id?: string
          created_at?: string
        }
      }
      formation_participants: {
        Row: {
          id: string
          formation_id: string
          user_id: string
          attendance: boolean
          passed: boolean
          certificate_url: string | null
          created_at: string
        }
        Insert: {
          id?: string
          formation_id: string
          user_id: string
          attendance?: boolean
          passed?: boolean
          certificate_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          formation_id?: string
          user_id?: string
          attendance?: boolean
          passed?: boolean
          certificate_url?: string | null
          created_at?: string
        }
      }
      actions_capa: {
        Row: {
          id: string
          reference: string
          description: string
          type: 'corrective' | 'preventive'
          priority: 'basse' | 'moyenne' | 'haute' | 'critique'
          status: 'ouverte' | 'en_cours' | 'terminee'
          responsible_id: string
          due_date: string
          completion_date: string | null
          incident_id: string | null
          site_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          reference: string
          description: string
          type?: 'corrective' | 'preventive'
          priority?: 'basse' | 'moyenne' | 'haute' | 'critique'
          status?: 'ouverte' | 'en_cours' | 'terminee'
          responsible_id: string
          due_date: string
          completion_date?: string | null
          incident_id?: string | null
          site_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          reference?: string
          description?: string
          type?: 'corrective' | 'preventive'
          priority?: 'basse' | 'moyenne' | 'haute' | 'critique'
          status?: 'ouverte' | 'en_cours' | 'terminee'
          responsible_id?: string
          due_date?: string
          completion_date?: string | null
          incident_id?: string | null
          site_id?: string
          created_at?: string
          updated_at?: string
        }
      }
      equipements_incendie: {
        Row: {
          id: string
          reference: string
          type: string
          location: string
          last_inspection: string | null
          next_inspection: string
          status: 'conforme' | 'a_reviser' | 'hors_service'
          site_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          reference: string
          type: string
          location: string
          last_inspection?: string | null
          next_inspection: string
          status?: 'conforme' | 'a_reviser' | 'hors_service'
          site_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          reference?: string
          type?: string
          location?: string
          last_inspection?: string | null
          next_inspection?: string
          status?: 'conforme' | 'a_reviser' | 'hors_service'
          site_id?: string
          created_at?: string
          updated_at?: string
        }
      }
      visiteurs: {
        Row: {
          id: string
          full_name: string
          company: string
          purpose: string
          host: string
          badge_number: string | null
          entry_time: string
          exit_time: string | null
          site_id: string
          created_at: string
        }
        Insert: {
          id?: string
          full_name: string
          company: string
          purpose: string
          host: string
          badge_number?: string | null
          entry_time?: string
          exit_time?: string | null
          site_id: string
          created_at?: string
        }
        Update: {
          id?: string
          full_name?: string
          company?: string
          purpose?: string
          host?: string
          badge_number?: string | null
          entry_time?: string
          exit_time?: string | null
          site_id?: string
          created_at?: string
        }
      }
      audits: {
        Row: {
          id: string
          reference: string
          type: string
          date: string
          auditor_id: string
          score: number | null
          status: 'planifie' | 'en_cours' | 'termine'
          site_id: string
          created_at: string
        }
        Insert: {
          id?: string
          reference: string
          type: string
          date: string
          auditor_id: string
          score?: number | null
          status?: 'planifie' | 'en_cours' | 'termine'
          site_id: string
          created_at?: string
        }
        Update: {
          id?: string
          reference?: string
          type?: string
          date?: string
          auditor_id?: string
          score?: number | null
          status?: 'planifie' | 'en_cours' | 'termine'
          site_id?: string
          created_at?: string
        }
      }
      non_conformites: {
        Row: {
          id: string
          reference: string
          description: string
          priority: 'mineure' | 'majeure' | 'critique'
          status: 'ouvert' | 'en_cours' | 'cloture'
          audit_id: string | null
          responsible_id: string
          due_date: string
          site_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          reference: string
          description: string
          priority?: 'mineure' | 'majeure' | 'critique'
          status?: 'ouvert' | 'en_cours' | 'cloture'
          audit_id?: string | null
          responsible_id: string
          due_date: string
          site_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          reference?: string
          description?: string
          priority?: 'mineure' | 'majeure' | 'critique'
          status?: 'ouvert' | 'en_cours' | 'cloture'
          audit_id?: string | null
          responsible_id?: string
          due_date?: string
          site_id?: string
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
