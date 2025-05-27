export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      club_officials: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          club_id: string
          created_at: string
          id: string
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          club_id: string
          created_at?: string
          id?: string
          role: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          club_id?: string
          created_at?: string
          id?: string
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "club_officials_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_club_officials_club_id"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_club_officials_user_id"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      club_teams: {
        Row: {
          club_id: string
          created_at: string | null
          id: string
          team_id: string
        }
        Insert: {
          club_id: string
          created_at?: string | null
          id?: string
          team_id: string
        }
        Update: {
          club_id?: string
          created_at?: string | null
          id?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "club_teams_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "club_teams_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      clubs: {
        Row: {
          created_at: string | null
          id: string
          name: string
          reference_number: string | null
          serial_number: string | null
          subscription_type: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          reference_number?: string | null
          serial_number?: string | null
          subscription_type?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          reference_number?: string | null
          serial_number?: string | null
          subscription_type?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      coaching_badges: {
        Row: {
          badge_level: string | null
          badge_name: string
          certificate_number: string | null
          created_at: string | null
          expiry_date: string | null
          id: string
          issued_date: string | null
          issuing_authority: string | null
          staff_id: string
        }
        Insert: {
          badge_level?: string | null
          badge_name: string
          certificate_number?: string | null
          created_at?: string | null
          expiry_date?: string | null
          id?: string
          issued_date?: string | null
          issuing_authority?: string | null
          staff_id: string
        }
        Update: {
          badge_level?: string | null
          badge_name?: string
          certificate_number?: string | null
          created_at?: string | null
          expiry_date?: string | null
          id?: string
          issued_date?: string | null
          issuing_authority?: string | null
          staff_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coaching_badges_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "team_staff"
            referencedColumns: ["id"]
          },
        ]
      }
      coaching_courses: {
        Row: {
          certificate_number: string | null
          completion_date: string | null
          course_name: string
          course_type: string | null
          created_at: string | null
          id: string
          issuing_authority: string | null
          staff_id: string
        }
        Insert: {
          certificate_number?: string | null
          completion_date?: string | null
          course_name: string
          course_type?: string | null
          created_at?: string | null
          id?: string
          issuing_authority?: string | null
          staff_id: string
        }
        Update: {
          certificate_number?: string | null
          completion_date?: string | null
          course_name?: string
          course_type?: string | null
          created_at?: string | null
          id?: string
          issuing_authority?: string | null
          staff_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coaching_courses_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "team_staff"
            referencedColumns: ["id"]
          },
        ]
      }
      event_attendees: {
        Row: {
          attendee_type: string
          created_at: string
          event_id: string
          id: string
          responded_at: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          attendee_type: string
          created_at?: string
          event_id: string
          id?: string
          responded_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          attendee_type?: string
          created_at?: string
          event_id?: string
          id?: string
          responded_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_attendees_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_attendees_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      event_player_stats: {
        Row: {
          created_at: string
          event_id: string
          id: string
          is_captain: boolean
          is_substitute: boolean
          minutes_played: number
          period_number: number
          player_id: string
          position: string | null
          substitution_time: number | null
          team_number: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          is_captain?: boolean
          is_substitute?: boolean
          minutes_played?: number
          period_number?: number
          player_id: string
          position?: string | null
          substitution_time?: number | null
          team_number?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          is_captain?: boolean
          is_substitute?: boolean
          minutes_played?: number
          period_number?: number
          player_id?: string
          position?: string | null
          substitution_time?: number | null
          team_number?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_player_stats_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_player_stats_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      event_selections: {
        Row: {
          captain_id: string | null
          created_at: string
          duration_minutes: number
          event_id: string
          formation: string
          id: string
          kit_selection: Json | null
          performance_category: string | null
          performance_category_id: string | null
          period_number: number
          player_positions: Json
          staff_selection: Json | null
          substitutes: Json
          team_id: string
          team_number: number | null
          updated_at: string
        }
        Insert: {
          captain_id?: string | null
          created_at?: string
          duration_minutes?: number
          event_id: string
          formation: string
          id?: string
          kit_selection?: Json | null
          performance_category?: string | null
          performance_category_id?: string | null
          period_number?: number
          player_positions?: Json
          staff_selection?: Json | null
          substitutes?: Json
          team_id: string
          team_number?: number | null
          updated_at?: string
        }
        Update: {
          captain_id?: string | null
          created_at?: string
          duration_minutes?: number
          event_id?: string
          formation?: string
          id?: string
          kit_selection?: Json | null
          performance_category?: string | null
          performance_category_id?: string | null
          period_number?: number
          player_positions?: Json
          staff_selection?: Json | null
          substitutes?: Json
          team_id?: string
          team_number?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_selections_captain_id_fkey"
            columns: ["captain_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_selections_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_selections_performance_category_id_fkey"
            columns: ["performance_category_id"]
            isOneToOne: false
            referencedRelation: "performance_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_selections_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      event_teams: {
        Row: {
          created_at: string
          event_id: string
          id: string
          team_id: string
          team_number: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          team_id: string
          team_number?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          team_id?: string
          team_number?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_teams_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          coach_notes: string | null
          created_at: string
          date: string
          description: string | null
          end_time: string | null
          event_type: string
          facility_booking_id: string | null
          facility_id: string | null
          game_format: string | null
          id: string
          is_home: boolean | null
          location: string | null
          meeting_time: string | null
          notes: string | null
          opponent: string | null
          player_of_match_id: string | null
          scores: Json | null
          staff_notes: string | null
          start_time: string | null
          team_id: string
          title: string
          total_minutes: number | null
          training_notes: string | null
          updated_at: string
        }
        Insert: {
          coach_notes?: string | null
          created_at?: string
          date: string
          description?: string | null
          end_time?: string | null
          event_type: string
          facility_booking_id?: string | null
          facility_id?: string | null
          game_format?: string | null
          id?: string
          is_home?: boolean | null
          location?: string | null
          meeting_time?: string | null
          notes?: string | null
          opponent?: string | null
          player_of_match_id?: string | null
          scores?: Json | null
          staff_notes?: string | null
          start_time?: string | null
          team_id: string
          title: string
          total_minutes?: number | null
          training_notes?: string | null
          updated_at?: string
        }
        Update: {
          coach_notes?: string | null
          created_at?: string
          date?: string
          description?: string | null
          end_time?: string | null
          event_type?: string
          facility_booking_id?: string | null
          facility_id?: string | null
          game_format?: string | null
          id?: string
          is_home?: boolean | null
          location?: string | null
          meeting_time?: string | null
          notes?: string | null
          opponent?: string | null
          player_of_match_id?: string | null
          scores?: Json | null
          staff_notes?: string | null
          start_time?: string | null
          team_id?: string
          title?: string
          total_minutes?: number | null
          training_notes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_facility_booking_id_fkey"
            columns: ["facility_booking_id"]
            isOneToOne: false
            referencedRelation: "facility_availability"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_player_of_match_id_fkey"
            columns: ["player_of_match_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      facilities: {
        Row: {
          bookable_units: string
          club_id: string
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          bookable_units?: string
          club_id: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          bookable_units?: string
          club_id?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "facilities_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      facility_availability: {
        Row: {
          booked_by_team_id: string | null
          created_at: string
          date: string
          end_time: string
          event_type: string | null
          facility_id: string
          id: string
          is_available: boolean
          start_time: string
          updated_at: string
        }
        Insert: {
          booked_by_team_id?: string | null
          created_at?: string
          date: string
          end_time: string
          event_type?: string | null
          facility_id: string
          id?: string
          is_available?: boolean
          start_time: string
          updated_at?: string
        }
        Update: {
          booked_by_team_id?: string | null
          created_at?: string
          date?: string
          end_time?: string
          event_type?: string | null
          facility_id?: string
          id?: string
          is_available?: boolean
          start_time?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "facility_availability_booked_by_team_id_fkey"
            columns: ["booked_by_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "facility_availability_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
        ]
      }
      parents: {
        Row: {
          created_at: string | null
          email: string
          id: string
          link_code: string
          name: string
          phone: string | null
          player_id: string | null
          subscription_status: string | null
          subscription_type: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          link_code?: string
          name: string
          phone?: string | null
          player_id?: string | null
          subscription_status?: string | null
          subscription_type?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          link_code?: string
          name?: string
          phone?: string | null
          player_id?: string | null
          subscription_status?: string | null
          subscription_type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "parents_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      performance_categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          team_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          team_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          team_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      player_attribute_history: {
        Row: {
          attribute_group: string
          attribute_name: string
          created_at: string | null
          id: string
          player_id: string | null
          recorded_by: string
          recorded_date: string
          value: number
        }
        Insert: {
          attribute_group: string
          attribute_name: string
          created_at?: string | null
          id?: string
          player_id?: string | null
          recorded_by: string
          recorded_date?: string
          value: number
        }
        Update: {
          attribute_group?: string
          attribute_name?: string
          created_at?: string | null
          id?: string
          player_id?: string | null
          recorded_by?: string
          recorded_date?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "player_attribute_history_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      player_transfers: {
        Row: {
          accepted_by: string | null
          created_at: string | null
          data_transfer_options: Json | null
          from_team_id: string | null
          id: string
          player_id: string | null
          requested_by: string
          status: string | null
          to_team_id: string | null
          transfer_date: string
          updated_at: string | null
        }
        Insert: {
          accepted_by?: string | null
          created_at?: string | null
          data_transfer_options?: Json | null
          from_team_id?: string | null
          id?: string
          player_id?: string | null
          requested_by: string
          status?: string | null
          to_team_id?: string | null
          transfer_date?: string
          updated_at?: string | null
        }
        Update: {
          accepted_by?: string | null
          created_at?: string | null
          data_transfer_options?: Json | null
          from_team_id?: string | null
          id?: string
          player_id?: string | null
          requested_by?: string
          status?: string | null
          to_team_id?: string | null
          transfer_date?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "player_transfers_from_team_id_fkey"
            columns: ["from_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_transfers_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_transfers_to_team_id_fkey"
            columns: ["to_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      players: {
        Row: {
          attributes: Json | null
          availability: string
          comments: Json | null
          created_at: string
          date_of_birth: string
          id: string
          kit_sizes: Json | null
          leave_comments: string | null
          leave_date: string | null
          linking_code: string | null
          match_stats: Json | null
          name: string
          objectives: Json | null
          parent_id: string | null
          performance_category_id: string | null
          squad_number: number
          status: string | null
          subscription_status: string | null
          subscription_type: string | null
          team_id: string
          type: string
          updated_at: string
        }
        Insert: {
          attributes?: Json | null
          availability?: string
          comments?: Json | null
          created_at?: string
          date_of_birth: string
          id?: string
          kit_sizes?: Json | null
          leave_comments?: string | null
          leave_date?: string | null
          linking_code?: string | null
          match_stats?: Json | null
          name: string
          objectives?: Json | null
          parent_id?: string | null
          performance_category_id?: string | null
          squad_number: number
          status?: string | null
          subscription_status?: string | null
          subscription_type?: string | null
          team_id: string
          type: string
          updated_at?: string
        }
        Update: {
          attributes?: Json | null
          availability?: string
          comments?: Json | null
          created_at?: string
          date_of_birth?: string
          id?: string
          kit_sizes?: Json | null
          leave_comments?: string | null
          leave_date?: string | null
          linking_code?: string | null
          match_stats?: Json | null
          name?: string
          objectives?: Json | null
          parent_id?: string | null
          performance_category_id?: string | null
          squad_number?: number
          status?: string | null
          subscription_status?: string | null
          subscription_type?: string | null
          team_id?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "players_performance_category_id_fkey"
            columns: ["performance_category_id"]
            isOneToOne: false
            referencedRelation: "performance_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "players_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          coaching_badges: Json | null
          created_at: string | null
          email: string | null
          fa_id: string | null
          id: string
          name: string | null
          phone: string | null
          roles: string[] | null
          updated_at: string | null
        }
        Insert: {
          coaching_badges?: Json | null
          created_at?: string | null
          email?: string | null
          fa_id?: string | null
          id: string
          name?: string | null
          phone?: string | null
          roles?: string[] | null
          updated_at?: string | null
        }
        Update: {
          coaching_badges?: Json | null
          created_at?: string | null
          email?: string | null
          fa_id?: string | null
          id?: string
          name?: string | null
          phone?: string | null
          roles?: string[] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      staff_certifications: {
        Row: {
          awarded_by: string | null
          awarded_date: string
          certification_name: string
          certification_type: string
          club_id: string
          created_at: string
          expiry_date: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          awarded_by?: string | null
          awarded_date: string
          certification_name: string
          certification_type: string
          club_id: string
          created_at?: string
          expiry_date?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          awarded_by?: string | null
          awarded_date?: string
          certification_name?: string
          certification_type?: string
          club_id?: string
          created_at?: string
          expiry_date?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_certifications_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      team_clothing_sizes: {
        Row: {
          category: string
          created_at: string
          display_order: number
          id: string
          size_name: string
          team_id: string
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          display_order?: number
          id?: string
          size_name: string
          team_id: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          display_order?: number
          id?: string
          size_name?: string
          team_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      team_equipment: {
        Row: {
          condition: string
          created_at: string
          description: string | null
          id: string
          name: string
          quantity: number
          team_id: string
          updated_at: string
        }
        Insert: {
          condition?: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          quantity?: number
          team_id: string
          updated_at?: string
        }
        Update: {
          condition?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          quantity?: number
          team_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      team_kit_issues: {
        Row: {
          created_at: string
          date_issued: string
          id: string
          issued_by: string | null
          kit_item_id: string | null
          kit_item_name: string
          kit_size: string | null
          player_ids: Json
          quantity: number
          team_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          date_issued?: string
          id?: string
          issued_by?: string | null
          kit_item_id?: string | null
          kit_item_name: string
          kit_size?: string | null
          player_ids?: Json
          quantity?: number
          team_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          date_issued?: string
          id?: string
          issued_by?: string | null
          kit_item_id?: string | null
          kit_item_name?: string
          kit_size?: string | null
          player_ids?: Json
          quantity?: number
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_kit_issues_kit_item_id_fkey"
            columns: ["kit_item_id"]
            isOneToOne: false
            referencedRelation: "kit_items_with_sizes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_kit_issues_kit_item_id_fkey"
            columns: ["kit_item_id"]
            isOneToOne: false
            referencedRelation: "team_kit_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_kit_issues_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_kit_items: {
        Row: {
          available_sizes: Json
          category: string
          created_at: string
          id: string
          name: string
          size_category: string | null
          team_id: string
          updated_at: string
        }
        Insert: {
          available_sizes?: Json
          category?: string
          created_at?: string
          id?: string
          name: string
          size_category?: string | null
          team_id: string
          updated_at?: string
        }
        Update: {
          available_sizes?: Json
          category?: string
          created_at?: string
          id?: string
          name?: string
          size_category?: string | null
          team_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      team_privacy_settings: {
        Row: {
          created_at: string
          id: string
          show_player_stats_to_parents: boolean
          show_player_stats_to_players: boolean
          show_scores_to_parents: boolean
          show_scores_to_players: boolean
          team_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          show_player_stats_to_parents?: boolean
          show_player_stats_to_players?: boolean
          show_scores_to_parents?: boolean
          show_scores_to_players?: boolean
          team_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          show_player_stats_to_parents?: boolean
          show_player_stats_to_players?: boolean
          show_scores_to_parents?: boolean
          show_scores_to_players?: boolean
          team_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      team_staff: {
        Row: {
          certificates: Json | null
          coaching_badges: Json | null
          created_at: string | null
          email: string
          id: string
          name: string
          phone: string | null
          pvg_checked: boolean | null
          pvg_checked_at: string | null
          pvg_checked_by: string | null
          role: string
          team_id: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          certificates?: Json | null
          coaching_badges?: Json | null
          created_at?: string | null
          email: string
          id?: string
          name: string
          phone?: string | null
          pvg_checked?: boolean | null
          pvg_checked_at?: string | null
          pvg_checked_by?: string | null
          role: string
          team_id: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          certificates?: Json | null
          coaching_badges?: Json | null
          created_at?: string | null
          email?: string
          id?: string
          name?: string
          phone?: string | null
          pvg_checked?: boolean | null
          pvg_checked_at?: string | null
          pvg_checked_by?: string | null
          role?: string
          team_id?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "team_staff_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_subscriptions: {
        Row: {
          billing_period: string | null
          created_at: string
          end_date: string | null
          id: string
          start_date: string
          status: string
          subscription_type: string
          team_id: string
          updated_at: string
          value_per_period: number | null
        }
        Insert: {
          billing_period?: string | null
          created_at?: string
          end_date?: string | null
          id?: string
          start_date: string
          status?: string
          subscription_type: string
          team_id: string
          updated_at?: string
          value_per_period?: number | null
        }
        Update: {
          billing_period?: string | null
          created_at?: string
          end_date?: string | null
          id?: string
          start_date?: string
          status?: string
          subscription_type?: string
          team_id?: string
          updated_at?: string
          value_per_period?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "team_subscriptions_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          age_group: string
          club_id: string | null
          created_at: string | null
          game_format: string
          id: string
          kit_icons: Json | null
          manager_email: string | null
          manager_name: string | null
          manager_phone: string | null
          name: string
          performance_categories: string[] | null
          season_end: string
          season_start: string
          subscription_type: string | null
          updated_at: string | null
        }
        Insert: {
          age_group: string
          club_id?: string | null
          created_at?: string | null
          game_format: string
          id?: string
          kit_icons?: Json | null
          manager_email?: string | null
          manager_name?: string | null
          manager_phone?: string | null
          name: string
          performance_categories?: string[] | null
          season_end: string
          season_start: string
          subscription_type?: string | null
          updated_at?: string | null
        }
        Update: {
          age_group?: string
          club_id?: string | null
          created_at?: string | null
          game_format?: string
          id?: string
          kit_icons?: Json | null
          manager_email?: string | null
          manager_name?: string | null
          manager_phone?: string | null
          name?: string
          performance_categories?: string[] | null
          season_end?: string
          season_start?: string
          subscription_type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_teams_club_id"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teams_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      user_clubs: {
        Row: {
          club_id: string
          created_at: string | null
          id: string
          role: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          club_id: string
          created_at?: string | null
          id?: string
          role: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          club_id?: string
          created_at?: string | null
          id?: string
          role?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_user_clubs_club_id"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_user_clubs_user_id"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_clubs_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      user_invitations: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invitation_code: string
          invited_by: string
          name: string
          player_id: string | null
          role: string
          status: string
          team_id: string | null
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invitation_code?: string
          invited_by: string
          name: string
          player_id?: string | null
          role: string
          status?: string
          team_id?: string | null
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invitation_code?: string
          invited_by?: string
          name?: string
          player_id?: string | null
          role?: string
          status?: string
          team_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_invitations_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_invitations_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      user_players: {
        Row: {
          created_at: string
          id: string
          player_id: string
          relationship: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          player_id: string
          relationship: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          player_id?: string
          relationship?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_players_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      user_teams: {
        Row: {
          created_at: string | null
          id: string
          role: string
          team_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: string
          team_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: string
          team_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_user_teams_team_id"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_user_teams_user_id"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_teams_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      kit_items_with_sizes: {
        Row: {
          available_size_ids: string[] | null
          available_size_names: string[] | null
          category: string | null
          id: string | null
          name: string | null
          size_category: string | null
          team_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      generate_club_serial: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_current_user_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      update_all_completed_events_stats: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      update_event_player_stats: {
        Args: { event_uuid: string }
        Returns: undefined
      }
      update_player_match_stats: {
        Args: { player_uuid: string }
        Returns: undefined
      }
      user_is_global_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
