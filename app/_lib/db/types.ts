export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string | null;
          email: string;
          terms_accepted_at: string | null;
          terms_version: string | null;
          onboarding_completed_at: string | null;
          generation_paused: boolean;
          generation_paused_until: string | null;
          daily_post_cap: number;
          board_days: number;
          timezone: string;
          image_model: string | null;
          default_style_preset: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          username?: string | null;
          email: string;
          terms_accepted_at?: string | null;
          terms_version?: string | null;
          onboarding_completed_at?: string | null;
          generation_paused?: boolean;
          generation_paused_until?: string | null;
          daily_post_cap?: number;
          board_days?: number;
          timezone?: string;
          image_model?: string | null;
          default_style_preset?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          username?: string | null;
          email?: string;
          terms_accepted_at?: string | null;
          terms_version?: string | null;
          onboarding_completed_at?: string | null;
          generation_paused?: boolean;
          generation_paused_until?: string | null;
          daily_post_cap?: number;
          board_days?: number;
          timezone?: string;
          image_model?: string | null;
          default_style_preset?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      facebook_pages: {
        Row: {
          id: string;
          user_id: string;
          page_id: string;
          page_name: string;
          category: string | null;
          followers_count: number;
          token_ciphertext: string; // hex or base64 representation in JS
          token_last4: string;
          token_status: "valid" | "invalid" | "expired" | "unverified";
          token_expires_at: string | null;
          last_verified_at: string | null;
          is_default: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          page_id: string;
          page_name: string;
          category?: string | null;
          followers_count?: number;
          token_ciphertext: string;
          token_last4: string;
          token_status?: "valid" | "invalid" | "expired" | "unverified";
          token_expires_at?: string | null;
          last_verified_at?: string | null;
          is_default?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          page_id?: string;
          page_name?: string;
          category?: string | null;
          followers_count?: number;
          token_ciphertext?: string;
          token_last4?: string;
          token_status?: "valid" | "invalid" | "expired" | "unverified";
          token_expires_at?: string | null;
          last_verified_at?: string | null;
          is_default?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      provider_keys: {
        Row: {
          id: string;
          user_id: string;
          provider: "google_ai_studio";
          key_ciphertext: string;
          key_last4: string;
          status: "valid" | "invalid" | "expired";
          last_verified_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          provider?: "google_ai_studio";
          key_ciphertext: string;
          key_last4: string;
          status?: "valid" | "invalid" | "expired";
          last_verified_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          provider?: "google_ai_studio";
          key_ciphertext?: string;
          key_last4?: string;
          status?: "valid" | "invalid" | "expired";
          last_verified_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      prompt_sets: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          source: "upload" | "manual" | "ai_assistant";
          source_filename: string | null;
          style: string | null;
          total_rows: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          source?: "upload" | "manual" | "ai_assistant";
          source_filename?: string | null;
          style?: string | null;
          total_rows?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          source?: "upload" | "manual" | "ai_assistant";
          source_filename?: string | null;
          style?: string | null;
          total_rows?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      prompts: {
        Row: {
          id: string;
          user_id: string;
          set_id: string | null;
          row_index: number | null;
          style: string | null;
          image_prompt: string;
          caption: string | null;
          hashtags: string[];
          aspect: "4:5" | "1:1" | "16:9";
          status: "draft" | "queued" | "generating" | "ready" | "approved" | "scheduled" | "posted" | "failed";
          content_hash: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          set_id?: string | null;
          row_index?: number | null;
          style?: string | null;
          image_prompt: string;
          caption?: string | null;
          hashtags?: string[];
          aspect?: "4:5" | "1:1" | "16:9";
          status?: "draft" | "queued" | "generating" | "ready" | "approved" | "scheduled" | "posted" | "failed";
          content_hash: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          set_id?: string | null;
          row_index?: number | null;
          style?: string | null;
          image_prompt?: string;
          caption?: string | null;
          hashtags?: string[];
          aspect?: "4:5" | "1:1" | "16:9";
          status?: "draft" | "queued" | "generating" | "ready" | "approved" | "scheduled" | "posted" | "failed";
          content_hash?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      generations: {
        Row: {
          id: string;
          user_id: string;
          prompt_id: string;
          job_id: string | null;
          model: string;
          system_instruction: string | null;
          aspect: string;
          image_size: string;
          storage_path: string | null;
          width: number | null;
          height: number | null;
          bytes: number | null;
          latency_ms: number | null;
          status: "pending" | "running" | "succeeded" | "failed";
          error_code: string | null;
          error_message: string | null;
          attempt: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          prompt_id: string;
          job_id?: string | null;
          model: string;
          system_instruction?: string | null;
          aspect?: string;
          image_size?: string;
          storage_path?: string | null;
          width?: number | null;
          height?: number | null;
          bytes?: number | null;
          latency_ms?: number | null;
          status?: "pending" | "running" | "succeeded" | "failed";
          error_code?: string | null;
          error_message?: string | null;
          attempt?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          prompt_id?: string;
          job_id?: string | null;
          model?: string;
          system_instruction?: string | null;
          aspect?: string;
          image_size?: string;
          storage_path?: string | null;
          width?: number | null;
          height?: number | null;
          bytes?: number | null;
          latency_ms?: number | null;
          status?: "pending" | "running" | "succeeded" | "failed";
          error_code?: string | null;
          error_message?: string | null;
          attempt?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "generations_prompt_id_fkey";
            columns: ["prompt_id"];
            isOneToOne: false;
            referencedRelation: "prompts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "generations_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      jobs: {
        Row: {
          id: string;
          user_id: string;
          type: "generate_image" | "publish_post";
          payload: Json;
          status: "queued" | "running" | "succeeded" | "failed" | "cancelled";
          priority: number;
          attempts: number;
          max_attempts: number;
          run_after: string;
          locked_at: string | null;
          locked_by: string | null;
          last_error: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: "generate_image" | "publish_post";
          payload: Json;
          status?: "queued" | "running" | "succeeded" | "failed" | "cancelled";
          priority?: number;
          attempts?: number;
          max_attempts?: number;
          run_after?: string;
          locked_at?: string | null;
          locked_by?: string | null;
          last_error?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: "generate_image" | "publish_post";
          payload?: Json;
          status?: "queued" | "running" | "succeeded" | "failed" | "cancelled";
          priority?: number;
          attempts?: number;
          max_attempts?: number;
          run_after?: string;
          locked_at?: string | null;
          locked_by?: string | null;
          last_error?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      board_columns: {
        Row: {
          id: string;
          user_id: string;
          board_date: string | null;
          title: string;
          position: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          board_date?: string | null;
          title: string;
          position: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          board_date?: string | null;
          title?: string;
          position?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      board_cards: {
        Row: {
          id: string;
          user_id: string;
          column_id: string;
          prompt_id: string;
          generation_id: string | null;
          facebook_page_id: string | null;
          position: number;
          scheduled_at: string | null;
          timezone: string;
          status: "planned" | "scheduled" | "publishing" | "published" | "failed";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          column_id: string;
          prompt_id: string;
          generation_id?: string | null;
          facebook_page_id?: string | null;
          position: number;
          scheduled_at?: string | null;
          timezone?: string;
          status?: "planned" | "scheduled" | "publishing" | "published" | "failed";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          column_id?: string;
          prompt_id?: string;
          generation_id?: string | null;
          facebook_page_id?: string | null;
          position?: number;
          scheduled_at?: string | null;
          timezone?: string;
          status?: "planned" | "scheduled" | "publishing" | "published" | "failed";
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "board_cards_column_id_fkey";
            columns: ["column_id"];
            isOneToOne: false;
            referencedRelation: "board_columns";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "board_cards_prompt_id_fkey";
            columns: ["prompt_id"];
            isOneToOne: true;
            referencedRelation: "prompts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "board_cards_generation_id_fkey";
            columns: ["generation_id"];
            isOneToOne: false;
            referencedRelation: "generations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "board_cards_facebook_page_id_fkey";
            columns: ["facebook_page_id"];
            isOneToOne: false;
            referencedRelation: "facebook_pages";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "board_cards_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      posts: {
        Row: {
          id: string;
          user_id: string;
          card_id: string | null;
          facebook_page_id: string | null;
          prompt_id: string | null;
          generation_id: string | null;
          caption_final: string | null;
          image_url: string | null;
          fb_post_id: string | null;
          fb_photo_id: string | null;
          published_at: string | null;
          scheduled_publish_time: string | null;
          status: "scheduled" | "publishing" | "published" | "failed" | "cancelled" | "cancel_pending";
          publish_attempts: number;
          last_attempt_at: string | null;
          fb_submitted_at: string | null;
          fb_mode: "native_schedule" | "immediate" | null;
          error_code: string | null;
          error_message: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          card_id?: string | null;
          facebook_page_id?: string | null;
          prompt_id?: string | null;
          generation_id?: string | null;
          caption_final?: string | null;
          image_url?: string | null;
          fb_post_id?: string | null;
          fb_photo_id?: string | null;
          published_at?: string | null;
          scheduled_publish_time?: string | null;
          status?: "scheduled" | "publishing" | "published" | "failed" | "cancelled" | "cancel_pending";
          publish_attempts?: number;
          last_attempt_at?: string | null;
          fb_submitted_at?: string | null;
          fb_mode?: "native_schedule" | "immediate" | null;
          error_code?: string | null;
          error_message?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          card_id?: string | null;
          facebook_page_id?: string | null;
          prompt_id?: string | null;
          generation_id?: string | null;
          caption_final?: string | null;
          image_url?: string | null;
          fb_post_id?: string | null;
          fb_photo_id?: string | null;
          published_at?: string | null;
          scheduled_publish_time?: string | null;
          status?: "scheduled" | "publishing" | "published" | "failed" | "cancelled" | "cancel_pending";
          publish_attempts?: number;
          last_attempt_at?: string | null;
          fb_submitted_at?: string | null;
          fb_mode?: "native_schedule" | "immediate" | null;
          error_code?: string | null;
          error_message?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "posts_card_id_fkey";
            columns: ["card_id"];
            isOneToOne: true;
            referencedRelation: "board_cards";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "posts_facebook_page_id_fkey";
            columns: ["facebook_page_id"];
            isOneToOne: false;
            referencedRelation: "facebook_pages";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "posts_prompt_id_fkey";
            columns: ["prompt_id"];
            isOneToOne: false;
            referencedRelation: "prompts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "posts_generation_id_fkey";
            columns: ["generation_id"];
            isOneToOne: false;
            referencedRelation: "generations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "posts_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      activity_log: {
        Row: {
          id: string;
          user_id: string;
          entity_type: string;
          entity_id: string | null;
          action: string;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          entity_type: string;
          entity_id?: string | null;
          action: string;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          entity_type?: string;
          entity_id?: string | null;
          action?: string;
          metadata?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
      waitlist: {
        Row: {
          id: string;
          email: string;
          source: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          source?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          source?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      rate_limits: {
        Row: {
          id: string;
          user_id: string;
          bucket: string;
          window_start: string;
          count: number;
        };
        Insert: {
          id?: string;
          user_id: string;
          bucket: string;
          window_start: string;
          count?: number;
        };
        Update: {
          id?: string;
          user_id?: string;
          bucket?: string;
          window_start?: string;
          count?: number;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      approve_prompt: {
        Args: {
          p_prompt_id: string;
        };
        Returns: Database["public"]["Tables"]["board_cards"]["Row"];
      };
      reject_prompt: {
        Args: {
          p_prompt_id: string;
          p_reason?: string | null;
        };
        Returns: boolean;
      };
      schedule_card: {
        Args: {
          p_card_id: string;
          p_scheduled_at: string;
          p_page_id: string;
        };
        Returns: string;
      };
      unschedule_card: {
        Args: {
          p_card_id: string;
        };
        Returns: Json;
      };
      move_card: {
        Args: {
          p_card_id: string;
          p_column_id: string;
          p_position: number;
        };
        Returns: boolean;
      };
      claim_jobs: {
        Args: {
          p_worker: string;
          p_batch?: number;
          p_per_user?: number;
        };
        Returns: Database["public"]["Tables"]["jobs"]["Row"][];
      };
      reap_stuck_jobs: {
        Args: {
          p_timeout?: string;
        };
        Returns: number;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

export type Tables<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Row"];
export type InsertTables<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Insert"];
export type UpdateTables<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Update"];
