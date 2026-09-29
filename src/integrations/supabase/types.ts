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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      family_members: {
        Row: {
          age: number | null
          created_at: string
          diet_notes: string[]
          dislikes: string[]
          household_id: string
          id: string
          likes: string[]
          name: string
          ration_factor: number
          sport_level: string
        }
        Insert: {
          age?: number | null
          created_at?: string
          diet_notes?: string[]
          dislikes?: string[]
          household_id: string
          id?: string
          likes?: string[]
          name: string
          ration_factor?: number
          sport_level?: string
        }
        Update: {
          age?: number | null
          created_at?: string
          diet_notes?: string[]
          dislikes?: string[]
          household_id?: string
          id?: string
          likes?: string[]
          name?: string
          ration_factor?: number
          sport_level?: string
        }
        Relationships: [
          {
            foreignKeyName: "family_members_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback: {
        Row: {
          created_at: string
          do_not_repeat: boolean
          household_id: string
          id: string
          member_id: string | null
          plan_item_id: string | null
          rating: number
          recipe_name: string
        }
        Insert: {
          created_at?: string
          do_not_repeat?: boolean
          household_id: string
          id?: string
          member_id?: string | null
          plan_item_id?: string | null
          rating?: number
          recipe_name: string
        }
        Update: {
          created_at?: string
          do_not_repeat?: boolean
          household_id?: string
          id?: string
          member_id?: string | null
          plan_item_id?: string | null
          rating?: number
          recipe_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "feedback_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "family_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_plan_item_id_fkey"
            columns: ["plan_item_id"]
            isOneToOne: false
            referencedRelation: "plan_items"
            referencedColumns: ["id"]
          },
        ]
      }
      household_users: {
        Row: {
          created_at: string
          household_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          household_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          household_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "household_users_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      households: {
        Row: {
          created_at: string
          equipment: string[]
          id: string
          name: string
          no_cook_slots: Json
          owner_id: string
        }
        Insert: {
          created_at?: string
          equipment?: string[]
          id?: string
          name?: string
          no_cook_slots?: Json
          owner_id: string
        }
        Update: {
          created_at?: string
          equipment?: string[]
          id?: string
          name?: string
          no_cook_slots?: Json
          owner_id?: string
        }
        Relationships: []
      }
      meal_plans: {
        Row: {
          batch_cooking: Json
          created_at: string
          household_id: string
          id: string
          summary: string | null
          week_start: string
        }
        Insert: {
          batch_cooking?: Json
          created_at?: string
          household_id: string
          id?: string
          summary?: string | null
          week_start: string
        }
        Update: {
          batch_cooking?: Json
          created_at?: string
          household_id?: string
          id?: string
          summary?: string | null
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "meal_plans_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      pantry_items: {
        Row: {
          created_at: string
          expires_on: string | null
          household_id: string
          id: string
          location: string | null
          name: string
          quantity: number
          unit: string
        }
        Insert: {
          created_at?: string
          expires_on?: string | null
          household_id: string
          id?: string
          location?: string | null
          name: string
          quantity?: number
          unit?: string
        }
        Update: {
          created_at?: string
          expires_on?: string | null
          household_id?: string
          id?: string
          location?: string | null
          name?: string
          quantity?: number
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "pantry_items_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_items: {
        Row: {
          batch_friendly: boolean
          course: string
          created_at: string
          day: string
          household_id: string
          id: string
          ingredients: Json
          is_fish: boolean
          is_leftover: boolean
          is_legume: boolean
          is_pasta: boolean
          is_red_meat: boolean
          main_type: string | null
          meal: string
          name: string
          plan_id: string
        }
        Insert: {
          batch_friendly?: boolean
          course: string
          created_at?: string
          day: string
          household_id: string
          id?: string
          ingredients?: Json
          is_fish?: boolean
          is_leftover?: boolean
          is_legume?: boolean
          is_pasta?: boolean
          is_red_meat?: boolean
          main_type?: string | null
          meal: string
          name: string
          plan_id: string
        }
        Update: {
          batch_friendly?: boolean
          course?: string
          created_at?: string
          day?: string
          household_id?: string
          id?: string
          ingredients?: Json
          is_fish?: boolean
          is_leftover?: boolean
          is_legume?: boolean
          is_pasta?: boolean
          is_red_meat?: boolean
          main_type?: string | null
          meal?: string
          name?: string
          plan_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_items_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_items_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "meal_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      recipes: {
        Row: {
          batch_friendly: boolean
          course: string
          created_at: string
          household_id: string
          id: string
          ingredients: Json
          is_favorite: boolean
          is_fish: boolean
          is_legume: boolean
          is_pasta: boolean
          is_red_meat: boolean
          main_type: string | null
          name: string
        }
        Insert: {
          batch_friendly?: boolean
          course?: string
          created_at?: string
          household_id: string
          id?: string
          ingredients?: Json
          is_favorite?: boolean
          is_fish?: boolean
          is_legume?: boolean
          is_pasta?: boolean
          is_red_meat?: boolean
          main_type?: string | null
          name: string
        }
        Update: {
          batch_friendly?: boolean
          course?: string
          created_at?: string
          household_id?: string
          id?: string
          ingredients?: Json
          is_favorite?: boolean
          is_fish?: boolean
          is_legume?: boolean
          is_pasta?: boolean
          is_red_meat?: boolean
          main_type?: string | null
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipes_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      shopping_items: {
        Row: {
          created_at: string
          household_id: string
          id: string
          is_checked: boolean
          name: string
          plan_id: string | null
          quantity: number
          store: string
          unit: string
        }
        Insert: {
          created_at?: string
          household_id: string
          id?: string
          is_checked?: boolean
          name: string
          plan_id?: string | null
          quantity?: number
          store?: string
          unit?: string
        }
        Update: {
          created_at?: string
          household_id?: string
          id?: string
          is_checked?: boolean
          name?: string
          plan_id?: string | null
          quantity?: number
          store?: string
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "shopping_items_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shopping_items_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "meal_plans"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_household_member: { Args: { _household_id: string }; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
