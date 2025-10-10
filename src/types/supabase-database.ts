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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      accommodation_units: {
        Row: {
          accessibility_features: Json | null
          accommodation_type_id: string | null
          bed_configuration: Json | null
          booking_policies: Json | null
          capacity: Json | null
          created_at: string | null
          description: string | null
          display_order: number | null
          embedding_balanced: string | null
          embedding_fast: string | null
          floor_number: number | null
          hotel_id: string | null
          id: string
          images: Json | null
          is_featured: boolean | null
          location_details: Json | null
          motopress_instance_id: number | null
          motopress_type_id: number | null
          name: string
          short_description: string | null
          size_m2: number | null
          status: string | null
          tenant_id: string | null
          tourism_features: Json | null
          unique_features: Json | null
          unit_number: string | null
          unit_type: string | null
          updated_at: string | null
          view_type: string | null
        }
        Insert: {
          accessibility_features?: Json | null
          accommodation_type_id?: string | null
          bed_configuration?: Json | null
          booking_policies?: Json | null
          capacity?: Json | null
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          embedding_balanced?: string | null
          embedding_fast?: string | null
          floor_number?: number | null
          hotel_id?: string | null
          id?: string
          images?: Json | null
          is_featured?: boolean | null
          location_details?: Json | null
          motopress_instance_id?: number | null
          motopress_type_id?: number | null
          name: string
          short_description?: string | null
          size_m2?: number | null
          status?: string | null
          tenant_id?: string | null
          tourism_features?: Json | null
          unique_features?: Json | null
          unit_number?: string | null
          unit_type?: string | null
          updated_at?: string | null
          view_type?: string | null
        }
        Update: {
          accessibility_features?: Json | null
          accommodation_type_id?: string | null
          bed_configuration?: Json | null
          booking_policies?: Json | null
          capacity?: Json | null
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          embedding_balanced?: string | null
          embedding_fast?: string | null
          floor_number?: number | null
          hotel_id?: string | null
          id?: string
          images?: Json | null
          is_featured?: boolean | null
          location_details?: Json | null
          motopress_instance_id?: number | null
          motopress_type_id?: number | null
          name?: string
          short_description?: string | null
          size_m2?: number | null
          status?: string | null
          tenant_id?: string | null
          tourism_features?: Json | null
          unique_features?: Json | null
          unit_number?: string | null
          unit_type?: string | null
          updated_at?: string | null
          view_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "accommodation_units_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accommodation_units_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_registry"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      accommodation_units_manual: {
        Row: {
          appliance_guides: Json | null
          created_at: string | null
          detailed_instructions: string | null
          embedding: string | null
          embedding_balanced: string | null
          emergency_info: string | null
          house_rules_specific: string | null
          local_tips: string | null
          manual_content: string | null
          metadata: Json | null
          safe_code: string | null
          unit_id: string
          updated_at: string | null
          wifi_password: string | null
        }
        Insert: {
          appliance_guides?: Json | null
          created_at?: string | null
          detailed_instructions?: string | null
          embedding?: string | null
          embedding_balanced?: string | null
          emergency_info?: string | null
          house_rules_specific?: string | null
          local_tips?: string | null
          manual_content?: string | null
          metadata?: Json | null
          safe_code?: string | null
          unit_id: string
          updated_at?: string | null
          wifi_password?: string | null
        }
        Update: {
          appliance_guides?: Json | null
          created_at?: string | null
          detailed_instructions?: string | null
          embedding?: string | null
          embedding_balanced?: string | null
          emergency_info?: string | null
          house_rules_specific?: string | null
          local_tips?: string | null
          manual_content?: string | null
          metadata?: Json | null
          safe_code?: string | null
          unit_id?: string
          updated_at?: string | null
          wifi_password?: string | null
        }
        Relationships: []
      }
      accommodation_units_manual_chunks: {
        Row: {
          accommodation_unit_id: string
          chunk_content: string
          chunk_index: number
          created_at: string | null
          embedding: string | null
          embedding_balanced: string | null
          embedding_fast: string | null
          id: string
          manual_id: string
          metadata: Json | null
          section_title: string | null
          tenant_id: string
          total_chunks: number
          updated_at: string | null
        }
        Insert: {
          accommodation_unit_id: string
          chunk_content: string
          chunk_index: number
          created_at?: string | null
          embedding?: string | null
          embedding_balanced?: string | null
          embedding_fast?: string | null
          id?: string
          manual_id: string
          metadata?: Json | null
          section_title?: string | null
          tenant_id: string
          total_chunks: number
          updated_at?: string | null
        }
        Update: {
          accommodation_unit_id?: string
          chunk_content?: string
          chunk_index?: number
          created_at?: string | null
          embedding?: string | null
          embedding_balanced?: string | null
          embedding_fast?: string | null
          id?: string
          manual_id?: string
          metadata?: Json | null
          section_title?: string | null
          tenant_id?: string
          total_chunks?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "accommodation_units_manual_chunks_manual_id_fkey"
            columns: ["manual_id"]
            isOneToOne: false
            referencedRelation: "accommodation_units_manual"
            referencedColumns: ["unit_id"]
          },
          {
            foreignKeyName: "accommodation_units_manual_chunks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_registry"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      accommodation_units_public: {
        Row: {
          amenities: Json | null
          created_at: string | null
          description: string
          embedding: string | null
          embedding_fast: string | null
          highlights: Json | null
          is_active: boolean | null
          is_bookable: boolean | null
          metadata: Json | null
          name: string
          photos: Json | null
          pricing: Json | null
          short_description: string | null
          tenant_id: string
          unit_id: string
          unit_number: string | null
          unit_type: string | null
          updated_at: string | null
          virtual_tour_url: string | null
        }
        Insert: {
          amenities?: Json | null
          created_at?: string | null
          description: string
          embedding?: string | null
          embedding_fast?: string | null
          highlights?: Json | null
          is_active?: boolean | null
          is_bookable?: boolean | null
          metadata?: Json | null
          name: string
          photos?: Json | null
          pricing?: Json | null
          short_description?: string | null
          tenant_id: string
          unit_id?: string
          unit_number?: string | null
          unit_type?: string | null
          updated_at?: string | null
          virtual_tour_url?: string | null
        }
        Update: {
          amenities?: Json | null
          created_at?: string | null
          description?: string
          embedding?: string | null
          embedding_fast?: string | null
          highlights?: Json | null
          is_active?: boolean | null
          is_bookable?: boolean | null
          metadata?: Json | null
          name?: string
          photos?: Json | null
          pricing?: Json | null
          short_description?: string | null
          tenant_id?: string
          unit_id?: string
          unit_number?: string | null
          unit_type?: string | null
          updated_at?: string | null
          virtual_tour_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "accommodation_units_public_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_registry"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      chat_conversations: {
        Row: {
          check_in_date: string | null
          created_at: string | null
          guest_phone_last_4: string | null
          id: string
          reservation_id: string | null
          status: string | null
          tenant_id: string
          updated_at: string | null
          user_id: string
          user_type: string
        }
        Insert: {
          check_in_date?: string | null
          created_at?: string | null
          guest_phone_last_4?: string | null
          id?: string
          reservation_id?: string | null
          status?: string | null
          tenant_id: string
          updated_at?: string | null
          user_id: string
          user_type: string
        }
        Update: {
          check_in_date?: string | null
          created_at?: string | null
          guest_phone_last_4?: string | null
          id?: string
          reservation_id?: string | null
          status?: string | null
          tenant_id?: string
          updated_at?: string | null
          user_id?: string
          user_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_conversations_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "guest_reservations"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          content: string
          conversation_id: string | null
          created_at: string | null
          entities: Json | null
          id: string
          metadata: Json | null
          role: string
          sources: Json | null
          tenant_id: string | null
        }
        Insert: {
          content: string
          conversation_id?: string | null
          created_at?: string | null
          entities?: Json | null
          id?: string
          metadata?: Json | null
          role: string
          sources?: Json | null
          tenant_id?: string | null
        }
        Update: {
          content?: string
          conversation_id?: string | null
          created_at?: string | null
          entities?: Json | null
          id?: string
          metadata?: Json | null
          role?: string
          sources?: Json | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "guest_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      compliance_submissions: {
        Row: {
          data: Json
          error_message: string | null
          guest_id: string
          id: string
          sire_response: Json | null
          status: string
          submitted_at: string | null
          submitted_by: string | null
          tenant_id: string
          tra_response: Json | null
          type: string
        }
        Insert: {
          data: Json
          error_message?: string | null
          guest_id: string
          id?: string
          sire_response?: Json | null
          status: string
          submitted_at?: string | null
          submitted_by?: string | null
          tenant_id: string
          tra_response?: Json | null
          type: string
        }
        Update: {
          data?: Json
          error_message?: string | null
          guest_id?: string
          id?: string
          sire_response?: Json | null
          status?: string
          submitted_at?: string | null
          submitted_by?: string | null
          tenant_id?: string
          tra_response?: Json | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "compliance_submissions_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guest_reservations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_attachments: {
        Row: {
          analysis_type: string | null
          confidence_score: number | null
          conversation_id: string
          created_at: string | null
          file_size_bytes: number | null
          file_type: string
          file_url: string
          id: string
          message_id: string | null
          mime_type: string | null
          ocr_text: string | null
          original_filename: string | null
          updated_at: string | null
          vision_analysis: Json | null
        }
        Insert: {
          analysis_type?: string | null
          confidence_score?: number | null
          conversation_id: string
          created_at?: string | null
          file_size_bytes?: number | null
          file_type: string
          file_url: string
          id?: string
          message_id?: string | null
          mime_type?: string | null
          ocr_text?: string | null
          original_filename?: string | null
          updated_at?: string | null
          vision_analysis?: Json | null
        }
        Update: {
          analysis_type?: string | null
          confidence_score?: number | null
          conversation_id?: string
          created_at?: string | null
          file_size_bytes?: number | null
          file_type?: string
          file_url?: string
          id?: string
          message_id?: string | null
          mime_type?: string | null
          ocr_text?: string | null
          original_filename?: string | null
          updated_at?: string | null
          vision_analysis?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "conversation_attachments_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "guest_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_memory: {
        Row: {
          created_at: string | null
          embedding_fast: string | null
          id: string
          key_entities: Json | null
          message_count: number
          message_range: string
          session_id: string
          summary_text: string
          tenant_id: string
        }
        Insert: {
          created_at?: string | null
          embedding_fast?: string | null
          id?: string
          key_entities?: Json | null
          message_count?: number
          message_range: string
          session_id: string
          summary_text: string
          tenant_id: string
        }
        Update: {
          created_at?: string | null
          embedding_fast?: string | null
          id?: string
          key_entities?: Json | null
          message_count?: number
          message_range?: string
          session_id?: string
          summary_text?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_memory_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "prospective_sessions"
            referencedColumns: ["session_id"]
          },
          {
            foreignKeyName: "conversation_memory_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_registry"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      guest_conversations: {
        Row: {
          archived_at: string | null
          compressed_history: Json | null
          created_at: string | null
          favorites: Json | null
          guest_id: string
          id: string
          is_archived: boolean | null
          last_activity_at: string | null
          last_message: string | null
          message_count: number | null
          tenant_id: string
          title: string
          updated_at: string | null
        }
        Insert: {
          archived_at?: string | null
          compressed_history?: Json | null
          created_at?: string | null
          favorites?: Json | null
          guest_id: string
          id?: string
          is_archived?: boolean | null
          last_activity_at?: string | null
          last_message?: string | null
          message_count?: number | null
          tenant_id: string
          title: string
          updated_at?: string | null
        }
        Update: {
          archived_at?: string | null
          compressed_history?: Json | null
          created_at?: string | null
          favorites?: Json | null
          guest_id?: string
          id?: string
          is_archived?: boolean | null
          last_activity_at?: string | null
          last_message?: string | null
          message_count?: number | null
          tenant_id?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "guest_conversations_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guest_reservations"
            referencedColumns: ["id"]
          },
        ]
      }
      guest_reservations: {
        Row: {
          accommodation_unit_id: string | null
          accommodation_unit_id_key: string | null
          adults: number | null
          birth_date: string | null
          booking_notes: string | null
          booking_source: string | null
          check_in_date: string
          check_in_time: string | null
          check_out_date: string
          check_out_time: string | null
          children: number | null
          created_at: string | null
          currency: string | null
          destination_city_code: string | null
          document_number: string | null
          document_type: string | null
          external_booking_id: string | null
          first_surname: string | null
          given_names: string | null
          guest_country: string | null
          guest_email: string | null
          guest_name: string
          hotel_city_code: string | null
          hotel_sire_code: string | null
          id: string
          movement_date: string | null
          movement_type: string | null
          nationality_code: string | null
          origin_city_code: string | null
          phone_full: string
          phone_last_4: string
          reservation_code: string | null
          second_surname: string | null
          status: string | null
          tenant_id: string
          total_price: number | null
          updated_at: string | null
        }
        Insert: {
          accommodation_unit_id?: string | null
          accommodation_unit_id_key?: string | null
          adults?: number | null
          birth_date?: string | null
          booking_notes?: string | null
          booking_source?: string | null
          check_in_date: string
          check_in_time?: string | null
          check_out_date: string
          check_out_time?: string | null
          children?: number | null
          created_at?: string | null
          currency?: string | null
          destination_city_code?: string | null
          document_number?: string | null
          document_type?: string | null
          external_booking_id?: string | null
          first_surname?: string | null
          given_names?: string | null
          guest_country?: string | null
          guest_email?: string | null
          guest_name: string
          hotel_city_code?: string | null
          hotel_sire_code?: string | null
          id?: string
          movement_date?: string | null
          movement_type?: string | null
          nationality_code?: string | null
          origin_city_code?: string | null
          phone_full?: string
          phone_last_4?: string
          reservation_code?: string | null
          second_surname?: string | null
          status?: string | null
          tenant_id?: string
          total_price?: number | null
          updated_at?: string | null
        }
        Update: {
          accommodation_unit_id?: string | null
          accommodation_unit_id_key?: string | null
          adults?: number | null
          birth_date?: string | null
          booking_notes?: string | null
          booking_source?: string | null
          check_in_date?: string
          check_in_time?: string | null
          check_out_date?: string
          check_out_time?: string | null
          children?: number | null
          created_at?: string | null
          currency?: string | null
          destination_city_code?: string | null
          document_number?: string | null
          document_type?: string | null
          external_booking_id?: string | null
          first_surname?: string | null
          given_names?: string | null
          guest_country?: string | null
          guest_email?: string | null
          guest_name?: string
          hotel_city_code?: string | null
          hotel_sire_code?: string | null
          id?: string
          movement_date?: string | null
          movement_type?: string | null
          nationality_code?: string | null
          origin_city_code?: string | null
          phone_full?: string
          phone_last_4?: string
          reservation_code?: string | null
          second_surname?: string | null
          status?: string | null
          tenant_id?: string
          total_price?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      hotel_operations: {
        Row: {
          access_level: string | null
          category: string
          content: string
          created_at: string | null
          created_by: string | null
          embedding: string | null
          embedding_balanced: string | null
          is_active: boolean | null
          metadata: Json | null
          operation_id: string
          tenant_id: string
          title: string
          updated_at: string | null
          version: number | null
        }
        Insert: {
          access_level?: string | null
          category: string
          content: string
          created_at?: string | null
          created_by?: string | null
          embedding?: string | null
          embedding_balanced?: string | null
          is_active?: boolean | null
          metadata?: Json | null
          operation_id?: string
          tenant_id: string
          title: string
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          access_level?: string | null
          category?: string
          content?: string
          created_at?: string | null
          created_by?: string | null
          embedding?: string | null
          embedding_balanced?: string | null
          is_active?: boolean | null
          metadata?: Json | null
          operation_id?: string
          tenant_id?: string
          title?: string
          updated_at?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "hotel_operations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "staff_users"
            referencedColumns: ["staff_id"]
          },
          {
            foreignKeyName: "hotel_operations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_registry"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      hotels: {
        Row: {
          address: Json | null
          check_in_time: string | null
          check_out_time: string | null
          contact_info: Json | null
          created_at: string | null
          description: string | null
          embedding_balanced: string | null
          embedding_fast: string | null
          full_description: string | null
          hotel_amenities: Json | null
          id: string
          images: Json | null
          motopress_property_id: number | null
          name: string
          policies: Json | null
          policies_summary: string | null
          short_description: string | null
          status: string | null
          tenant_id: string
          tourism_summary: string | null
          updated_at: string | null
        }
        Insert: {
          address?: Json | null
          check_in_time?: string | null
          check_out_time?: string | null
          contact_info?: Json | null
          created_at?: string | null
          description?: string | null
          embedding_balanced?: string | null
          embedding_fast?: string | null
          full_description?: string | null
          hotel_amenities?: Json | null
          id?: string
          images?: Json | null
          motopress_property_id?: number | null
          name: string
          policies?: Json | null
          policies_summary?: string | null
          short_description?: string | null
          status?: string | null
          tenant_id: string
          tourism_summary?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: Json | null
          check_in_time?: string | null
          check_out_time?: string | null
          contact_info?: Json | null
          created_at?: string | null
          description?: string | null
          embedding_balanced?: string | null
          embedding_fast?: string | null
          full_description?: string | null
          hotel_amenities?: Json | null
          id?: string
          images?: Json | null
          motopress_property_id?: number | null
          name?: string
          policies?: Json | null
          policies_summary?: string | null
          short_description?: string | null
          status?: string | null
          tenant_id?: string
          tourism_summary?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hotels_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_registry"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      integration_configs: {
        Row: {
          config_data: Json
          created_at: string | null
          id: string
          integration_type: string
          is_active: boolean | null
          last_sync_at: string | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          config_data: Json
          created_at?: string | null
          id?: string
          integration_type: string
          is_active?: boolean | null
          last_sync_at?: string | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          config_data?: Json
          created_at?: string | null
          id?: string
          integration_type?: string
          is_active?: boolean | null
          last_sync_at?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "integration_configs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_registry"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      muva_content: {
        Row: {
          business_info: Json | null
          category: string | null
          chunk_index: number | null
          content: string
          created_at: string | null
          description: string | null
          document_type: string | null
          embedding: string | null
          embedding_fast: string | null
          embedding_model: string | null
          id: string
          keywords: string[] | null
          language: string | null
          page_number: number | null
          schema_type: string | null
          schema_version: string | null
          section_title: string | null
          source_file: string | null
          status: string | null
          subcategory: string | null
          tags: string[] | null
          title: string | null
          token_count: number | null
          total_chunks: number | null
          updated_at: string | null
          version: string | null
        }
        Insert: {
          business_info?: Json | null
          category?: string | null
          chunk_index?: number | null
          content: string
          created_at?: string | null
          description?: string | null
          document_type?: string | null
          embedding?: string | null
          embedding_fast?: string | null
          embedding_model?: string | null
          id?: string
          keywords?: string[] | null
          language?: string | null
          page_number?: number | null
          schema_type?: string | null
          schema_version?: string | null
          section_title?: string | null
          source_file?: string | null
          status?: string | null
          subcategory?: string | null
          tags?: string[] | null
          title?: string | null
          token_count?: number | null
          total_chunks?: number | null
          updated_at?: string | null
          version?: string | null
        }
        Update: {
          business_info?: Json | null
          category?: string | null
          chunk_index?: number | null
          content?: string
          created_at?: string | null
          description?: string | null
          document_type?: string | null
          embedding?: string | null
          embedding_fast?: string | null
          embedding_model?: string | null
          id?: string
          keywords?: string[] | null
          language?: string | null
          page_number?: number | null
          schema_type?: string | null
          schema_version?: string | null
          section_title?: string | null
          source_file?: string | null
          status?: string | null
          subcategory?: string | null
          tags?: string[] | null
          title?: string | null
          token_count?: number | null
          total_chunks?: number | null
          updated_at?: string | null
          version?: string | null
        }
        Relationships: []
      }
      prospective_sessions: {
        Row: {
          conversation_history: Json
          conversion_date: string | null
          converted_to_reservation_id: string | null
          cookie_id: string
          created_at: string
          expires_at: string
          landing_page: string | null
          last_activity_at: string
          referrer: string | null
          session_id: string
          status: string
          tenant_id: string
          travel_intent: Json
          utm_tracking: Json
        }
        Insert: {
          conversation_history?: Json
          conversion_date?: string | null
          converted_to_reservation_id?: string | null
          cookie_id: string
          created_at?: string
          expires_at?: string
          landing_page?: string | null
          last_activity_at?: string
          referrer?: string | null
          session_id?: string
          status?: string
          tenant_id: string
          travel_intent?: Json
          utm_tracking?: Json
        }
        Update: {
          conversation_history?: Json
          conversion_date?: string | null
          converted_to_reservation_id?: string | null
          cookie_id?: string
          created_at?: string
          expires_at?: string
          landing_page?: string | null
          last_activity_at?: string
          referrer?: string | null
          session_id?: string
          status?: string
          tenant_id?: string
          travel_intent?: Json
          utm_tracking?: Json
        }
        Relationships: [
          {
            foreignKeyName: "prospective_sessions_converted_to_reservation_id_fkey"
            columns: ["converted_to_reservation_id"]
            isOneToOne: false
            referencedRelation: "guest_reservations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prospective_sessions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_registry"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      sire_cities: {
        Row: {
          code: string
          created_at: string | null
          department: string | null
          name: string
          region: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          department?: string | null
          name: string
          region?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          department?: string | null
          name?: string
          region?: string | null
        }
        Relationships: []
      }
      sire_content: {
        Row: {
          category: string | null
          chunk_index: number | null
          content: string
          created_at: string | null
          description: string | null
          document_type: string | null
          embedding: string | null
          embedding_balanced: string | null
          embedding_model: string | null
          id: string
          keywords: string[] | null
          language: string | null
          page_number: number | null
          section_title: string | null
          source_file: string | null
          status: string | null
          tags: string[] | null
          title: string | null
          token_count: number | null
          total_chunks: number | null
          updated_at: string | null
          version: string | null
        }
        Insert: {
          category?: string | null
          chunk_index?: number | null
          content: string
          created_at?: string | null
          description?: string | null
          document_type?: string | null
          embedding?: string | null
          embedding_balanced?: string | null
          embedding_model?: string | null
          id?: string
          keywords?: string[] | null
          language?: string | null
          page_number?: number | null
          section_title?: string | null
          source_file?: string | null
          status?: string | null
          tags?: string[] | null
          title?: string | null
          token_count?: number | null
          total_chunks?: number | null
          updated_at?: string | null
          version?: string | null
        }
        Update: {
          category?: string | null
          chunk_index?: number | null
          content?: string
          created_at?: string | null
          description?: string | null
          document_type?: string | null
          embedding?: string | null
          embedding_balanced?: string | null
          embedding_model?: string | null
          id?: string
          keywords?: string[] | null
          language?: string | null
          page_number?: number | null
          section_title?: string | null
          source_file?: string | null
          status?: string | null
          tags?: string[] | null
          title?: string | null
          token_count?: number | null
          total_chunks?: number | null
          updated_at?: string | null
          version?: string | null
        }
        Relationships: []
      }
      sire_countries: {
        Row: {
          alpha2_code: string | null
          created_at: string | null
          iso_code: string
          name: string
          name_es: string | null
          sire_code: string | null
        }
        Insert: {
          alpha2_code?: string | null
          created_at?: string | null
          iso_code: string
          name: string
          name_es?: string | null
          sire_code?: string | null
        }
        Update: {
          alpha2_code?: string | null
          created_at?: string | null
          iso_code?: string
          name?: string
          name_es?: string | null
          sire_code?: string | null
        }
        Relationships: []
      }
      sire_document_types: {
        Row: {
          code: string
          created_at: string | null
          description: string | null
          name: string
        }
        Insert: {
          code: string
          created_at?: string | null
          description?: string | null
          name: string
        }
        Update: {
          code?: string
          created_at?: string | null
          description?: string | null
          name?: string
        }
        Relationships: []
      }
      sire_export_logs: {
        Row: {
          created_at: string
          error_message: string | null
          export_date: string
          export_type: string
          file_name: string | null
          id: string
          metadata: Json | null
          movement_type: string | null
          record_count: number
          status: string
          tenant_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          export_date: string
          export_type: string
          file_name?: string | null
          id?: string
          metadata?: Json | null
          movement_type?: string | null
          record_count: number
          status: string
          tenant_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          error_message?: string | null
          export_date?: string
          export_type?: string
          file_name?: string | null
          id?: string
          metadata?: Json | null
          movement_type?: string | null
          record_count?: number
          status?: string
          tenant_id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      staff_conversations: {
        Row: {
          category: string | null
          conversation_id: string
          created_at: string | null
          last_message_at: string | null
          staff_id: string
          status: string | null
          tenant_id: string
          title: string | null
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          conversation_id?: string
          created_at?: string | null
          last_message_at?: string | null
          staff_id: string
          status?: string | null
          tenant_id: string
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          conversation_id?: string
          created_at?: string | null
          last_message_at?: string | null
          staff_id?: string
          status?: string | null
          tenant_id?: string
          title?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_conversations_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff_users"
            referencedColumns: ["staff_id"]
          },
        ]
      }
      staff_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string | null
          message_id: string
          message_index: number
          metadata: Json | null
          role: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string | null
          message_id?: string
          message_index: number
          metadata?: Json | null
          role: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string | null
          message_id?: string
          message_index?: number
          metadata?: Json | null
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "staff_conversations"
            referencedColumns: ["conversation_id"]
          },
        ]
      }
      staff_users: {
        Row: {
          created_at: string | null
          created_by: string | null
          email: string | null
          full_name: string
          is_active: boolean | null
          last_login_at: string | null
          password_hash: string
          permissions: Json | null
          phone: string | null
          role: string
          staff_id: string
          tenant_id: string
          updated_at: string | null
          username: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          email?: string | null
          full_name: string
          is_active?: boolean | null
          last_login_at?: string | null
          password_hash: string
          permissions?: Json | null
          phone?: string | null
          role: string
          staff_id?: string
          tenant_id: string
          updated_at?: string | null
          username: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          email?: string | null
          full_name?: string
          is_active?: boolean | null
          last_login_at?: string | null
          password_hash?: string
          permissions?: Json | null
          phone?: string | null
          role?: string
          staff_id?: string
          tenant_id?: string
          updated_at?: string | null
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_users_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "staff_users"
            referencedColumns: ["staff_id"]
          },
          {
            foreignKeyName: "staff_users_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_registry"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      sync_history: {
        Row: {
          completed_at: string | null
          error_message: string | null
          id: string
          integration_type: string
          metadata: Json | null
          records_created: number | null
          records_processed: number | null
          records_updated: number | null
          started_at: string | null
          status: string
          sync_type: string
          tenant_id: string
        }
        Insert: {
          completed_at?: string | null
          error_message?: string | null
          id?: string
          integration_type: string
          metadata?: Json | null
          records_created?: number | null
          records_processed?: number | null
          records_updated?: number | null
          started_at?: string | null
          status: string
          sync_type: string
          tenant_id: string
        }
        Update: {
          completed_at?: string | null
          error_message?: string | null
          id?: string
          integration_type?: string
          metadata?: Json | null
          records_created?: number | null
          records_processed?: number | null
          records_updated?: number | null
          started_at?: string | null
          status?: string
          sync_type?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sync_history_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_registry"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      tenant_compliance_credentials: {
        Row: {
          created_at: string | null
          id: string
          sire_password_encrypted: string | null
          sire_username: string | null
          tenant_id: string
          tra_rnt_token: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          sire_password_encrypted?: string | null
          sire_username?: string | null
          tenant_id: string
          tra_rnt_token?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          sire_password_encrypted?: string | null
          sire_username?: string | null
          tenant_id?: string
          tra_rnt_token?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenant_compliance_credentials_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenant_registry"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      tenant_registry: {
        Row: {
          created_at: string | null
          features: Json | null
          is_active: boolean | null
          nit: string
          nombre_comercial: string
          razon_social: string
          schema_name: string
          slug: string | null
          subscription_tier: string | null
          tenant_id: string
          tenant_type: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          features?: Json | null
          is_active?: boolean | null
          nit: string
          nombre_comercial: string
          razon_social: string
          schema_name: string
          slug?: string | null
          subscription_tier?: string | null
          tenant_id?: string
          tenant_type?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          features?: Json | null
          is_active?: boolean | null
          nit?: string
          nombre_comercial?: string
          razon_social?: string
          schema_name?: string
          slug?: string | null
          subscription_tier?: string | null
          tenant_id?: string
          tenant_type?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      user_tenant_permissions: {
        Row: {
          created_at: string | null
          expires_at: string | null
          granted_at: string | null
          granted_by: string | null
          id: string
          is_active: boolean | null
          permissions: Json | null
          role: string
          tenant_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          is_active?: boolean | null
          permissions?: Json | null
          role?: string
          tenant_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          is_active?: boolean | null
          permissions?: Json | null
          role?: string
          tenant_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_tenant_permissions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_registry"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
    }
    Views: {
      guest_chat_performance_monitor: {
        Row: {
          metric_name: string | null
          status: string | null
          value: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      binary_quantize: {
        Args: { "": string } | { "": unknown }
        Returns: unknown
      }
      check_metadata_integrity: {
        Args: Record<PropertyKey, never>
        Returns: {
          alert_type: string
          details: Json
          message: string
          severity: string
        }[]
      }
      check_rls_policies: {
        Args: Record<PropertyKey, never>
        Returns: {
          alert_type: string
          details: Json
          message: string
          severity: string
        }[]
      }
      check_rls_status: {
        Args: Record<PropertyKey, never>
        Returns: {
          policy_count: number
          rls_enabled: boolean
          schema_name: string
          table_name: string
        }[]
      }
      check_sire_access_permission: {
        Args: { p_tenant_id: string; p_user_id?: string }
        Returns: boolean
      }
      check_sire_data_completeness: {
        Args: { p_reservation_id: string }
        Returns: {
          is_complete: boolean
          missing_fields: string[]
          validation_errors: string[]
        }[]
      }
      check_slow_queries: {
        Args: Record<PropertyKey, never>
        Returns: {
          alert_type: string
          details: Json
          message: string
          severity: string
        }[]
      }
      exec_sql: {
        Args: { sql: string }
        Returns: Json
      }
      execute_sql: {
        Args: { query: string }
        Returns: Json
      }
      get_accommodation_tenant_id: {
        Args: { p_unit_id: string }
        Returns: string
      }
      get_accommodation_unit_by_id: {
        Args: { p_tenant_id: string; p_unit_id: string }
        Returns: {
          id: string
          name: string
          unit_number: string
          view_type: string
        }[]
      }
      get_accommodation_unit_by_motopress_id: {
        Args: { p_motopress_unit_id: number; p_tenant_id: string }
        Returns: string
      }
      get_accommodation_unit_by_name: {
        Args: { p_tenant_id: string; p_unit_name: string }
        Returns: string
      }
      get_accommodation_units: {
        Args: { p_hotel_id?: string; p_tenant_id?: string }
        Returns: {
          accessibility_features: Json
          amenities_list: Json
          base_price_high_season: number
          base_price_low_season: number
          bed_configuration: Json
          capacity: Json
          description: string
          display_order: number
          embedding_balanced: string
          embedding_fast: string
          hotel_id: string
          id: string
          is_featured: boolean
          location_details: Json
          name: string
          short_description: string
          status: string
          tenant_id: string
          unique_features: Json
          unit_amenities: string
          unit_number: string
          view_type: string
        }[]
      }
      get_accommodation_units_by_ids: {
        Args: { p_unit_ids: string[] }
        Returns: {
          id: string
          name: string
          unit_number: string
          unit_type: string
        }[]
      }
      get_accommodation_units_needing_type_id: {
        Args: { p_tenant_id: string }
        Returns: {
          id: string
          motopress_type_id: number
          motopress_unit_id: number
          name: string
        }[]
      }
      get_active_integration: {
        Args: { p_integration_type: string; p_tenant_id: string }
        Returns: {
          config_data: Json
          created_at: string
          id: string
          integration_type: string
          is_active: boolean
          last_sync_at: string
          tenant_id: string
          updated_at: string
        }[]
      }
      get_archived_conversations_to_delete: {
        Args: { p_days_archived?: number; p_tenant_id?: string }
        Returns: {
          archived_at: string
          days_archived: number
          id: string
          title: string
        }[]
      }
      get_conversation_messages: {
        Args: { p_conversation_id: string; p_limit?: number; p_offset?: number }
        Returns: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          metadata: Json
          role: string
        }[]
      }
      get_full_document: {
        Args: { p_source_file: string; p_table_name?: string }
        Returns: {
          business_info: Json
          content: string
          description: string
          full_content: string
          id: string
          title: string
        }[]
      }
      get_guest_conversation_metadata: {
        Args: { p_conversation_id: string }
        Returns: {
          archived_at: string
          compressed_history: Json
          created_at: string
          favorites: Json
          guest_id: string
          id: string
          is_archived: boolean
          last_activity_at: string
          last_message: string
          message_count: number
          tenant_id: string
          title: string
          updated_at: string
        }[]
      }
      get_inactive_conversations: {
        Args: { p_days_inactive?: number; p_tenant_id?: string }
        Returns: {
          days_inactive: number
          id: string
          last_activity_at: string
          title: string
        }[]
      }
      get_reservations_by_external_id: {
        Args: { p_external_booking_id: string; p_tenant_id: string }
        Returns: {
          accommodation_unit_id: string
          booking_source: string
          check_in_date: string
          check_out_date: string
          created_at: string
          currency: string
          external_booking_id: string
          guest_email: string
          guest_name: string
          id: string
          phone_full: string
          phone_last_4: string
          reservation_code: string
          status: string
          tenant_id: string
          total_price: number
        }[]
      }
      get_sire_guest_data: {
        Args: { p_reservation_id: string }
        Returns: {
          birth_date: string
          check_in_date: string
          check_out_date: string
          destination_city_code: string
          destination_city_name: string
          document_number: string
          document_type: string
          document_type_name: string
          first_surname: string
          given_names: string
          guest_name: string
          hotel_city_code: string
          hotel_sire_code: string
          movement_date: string
          movement_type: string
          nationality_code: string
          nationality_name: string
          origin_city_code: string
          origin_city_name: string
          reservation_code: string
          reservation_id: string
          second_surname: string
          status: string
          tenant_id: string
        }[]
      }
      get_sire_monthly_export: {
        Args: {
          p_month: number
          p_movement_type?: string
          p_tenant_id: string
          p_year: number
        }
        Returns: {
          birth_date: string
          check_in_date: string
          check_out_date: string
          destination_city_code: string
          document_number: string
          document_type: string
          first_surname: string
          given_names: string
          guest_name: string
          hotel_city_code: string
          hotel_sire_code: string
          movement_date: string
          movement_type: string
          nationality_code: string
          origin_city_code: string
          reservation_code: string
          reservation_id: string
          second_surname: string
          status: string
        }[]
      }
      get_sire_statistics: {
        Args: { p_end_date: string; p_start_date: string; p_tenant_id: string }
        Returns: {
          check_ins_complete: number
          check_outs_complete: number
          completion_rate: number
          missing_document: number
          missing_hotel_code: number
          missing_names: number
          missing_nationality: number
          sire_complete_reservations: number
          sire_incomplete_reservations: number
          top_nationalities: Json
          total_reservations: number
        }[]
      }
      get_tenant_schema: {
        Args: { tenant_nit: string }
        Returns: string
      }
      halfvec_avg: {
        Args: { "": number[] }
        Returns: unknown
      }
      halfvec_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      halfvec_send: {
        Args: { "": unknown }
        Returns: string
      }
      halfvec_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
      has_tenant_feature: {
        Args: { p_feature_name: string; p_tenant_id: string }
        Returns: boolean
      }
      hnsw_bit_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnsw_halfvec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnsw_sparsevec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnswhandler: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflat_bit_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflat_halfvec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflathandler: {
        Args: { "": unknown }
        Returns: unknown
      }
      l2_norm: {
        Args: { "": unknown } | { "": unknown }
        Returns: number
      }
      l2_normalize: {
        Args: { "": string } | { "": unknown } | { "": unknown }
        Returns: string
      }
      list_rls_policies: {
        Args: Record<PropertyKey, never>
        Returns: {
          command: string
          policy_name: string
          roles: string[]
          table_name: string
        }[]
      }
      match_accommodation_units_balanced: {
        Args: {
          match_count?: number
          query_embedding: string
          similarity_threshold?: number
        }
        Returns: {
          booking_policies: string
          capacity: Json
          description: string
          id: string
          is_featured: boolean
          name: string
          similarity: number
        }[]
      }
      match_accommodation_units_fast: {
        Args: {
          match_count?: number
          query_embedding: string
          similarity_threshold?: number
        }
        Returns: {
          content: string
          description: string
          id: string
          is_featured: boolean
          name: string
          similarity: number
          view_type: string
        }[]
      }
      match_accommodations_public: {
        Args: {
          match_count?: number
          match_threshold?: number
          p_tenant_id: string
          query_embedding: string
        }
        Returns: {
          content: string
          id: string
          metadata: Json
          name: string
          photos: Json
          pricing: Json
          similarity: number
          source_file: string
        }[]
      }
      match_conversation_memory: {
        Args: {
          match_count?: number
          match_threshold?: number
          p_session_id: string
          query_embedding: string
        }
        Returns: {
          id: string
          key_entities: Json
          message_range: string
          similarity: number
          summary_text: string
        }[]
      }
      match_documents: {
        Args: {
          match_count?: number
          match_threshold?: number
          query_embedding: string
        }
        Returns: {
          chunk_index: number
          content: string
          created_at: string
          document_type: string
          embedding: string
          id: string
          similarity: number
          source_file: string
          total_chunks: number
        }[]
      }
      match_documents_with_tenant: {
        Args: {
          domain_filter?: string
          match_count?: number
          match_threshold?: number
          query_embedding: string
          tenant_nit?: string
        }
        Returns: {
          content: string
          document_type: string
          metadata: Json
          similarity: number
          source_file: string
        }[]
      }
      match_guest_accommodations: {
        Args: {
          match_count?: number
          match_threshold?: number
          p_guest_unit_id: string
          p_tenant_id: string
          query_embedding_balanced: string
          query_embedding_fast: string
        }
        Returns: {
          content: string
          id: string
          is_guest_unit: boolean
          name: string
          similarity: number
          source_table: string
        }[]
      }
      match_guest_information_balanced: {
        Args: {
          match_count?: number
          p_tenant_id: string
          query_embedding: string
          similarity_threshold?: number
        }
        Returns: {
          info_content: string
          info_id: string
          info_title: string
          info_type: string
          similarity: number
        }[]
      }
      match_hotel_content: {
        Args: {
          client_nit?: string
          match_count?: number
          match_threshold?: number
          property_name?: string
          query_embedding: string
        }
        Returns: {
          client_info: Json
          content: string
          metadata: Json
          similarity: number
          source_name: string
          source_type: string
        }[]
      }
      match_hotel_documents: {
        Args: {
          client_id_filter: string
          match_count?: number
          match_threshold?: number
          query_embedding: string
        }
        Returns: {
          business_type: string
          chunk_index: number
          client_id: string
          content: string
          created_at: string
          document_type: string
          embedding: string
          id: string
          similarity: number
          source_file: string
          title: string
          total_chunks: number
          zone: string
        }[]
      }
      match_hotel_general_info: {
        Args: {
          match_count?: number
          p_tenant_id: string
          query_embedding: string
          similarity_threshold?: number
        }
        Returns: {
          info_content: string
          info_id: string
          info_title: string
          info_type: string
          similarity: number
        }[]
      }
      match_hotel_operations_balanced: {
        Args: {
          match_count?: number
          match_threshold?: number
          p_access_levels: string[]
          p_tenant_id: string
          query_embedding: string
        }
        Returns: {
          access_level: string
          category: string
          content: string
          operation_id: string
          similarity: number
          title: string
        }[]
      }
      match_hotels_documents: {
        Args: {
          business_type_filter?: string
          match_count?: number
          match_threshold?: number
          query_embedding: string
          tenant_id_filter: string
          tier?: number
        }
        Returns: {
          content: string
          id: string
          metadata: Json
          similarity: number
          source_table: string
          tier_used: number
        }[]
      }
      match_hotels_documents_optimized: {
        Args: {
          match_count?: number
          match_threshold?: number
          query_embedding: string
        }
        Returns: {
          content: string
          metadata: Json
          similarity: number
          source_table: string
        }[]
      }
      match_hotels_with_tier_routing: {
        Args: {
          match_count?: number
          query_embedding_balanced: string
          query_embedding_fast: string
          search_type?: string
          similarity_threshold?: number
        }
        Returns: {
          address: Json
          description: string
          hotel_amenities: Json
          id: string
          name: string
          policies_summary: string
          search_tier: string
          similarity: number
          tourism_summary: string
        }[]
      }
      match_listings_documents: {
        Args:
          | {
              business_type_filter?: string
              client_id_filter?: string
              match_count?: number
              match_threshold?: number
              query_embedding: string
            }
          | {
              business_type_filter?: string
              client_id_filter?: string
              match_count?: number
              match_threshold?: number
              query_embedding: string
            }
        Returns: {
          content: string
          id: string
          metadata: Json
          similarity: number
        }[]
      }
      match_muva_activities: {
        Args: {
          match_count?: number
          match_threshold?: number
          query_embedding: string
        }
        Returns: {
          actividades_disponibles: string[]
          categoria: string
          chunk_index: number
          content: string
          id: string
          keywords: string[]
          nombre: string
          precio: string
          similarity: number
          source_file: string
          subzona: string
          tags: string[]
          telefono: string
          total_chunks: number
          website: string
          zona: string
        }[]
      }
      match_muva_documents: {
        Args: {
          match_count?: number
          match_threshold?: number
          query_embedding: string
        }
        Returns: {
          business_info: Json
          category: string
          chunk_index: number
          content: string
          created_at: string
          description: string
          document_type: string
          embedding: string
          id: string
          similarity: number
          source_file: string
          subcategory: string
          title: string
          total_chunks: number
        }[]
      }
      match_muva_documents_public: {
        Args: {
          match_count?: number
          match_threshold?: number
          query_embedding: string
        }
        Returns: {
          business_info: Json
          category: string
          content: string
          description: string
          document_type: string
          id: string
          similarity: number
          source_file: string
          subcategory: string
          title: string
        }[]
      }
      match_optimized_documents: {
        Args: {
          match_count?: number
          match_threshold?: number
          query_embedding: string
          target_tables?: string[]
          tenant_id_filter?: string
          tier?: number
        }
        Returns: {
          content: string
          metadata: Json
          similarity: number
          source_table: string
          tier_name: string
        }[]
      }
      match_policies: {
        Args: {
          match_count?: number
          match_threshold?: number
          p_tenant_id: string
          query_embedding: string
        }
        Returns: {
          content: string
          id: string
          policy_name: string
          similarity: number
        }[]
      }
      match_policies_public: {
        Args: {
          match_count?: number
          match_threshold?: number
          p_tenant_id: string
          query_embedding: string
        }
        Returns: {
          content: string
          id: string
          policy_id: string
          policy_type: string
          similarity: number
          source_file: string
          title: string
        }[]
      }
      match_simmerdown_documents: {
        Args: {
          match_count?: number
          match_threshold?: number
          query_embedding: string
        }
        Returns: {
          chunk_index: number
          content: string
          created_at: string
          document_type: string
          id: string
          metadata: Json
          source_file: string
          total_chunks: number
        }[]
      }
      match_sire_documents: {
        Args: {
          match_count?: number
          match_threshold?: number
          query_embedding: string
        }
        Returns: {
          chunk_index: number
          content: string
          created_at: string
          document_type: string
          embedding: string
          id: string
          similarity: number
          source_file: string
          total_chunks: number
        }[]
      }
      match_unified_documents: {
        Args: {
          domain_filter?: string
          match_count?: number
          match_threshold?: number
          query_embedding: string
        }
        Returns: {
          content: string
          domain: string
          id: string
          metadata: Json
          similarity: number
        }[]
      }
      match_unit_manual: {
        Args: {
          match_count?: number
          p_unit_id: string
          query_embedding: string
          similarity_threshold?: number
        }
        Returns: {
          detailed_instructions: string
          manual_content: string
          safe_code: string
          similarity: number
          unit_id: string
          unit_name: string
          wifi_password: string
        }[]
      }
      match_unit_manual_chunks: {
        Args: {
          match_count?: number
          match_threshold?: number
          p_accommodation_unit_id: string
          query_embedding: string
        }
        Returns: {
          chunk_content: string
          chunk_index: number
          id: string
          manual_id: string
          section_title: string
          similarity: number
        }[]
      }
      search_hotels_by_tenant: {
        Args: {
          content_types?: string[]
          match_count?: number
          match_threshold?: number
          query_embedding: string
          tenant_ids?: string[]
        }
        Returns: {
          content: string
          id: string
          metadata: Json
          similarity: number
          tenant_id: string
        }[]
      }
      search_muva_attractions: {
        Args: {
          location_filter?: string
          match_count?: number
          min_rating?: number
          query_embedding: string
        }
        Returns: {
          contact_info: Json
          content: string
          description: string
          id: string
          location: string
          opening_hours: string
          rating: number
          similarity: number
          title: string
        }[]
      }
      search_muva_restaurants: {
        Args: {
          location_filter?: string
          match_count?: number
          min_rating?: number
          price_filter?: string
          query_embedding: string
        }
        Returns: {
          contact_info: Json
          content: string
          description: string
          id: string
          location: string
          opening_hours: string
          price_range: string
          rating: number
          similarity: number
          title: string
        }[]
      }
      set_app_tenant_id: {
        Args: { tenant_id: string }
        Returns: string
      }
      simulate_app_tenant_access: {
        Args: { input_tenant_id: string }
        Returns: {
          configured_tenant: string
          isolation_working: boolean
          properties_visible: number
          scenario: string
          units_visible: number
        }[]
      }
      sparsevec_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      sparsevec_send: {
        Args: { "": unknown }
        Returns: string
      }
      sparsevec_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
      test_ddl_execution: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      test_tenant_isolation_simple: {
        Args: Record<PropertyKey, never>
        Returns: {
          accommodation_units_count: number
          properties_count: number
          tenant_id_used: string
          test_scenario: string
        }[]
      }
      vector_avg: {
        Args: { "": number[] }
        Returns: string
      }
      vector_dims: {
        Args: { "": string } | { "": unknown }
        Returns: number
      }
      vector_norm: {
        Args: { "": string }
        Returns: number
      }
      vector_out: {
        Args: { "": string }
        Returns: unknown
      }
      vector_send: {
        Args: { "": string }
        Returns: string
      }
      vector_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
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
