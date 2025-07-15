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
    PostgrestVersion: "12.2.3 (519615d)"
  }
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
            referencedRelation: "linked_teams"
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
          logo_url: string | null
          name: string
          reference_number: string | null
          serial_number: string | null
          subscription_type: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          logo_url?: string | null
          name: string
          reference_number?: string | null
          serial_number?: string | null
          subscription_type?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          logo_url?: string | null
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
      event_availability: {
        Row: {
          created_at: string
          event_id: string
          id: string
          notification_sent_at: string | null
          responded_at: string | null
          role: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          notification_sent_at?: string | null
          responded_at?: string | null
          role: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          notification_sent_at?: string | null
          responded_at?: string | null
          role?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_availability_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
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
          performance_category_id: string | null
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
          performance_category_id?: string | null
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
          performance_category_id?: string | null
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
          minutes_played: Json | null
          performance_category: string | null
          performance_category_id: string | null
          period_number: number
          player_positions: Json
          staff_selection: Json | null
          substitute_players: Json | null
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
          minutes_played?: Json | null
          performance_category?: string | null
          performance_category_id?: string | null
          period_number?: number
          player_positions?: Json
          staff_selection?: Json | null
          substitute_players?: Json | null
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
          minutes_played?: Json | null
          performance_category?: string | null
          performance_category_id?: string | null
          period_number?: number
          player_positions?: Json
          staff_selection?: Json | null
          substitute_players?: Json | null
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
            referencedRelation: "linked_teams"
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
          game_duration: number | null
          game_format: string | null
          id: string
          is_home: boolean | null
          kit_selection: string | null
          latitude: number | null
          location: string | null
          longitude: number | null
          meeting_time: string | null
          notes: string | null
          opponent: string | null
          player_of_match_id: string | null
          scores: Json | null
          staff_notes: string | null
          start_time: string | null
          team_id: string
          teams: Json | null
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
          game_duration?: number | null
          game_format?: string | null
          id?: string
          is_home?: boolean | null
          kit_selection?: string | null
          latitude?: number | null
          location?: string | null
          longitude?: number | null
          meeting_time?: string | null
          notes?: string | null
          opponent?: string | null
          player_of_match_id?: string | null
          scores?: Json | null
          staff_notes?: string | null
          start_time?: string | null
          team_id: string
          teams?: Json | null
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
          game_duration?: number | null
          game_format?: string | null
          id?: string
          is_home?: boolean | null
          kit_selection?: string | null
          latitude?: number | null
          location?: string | null
          longitude?: number | null
          meeting_time?: string | null
          notes?: string | null
          opponent?: string | null
          player_of_match_id?: string | null
          scores?: Json | null
          staff_notes?: string | null
          start_time?: string | null
          team_id?: string
          teams?: Json | null
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
            referencedRelation: "linked_teams"
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
            referencedRelation: "linked_teams"
            referencedColumns: ["id"]
          },
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
      notification_logs: {
        Row: {
          created_at: string
          delivered_at: string | null
          event_id: string | null
          id: string
          metadata: Json | null
          method: string
          notification_type: string
          opened_at: string | null
          sent_at: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          delivered_at?: string | null
          event_id?: string | null
          id?: string
          metadata?: Json | null
          method: string
          notification_type: string
          opened_at?: string | null
          sent_at?: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          delivered_at?: string | null
          event_id?: string | null
          id?: string
          metadata?: Json | null
          method?: string
          notification_type?: string
          opened_at?: string | null
          sent_at?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_logs_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
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
            referencedRelation: "linked_teams"
            referencedColumns: ["id"]
          },
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
            referencedRelation: "linked_teams"
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
          card_design_id: string | null
          comments: Json | null
          created_at: string
          date_of_birth: string
          fun_stats: Json | null
          id: string
          kit_sizes: Json | null
          leave_comments: string | null
          leave_date: string | null
          linking_code: string | null
          match_stats: Json | null
          name: string
          objectives: Json | null
          parent_id: string | null
          parent_linking_code: string | null
          parent_linking_code_expires_at: string | null
          performance_category_id: string | null
          photo_url: string | null
          play_style: string | null
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
          card_design_id?: string | null
          comments?: Json | null
          created_at?: string
          date_of_birth: string
          fun_stats?: Json | null
          id?: string
          kit_sizes?: Json | null
          leave_comments?: string | null
          leave_date?: string | null
          linking_code?: string | null
          match_stats?: Json | null
          name: string
          objectives?: Json | null
          parent_id?: string | null
          parent_linking_code?: string | null
          parent_linking_code_expires_at?: string | null
          performance_category_id?: string | null
          photo_url?: string | null
          play_style?: string | null
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
          card_design_id?: string | null
          comments?: Json | null
          created_at?: string
          date_of_birth?: string
          fun_stats?: Json | null
          id?: string
          kit_sizes?: Json | null
          leave_comments?: string | null
          leave_date?: string | null
          linking_code?: string | null
          match_stats?: Json | null
          name?: string
          objectives?: Json | null
          parent_id?: string | null
          parent_linking_code?: string | null
          parent_linking_code_expires_at?: string | null
          performance_category_id?: string | null
          photo_url?: string | null
          play_style?: string | null
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
            referencedRelation: "linked_teams"
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
      position_abbreviations: {
        Row: {
          abbreviation: string
          created_at: string
          display_order: number
          game_format: string
          id: string
          position_group: string
          position_name: string
        }
        Insert: {
          abbreviation: string
          created_at?: string
          display_order?: number
          game_format: string
          id?: string
          position_group: string
          position_name: string
        }
        Update: {
          abbreviation?: string
          created_at?: string
          display_order?: number
          game_format?: string
          id?: string
          position_group?: string
          position_name?: string
        }
        Relationships: []
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
          push_token: string | null
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
          push_token?: string | null
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
          push_token?: string | null
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
      team_code_usage: {
        Row: {
          code_used: string
          created_at: string | null
          id: string
          ip_address: string | null
          joined_at: string | null
          role_joined: string
          team_id: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          code_used: string
          created_at?: string | null
          id?: string
          ip_address?: string | null
          joined_at?: string | null
          role_joined: string
          team_id: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          code_used?: string
          created_at?: string | null
          id?: string
          ip_address?: string | null
          joined_at?: string | null
          role_joined?: string
          team_id?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "team_code_usage_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "linked_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_code_usage_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_code_usage_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
            referencedRelation: "linked_teams"
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
      team_squads: {
        Row: {
          added_at: string
          added_by: string | null
          availability_status: string
          created_at: string
          event_id: string | null
          id: string
          notes: string | null
          player_id: string
          squad_role: string
          team_id: string
          team_number: number
          updated_at: string
        }
        Insert: {
          added_at?: string
          added_by?: string | null
          availability_status?: string
          created_at?: string
          event_id?: string | null
          id?: string
          notes?: string | null
          player_id: string
          squad_role?: string
          team_id: string
          team_number?: number
          updated_at?: string
        }
        Update: {
          added_at?: string
          added_by?: string | null
          availability_status?: string
          created_at?: string
          event_id?: string | null
          id?: string
          notes?: string | null
          player_id?: string
          squad_role?: string
          team_id?: string
          team_number?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_squads_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_squads_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_squads_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "linked_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_squads_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_staff: {
        Row: {
          certificates: Json | null
          coaching_badges: Json | null
          created_at: string | null
          email: string
          id: string
          linking_code: string | null
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
          linking_code?: string | null
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
          linking_code?: string | null
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
            referencedRelation: "linked_teams"
            referencedColumns: ["id"]
          },
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
            referencedRelation: "linked_teams"
            referencedColumns: ["id"]
          },
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
          game_duration: number | null
          game_format: string
          home_latitude: number | null
          home_location: string | null
          home_longitude: number | null
          id: string
          kit_designs: Json | null
          kit_icons: Json | null
          logo_url: string | null
          manager_email: string | null
          manager_name: string | null
          manager_phone: string | null
          name: string
          name_display_option: string | null
          performance_categories: string[] | null
          season_end: string
          season_start: string
          subscription_type: string | null
          team_join_code: string | null
          team_join_code_expires_at: string | null
          updated_at: string | null
        }
        Insert: {
          age_group: string
          club_id?: string | null
          created_at?: string | null
          game_duration?: number | null
          game_format: string
          home_latitude?: number | null
          home_location?: string | null
          home_longitude?: number | null
          id?: string
          kit_designs?: Json | null
          kit_icons?: Json | null
          logo_url?: string | null
          manager_email?: string | null
          manager_name?: string | null
          manager_phone?: string | null
          name: string
          name_display_option?: string | null
          performance_categories?: string[] | null
          season_end: string
          season_start: string
          subscription_type?: string | null
          team_join_code?: string | null
          team_join_code_expires_at?: string | null
          updated_at?: string | null
        }
        Update: {
          age_group?: string
          club_id?: string | null
          created_at?: string | null
          game_duration?: number | null
          game_format?: string
          home_latitude?: number | null
          home_location?: string | null
          home_longitude?: number | null
          id?: string
          kit_designs?: Json | null
          kit_icons?: Json | null
          logo_url?: string | null
          manager_email?: string | null
          manager_name?: string | null
          manager_phone?: string | null
          name?: string
          name_display_option?: string | null
          performance_categories?: string[] | null
          season_end?: string
          season_start?: string
          subscription_type?: string | null
          team_join_code?: string | null
          team_join_code_expires_at?: string | null
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
          staff_id: string | null
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
          staff_id?: string | null
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
          staff_id?: string | null
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
            foreignKeyName: "user_invitations_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "team_staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_invitations_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "linked_teams"
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
      user_staff: {
        Row: {
          created_at: string | null
          id: string
          relationship: string
          staff_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          relationship?: string
          staff_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          relationship?: string
          staff_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_staff_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "team_staff"
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
            referencedRelation: "linked_teams"
            referencedColumns: ["id"]
          },
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
            referencedRelation: "linked_teams"
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
      club_teams_detailed: {
        Row: {
          age_group: string | null
          club_id: string | null
          club_logo_url: string | null
          club_name: string | null
          created_at: string | null
          game_format: string | null
          id: string | null
          season_end: string | null
          season_start: string | null
          team_id: string | null
          team_logo_url: string | null
          team_name: string | null
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
            referencedRelation: "linked_teams"
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
      linked_teams: {
        Row: {
          age_group: string | null
          club_id: string | null
          club_logo_url: string | null
          club_name: string | null
          created_at: string | null
          game_format: string | null
          id: string | null
          kit_icons: Json | null
          logo_url: string | null
          manager_email: string | null
          manager_name: string | null
          manager_phone: string | null
          name: string | null
          performance_categories: string[] | null
          season_end: string | null
          season_start: string | null
          subscription_type: string | null
          updated_at: string | null
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
    }
    Functions: {
      backup_event_selections: {
        Args: Record<PropertyKey, never>
        Returns: {
          backup_id: string
          event_id: string
          team_id: string
          team_number: number
          period_number: number
          formation: string
          player_positions: Json
          substitute_players: Json
          captain_id: string
          staff_selection: Json
          duration_minutes: number
          performance_category_id: string
          backup_created_at: string
        }[]
      }
      clean_and_regenerate_player_stats: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      debug_player_positions: {
        Args: { p_player_id: string; p_player_name?: string }
        Returns: undefined
      }
      generate_club_serial: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      generate_parent_linking_code: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      generate_team_join_code: {
        Args: { team_name: string }
        Returns: string
      }
      get_current_user_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      regenerate_all_event_player_stats: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      regenerate_player_stats_batch_safe: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      send_availability_notifications: {
        Args: { p_event_id: string }
        Returns: undefined
      }
      standardize_position_name: {
        Args: { input_position: string }
        Returns: string
      }
      update_all_completed_events_stats: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      update_availability_status: {
        Args: {
          p_event_id: string
          p_user_id: string
          p_role: string
          p_status: string
        }
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
      update_single_player_stats: {
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
    Enums: {},
  },
} as const
