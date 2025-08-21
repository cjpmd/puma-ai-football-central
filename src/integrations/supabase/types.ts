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
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      ai_training_recommendations: {
        Row: {
          confidence_score: number | null
          created_at: string
          difficulty_level: number
          expires_at: string | null
          focus_areas: string[] | null
          id: string
          player_id: string
          reasoning: string | null
          recommendation_data: Json
          recommended_drills: string[] | null
          status: string
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string
          difficulty_level?: number
          expires_at?: string | null
          focus_areas?: string[] | null
          id?: string
          player_id: string
          reasoning?: string | null
          recommendation_data?: Json
          recommended_drills?: string[] | null
          status?: string
        }
        Update: {
          confidence_score?: number | null
          created_at?: string
          difficulty_level?: number
          expires_at?: string | null
          focus_areas?: string[] | null
          id?: string
          player_id?: string
          reasoning?: string | null
          recommendation_data?: Json
          recommended_drills?: string[] | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_training_recommendations_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          id: string
          ip_address: unknown | null
          new_data: Json | null
          old_data: Json | null
          operation: string
          table_name: string
          timestamp: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          id?: string
          ip_address?: unknown | null
          new_data?: Json | null
          old_data?: Json | null
          operation: string
          table_name: string
          timestamp?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          id?: string
          ip_address?: unknown | null
          new_data?: Json | null
          old_data?: Json | null
          operation?: string
          table_name?: string
          timestamp?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
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
      drill_media: {
        Row: {
          created_at: string | null
          drill_id: string | null
          file_name: string
          file_size: number | null
          file_type: string
          file_url: string
          id: string
        }
        Insert: {
          created_at?: string | null
          drill_id?: string | null
          file_name: string
          file_size?: number | null
          file_type: string
          file_url: string
          id?: string
        }
        Update: {
          created_at?: string | null
          drill_id?: string | null
          file_name?: string
          file_size?: number | null
          file_type?: string
          file_url?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "drill_media_drill_id_fkey"
            columns: ["drill_id"]
            isOneToOne: false
            referencedRelation: "drills"
            referencedColumns: ["id"]
          },
        ]
      }
      drill_subgroup_players: {
        Row: {
          created_at: string | null
          drill_subgroup_id: string | null
          id: string
          player_id: string | null
        }
        Insert: {
          created_at?: string | null
          drill_subgroup_id?: string | null
          id?: string
          player_id?: string | null
        }
        Update: {
          created_at?: string | null
          drill_subgroup_id?: string | null
          id?: string
          player_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "drill_subgroup_players_drill_subgroup_id_fkey"
            columns: ["drill_subgroup_id"]
            isOneToOne: false
            referencedRelation: "drill_subgroups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drill_subgroup_players_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      drill_subgroups: {
        Row: {
          created_at: string | null
          id: string
          subgroup_name: string
          training_session_drill_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          subgroup_name: string
          training_session_drill_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          subgroup_name?: string
          training_session_drill_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "drill_subgroups_training_session_drill_id_fkey"
            columns: ["training_session_drill_id"]
            isOneToOne: false
            referencedRelation: "training_session_drills"
            referencedColumns: ["id"]
          },
        ]
      }
      drill_tag_assignments: {
        Row: {
          drill_id: string
          tag_id: string
        }
        Insert: {
          drill_id: string
          tag_id: string
        }
        Update: {
          drill_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "drill_tag_assignments_drill_id_fkey"
            columns: ["drill_id"]
            isOneToOne: false
            referencedRelation: "drills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drill_tag_assignments_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "drill_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      drill_tags: {
        Row: {
          color: string | null
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          id?: string
          name: string
        }
        Update: {
          color?: string | null
          created_at?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      drills: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          difficulty_level: string | null
          duration_minutes: number | null
          id: string
          is_public: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          difficulty_level?: string | null
          duration_minutes?: number | null
          id?: string
          is_public?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          difficulty_level?: string | null
          duration_minutes?: number | null
          id?: string
          is_public?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
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
          meeting_time: string | null
          start_time: string | null
          team_id: string
          team_number: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          meeting_time?: string | null
          start_time?: string | null
          team_id: string
          team_number?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          meeting_time?: string | null
          start_time?: string | null
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
      individual_plan_assignments: {
        Row: {
          assigned_at: string
          assigned_by: string
          coach_notes: string | null
          created_at: string
          id: string
          plan_id: string
          player_feedback: string | null
          status: string
          updated_at: string
        }
        Insert: {
          assigned_at?: string
          assigned_by: string
          coach_notes?: string | null
          created_at?: string
          id?: string
          plan_id: string
          player_feedback?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string
          coach_notes?: string | null
          created_at?: string
          id?: string
          plan_id?: string
          player_feedback?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "individual_plan_assignments_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "individual_training_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      individual_progress_milestones: {
        Row: {
          achieved_at: string | null
          created_at: string
          current_value: number | null
          id: string
          milestone_name: string
          notes: string | null
          plan_id: string
          target_value: number | null
          unit: string | null
          updated_at: string
        }
        Insert: {
          achieved_at?: string | null
          created_at?: string
          current_value?: number | null
          id?: string
          milestone_name: string
          notes?: string | null
          plan_id: string
          target_value?: number | null
          unit?: string | null
          updated_at?: string
        }
        Update: {
          achieved_at?: string | null
          created_at?: string
          current_value?: number | null
          id?: string
          milestone_name?: string
          notes?: string | null
          plan_id?: string
          target_value?: number | null
          unit?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "individual_progress_milestones_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "individual_training_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      individual_session_completions: {
        Row: {
          actual_duration_minutes: number | null
          completed: boolean
          completed_date: string
          created_at: string
          drill_results: Json
          id: string
          notes: string | null
          player_id: string
          rpe: number | null
          session_id: string
          updated_at: string
          video_evidence_urls: string[]
        }
        Insert: {
          actual_duration_minutes?: number | null
          completed?: boolean
          completed_date?: string
          created_at?: string
          drill_results?: Json
          id?: string
          notes?: string | null
          player_id: string
          rpe?: number | null
          session_id: string
          updated_at?: string
          video_evidence_urls?: string[]
        }
        Update: {
          actual_duration_minutes?: number | null
          completed?: boolean
          completed_date?: string
          created_at?: string
          drill_results?: Json
          id?: string
          notes?: string | null
          player_id?: string
          rpe?: number | null
          session_id?: string
          updated_at?: string
          video_evidence_urls?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "individual_session_completions_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "individual_session_completions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "individual_training_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      individual_session_drills: {
        Row: {
          created_at: string
          custom_drill_description: string | null
          custom_drill_name: string | null
          drill_id: string | null
          id: string
          notes: string | null
          progression_level: number
          sequence_order: number
          session_id: string
          target_duration_minutes: number | null
          target_metrics: Json
          target_repetitions: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          custom_drill_description?: string | null
          custom_drill_name?: string | null
          drill_id?: string | null
          id?: string
          notes?: string | null
          progression_level?: number
          sequence_order?: number
          session_id: string
          target_duration_minutes?: number | null
          target_metrics?: Json
          target_repetitions?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          custom_drill_description?: string | null
          custom_drill_name?: string | null
          drill_id?: string | null
          id?: string
          notes?: string | null
          progression_level?: number
          sequence_order?: number
          session_id?: string
          target_duration_minutes?: number | null
          target_metrics?: Json
          target_repetitions?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "individual_session_drills_drill_id_fkey"
            columns: ["drill_id"]
            isOneToOne: false
            referencedRelation: "drills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "individual_session_drills_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "individual_training_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      individual_training_plans: {
        Row: {
          accountability: Json
          coach_id: string | null
          created_at: string
          created_by: string | null
          end_date: string
          focus_areas: string[] | null
          id: string
          objective_text: string | null
          plan_type: string
          player_id: string
          start_date: string
          status: string
          title: string
          updated_at: string
          visibility: string
          weekly_sessions: number | null
        }
        Insert: {
          accountability?: Json
          coach_id?: string | null
          created_at?: string
          created_by?: string | null
          end_date: string
          focus_areas?: string[] | null
          id?: string
          objective_text?: string | null
          plan_type?: string
          player_id: string
          start_date: string
          status?: string
          title: string
          updated_at?: string
          visibility?: string
          weekly_sessions?: number | null
        }
        Update: {
          accountability?: Json
          coach_id?: string | null
          created_at?: string
          created_by?: string | null
          end_date?: string
          focus_areas?: string[] | null
          id?: string
          objective_text?: string | null
          plan_type?: string
          player_id?: string
          start_date?: string
          status?: string
          title?: string
          updated_at?: string
          visibility?: string
          weekly_sessions?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "individual_training_plans_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "individual_training_plans_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      individual_training_sessions: {
        Row: {
          cooldown_drill_ids: string[]
          created_at: string
          day_of_week: number | null
          description: string | null
          id: string
          intensity: number
          location: string
          plan_id: string
          planned_date: string | null
          session_order: number | null
          target_duration_minutes: number | null
          title: string
          updated_at: string
          warmup_drill_ids: string[]
        }
        Insert: {
          cooldown_drill_ids?: string[]
          created_at?: string
          day_of_week?: number | null
          description?: string | null
          id?: string
          intensity?: number
          location?: string
          plan_id: string
          planned_date?: string | null
          session_order?: number | null
          target_duration_minutes?: number | null
          title: string
          updated_at?: string
          warmup_drill_ids?: string[]
        }
        Update: {
          cooldown_drill_ids?: string[]
          created_at?: string
          day_of_week?: number | null
          description?: string | null
          id?: string
          intensity?: number
          location?: string
          plan_id?: string
          planned_date?: string | null
          session_order?: number | null
          target_duration_minutes?: number | null
          title?: string
          updated_at?: string
          warmup_drill_ids?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "individual_training_sessions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "individual_training_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      kit_items: {
        Row: {
          category: string
          created_at: string | null
          id: string
          name: string
          size_category: string
          team_id: string
          updated_at: string | null
        }
        Insert: {
          category: string
          created_at?: string | null
          id?: string
          name: string
          size_category: string
          team_id: string
          updated_at?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          id?: string
          name?: string
          size_category?: string
          team_id?: string
          updated_at?: string | null
        }
        Relationships: []
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
      rate_limit_violations: {
        Row: {
          action_type: string
          blocked_until: string | null
          created_at: string
          id: string
          ip_address: unknown | null
          user_id: string | null
          violation_count: number
          window_start: string
        }
        Insert: {
          action_type: string
          blocked_until?: string | null
          created_at?: string
          id?: string
          ip_address?: unknown | null
          user_id?: string | null
          violation_count?: number
          window_start?: string
        }
        Update: {
          action_type?: string
          blocked_until?: string | null
          created_at?: string
          id?: string
          ip_address?: unknown | null
          user_id?: string | null
          violation_count?: number
          window_start?: string
        }
        Relationships: []
      }
      rate_limiting_config: {
        Row: {
          action_type: string
          block_duration_minutes: number
          created_at: string | null
          id: string
          max_attempts: number
          window_minutes: number
        }
        Insert: {
          action_type: string
          block_duration_minutes?: number
          created_at?: string | null
          id?: string
          max_attempts?: number
          window_minutes?: number
        }
        Update: {
          action_type?: string
          block_duration_minutes?: number
          created_at?: string | null
          id?: string
          max_attempts?: number
          window_minutes?: number
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          action: string
          attempt_count: number | null
          blocked_until: string | null
          created_at: string | null
          id: string
          ip_address: unknown | null
          user_id: string | null
          window_start: string | null
        }
        Insert: {
          action: string
          attempt_count?: number | null
          blocked_until?: string | null
          created_at?: string | null
          id?: string
          ip_address?: unknown | null
          user_id?: string | null
          window_start?: string | null
        }
        Update: {
          action?: string
          attempt_count?: number | null
          blocked_until?: string | null
          created_at?: string | null
          id?: string
          ip_address?: unknown | null
          user_id?: string | null
          window_start?: string | null
        }
        Relationships: []
      }
      security_audit_logs: {
        Row: {
          action_type: string
          created_at: string
          id: string
          ip_address: unknown | null
          metadata: Json | null
          new_data: Json | null
          old_data: Json | null
          record_id: string | null
          risk_level: string
          table_name: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action_type: string
          created_at?: string
          id?: string
          ip_address?: unknown | null
          metadata?: Json | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          risk_level?: string
          table_name?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action_type?: string
          created_at?: string
          id?: string
          ip_address?: unknown | null
          metadata?: Json | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          risk_level?: string
          table_name?: string | null
          user_agent?: string | null
          user_id?: string | null
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
          header_display_type: string | null
          header_image_url: string | null
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
          header_display_type?: string | null
          header_image_url?: string | null
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
          header_display_type?: string | null
          header_image_url?: string | null
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
      training_groups: {
        Row: {
          created_at: string | null
          group_name: string | null
          group_number: number
          id: string
          performance_category_id: string | null
          training_session_id: string | null
        }
        Insert: {
          created_at?: string | null
          group_name?: string | null
          group_number: number
          id?: string
          performance_category_id?: string | null
          training_session_id?: string | null
        }
        Update: {
          created_at?: string | null
          group_name?: string | null
          group_number?: number
          id?: string
          performance_category_id?: string | null
          training_session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "training_groups_performance_category_id_fkey"
            columns: ["performance_category_id"]
            isOneToOne: false
            referencedRelation: "performance_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_groups_training_session_id_fkey"
            columns: ["training_session_id"]
            isOneToOne: false
            referencedRelation: "training_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      training_session_drills: {
        Row: {
          created_at: string | null
          custom_drill_description: string | null
          custom_drill_name: string | null
          drill_id: string | null
          duration_minutes: number
          id: string
          notes: string | null
          sequence_order: number
          training_session_id: string | null
        }
        Insert: {
          created_at?: string | null
          custom_drill_description?: string | null
          custom_drill_name?: string | null
          drill_id?: string | null
          duration_minutes: number
          id?: string
          notes?: string | null
          sequence_order: number
          training_session_id?: string | null
        }
        Update: {
          created_at?: string | null
          custom_drill_description?: string | null
          custom_drill_name?: string | null
          drill_id?: string | null
          duration_minutes?: number
          id?: string
          notes?: string | null
          sequence_order?: number
          training_session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "training_session_drills_drill_id_fkey"
            columns: ["drill_id"]
            isOneToOne: false
            referencedRelation: "drills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_session_drills_training_session_id_fkey"
            columns: ["training_session_id"]
            isOneToOne: false
            referencedRelation: "training_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      training_session_equipment: {
        Row: {
          created_at: string | null
          custom_equipment_name: string | null
          equipment_id: string | null
          id: string
          notes: string | null
          quantity_needed: number | null
          training_session_id: string | null
        }
        Insert: {
          created_at?: string | null
          custom_equipment_name?: string | null
          equipment_id?: string | null
          id?: string
          notes?: string | null
          quantity_needed?: number | null
          training_session_id?: string | null
        }
        Update: {
          created_at?: string | null
          custom_equipment_name?: string | null
          equipment_id?: string | null
          id?: string
          notes?: string | null
          quantity_needed?: number | null
          training_session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "training_session_equipment_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "team_equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_session_equipment_training_session_id_fkey"
            columns: ["training_session_id"]
            isOneToOne: false
            referencedRelation: "training_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      training_sessions: {
        Row: {
          created_at: string | null
          event_id: string | null
          id: string
          team_id: string | null
          total_duration_minutes: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          event_id?: string | null
          id?: string
          team_id?: string | null
          total_duration_minutes?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          event_id?: string | null
          id?: string
          team_id?: string | null
          total_duration_minutes?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "training_sessions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_sessions_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "linked_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_sessions_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
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
      user_sessions: {
        Row: {
          created_at: string | null
          expires_at: string | null
          id: string
          ip_address: unknown | null
          is_admin_session: boolean | null
          last_activity: string | null
          session_token: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          ip_address?: unknown | null
          is_admin_session?: boolean | null
          last_activity?: string | null
          session_token: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          ip_address?: unknown | null
          is_admin_session?: boolean | null
          last_activity?: string | null
          session_token?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
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
        Insert: {
          available_size_ids?: never
          available_size_names?: never
          category?: string | null
          id?: string | null
          name?: string | null
          size_category?: string | null
          team_id?: string | null
        }
        Update: {
          available_size_ids?: never
          available_size_names?: never
          category?: string | null
          id?: string | null
          name?: string | null
          size_category?: string | null
          team_id?: string | null
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
          backup_created_at: string
          backup_id: string
          captain_id: string
          duration_minutes: number
          event_id: string
          formation: string
          performance_category_id: string
          period_number: number
          player_positions: Json
          staff_selection: Json
          substitute_players: Json
          team_id: string
          team_number: number
        }[]
      }
      check_password_strength: {
        Args: { password: string }
        Returns: boolean
      }
      check_rate_limit_enhanced: {
        Args: {
          p_action_type: string
          p_ip_address?: unknown
          p_user_id?: string
        }
        Returns: Json
      }
      clean_and_regenerate_player_stats: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      debug_player_positions: {
        Args: { p_player_id: string; p_player_name?: string }
        Returns: undefined
      }
      format_file_size: {
        Args: { size_bytes: number }
        Returns: string
      }
      generate_club_serial: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      generate_parent_linking_code: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      generate_secure_invitation_code: {
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
      get_user_event_roles: {
        Args: { p_event_id: string; p_user_id: string }
        Returns: {
          role: string
          source_id: string
          source_type: string
        }[]
      }
      is_club_member: {
        Args: { club_uuid: string; required_roles?: string[] }
        Returns: boolean
      }
      is_club_member_secure: {
        Args: { club_uuid: string; required_roles?: string[] }
        Returns: boolean
      }
      is_global_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_global_admin_secure: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_team_member: {
        Args: { required_roles?: string[]; team_uuid: string }
        Returns: boolean
      }
      is_team_member_secure: {
        Args: { required_roles?: string[]; team_uuid: string }
        Returns: boolean
      }
      is_user_club_admin: {
        Args: { p_club_id: string; p_user_id: string }
        Returns: boolean
      }
      is_user_club_admin_secure: {
        Args: { p_club_id: string; p_user_id: string }
        Returns: boolean
      }
      log_security_event: {
        Args: { details?: Json; event_type: string; risk_level?: string }
        Returns: undefined
      }
      log_security_event_enhanced: {
        Args: {
          details?: Json
          event_type: string
          ip_address?: unknown
          risk_level?: string
          user_agent?: string
        }
        Returns: undefined
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
          p_role: string
          p_status: string
          p_user_id: string
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
      validate_authentication_input: {
        Args: { action_type?: string; email?: string; password?: string }
        Returns: Json
      }
      validate_invitation_data: {
        Args: {
          p_email: string
          p_role?: string
          p_team_name: string
          p_user_name: string
        }
        Returns: Json
      }
      validate_password_strength: {
        Args: { password: string }
        Returns: boolean
      }
      validate_password_strength_enhanced: {
        Args: { password: string; user_email?: string }
        Returns: Json
      }
      validate_session_security: {
        Args: {
          p_ip_address?: unknown
          p_user_agent?: string
          p_user_id: string
        }
        Returns: Json
      }
      validate_user_permissions: {
        Args: { p_user_id: string }
        Returns: Json
      }
      validate_user_role_access: {
        Args: {
          p_required_role: string
          p_resource_id?: string
          p_resource_type?: string
          p_user_id: string
        }
        Returns: Json
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
