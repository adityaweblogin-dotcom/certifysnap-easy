export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          actor_email: string | null
          actor_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string | null
          event_id: string | null
          id: string
          metadata: Json
          organization_id: string | null
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          event_id?: string | null
          id?: string
          metadata?: Json
          organization_id?: string | null
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          event_id?: string | null
          id?: string
          metadata?: Json
          organization_id?: string | null
        }
        Relationships: []
      }
      certificates: {
        Row: {
          created_at: string
          download_count: number
          downloaded_at: string | null
          event_id: string
          id: string
          issued_at: string
          last_error: string | null
          participant_id: string
          revoked: boolean
          sent_at: string | null
          status: Database["public"]["Enums"]["cert_status"]
          template_id: string | null
          updated_at: string
          values: Json
          verification_code: string
        }
        Insert: {
          created_at?: string
          download_count?: number
          downloaded_at?: string | null
          event_id: string
          id?: string
          issued_at?: string
          last_error?: string | null
          participant_id: string
          revoked?: boolean
          sent_at?: string | null
          status?: Database["public"]["Enums"]["cert_status"]
          template_id?: string | null
          updated_at?: string
          values?: Json
          verification_code: string
        }
        Update: {
          created_at?: string
          download_count?: number
          downloaded_at?: string | null
          event_id?: string
          id?: string
          issued_at?: string
          last_error?: string | null
          participant_id?: string
          revoked?: boolean
          sent_at?: string | null
          status?: Database["public"]["Enums"]["cert_status"]
          template_id?: string | null
          updated_at?: string
          values?: Json
          verification_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "certificates_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificates_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: true
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificates_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_logs: {
        Row: {
          certificate_id: string | null
          channel: string
          created_at: string
          detail: string | null
          event_id: string
          id: string
          recipient_email: string | null
          status: string
        }
        Insert: {
          certificate_id?: string | null
          channel?: string
          created_at?: string
          detail?: string | null
          event_id: string
          id?: string
          recipient_email?: string | null
          status: string
        }
        Update: {
          certificate_id?: string | null
          channel?: string
          created_at?: string
          detail?: string | null
          event_id?: string
          id?: string
          recipient_email?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_logs_certificate_id_fkey"
            columns: ["certificate_id"]
            isOneToOne: false
            referencedRelation: "certificates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_logs_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          certificate_type: string
          created_at: string
          created_by: string | null
          description: string | null
          event_date: string | null
          id: string
          name: string
          organization_id: string
          schedule_batch_size: number
          schedule_cadence: string
          schedule_enabled: boolean
          schedule_last_run_at: string | null
          schedule_next_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          certificate_type?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          event_date?: string | null
          id?: string
          name: string
          organization_id: string
          schedule_batch_size?: number
          schedule_cadence?: string
          schedule_enabled?: boolean
          schedule_last_run_at?: string | null
          schedule_next_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          certificate_type?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          event_date?: string | null
          id?: string
          name?: string
          organization_id?: string
          schedule_batch_size?: number
          schedule_cadence?: string
          schedule_enabled?: boolean
          schedule_last_run_at?: string | null
          schedule_next_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          id: string
          is_demo: boolean
          logo_url: string | null
          name: string
          owner_id: string | null
          signature_url: string | null
          slug: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_demo?: boolean
          logo_url?: string | null
          name: string
          owner_id?: string | null
          signature_url?: string | null
          slug?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_demo?: boolean
          logo_url?: string | null
          name?: string
          owner_id?: string | null
          signature_url?: string | null
          slug?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      participants: {
        Row: {
          certificate_type: string | null
          created_at: string
          data: Json
          email: string
          event_id: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          certificate_type?: string | null
          created_at?: string
          data?: Json
          email: string
          event_id: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          certificate_type?: string | null
          created_at?: string
          data?: Json
          email?: string
          event_id?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "participants_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      templates: {
        Row: {
          background_color: string
          background_url: string | null
          created_at: string
          elements: Json
          event_id: string
          field_map: Json
          height: number
          id: string
          is_default: boolean
          name: string
          updated_at: string
          width: number
        }
        Insert: {
          background_color?: string
          background_url?: string | null
          created_at?: string
          elements?: Json
          event_id: string
          field_map?: Json
          height?: number
          id?: string
          is_default?: boolean
          name?: string
          updated_at?: string
          width?: number
        }
        Update: {
          background_color?: string
          background_url?: string | null
          created_at?: string
          elements?: Json
          event_id?: string
          field_map?: Json
          height?: number
          id?: string
          is_default?: boolean
          name?: string
          updated_at?: string
          width?: number
        }
        Relationships: [
          {
            foreignKeyName: "templates_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_manage_event: { Args: { _event: string }; Returns: boolean }
      can_manage_org: { Args: { _org: string }; Returns: boolean }
      can_view_event: { Args: { _event: string }; Returns: boolean }
      can_view_org: { Args: { _org: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      log_verification_attempt: {
        Args: { _code: string; _found: boolean }
        Returns: undefined
      }
      mark_certificate_downloaded: {
        Args: { _code: string }
        Returns: undefined
      }
      org_role: {
        Args: { _org: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      verify_certificate: {
        Args: { _code: string }
        Returns: {
          certificate_type: string
          event_date: string
          event_name: string
          issued_at: string
          organization_name: string
          recipient_email_masked: string
          recipient_name: string
          revoked: boolean
          sent_at: string
          status: string
          valid: boolean
          verification_code: string
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "organizer" | "viewer"
      cert_status: "draft" | "generated" | "sent" | "failed" | "downloaded"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "organizer", "viewer"],
      cert_status: ["draft", "generated", "sent", "failed", "downloaded"],
    },
  },
} as const
