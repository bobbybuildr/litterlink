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
export type OrganiserApplicationStatus = "pending" | "approved" | "rejected";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string | null;
          postcode: string | null;
          avatar_url: string | null;
          is_verified_organiser: boolean;
          is_admin: boolean;
          created_at: string;
        };
        Insert: {
          id: string;
          display_name?: string | null;
          postcode?: string | null;
          avatar_url?: string | null;
          is_verified_organiser?: boolean;
          is_admin?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          display_name?: string | null;
          postcode?: string | null;
          avatar_url?: string | null;
          is_verified_organiser?: boolean;
          is_admin?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      events: {
        Row: {
          id: string;
          organiser_id: string | null;
          group_id: string | null;
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
          organiser_contact_details: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organiser_id: string;
          group_id?: string | null;
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
          organiser_contact_details?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          organiser_id?: string;
          group_id?: string | null;
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
          organiser_contact_details?: string | null;
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
          duration_hours: number | null;
          litter_types: string[] | null;
          hotspot_severity: number | null;
          notable_brands: string | null;
          notes: string | null;
        };
        Insert: {
          id?: string;
          event_id: string;
          bags_collected?: number | null;
          weight_kg?: number | null;
          area_covered_sqm?: number | null;
          actual_attendees?: number | null;
          duration_hours?: number | null;
          litter_types?: string[] | null;
          hotspot_severity?: number | null;
          notable_brands?: string | null;
          notes?: string | null;
        };
        Update: {
          id?: string;
          event_id?: string;
          bags_collected?: number | null;
          weight_kg?: number | null;
          area_covered_sqm?: number | null;
          actual_attendees?: number | null;
          duration_hours?: number | null;
          litter_types?: string[] | null;
          hotspot_severity?: number | null;
          notable_brands?: string | null;
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
      groups: {
        Row: {
          id: string;
          name: string;
          slug: string;
          description: string | null;
          logo_url: string | null;
          website_url: string | null;
          social_url: string | null;
          contact_email: string | null;
          group_type: string;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          description?: string | null;
          logo_url?: string | null;
          website_url?: string | null;
          social_url?: string | null;
          contact_email?: string | null;
          group_type?: string;
          created_by: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          description?: string | null;
          logo_url?: string | null;
          website_url?: string | null;
          social_url?: string | null;
          contact_email?: string | null;
          group_type?: string;
          created_by?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      email_preferences: {
        Row: {
          id: string;
          user_id: string;
          event_notifications: boolean;
          organiser_status_updates: boolean;
          new_nearby_events: boolean;
          marketing_emails: boolean;
          newsletter: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          event_notifications?: boolean;
          organiser_status_updates?: boolean;
          new_nearby_events?: boolean;
          marketing_emails?: boolean;
          newsletter?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          event_notifications?: boolean;
          organiser_status_updates?: boolean;
          new_nearby_events?: boolean;
          marketing_emails?: boolean;
          newsletter?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      organiser_applications: {
        Row: {
          id: string;
          user_id: string;
          motivation: string;
          experience: string | null;
          organisation_name: string | null;
          social_links: string | null;
          status: OrganiserApplicationStatus;
          reviewed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          motivation: string;
          experience?: string | null;
          organisation_name?: string | null;
          social_links?: string | null;
          status?: OrganiserApplicationStatus;
          reviewed_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          motivation?: string;
          experience?: string | null;
          organisation_name?: string | null;
          social_links?: string | null;
          status?: OrganiserApplicationStatus;
          reviewed_at?: string | null;
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
      organiser_application_status: OrganiserApplicationStatus;
    };
  };
}
