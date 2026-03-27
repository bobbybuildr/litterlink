/**
 * Hand-written database types matching the LitterLink schema.
 * Run `supabase gen types typescript` to replace this with generated types
 * once your Supabase project is set up.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type EventStatus = "draft" | "published" | "completed" | "cancelled";
export type ParticipantStatus = "confirmed" | "waitlisted" | "cancelled";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string | null;
          postcode: string | null;
          avatar_url: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          display_name?: string | null;
          postcode?: string | null;
          avatar_url?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          display_name?: string | null;
          postcode?: string | null;
          avatar_url?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      events: {
        Row: {
          id: string;
          organiser_id: string;
          title: string;
          description: string | null;
          location_postcode: string;
          latitude: number;
          longitude: number;
          address_label: string | null;
          starts_at: string;
          ends_at: string | null;
          max_attendees: number | null;
          status: EventStatus;
          created_at: string;
        };
        Insert: {
          id?: string;
          organiser_id: string;
          title: string;
          description?: string | null;
          location_postcode: string;
          latitude: number;
          longitude: number;
          address_label?: string | null;
          starts_at: string;
          ends_at?: string | null;
          max_attendees?: number | null;
          status?: EventStatus;
          created_at?: string;
        };
        Update: {
          id?: string;
          organiser_id?: string;
          title?: string;
          description?: string | null;
          location_postcode?: string;
          latitude?: number;
          longitude?: number;
          address_label?: string | null;
          starts_at?: string;
          ends_at?: string | null;
          max_attendees?: number | null;
          status?: EventStatus;
          created_at?: string;
        };
        Relationships: [];
      };
      event_participants: {
        Row: {
          id: string;
          event_id: string;
          user_id: string;
          status: ParticipantStatus;
          joined_at: string;
        };
        Insert: {
          id?: string;
          event_id: string;
          user_id: string;
          status?: ParticipantStatus;
          joined_at?: string;
        };
        Update: {
          id?: string;
          event_id?: string;
          user_id?: string;
          status?: ParticipantStatus;
          joined_at?: string;
        };
        Relationships: [];
      };
      event_stats: {
        Row: {
          id: string;
          event_id: string;
          bags_collected: number | null;
          weight_kg: number | null;
          area_covered_sqm: number | null;
          actual_attendees: number | null;
          notes: string | null;
        };
        Insert: {
          id?: string;
          event_id: string;
          bags_collected?: number | null;
          weight_kg?: number | null;
          area_covered_sqm?: number | null;
          actual_attendees?: number | null;
          notes?: string | null;
        };
        Update: {
          id?: string;
          event_id?: string;
          bags_collected?: number | null;
          weight_kg?: number | null;
          area_covered_sqm?: number | null;
          actual_attendees?: number | null;
          notes?: string | null;
        };
        Relationships: [];
      };
      event_photos: {
        Row: {
          id: string;
          event_id: string;
          uploaded_by: string;
          storage_path: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          event_id: string;
          uploaded_by: string;
          storage_path: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          event_id?: string;
          uploaded_by?: string;
          storage_path?: string;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      event_status: EventStatus;
      participant_status: ParticipantStatus;
    };
  };
}
