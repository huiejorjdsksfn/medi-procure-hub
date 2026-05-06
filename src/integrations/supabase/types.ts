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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      achievements: {
        Row: {
          created_at: string | null
          description: string | null
          icon_url: string | null
          id: string
          name: string
          points: number | null
          requirement_type: string | null
          requirement_value: number | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          icon_url?: string | null
          id?: string
          name: string
          points?: number | null
          requirement_type?: string | null
          requirement_value?: number | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          icon_url?: string | null
          id?: string
          name?: string
          points?: number | null
          requirement_type?: string | null
          requirement_value?: number | null
        }
        Relationships: []
      }
      announcements: {
        Row: {
          content: string
          created_at: string | null
          created_by: string | null
          expires_at: string | null
          id: string
          priority: string | null
          target_levels: Database["public"]["Enums"]["education_level"][] | null
          target_roles: Database["public"]["Enums"]["app_role"][] | null
          title: string
        }
        Insert: {
          content: string
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          id?: string
          priority?: string | null
          target_levels?:
            | Database["public"]["Enums"]["education_level"][]
            | null
          target_roles?: Database["public"]["Enums"]["app_role"][] | null
          title: string
        }
        Update: {
          content?: string
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          id?: string
          priority?: string | null
          target_levels?:
            | Database["public"]["Enums"]["education_level"][]
            | null
          target_roles?: Database["public"]["Enums"]["app_role"][] | null
          title?: string
        }
        Relationships: []
      }
      assignment_submissions: {
        Row: {
          assignment_id: string | null
          feedback: string | null
          grade: number | null
          graded_at: string | null
          graded_by: string | null
          id: string
          student_id: string | null
          submission_text: string | null
          submission_url: string | null
          submitted_at: string | null
        }
        Insert: {
          assignment_id?: string | null
          feedback?: string | null
          grade?: number | null
          graded_at?: string | null
          graded_by?: string | null
          id?: string
          student_id?: string | null
          submission_text?: string | null
          submission_url?: string | null
          submitted_at?: string | null
        }
        Update: {
          assignment_id?: string | null
          feedback?: string | null
          grade?: number | null
          graded_at?: string | null
          graded_by?: string | null
          id?: string
          student_id?: string | null
          submission_text?: string | null
          submission_url?: string | null
          submitted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assignment_submissions_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
        ]
      }
      assignments: {
        Row: {
          attachment_url: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          due_date: string | null
          id: string
          instructions: string | null
          subject_id: string | null
          title: string
          total_points: number | null
        }
        Insert: {
          attachment_url?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          instructions?: string | null
          subject_id?: string | null
          title: string
          total_points?: number | null
        }
        Update: {
          attachment_url?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          instructions?: string | null
          subject_id?: string | null
          title?: string
          total_points?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "assignments_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          created_at: string | null
          details: Json | null
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          details?: Json | null
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          details?: Json | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      departments: {
        Row: {
          code: string
          created_at: string | null
          head_name: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          head_name?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          head_name?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      document_templates: {
        Row: {
          category_id: string | null
          created_at: string | null
          description: string | null
          downloads: number | null
          file_url: string | null
          id: string
          institution: string | null
          name: string
          preview_url: string | null
          template_type: string | null
        }
        Insert: {
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          downloads?: number | null
          file_url?: string | null
          id?: string
          institution?: string | null
          name: string
          preview_url?: string | null
          template_type?: string | null
        }
        Update: {
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          downloads?: number | null
          file_url?: string | null
          id?: string
          institution?: string | null
          name?: string
          preview_url?: string | null
          template_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_templates_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "template_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_posts: {
        Row: {
          author_id: string | null
          content: string
          created_at: string | null
          group_id: string | null
          id: string
          is_pinned: boolean | null
          replies_count: number | null
          subject_id: string | null
          title: string
          updated_at: string | null
          upvotes: number | null
        }
        Insert: {
          author_id?: string | null
          content: string
          created_at?: string | null
          group_id?: string | null
          id?: string
          is_pinned?: boolean | null
          replies_count?: number | null
          subject_id?: string | null
          title: string
          updated_at?: string | null
          upvotes?: number | null
        }
        Update: {
          author_id?: string | null
          content?: string
          created_at?: string | null
          group_id?: string | null
          id?: string
          is_pinned?: boolean | null
          replies_count?: number | null
          subject_id?: string | null
          title?: string
          updated_at?: string | null
          upvotes?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "forum_posts_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "study_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_posts_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_replies: {
        Row: {
          author_id: string | null
          content: string
          created_at: string | null
          id: string
          post_id: string | null
          updated_at: string | null
          upvotes: number | null
        }
        Insert: {
          author_id?: string | null
          content: string
          created_at?: string | null
          id?: string
          post_id?: string | null
          updated_at?: string | null
          upvotes?: number | null
        }
        Update: {
          author_id?: string | null
          content?: string
          created_at?: string | null
          id?: string
          post_id?: string | null
          updated_at?: string | null
          upvotes?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "forum_replies_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "forum_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      goods_received: {
        Row: {
          created_at: string | null
          grn_number: string
          id: string
          inspection_status: string | null
          notes: string | null
          po_id: string | null
          received_at: string | null
          received_by: string | null
        }
        Insert: {
          created_at?: string | null
          grn_number: string
          id?: string
          inspection_status?: string | null
          notes?: string | null
          po_id?: string | null
          received_at?: string | null
          received_by?: string | null
        }
        Update: {
          created_at?: string | null
          grn_number?: string
          id?: string
          inspection_status?: string | null
          notes?: string | null
          po_id?: string | null
          received_at?: string | null
          received_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "goods_received_po_id_fkey"
            columns: ["po_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      group_members: {
        Row: {
          group_id: string | null
          id: string
          joined_at: string | null
          role: string | null
          user_id: string | null
        }
        Insert: {
          group_id?: string | null
          id?: string
          joined_at?: string | null
          role?: string | null
          user_id?: string | null
        }
        Update: {
          group_id?: string | null
          id?: string
          joined_at?: string | null
          role?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "study_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      item_categories: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          parent_id: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          parent_id?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          parent_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "item_categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "item_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      items: {
        Row: {
          added_by: string | null
          barcode: string | null
          batch_number: string | null
          category_id: string | null
          created_at: string | null
          department_id: string | null
          description: string | null
          expiry_date: string | null
          id: string
          item_type: string | null
          location: string | null
          name: string
          quantity_in_stock: number | null
          reorder_level: number | null
          sku: string | null
          status: string | null
          supplier_id: string | null
          unit_of_measure: string | null
          unit_price: number | null
          updated_at: string | null
        }
        Insert: {
          added_by?: string | null
          barcode?: string | null
          batch_number?: string | null
          category_id?: string | null
          created_at?: string | null
          department_id?: string | null
          description?: string | null
          expiry_date?: string | null
          id?: string
          item_type?: string | null
          location?: string | null
          name: string
          quantity_in_stock?: number | null
          reorder_level?: number | null
          sku?: string | null
          status?: string | null
          supplier_id?: string | null
          unit_of_measure?: string | null
          unit_price?: number | null
          updated_at?: string | null
        }
        Update: {
          added_by?: string | null
          barcode?: string | null
          batch_number?: string | null
          category_id?: string | null
          created_at?: string | null
          department_id?: string | null
          description?: string | null
          expiry_date?: string | null
          id?: string
          item_type?: string | null
          location?: string | null
          name?: string
          quantity_in_stock?: number | null
          reorder_level?: number | null
          sku?: string | null
          status?: string | null
          supplier_id?: string | null
          unit_of_measure?: string | null
          unit_price?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "item_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "items_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "items_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_content: {
        Row: {
          content_data: Json | null
          content_type: Database["public"]["Enums"]["content_type"]
          content_url: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          duration_minutes: number | null
          file_size_mb: number | null
          id: string
          is_premium: boolean | null
          subtopic_id: string | null
          thumbnail_url: string | null
          title: string
          updated_at: string | null
          view_count: number | null
        }
        Insert: {
          content_data?: Json | null
          content_type: Database["public"]["Enums"]["content_type"]
          content_url?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          duration_minutes?: number | null
          file_size_mb?: number | null
          id?: string
          is_premium?: boolean | null
          subtopic_id?: string | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string | null
          view_count?: number | null
        }
        Update: {
          content_data?: Json | null
          content_type?: Database["public"]["Enums"]["content_type"]
          content_url?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          duration_minutes?: number | null
          file_size_mb?: number | null
          id?: string
          is_premium?: boolean | null
          subtopic_id?: string | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string | null
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "learning_content_subtopic_id_fkey"
            columns: ["subtopic_id"]
            isOneToOne: false
            referencedRelation: "subtopics"
            referencedColumns: ["id"]
          },
        ]
      }
      music_playlists: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          id: string
          is_public: boolean | null
          name: string
          thumbnail_url: string | null
          user_id: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          name: string
          thumbnail_url?: string | null
          user_id?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          name?: string
          thumbnail_url?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      playlist_tracks: {
        Row: {
          artist: string | null
          created_at: string | null
          duration_seconds: number | null
          file_url: string | null
          id: string
          order_index: number | null
          playlist_id: string | null
          title: string
        }
        Insert: {
          artist?: string | null
          created_at?: string | null
          duration_seconds?: number | null
          file_url?: string | null
          id?: string
          order_index?: number | null
          playlist_id?: string | null
          title: string
        }
        Update: {
          artist?: string | null
          created_at?: string | null
          duration_seconds?: number | null
          file_url?: string | null
          id?: string
          order_index?: number | null
          playlist_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "playlist_tracks_playlist_id_fkey"
            columns: ["playlist_id"]
            isOneToOne: false
            referencedRelation: "music_playlists"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          full_name: string
          id: string
          institution_name: string | null
          phone_number: string | null
          preferred_language: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          full_name: string
          id: string
          institution_name?: string | null
          phone_number?: string | null
          preferred_language?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string
          id?: string
          institution_name?: string | null
          phone_number?: string | null
          preferred_language?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      purchase_orders: {
        Row: {
          approved_by: string | null
          created_at: string | null
          created_by: string | null
          delivery_date: string | null
          id: string
          po_number: string
          requisition_id: string | null
          status: string | null
          supplier_id: string | null
          total_amount: number | null
          updated_at: string | null
        }
        Insert: {
          approved_by?: string | null
          created_at?: string | null
          created_by?: string | null
          delivery_date?: string | null
          id?: string
          po_number: string
          requisition_id?: string | null
          status?: string | null
          supplier_id?: string | null
          total_amount?: number | null
          updated_at?: string | null
        }
        Update: {
          approved_by?: string | null
          created_at?: string | null
          created_by?: string | null
          delivery_date?: string | null
          id?: string
          po_number?: string
          requisition_id?: string | null
          status?: string | null
          supplier_id?: string | null
          total_amount?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_requisition_id_fkey"
            columns: ["requisition_id"]
            isOneToOne: false
            referencedRelation: "requisitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      requisition_items: {
        Row: {
          created_at: string | null
          id: string
          item_id: string | null
          item_name: string
          notes: string | null
          quantity: number
          requisition_id: string | null
          total_price: number | null
          unit_price: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          item_id?: string | null
          item_name: string
          notes?: string | null
          quantity?: number
          requisition_id?: string | null
          total_price?: number | null
          unit_price?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          item_id?: string | null
          item_name?: string
          notes?: string | null
          quantity?: number
          requisition_id?: string | null
          total_price?: number | null
          unit_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "requisition_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requisition_items_requisition_id_fkey"
            columns: ["requisition_id"]
            isOneToOne: false
            referencedRelation: "requisitions"
            referencedColumns: ["id"]
          },
        ]
      }
      requisitions: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string | null
          department_id: string | null
          id: string
          justification: string | null
          notes: string | null
          priority: string | null
          requested_by: string | null
          requisition_number: string
          status: string | null
          submitted_at: string | null
          total_amount: number | null
          updated_at: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          department_id?: string | null
          id?: string
          justification?: string | null
          notes?: string | null
          priority?: string | null
          requested_by?: string | null
          requisition_number: string
          status?: string | null
          submitted_at?: string | null
          total_amount?: number | null
          updated_at?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          department_id?: string | null
          id?: string
          justification?: string | null
          notes?: string | null
          priority?: string | null
          requested_by?: string | null
          requisition_number?: string
          status?: string | null
          submitted_at?: string | null
          total_amount?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "requisitions_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      study_groups: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_public: boolean | null
          max_members: number | null
          name: string
          subject_id: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          max_members?: number | null
          name: string
          subject_id?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          max_members?: number | null
          name?: string
          subject_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "study_groups_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      study_notes: {
        Row: {
          author_id: string | null
          content: string
          created_at: string | null
          downloads: number | null
          id: string
          is_public: boolean | null
          markdown_content: string | null
          subtopic_id: string | null
          tags: string[] | null
          title: string
          updated_at: string | null
          upvotes: number | null
        }
        Insert: {
          author_id?: string | null
          content: string
          created_at?: string | null
          downloads?: number | null
          id?: string
          is_public?: boolean | null
          markdown_content?: string | null
          subtopic_id?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string | null
          upvotes?: number | null
        }
        Update: {
          author_id?: string | null
          content?: string
          created_at?: string | null
          downloads?: number | null
          id?: string
          is_public?: boolean | null
          markdown_content?: string | null
          subtopic_id?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string | null
          upvotes?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "study_notes_subtopic_id_fkey"
            columns: ["subtopic_id"]
            isOneToOne: false
            referencedRelation: "subtopics"
            referencedColumns: ["id"]
          },
        ]
      }
      subjects: {
        Row: {
          code: string
          created_at: string | null
          description: string | null
          icon_url: string | null
          id: string
          level: Database["public"]["Enums"]["education_level"]
          name: string
          updated_at: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          description?: string | null
          icon_url?: string | null
          id?: string
          level: Database["public"]["Enums"]["education_level"]
          name: string
          updated_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          description?: string | null
          icon_url?: string | null
          id?: string
          level?: Database["public"]["Enums"]["education_level"]
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      subtopics: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          learning_objectives: string[] | null
          name: string
          order_index: number
          topic_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          learning_objectives?: string[] | null
          name: string
          order_index: number
          topic_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          learning_objectives?: string[] | null
          name?: string
          order_index?: number
          topic_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subtopics_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          address: string | null
          contact_person: string | null
          created_at: string | null
          email: string | null
          id: string
          name: string
          phone: string | null
          rating: number | null
          status: string | null
          tax_id: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          contact_person?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          rating?: number | null
          status?: string | null
          tax_id?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          contact_person?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          rating?: number | null
          status?: string | null
          tax_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      template_categories: {
        Row: {
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      topics: {
        Row: {
          created_at: string | null
          description: string | null
          estimated_hours: number | null
          id: string
          name: string
          order_index: number
          subject_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          estimated_hours?: number | null
          id?: string
          name: string
          order_index: number
          subject_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          estimated_hours?: number | null
          id?: string
          name?: string
          order_index?: number
          subject_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "topics_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      user_achievements: {
        Row: {
          achievement_id: string | null
          earned_at: string | null
          id: string
          user_id: string | null
        }
        Insert: {
          achievement_id?: string | null
          earned_at?: string | null
          id?: string
          user_id?: string | null
        }
        Update: {
          achievement_id?: string | null
          earned_at?: string | null
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
        ]
      }
      user_notifications: {
        Row: {
          created_at: string | null
          id: string
          message: string
          read_at: string | null
          reference_id: string | null
          title: string
          type: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          message: string
          read_at?: string | null
          reference_id?: string | null
          title: string
          type?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          message?: string
          read_at?: string | null
          reference_id?: string | null
          title?: string
          type?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_progress: {
        Row: {
          completed_at: string | null
          content_id: string | null
          id: string
          last_accessed: string | null
          notes: string | null
          progress_percentage: number | null
          subtopic_id: string | null
          time_spent_minutes: number | null
          user_id: string | null
        }
        Insert: {
          completed_at?: string | null
          content_id?: string | null
          id?: string
          last_accessed?: string | null
          notes?: string | null
          progress_percentage?: number | null
          subtopic_id?: string | null
          time_spent_minutes?: number | null
          user_id?: string | null
        }
        Update: {
          completed_at?: string | null
          content_id?: string | null
          id?: string
          last_accessed?: string | null
          notes?: string | null
          progress_percentage?: number | null
          subtopic_id?: string | null
          time_spent_minutes?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_progress_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "learning_content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_progress_subtopic_id_fkey"
            columns: ["subtopic_id"]
            isOneToOne: false
            referencedRelation: "subtopics"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      video_bookmarks: {
        Row: {
          content_id: string | null
          created_at: string | null
          id: string
          note: string | null
          timestamp_seconds: number
          user_id: string | null
        }
        Insert: {
          content_id?: string | null
          created_at?: string | null
          id?: string
          note?: string | null
          timestamp_seconds: number
          user_id?: string | null
        }
        Update: {
          content_id?: string | null
          created_at?: string | null
          id?: string
          note?: string | null
          timestamp_seconds?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "video_bookmarks_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "learning_content"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "student"
        | "teacher"
        | "admin"
        | "parent"
        | "ministry_official"
        | "curriculum_developer"
      content_type:
        | "video"
        | "document"
        | "audio"
        | "interactive"
        | "simulation"
        | "quiz"
        | "assignment"
      education_level: "primary" | "secondary" | "tertiary" | "vocational"
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
    Enums: {
      app_role: [
        "student",
        "teacher",
        "admin",
        "parent",
        "ministry_official",
        "curriculum_developer",
      ],
      content_type: [
        "video",
        "document",
        "audio",
        "interactive",
        "simulation",
        "quiz",
        "assignment",
      ],
      education_level: ["primary", "secondary", "tertiary", "vocational"],
    },
  },
} as const
