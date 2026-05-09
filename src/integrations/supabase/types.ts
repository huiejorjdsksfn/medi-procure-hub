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
      admin_inbox: {
        Row: {
          action_taken: string | null
          body: string | null
          created_at: string | null
          id: string
          priority: string | null
          record_id: string | null
          record_number: string | null
          reply_at: string | null
          reply_body: string | null
          reply_by: string | null
          sender_id: string | null
          sender_name: string | null
          status: string | null
          subject: string
          type: string
        }
        Insert: {
          action_taken?: string | null
          body?: string | null
          created_at?: string | null
          id?: string
          priority?: string | null
          record_id?: string | null
          record_number?: string | null
          reply_at?: string | null
          reply_body?: string | null
          reply_by?: string | null
          sender_id?: string | null
          sender_name?: string | null
          status?: string | null
          subject: string
          type: string
        }
        Update: {
          action_taken?: string | null
          body?: string | null
          created_at?: string | null
          id?: string
          priority?: string | null
          record_id?: string | null
          record_number?: string | null
          reply_at?: string | null
          reply_body?: string | null
          reply_by?: string | null
          sender_id?: string | null
          sender_name?: string | null
          status?: string | null
          subject?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_inbox_reply_by_fkey"
            columns: ["reply_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_inbox_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          id: string
          ip_address: string | null
          module: string
          new_values: Json | null
          old_values: Json | null
          performed_by: string | null
          record_id: string | null
          table_name: string | null
          user_id: string | null
          user_name: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          module: string
          new_values?: Json | null
          old_values?: Json | null
          performed_by?: string | null
          record_id?: string | null
          table_name?: string | null
          user_id?: string | null
          user_name?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          module?: string
          new_values?: Json | null
          old_values?: Json | null
          performed_by?: string | null
          record_id?: string | null
          table_name?: string | null
          user_id?: string | null
          user_name?: string | null
        }
        Relationships: []
      }
      backup_jobs: {
        Row: {
          completed_at: string | null
          error_msg: string | null
          file_size: number | null
          file_url: string | null
          id: string
          initiated_by: string | null
          label: string
          row_counts: Json | null
          started_at: string | null
          status: string | null
          tables_json: Json | null
        }
        Insert: {
          completed_at?: string | null
          error_msg?: string | null
          file_size?: number | null
          file_url?: string | null
          id?: string
          initiated_by?: string | null
          label: string
          row_counts?: Json | null
          started_at?: string | null
          status?: string | null
          tables_json?: Json | null
        }
        Update: {
          completed_at?: string | null
          error_msg?: string | null
          file_size?: number | null
          file_url?: string | null
          id?: string
          initiated_by?: string | null
          label?: string
          row_counts?: Json | null
          started_at?: string | null
          status?: string | null
          tables_json?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "backup_jobs_initiated_by_fkey"
            columns: ["initiated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_accounts: {
        Row: {
          account_name: string
          account_number: string
          account_type: string | null
          balance: number | null
          bank_name: string
          branch: string | null
          created_at: string | null
          currency: string | null
          gl_account: string | null
          id: string
          is_active: boolean | null
          signatories: string | null
          status: string | null
          swift_code: string | null
          updated_at: string | null
        }
        Insert: {
          account_name: string
          account_number: string
          account_type?: string | null
          balance?: number | null
          bank_name: string
          branch?: string | null
          created_at?: string | null
          currency?: string | null
          gl_account?: string | null
          id?: string
          is_active?: boolean | null
          signatories?: string | null
          status?: string | null
          swift_code?: string | null
          updated_at?: string | null
        }
        Update: {
          account_name?: string
          account_number?: string
          account_type?: string | null
          balance?: number | null
          bank_name?: string
          branch?: string | null
          created_at?: string | null
          currency?: string | null
          gl_account?: string | null
          id?: string
          is_active?: boolean | null
          signatories?: string | null
          status?: string | null
          swift_code?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      bid_evaluations: {
        Row: {
          bid_amount: number | null
          created_at: string | null
          evaluated_at: string | null
          evaluated_by: string | null
          evaluated_by_name: string | null
          financial_score: number | null
          id: string
          notes: string | null
          recommendation: string | null
          status: string | null
          supplier_id: string | null
          supplier_name: string | null
          technical_score: number | null
          tender_id: string | null
          tender_number: string | null
          total_score: number | null
        }
        Insert: {
          bid_amount?: number | null
          created_at?: string | null
          evaluated_at?: string | null
          evaluated_by?: string | null
          evaluated_by_name?: string | null
          financial_score?: number | null
          id?: string
          notes?: string | null
          recommendation?: string | null
          status?: string | null
          supplier_id?: string | null
          supplier_name?: string | null
          technical_score?: number | null
          tender_id?: string | null
          tender_number?: string | null
          total_score?: number | null
        }
        Update: {
          bid_amount?: number | null
          created_at?: string | null
          evaluated_at?: string | null
          evaluated_by?: string | null
          evaluated_by_name?: string | null
          financial_score?: number | null
          id?: string
          notes?: string | null
          recommendation?: string | null
          status?: string | null
          supplier_id?: string | null
          supplier_name?: string | null
          technical_score?: number | null
          tender_id?: string | null
          tender_number?: string | null
          total_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "bid_evaluations_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_evaluations_tender_id_fkey"
            columns: ["tender_id"]
            isOneToOne: false
            referencedRelation: "tenders"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_alerts: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          alert_type: string | null
          allocated: number | null
          budget_id: string | null
          budget_name: string | null
          created_at: string | null
          current_pct: number | null
          id: string
          override_approved: boolean | null
          override_notes: string | null
          remaining: number | null
          spent: number | null
          status: string | null
          threshold_pct: number | null
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_type?: string | null
          allocated?: number | null
          budget_id?: string | null
          budget_name?: string | null
          created_at?: string | null
          current_pct?: number | null
          id?: string
          override_approved?: boolean | null
          override_notes?: string | null
          remaining?: number | null
          spent?: number | null
          status?: string | null
          threshold_pct?: number | null
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_type?: string | null
          allocated?: number | null
          budget_id?: string | null
          budget_name?: string | null
          created_at?: string | null
          current_pct?: number | null
          id?: string
          override_approved?: boolean | null
          override_notes?: string | null
          remaining?: number | null
          spent?: number | null
          status?: string | null
          threshold_pct?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "budget_alerts_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "budgets"
            referencedColumns: ["id"]
          },
        ]
      }
      budgets: {
        Row: {
          allocated_amount: number | null
          approved_at: string | null
          approved_by: string | null
          budget_code: string
          budget_name: string
          category: string | null
          committed_amount: number | null
          consumed_amount: number | null
          created_at: string | null
          created_by: string | null
          created_by_name: string | null
          department: string | null
          department_id: string | null
          department_name: string | null
          financial_year: string
          fiscal_year: string | null
          id: string
          notes: string | null
          period_end: string | null
          period_start: string | null
          remaining_amount: number | null
          spent_amount: number | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          allocated_amount?: number | null
          approved_at?: string | null
          approved_by?: string | null
          budget_code?: string
          budget_name: string
          category?: string | null
          committed_amount?: number | null
          consumed_amount?: number | null
          created_at?: string | null
          created_by?: string | null
          created_by_name?: string | null
          department?: string | null
          department_id?: string | null
          department_name?: string | null
          financial_year?: string
          fiscal_year?: string | null
          id?: string
          notes?: string | null
          period_end?: string | null
          period_start?: string | null
          remaining_amount?: number | null
          spent_amount?: number | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          allocated_amount?: number | null
          approved_at?: string | null
          approved_by?: string | null
          budget_code?: string
          budget_name?: string
          category?: string | null
          committed_amount?: number | null
          consumed_amount?: number | null
          created_at?: string | null
          created_by?: string | null
          created_by_name?: string | null
          department?: string | null
          department_id?: string | null
          department_name?: string | null
          financial_year?: string
          fiscal_year?: string | null
          id?: string
          notes?: string | null
          period_end?: string | null
          period_start?: string | null
          remaining_amount?: number | null
          spent_amount?: number | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "budgets_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      chart_of_accounts: {
        Row: {
          account_code: string
          account_name: string
          account_type: string
          balance: number | null
          category: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          is_system: boolean | null
          parent_code: string | null
          updated_at: string | null
        }
        Insert: {
          account_code: string
          account_name: string
          account_type: string
          balance?: number | null
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_system?: boolean | null
          parent_code?: string | null
          updated_at?: string | null
        }
        Update: {
          account_code?: string
          account_name?: string
          account_type?: string
          balance?: number | null
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_system?: boolean | null
          parent_code?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      contract_milestones: {
        Row: {
          amount: number | null
          completed_at: string | null
          contract_id: string
          created_at: string | null
          description: string | null
          due_date: string | null
          id: string
          status: string | null
          title: string
        }
        Insert: {
          amount?: number | null
          completed_at?: string | null
          contract_id: string
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          status?: string | null
          title: string
        }
        Update: {
          amount?: number | null
          completed_at?: string | null
          contract_id?: string
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          status?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "contract_milestones_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      contracts: {
        Row: {
          amendments: Json | null
          auto_renew: boolean | null
          contact_email: string | null
          contact_person: string | null
          contract_number: string
          contract_value: number | null
          created_at: string | null
          created_by: string | null
          created_by_name: string | null
          currency: string | null
          delivery_terms: string | null
          description: string | null
          documents: Json | null
          end_date: string
          facility_id: string | null
          governing_law: string | null
          id: string
          milestones: Json | null
          notes: string | null
          payment_terms: string | null
          performance_bond: boolean | null
          performance_bond_amount: number | null
          performance_score: number | null
          rejection_reason: string | null
          renewal_count: number | null
          renewal_options: string | null
          renewal_terms: string | null
          signed_by: string | null
          signed_by_name: string | null
          signed_date: string | null
          start_date: string
          status: string | null
          supplier_id: string | null
          supplier_name: string | null
          termination_notice: number | null
          title: string
          total_value: number | null
          updated_at: string | null
          vat_applicable: boolean | null
        }
        Insert: {
          amendments?: Json | null
          auto_renew?: boolean | null
          contact_email?: string | null
          contact_person?: string | null
          contract_number?: string
          contract_value?: number | null
          created_at?: string | null
          created_by?: string | null
          created_by_name?: string | null
          currency?: string | null
          delivery_terms?: string | null
          description?: string | null
          documents?: Json | null
          end_date: string
          facility_id?: string | null
          governing_law?: string | null
          id?: string
          milestones?: Json | null
          notes?: string | null
          payment_terms?: string | null
          performance_bond?: boolean | null
          performance_bond_amount?: number | null
          performance_score?: number | null
          rejection_reason?: string | null
          renewal_count?: number | null
          renewal_options?: string | null
          renewal_terms?: string | null
          signed_by?: string | null
          signed_by_name?: string | null
          signed_date?: string | null
          start_date: string
          status?: string | null
          supplier_id?: string | null
          supplier_name?: string | null
          termination_notice?: number | null
          title: string
          total_value?: number | null
          updated_at?: string | null
          vat_applicable?: boolean | null
        }
        Update: {
          amendments?: Json | null
          auto_renew?: boolean | null
          contact_email?: string | null
          contact_person?: string | null
          contract_number?: string
          contract_value?: number | null
          created_at?: string | null
          created_by?: string | null
          created_by_name?: string | null
          currency?: string | null
          delivery_terms?: string | null
          description?: string | null
          documents?: Json | null
          end_date?: string
          facility_id?: string | null
          governing_law?: string | null
          id?: string
          milestones?: Json | null
          notes?: string | null
          payment_terms?: string | null
          performance_bond?: boolean | null
          performance_bond_amount?: number | null
          performance_score?: number | null
          rejection_reason?: string | null
          renewal_count?: number | null
          renewal_options?: string | null
          renewal_terms?: string | null
          signed_by?: string | null
          signed_by_name?: string | null
          signed_date?: string | null
          start_date?: string
          status?: string | null
          supplier_id?: string | null
          supplier_name?: string | null
          termination_notice?: number | null
          title?: string
          total_value?: number | null
          updated_at?: string | null
          vat_applicable?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "contracts_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      db_admin_log: {
        Row: {
          action: string
          created_at: string | null
          duration_ms: number | null
          error_msg: string | null
          id: string
          performed_by: string | null
          query_text: string | null
          row_count: number | null
          status: string | null
          table_name: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          duration_ms?: number | null
          error_msg?: string | null
          id?: string
          performed_by?: string | null
          query_text?: string | null
          row_count?: number | null
          status?: string | null
          table_name?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          duration_ms?: number | null
          error_msg?: string | null
          id?: string
          performed_by?: string | null
          query_text?: string | null
          row_count?: number | null
          status?: string | null
          table_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "db_admin_log_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      db_fix_scripts: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          id: string
          is_safe: boolean | null
          last_run_at: string | null
          last_run_by: string | null
          run_count: number | null
          sql_down: string | null
          sql_up: string
          title: string
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_safe?: boolean | null
          last_run_at?: string | null
          last_run_by?: string | null
          run_count?: number | null
          sql_down?: string | null
          sql_up: string
          title: string
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_safe?: boolean | null
          last_run_at?: string | null
          last_run_by?: string | null
          run_count?: number | null
          sql_down?: string | null
          sql_up?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "db_fix_scripts_last_run_by_fkey"
            columns: ["last_run_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          budget: number | null
          code: string | null
          created_at: string | null
          description: string | null
          head_email: string | null
          head_name: string | null
          head_phone: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          budget?: number | null
          code?: string | null
          created_at?: string | null
          description?: string | null
          head_email?: string | null
          head_name?: string | null
          head_phone?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          budget?: number | null
          code?: string | null
          created_at?: string | null
          description?: string | null
          head_email?: string | null
          head_name?: string | null
          head_phone?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      document_attachments: {
        Row: {
          file_name: string
          file_size: number | null
          file_type: string | null
          file_url: string
          id: string
          record_id: string
          table_name: string
          uploaded_at: string | null
          uploaded_by: string | null
        }
        Insert: {
          file_name: string
          file_size?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          record_id: string
          table_name: string
          uploaded_at?: string | null
          uploaded_by?: string | null
        }
        Update: {
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          record_id?: string
          table_name?: string
          uploaded_at?: string | null
          uploaded_by?: string | null
        }
        Relationships: []
      }
      documents: {
        Row: {
          category: string
          created_at: string | null
          description: string | null
          file_name: string | null
          file_size: number | null
          file_url: string | null
          id: string
          is_locked: boolean | null
          is_template: boolean | null
          mime_type: string | null
          name: string
          record_id: string | null
          record_type: string | null
          tags: string[] | null
          template_html: string | null
          updated_at: string | null
          uploaded_by: string | null
          version: string | null
        }
        Insert: {
          category?: string
          created_at?: string | null
          description?: string | null
          file_name?: string | null
          file_size?: number | null
          file_url?: string | null
          id?: string
          is_locked?: boolean | null
          is_template?: boolean | null
          mime_type?: string | null
          name: string
          record_id?: string | null
          record_type?: string | null
          tags?: string[] | null
          template_html?: string | null
          updated_at?: string | null
          uploaded_by?: string | null
          version?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string | null
          file_name?: string | null
          file_size?: number | null
          file_url?: string | null
          id?: string
          is_locked?: boolean | null
          is_template?: boolean | null
          mime_type?: string | null
          name?: string
          record_id?: string | null
          record_type?: string | null
          tags?: string[] | null
          template_html?: string | null
          updated_at?: string | null
          uploaded_by?: string | null
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      edge_function_logs: {
        Row: {
          created_at: string | null
          error_message: string | null
          execution_ms: number | null
          function_name: string
          id: string
          invoked_by: string | null
          request_body: Json | null
          response_body: Json | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          execution_ms?: number | null
          function_name: string
          id?: string
          invoked_by?: string | null
          request_body?: Json | null
          response_body?: Json | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          execution_ms?: number | null
          function_name?: string
          id?: string
          invoked_by?: string | null
          request_body?: Json | null
          response_body?: Json | null
          status?: string | null
        }
        Relationships: []
      }
      el5_sequences: {
        Row: {
          last_val: number
          seq_key: string
        }
        Insert: {
          last_val?: number
          seq_key: string
        }
        Update: {
          last_val?: number
          seq_key?: string
        }
        Relationships: []
      }
      email_attachments: {
        Row: {
          created_at: string | null
          email_id: string | null
          file_size: number | null
          file_url: string | null
          filename: string
          id: string
          mime_type: string | null
        }
        Insert: {
          created_at?: string | null
          email_id?: string | null
          file_size?: number | null
          file_url?: string | null
          filename: string
          id?: string
          mime_type?: string | null
        }
        Update: {
          created_at?: string | null
          email_id?: string | null
          file_size?: number | null
          file_url?: string | null
          filename?: string
          id?: string
          mime_type?: string | null
        }
        Relationships: []
      }
      email_drafts: {
        Row: {
          bcc: string | null
          body: string | null
          cc: string | null
          created_at: string | null
          id: string
          module: string | null
          priority: string | null
          subject: string | null
          template_id: string | null
          to_emails: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          bcc?: string | null
          body?: string | null
          cc?: string | null
          created_at?: string | null
          id?: string
          module?: string | null
          priority?: string | null
          subject?: string | null
          template_id?: string | null
          to_emails?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          bcc?: string | null
          body?: string | null
          cc?: string | null
          created_at?: string | null
          id?: string
          module?: string | null
          priority?: string | null
          subject?: string | null
          template_id?: string | null
          to_emails?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      email_inbox: {
        Row: {
          attachments: Json | null
          body_html: string | null
          body_text: string | null
          cc_address: string | null
          created_at: string | null
          folder: string | null
          from_address: string
          from_name: string | null
          id: string
          is_archived: boolean | null
          is_read: boolean | null
          is_starred: boolean | null
          message_id: string | null
          received_at: string | null
          subject: string
          to_address: string | null
          user_id: string | null
        }
        Insert: {
          attachments?: Json | null
          body_html?: string | null
          body_text?: string | null
          cc_address?: string | null
          created_at?: string | null
          folder?: string | null
          from_address: string
          from_name?: string | null
          id?: string
          is_archived?: boolean | null
          is_read?: boolean | null
          is_starred?: boolean | null
          message_id?: string | null
          received_at?: string | null
          subject: string
          to_address?: string | null
          user_id?: string | null
        }
        Update: {
          attachments?: Json | null
          body_html?: string | null
          body_text?: string | null
          cc_address?: string | null
          created_at?: string | null
          folder?: string | null
          from_address?: string
          from_name?: string | null
          id?: string
          is_archived?: boolean | null
          is_read?: boolean | null
          is_starred?: boolean | null
          message_id?: string | null
          received_at?: string | null
          subject?: string
          to_address?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      email_sent: {
        Row: {
          attachments: Json | null
          bcc_address: string | null
          body_html: string | null
          body_text: string | null
          cc_address: string | null
          created_at: string | null
          error_message: string | null
          from_address: string | null
          id: string
          sent_at: string | null
          sent_by: string | null
          sent_by_name: string | null
          sent_via: string | null
          status: string | null
          subject: string
          to_address: string
        }
        Insert: {
          attachments?: Json | null
          bcc_address?: string | null
          body_html?: string | null
          body_text?: string | null
          cc_address?: string | null
          created_at?: string | null
          error_message?: string | null
          from_address?: string | null
          id?: string
          sent_at?: string | null
          sent_by?: string | null
          sent_by_name?: string | null
          sent_via?: string | null
          status?: string | null
          subject: string
          to_address: string
        }
        Update: {
          attachments?: Json | null
          bcc_address?: string | null
          body_html?: string | null
          body_text?: string | null
          cc_address?: string | null
          created_at?: string | null
          error_message?: string | null
          from_address?: string | null
          id?: string
          sent_at?: string | null
          sent_by?: string | null
          sent_by_name?: string | null
          sent_via?: string | null
          status?: string | null
          subject?: string
          to_address?: string
        }
        Relationships: []
      }
      erp_sync_queue: {
        Row: {
          completed_at: string | null
          created_at: string | null
          direction: string | null
          entity_id: string | null
          entity_type: string | null
          erp_entity: string | null
          erp_id: string | null
          erp_system: string | null
          error_message: string | null
          gl_verified: boolean | null
          gl_verified_by: string | null
          id: string
          initiated_by: string | null
          initiated_name: string | null
          is_manual: boolean | null
          override_reason: string | null
          payload: Json | null
          processed_at: string | null
          response: Json | null
          retry_count: number | null
          scheduled_at: string | null
          source_id: string | null
          source_ref: string | null
          source_table: string | null
          started_at: string | null
          status: string | null
          sync_type: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          direction?: string | null
          entity_id?: string | null
          entity_type?: string | null
          erp_entity?: string | null
          erp_id?: string | null
          erp_system?: string | null
          error_message?: string | null
          gl_verified?: boolean | null
          gl_verified_by?: string | null
          id?: string
          initiated_by?: string | null
          initiated_name?: string | null
          is_manual?: boolean | null
          override_reason?: string | null
          payload?: Json | null
          processed_at?: string | null
          response?: Json | null
          retry_count?: number | null
          scheduled_at?: string | null
          source_id?: string | null
          source_ref?: string | null
          source_table?: string | null
          started_at?: string | null
          status?: string | null
          sync_type: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          direction?: string | null
          entity_id?: string | null
          entity_type?: string | null
          erp_entity?: string | null
          erp_id?: string | null
          erp_system?: string | null
          error_message?: string | null
          gl_verified?: boolean | null
          gl_verified_by?: string | null
          id?: string
          initiated_by?: string | null
          initiated_name?: string | null
          is_manual?: boolean | null
          override_reason?: string | null
          payload?: Json | null
          processed_at?: string | null
          response?: Json | null
          retry_count?: number | null
          scheduled_at?: string | null
          source_id?: string | null
          source_ref?: string | null
          source_table?: string | null
          started_at?: string | null
          status?: string | null
          sync_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "erp_sync_queue_gl_verified_by_fkey"
            columns: ["gl_verified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      external_connections: {
        Row: {
          config: Json | null
          connection_string: string | null
          created_at: string | null
          created_by: string | null
          database_name: string | null
          description: string | null
          dsn: string | null
          error_message: string | null
          host: string | null
          id: string
          last_sync: string | null
          metadata: Json | null
          name: string
          password: string | null
          port: number | null
          schema: string | null
          status: string | null
          sync_interval: string | null
          timeout: number | null
          type: string
          username: string | null
        }
        Insert: {
          config?: Json | null
          connection_string?: string | null
          created_at?: string | null
          created_by?: string | null
          database_name?: string | null
          description?: string | null
          dsn?: string | null
          error_message?: string | null
          host?: string | null
          id?: string
          last_sync?: string | null
          metadata?: Json | null
          name: string
          password?: string | null
          port?: number | null
          schema?: string | null
          status?: string | null
          sync_interval?: string | null
          timeout?: number | null
          type: string
          username?: string | null
        }
        Update: {
          config?: Json | null
          connection_string?: string | null
          created_at?: string | null
          created_by?: string | null
          database_name?: string | null
          description?: string | null
          dsn?: string | null
          error_message?: string | null
          host?: string | null
          id?: string
          last_sync?: string | null
          metadata?: Json | null
          name?: string
          password?: string | null
          port?: number | null
          schema?: string | null
          status?: string | null
          sync_interval?: string | null
          timeout?: number | null
          type?: string
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "external_connections_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      facilities: {
        Row: {
          accent_color: string | null
          address: string | null
          code: string
          county: string | null
          created_at: string | null
          email: string | null
          id: string
          is_active: boolean | null
          is_main: boolean | null
          level: string | null
          location: string
          logo_url: string | null
          name: string
          parent_id: string | null
          phone: string | null
          primary_color: string | null
          short_name: string
          sub_county: string | null
          type: string | null
          updated_at: string | null
        }
        Insert: {
          accent_color?: string | null
          address?: string | null
          code: string
          county?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          is_main?: boolean | null
          level?: string | null
          location: string
          logo_url?: string | null
          name: string
          parent_id?: string | null
          phone?: string | null
          primary_color?: string | null
          short_name: string
          sub_county?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Update: {
          accent_color?: string | null
          address?: string | null
          code?: string
          county?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          is_main?: boolean | null
          level?: string | null
          location?: string
          logo_url?: string | null
          name?: string
          parent_id?: string | null
          phone?: string | null
          primary_color?: string | null
          short_name?: string
          sub_county?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "facilities_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
        ]
      }
      facility_settings: {
        Row: {
          category: string | null
          created_at: string | null
          facility_id: string | null
          id: string
          key: string
          updated_at: string | null
          value: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          facility_id?: string | null
          id?: string
          key: string
          updated_at?: string | null
          value?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          facility_id?: string | null
          id?: string
          key?: string
          updated_at?: string | null
          value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "facility_settings_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
        ]
      }
      facility_transfers: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string | null
          dispatched_at: string | null
          from_facility_id: string | null
          id: string
          items: Json | null
          notes: string | null
          received_at: string | null
          requested_by: string | null
          requester_name: string | null
          status: string | null
          to_facility_id: string | null
          transfer_number: string | null
          updated_at: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          dispatched_at?: string | null
          from_facility_id?: string | null
          id?: string
          items?: Json | null
          notes?: string | null
          received_at?: string | null
          requested_by?: string | null
          requester_name?: string | null
          status?: string | null
          to_facility_id?: string | null
          transfer_number?: string | null
          updated_at?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          dispatched_at?: string | null
          from_facility_id?: string | null
          id?: string
          items?: Json | null
          notes?: string | null
          received_at?: string | null
          requested_by?: string | null
          requester_name?: string | null
          status?: string | null
          to_facility_id?: string | null
          transfer_number?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "facility_transfers_from_facility_id_fkey"
            columns: ["from_facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "facility_transfers_to_facility_id_fkey"
            columns: ["to_facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
        ]
      }
      fixed_assets: {
        Row: {
          accumulated_depreciation: number | null
          acquisition_cost: number | null
          acquisition_date: string | null
          asset_code: string | null
          asset_name: string | null
          asset_number: string
          category: string | null
          condition: string | null
          created_at: string | null
          created_by: string | null
          created_by_name: string | null
          current_value: number | null
          department: string | null
          department_id: string | null
          department_name: string | null
          depreciation_method: string | null
          depreciation_rate: number | null
          description: string
          id: string
          last_maintenance: string | null
          location: string | null
          manufacturer: string | null
          model: string | null
          net_book_value: number | null
          next_maintenance: string | null
          notes: string | null
          purchase_cost: number | null
          purchase_date: string | null
          purchase_price: number | null
          salvage_value: number | null
          serial_number: string | null
          status: string | null
          supplier_id: string | null
          updated_at: string | null
          useful_life_years: number | null
          warranty_expiry: string | null
        }
        Insert: {
          accumulated_depreciation?: number | null
          acquisition_cost?: number | null
          acquisition_date?: string | null
          asset_code?: string | null
          asset_name?: string | null
          asset_number?: string
          category?: string | null
          condition?: string | null
          created_at?: string | null
          created_by?: string | null
          created_by_name?: string | null
          current_value?: number | null
          department?: string | null
          department_id?: string | null
          department_name?: string | null
          depreciation_method?: string | null
          depreciation_rate?: number | null
          description?: string
          id?: string
          last_maintenance?: string | null
          location?: string | null
          manufacturer?: string | null
          model?: string | null
          net_book_value?: number | null
          next_maintenance?: string | null
          notes?: string | null
          purchase_cost?: number | null
          purchase_date?: string | null
          purchase_price?: number | null
          salvage_value?: number | null
          serial_number?: string | null
          status?: string | null
          supplier_id?: string | null
          updated_at?: string | null
          useful_life_years?: number | null
          warranty_expiry?: string | null
        }
        Update: {
          accumulated_depreciation?: number | null
          acquisition_cost?: number | null
          acquisition_date?: string | null
          asset_code?: string | null
          asset_name?: string | null
          asset_number?: string
          category?: string | null
          condition?: string | null
          created_at?: string | null
          created_by?: string | null
          created_by_name?: string | null
          current_value?: number | null
          department?: string | null
          department_id?: string | null
          department_name?: string | null
          depreciation_method?: string | null
          depreciation_rate?: number | null
          description?: string
          id?: string
          last_maintenance?: string | null
          location?: string | null
          manufacturer?: string | null
          model?: string | null
          net_book_value?: number | null
          next_maintenance?: string | null
          notes?: string | null
          purchase_cost?: number | null
          purchase_date?: string | null
          purchase_price?: number | null
          salvage_value?: number | null
          serial_number?: string | null
          status?: string | null
          supplier_id?: string | null
          updated_at?: string | null
          useful_life_years?: number | null
          warranty_expiry?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fixed_assets_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fixed_assets_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      gl_entries: {
        Row: {
          account_code: string
          account_name: string | null
          created_at: string | null
          credit: number | null
          debit: number | null
          description: string | null
          entry_date: string
          id: string
          period: string | null
          posted_by: string | null
          reference: string | null
          reference_id: string | null
          reference_type: string | null
        }
        Insert: {
          account_code: string
          account_name?: string | null
          created_at?: string | null
          credit?: number | null
          debit?: number | null
          description?: string | null
          entry_date?: string
          id?: string
          period?: string | null
          posted_by?: string | null
          reference?: string | null
          reference_id?: string | null
          reference_type?: string | null
        }
        Update: {
          account_code?: string
          account_name?: string | null
          created_at?: string | null
          credit?: number | null
          debit?: number | null
          description?: string | null
          entry_date?: string
          id?: string
          period?: string | null
          posted_by?: string | null
          reference?: string | null
          reference_id?: string | null
          reference_type?: string | null
        }
        Relationships: []
      }
      gl_journal: {
        Row: {
          account_name: string | null
          cost_centre: string | null
          created_at: string | null
          credit_amount: number | null
          debit_amount: number | null
          department: string | null
          description: string | null
          erp_posting_id: string | null
          gl_account: string
          id: string
          journal_number: string
          period: string | null
          posted_by: string | null
          posted_by_name: string | null
          posting_date: string | null
          project_code: string | null
          reference: string | null
          source_id: string | null
          source_type: string | null
          sync_status: string | null
        }
        Insert: {
          account_name?: string | null
          cost_centre?: string | null
          created_at?: string | null
          credit_amount?: number | null
          debit_amount?: number | null
          department?: string | null
          description?: string | null
          erp_posting_id?: string | null
          gl_account: string
          id?: string
          journal_number?: string
          period?: string | null
          posted_by?: string | null
          posted_by_name?: string | null
          posting_date?: string | null
          project_code?: string | null
          reference?: string | null
          source_id?: string | null
          source_type?: string | null
          sync_status?: string | null
        }
        Update: {
          account_name?: string | null
          cost_centre?: string | null
          created_at?: string | null
          credit_amount?: number | null
          debit_amount?: number | null
          department?: string | null
          description?: string | null
          erp_posting_id?: string | null
          gl_account?: string
          id?: string
          journal_number?: string
          period?: string | null
          posted_by?: string | null
          posted_by_name?: string | null
          posting_date?: string | null
          project_code?: string | null
          reference?: string | null
          source_id?: string | null
          source_type?: string | null
          sync_status?: string | null
        }
        Relationships: []
      }
      gl_mappings: {
        Row: {
          account_type: string | null
          cost_centre: string | null
          created_at: string | null
          created_by: string | null
          department: string | null
          erp_code: string | null
          gl_code: string
          gl_name: string
          id: string
          is_active: boolean | null
          notes: string | null
          vote_head: string | null
        }
        Insert: {
          account_type?: string | null
          cost_centre?: string | null
          created_at?: string | null
          created_by?: string | null
          department?: string | null
          erp_code?: string | null
          gl_code: string
          gl_name: string
          id?: string
          is_active?: boolean | null
          notes?: string | null
          vote_head?: string | null
        }
        Update: {
          account_type?: string | null
          cost_centre?: string | null
          created_at?: string | null
          created_by?: string | null
          department?: string | null
          erp_code?: string | null
          gl_code?: string
          gl_name?: string
          id?: string
          is_active?: boolean | null
          notes?: string | null
          vote_head?: string | null
        }
        Relationships: []
      }
      goods_received: {
        Row: {
          carrier_name: string | null
          created_at: string | null
          created_by: string | null
          created_by_name: string | null
          currency: string | null
          delivery_note: string | null
          delivery_note_no: string | null
          delivery_note_number: string | null
          department: string | null
          facility_id: string | null
          grn_date: string | null
          grn_number: string
          id: string
          inspected_at: string | null
          inspected_by: string | null
          inspected_by_name: string | null
          inspection_notes: string | null
          inspection_status: string | null
          invoice_number: string | null
          items_received: Json | null
          line_items: Json | null
          lpo_reference: string | null
          notes: string | null
          po_id: string | null
          po_number: string | null
          po_reference: string | null
          quality_checked: boolean | null
          quality_checked_by: string | null
          received_at: string | null
          received_by: string | null
          received_by_id: string | null
          received_by_name: string | null
          received_date: string | null
          remarks: string | null
          status: string | null
          storage_location: string | null
          store_location: string | null
          supplier_id: string | null
          supplier_name: string | null
          total_value: number | null
          updated_at: string | null
          vehicle_number: string | null
          waybill_number: string | null
        }
        Insert: {
          carrier_name?: string | null
          created_at?: string | null
          created_by?: string | null
          created_by_name?: string | null
          currency?: string | null
          delivery_note?: string | null
          delivery_note_no?: string | null
          delivery_note_number?: string | null
          department?: string | null
          facility_id?: string | null
          grn_date?: string | null
          grn_number?: string
          id?: string
          inspected_at?: string | null
          inspected_by?: string | null
          inspected_by_name?: string | null
          inspection_notes?: string | null
          inspection_status?: string | null
          invoice_number?: string | null
          items_received?: Json | null
          line_items?: Json | null
          lpo_reference?: string | null
          notes?: string | null
          po_id?: string | null
          po_number?: string | null
          po_reference?: string | null
          quality_checked?: boolean | null
          quality_checked_by?: string | null
          received_at?: string | null
          received_by?: string | null
          received_by_id?: string | null
          received_by_name?: string | null
          received_date?: string | null
          remarks?: string | null
          status?: string | null
          storage_location?: string | null
          store_location?: string | null
          supplier_id?: string | null
          supplier_name?: string | null
          total_value?: number | null
          updated_at?: string | null
          vehicle_number?: string | null
          waybill_number?: string | null
        }
        Update: {
          carrier_name?: string | null
          created_at?: string | null
          created_by?: string | null
          created_by_name?: string | null
          currency?: string | null
          delivery_note?: string | null
          delivery_note_no?: string | null
          delivery_note_number?: string | null
          department?: string | null
          facility_id?: string | null
          grn_date?: string | null
          grn_number?: string
          id?: string
          inspected_at?: string | null
          inspected_by?: string | null
          inspected_by_name?: string | null
          inspection_notes?: string | null
          inspection_status?: string | null
          invoice_number?: string | null
          items_received?: Json | null
          line_items?: Json | null
          lpo_reference?: string | null
          notes?: string | null
          po_id?: string | null
          po_number?: string | null
          po_reference?: string | null
          quality_checked?: boolean | null
          quality_checked_by?: string | null
          received_at?: string | null
          received_by?: string | null
          received_by_id?: string | null
          received_by_name?: string | null
          received_date?: string | null
          remarks?: string | null
          status?: string | null
          storage_location?: string | null
          store_location?: string | null
          supplier_id?: string | null
          supplier_name?: string | null
          total_value?: number | null
          updated_at?: string | null
          vehicle_number?: string | null
          waybill_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "goods_received_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goods_received_po_id_fkey"
            columns: ["po_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goods_received_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      goods_received_items: {
        Row: {
          batch_number: string | null
          condition: string | null
          created_at: string | null
          description: string | null
          expiry_date: string | null
          grn_id: string | null
          id: string
          item_id: string | null
          item_name: string
          quantity_accepted: number | null
          quantity_ordered: number | null
          quantity_received: number | null
          quantity_rejected: number | null
          rejection_reason: string | null
          total_price: number | null
          unit_of_measure: string | null
          unit_price: number | null
        }
        Insert: {
          batch_number?: string | null
          condition?: string | null
          created_at?: string | null
          description?: string | null
          expiry_date?: string | null
          grn_id?: string | null
          id?: string
          item_id?: string | null
          item_name: string
          quantity_accepted?: number | null
          quantity_ordered?: number | null
          quantity_received?: number | null
          quantity_rejected?: number | null
          rejection_reason?: string | null
          total_price?: number | null
          unit_of_measure?: string | null
          unit_price?: number | null
        }
        Update: {
          batch_number?: string | null
          condition?: string | null
          created_at?: string | null
          description?: string | null
          expiry_date?: string | null
          grn_id?: string | null
          id?: string
          item_id?: string | null
          item_name?: string
          quantity_accepted?: number | null
          quantity_ordered?: number | null
          quantity_received?: number | null
          quantity_rejected?: number | null
          rejection_reason?: string | null
          total_price?: number | null
          unit_of_measure?: string | null
          unit_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "goods_received_items_grn_id_fkey"
            columns: ["grn_id"]
            isOneToOne: false
            referencedRelation: "goods_received"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goods_received_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
        ]
      }
      grn_items: {
        Row: {
          condition: string | null
          created_at: string | null
          description: string | null
          grn_id: string | null
          id: string
          item_id: string | null
          item_name: string
          quantity_accepted: number | null
          quantity_ordered: number | null
          quantity_received: number | null
          quantity_rejected: number | null
          rejection_reason: string | null
          unit_of_measure: string | null
          unit_price: number | null
        }
        Insert: {
          condition?: string | null
          created_at?: string | null
          description?: string | null
          grn_id?: string | null
          id?: string
          item_id?: string | null
          item_name: string
          quantity_accepted?: number | null
          quantity_ordered?: number | null
          quantity_received?: number | null
          quantity_rejected?: number | null
          rejection_reason?: string | null
          unit_of_measure?: string | null
          unit_price?: number | null
        }
        Update: {
          condition?: string | null
          created_at?: string | null
          description?: string | null
          grn_id?: string | null
          id?: string
          item_id?: string | null
          item_name?: string
          quantity_accepted?: number | null
          quantity_ordered?: number | null
          quantity_received?: number | null
          quantity_rejected?: number | null
          rejection_reason?: string | null
          unit_of_measure?: string | null
          unit_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "grn_items_grn_id_fkey"
            columns: ["grn_id"]
            isOneToOne: false
            referencedRelation: "goods_received"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grn_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
        ]
      }
      inbox_items: {
        Row: {
          action_taken: string | null
          body: string | null
          created_at: string | null
          from_user_id: string | null
          id: string
          is_archived: boolean | null
          is_starred: boolean | null
          module: string | null
          notification_id: string | null
          priority: string | null
          record_id: string | null
          record_number: string | null
          record_type: string | null
          replied_at: string | null
          reply_body: string | null
          status: string | null
          subject: string
          to_user_id: string | null
          type: string
        }
        Insert: {
          action_taken?: string | null
          body?: string | null
          created_at?: string | null
          from_user_id?: string | null
          id?: string
          is_archived?: boolean | null
          is_starred?: boolean | null
          module?: string | null
          notification_id?: string | null
          priority?: string | null
          record_id?: string | null
          record_number?: string | null
          record_type?: string | null
          replied_at?: string | null
          reply_body?: string | null
          status?: string | null
          subject: string
          to_user_id?: string | null
          type: string
        }
        Update: {
          action_taken?: string | null
          body?: string | null
          created_at?: string | null
          from_user_id?: string | null
          id?: string
          is_archived?: boolean | null
          is_starred?: boolean | null
          module?: string | null
          notification_id?: string | null
          priority?: string | null
          record_id?: string | null
          record_number?: string | null
          record_type?: string | null
          replied_at?: string | null
          reply_body?: string | null
          status?: string | null
          subject?: string
          to_user_id?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "inbox_items_from_user_id_fkey"
            columns: ["from_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inbox_items_to_user_id_fkey"
            columns: ["to_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      inspections: {
        Row: {
          batch_number: string | null
          created_at: string | null
          created_by: string | null
          created_by_name: string | null
          expiry_date: string | null
          grn_id: string | null
          grn_reference: string | null
          id: string
          inspection_date: string | null
          inspection_number: string
          inspector_id: string | null
          inspector_name: string | null
          item_id: string | null
          item_name: string | null
          notes: string | null
          po_id: string | null
          po_reference: string | null
          quantity_accepted: number | null
          quantity_inspected: number | null
          quantity_rejected: number | null
          rejection_reason: string | null
          result: string | null
          result_notes: string | null
          supplier_id: string | null
          supplier_name: string | null
          updated_at: string | null
        }
        Insert: {
          batch_number?: string | null
          created_at?: string | null
          created_by?: string | null
          created_by_name?: string | null
          expiry_date?: string | null
          grn_id?: string | null
          grn_reference?: string | null
          id?: string
          inspection_date?: string | null
          inspection_number?: string
          inspector_id?: string | null
          inspector_name?: string | null
          item_id?: string | null
          item_name?: string | null
          notes?: string | null
          po_id?: string | null
          po_reference?: string | null
          quantity_accepted?: number | null
          quantity_inspected?: number | null
          quantity_rejected?: number | null
          rejection_reason?: string | null
          result?: string | null
          result_notes?: string | null
          supplier_id?: string | null
          supplier_name?: string | null
          updated_at?: string | null
        }
        Update: {
          batch_number?: string | null
          created_at?: string | null
          created_by?: string | null
          created_by_name?: string | null
          expiry_date?: string | null
          grn_id?: string | null
          grn_reference?: string | null
          id?: string
          inspection_date?: string | null
          inspection_number?: string
          inspector_id?: string | null
          inspector_name?: string | null
          item_id?: string | null
          item_name?: string | null
          notes?: string | null
          po_id?: string | null
          po_reference?: string | null
          quantity_accepted?: number | null
          quantity_inspected?: number | null
          quantity_rejected?: number | null
          rejection_reason?: string | null
          result?: string | null
          result_notes?: string | null
          supplier_id?: string | null
          supplier_name?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inspections_grn_id_fkey"
            columns: ["grn_id"]
            isOneToOne: false
            referencedRelation: "goods_received"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspections_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspections_po_id_fkey"
            columns: ["po_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspections_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_matching: {
        Row: {
          amount: number | null
          approved_at: string | null
          approved_by: string | null
          approved_by_name: string | null
          cost_centre: string | null
          created_at: string | null
          created_by: string | null
          created_by_name: string | null
          gl_account: string | null
          grn_amount: number | null
          grn_id: string | null
          grn_number: string | null
          id: string
          invoice_amount: number | null
          invoice_date: string | null
          invoice_number: string
          match_number: string
          match_status: string | null
          match_type: string | null
          matched_at: string | null
          matched_by: string | null
          notes: string | null
          po_amount: number | null
          po_id: string | null
          po_number: string | null
          status: string | null
          supplier_id: string | null
          supplier_name: string | null
          updated_at: string | null
          variance_amount: number | null
          variance_reason: string | null
        }
        Insert: {
          amount?: number | null
          approved_at?: string | null
          approved_by?: string | null
          approved_by_name?: string | null
          cost_centre?: string | null
          created_at?: string | null
          created_by?: string | null
          created_by_name?: string | null
          gl_account?: string | null
          grn_amount?: number | null
          grn_id?: string | null
          grn_number?: string | null
          id?: string
          invoice_amount?: number | null
          invoice_date?: string | null
          invoice_number: string
          match_number?: string
          match_status?: string | null
          match_type?: string | null
          matched_at?: string | null
          matched_by?: string | null
          notes?: string | null
          po_amount?: number | null
          po_id?: string | null
          po_number?: string | null
          status?: string | null
          supplier_id?: string | null
          supplier_name?: string | null
          updated_at?: string | null
          variance_amount?: number | null
          variance_reason?: string | null
        }
        Update: {
          amount?: number | null
          approved_at?: string | null
          approved_by?: string | null
          approved_by_name?: string | null
          cost_centre?: string | null
          created_at?: string | null
          created_by?: string | null
          created_by_name?: string | null
          gl_account?: string | null
          grn_amount?: number | null
          grn_id?: string | null
          grn_number?: string | null
          id?: string
          invoice_amount?: number | null
          invoice_date?: string | null
          invoice_number?: string
          match_number?: string
          match_status?: string | null
          match_type?: string | null
          matched_at?: string | null
          matched_by?: string | null
          notes?: string | null
          po_amount?: number | null
          po_id?: string | null
          po_number?: string | null
          status?: string | null
          supplier_id?: string | null
          supplier_name?: string | null
          updated_at?: string | null
          variance_amount?: number | null
          variance_reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoice_matching_grn_id_fkey"
            columns: ["grn_id"]
            isOneToOne: false
            referencedRelation: "goods_received"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_matching_matched_by_fkey"
            columns: ["matched_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_matching_po_id_fkey"
            columns: ["po_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_matching_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_matching_queue: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          approved_by_name: string | null
          cost_centre: string | null
          created_at: string | null
          created_by: string | null
          gl_code: string | null
          grn_amount: number | null
          grn_id: string | null
          grn_number: string | null
          id: string
          invoice_amount: number | null
          invoice_date: string | null
          invoice_number: string | null
          match_status: string | null
          match_type: string | null
          matched_at: string | null
          matched_by: string | null
          matched_by_name: string | null
          notes: string | null
          po_amount: number | null
          po_id: string | null
          po_number: string | null
          rejection_reason: string | null
          supplier_id: string | null
          supplier_name: string | null
          updated_at: string | null
          variance: number | null
          variance_pct: number | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          approved_by_name?: string | null
          cost_centre?: string | null
          created_at?: string | null
          created_by?: string | null
          gl_code?: string | null
          grn_amount?: number | null
          grn_id?: string | null
          grn_number?: string | null
          id?: string
          invoice_amount?: number | null
          invoice_date?: string | null
          invoice_number?: string | null
          match_status?: string | null
          match_type?: string | null
          matched_at?: string | null
          matched_by?: string | null
          matched_by_name?: string | null
          notes?: string | null
          po_amount?: number | null
          po_id?: string | null
          po_number?: string | null
          rejection_reason?: string | null
          supplier_id?: string | null
          supplier_name?: string | null
          updated_at?: string | null
          variance?: number | null
          variance_pct?: number | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          approved_by_name?: string | null
          cost_centre?: string | null
          created_at?: string | null
          created_by?: string | null
          gl_code?: string | null
          grn_amount?: number | null
          grn_id?: string | null
          grn_number?: string | null
          id?: string
          invoice_amount?: number | null
          invoice_date?: string | null
          invoice_number?: string | null
          match_status?: string | null
          match_type?: string | null
          matched_at?: string | null
          matched_by?: string | null
          matched_by_name?: string | null
          notes?: string | null
          po_amount?: number | null
          po_id?: string | null
          po_number?: string | null
          rejection_reason?: string | null
          supplier_id?: string | null
          supplier_name?: string | null
          updated_at?: string | null
          variance?: number | null
          variance_pct?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "invoice_matching_queue_grn_id_fkey"
            columns: ["grn_id"]
            isOneToOne: false
            referencedRelation: "goods_received"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_matching_queue_po_id_fkey"
            columns: ["po_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_matching_queue_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      ip_access_log: {
        Row: {
          allowed: boolean
          city: string | null
          country: string | null
          created_at: string | null
          id: string
          ip_address: string
          network: string | null
          path: string | null
          reason: string | null
          revoked_at: string | null
          revoked_by: string | null
          session_id: string | null
          user_agent: string | null
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          allowed: boolean
          city?: string | null
          country?: string | null
          created_at?: string | null
          id?: string
          ip_address: string
          network?: string | null
          path?: string | null
          reason?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          allowed?: boolean
          city?: string | null
          country?: string | null
          created_at?: string | null
          id?: string
          ip_address?: string
          network?: string | null
          path?: string | null
          reason?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ip_access_log_revoked_by_fkey"
            columns: ["revoked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ip_access_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
          category: string | null
          category_id: string | null
          category_name: string | null
          cost_price: number | null
          created_at: string | null
          created_by: string | null
          current_quantity: number | null
          department_id: string | null
          department_name: string | null
          description: string | null
          expiry_date: string | null
          facility_id: string | null
          id: string
          is_active: boolean | null
          item_code: string | null
          item_type: string | null
          location: string | null
          manufacturer: string | null
          minimum_stock: number | null
          name: string
          notes: string | null
          quantity_in_stock: number | null
          quantity_reserved: number | null
          reorder_level: number | null
          sku: string | null
          status: string | null
          supplier_id: string | null
          supplier_name: string | null
          unit: string | null
          unit_of_measure: string | null
          unit_price: number | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          added_by?: string | null
          barcode?: string | null
          batch_number?: string | null
          category?: string | null
          category_id?: string | null
          category_name?: string | null
          cost_price?: number | null
          created_at?: string | null
          created_by?: string | null
          current_quantity?: number | null
          department_id?: string | null
          department_name?: string | null
          description?: string | null
          expiry_date?: string | null
          facility_id?: string | null
          id?: string
          is_active?: boolean | null
          item_code?: string | null
          item_type?: string | null
          location?: string | null
          manufacturer?: string | null
          minimum_stock?: number | null
          name: string
          notes?: string | null
          quantity_in_stock?: number | null
          quantity_reserved?: number | null
          reorder_level?: number | null
          sku?: string | null
          status?: string | null
          supplier_id?: string | null
          supplier_name?: string | null
          unit?: string | null
          unit_of_measure?: string | null
          unit_price?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          added_by?: string | null
          barcode?: string | null
          batch_number?: string | null
          category?: string | null
          category_id?: string | null
          category_name?: string | null
          cost_price?: number | null
          created_at?: string | null
          created_by?: string | null
          current_quantity?: number | null
          department_id?: string | null
          department_name?: string | null
          description?: string | null
          expiry_date?: string | null
          facility_id?: string | null
          id?: string
          is_active?: boolean | null
          item_code?: string | null
          item_type?: string | null
          location?: string | null
          manufacturer?: string | null
          minimum_stock?: number | null
          name?: string
          notes?: string | null
          quantity_in_stock?: number | null
          quantity_reserved?: number | null
          reorder_level?: number | null
          sku?: string | null
          status?: string | null
          supplier_id?: string | null
          supplier_name?: string | null
          unit?: string | null
          unit_of_measure?: string | null
          unit_price?: number | null
          updated_at?: string | null
          updated_by?: string | null
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
            foreignKeyName: "items_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
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
      journal_vouchers: {
        Row: {
          approved_by: string | null
          approved_by_name: string | null
          created_at: string | null
          created_by: string | null
          created_by_name: string | null
          entries: Json | null
          id: string
          is_balanced: boolean | null
          journal_date: string
          journal_number: string
          narration: string | null
          period: string | null
          reference: string | null
          status: string | null
          total_credit: number | null
          total_debit: number | null
          updated_at: string | null
        }
        Insert: {
          approved_by?: string | null
          approved_by_name?: string | null
          created_at?: string | null
          created_by?: string | null
          created_by_name?: string | null
          entries?: Json | null
          id?: string
          is_balanced?: boolean | null
          journal_date?: string
          journal_number?: string
          narration?: string | null
          period?: string | null
          reference?: string | null
          status?: string | null
          total_credit?: number | null
          total_debit?: number | null
          updated_at?: string | null
        }
        Update: {
          approved_by?: string | null
          approved_by_name?: string | null
          created_at?: string | null
          created_by?: string | null
          created_by_name?: string | null
          entries?: Json | null
          id?: string
          is_balanced?: boolean | null
          journal_date?: string
          journal_number?: string
          narration?: string | null
          period?: string | null
          reference?: string | null
          status?: string | null
          total_credit?: number | null
          total_debit?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      module_settings: {
        Row: {
          id: string
          is_enabled: boolean | null
          label: string
          module_id: string
          path: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          id?: string
          is_enabled?: boolean | null
          label: string
          module_id: string
          path?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          id?: string
          is_enabled?: boolean | null
          label?: string
          module_id?: string
          path?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      network_whitelist: {
        Row: {
          active: boolean | null
          added_by: string | null
          cidr: string
          created_at: string | null
          id: string
          label: string
          notes: string | null
          type: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          active?: boolean | null
          added_by?: string | null
          cidr: string
          created_at?: string | null
          id?: string
          label: string
          notes?: string | null
          type?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          active?: boolean | null
          added_by?: string | null
          cidr?: string
          created_at?: string | null
          id?: string
          label?: string
          notes?: string | null
          type?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "network_whitelist_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "network_whitelist_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      non_conformance: {
        Row: {
          corrective_action: string | null
          cost_impact: number | null
          created_at: string | null
          created_by_name: string | null
          department: string | null
          description: string | null
          grn_reference: string | null
          id: string
          inspection_id: string | null
          issue_description: string
          item_id: string | null
          item_name: string | null
          ncr_number: string
          photos: Json | null
          preventive_action: string | null
          raised_by: string | null
          raised_by_name: string | null
          resolved_at: string | null
          resolved_by: string | null
          resolved_by_name: string | null
          root_cause: string | null
          severity: string | null
          source: string | null
          status: string | null
          supplier_id: string | null
          supplier_name: string | null
          target_date: string | null
          updated_at: string | null
        }
        Insert: {
          corrective_action?: string | null
          cost_impact?: number | null
          created_at?: string | null
          created_by_name?: string | null
          department?: string | null
          description?: string | null
          grn_reference?: string | null
          id?: string
          inspection_id?: string | null
          issue_description?: string
          item_id?: string | null
          item_name?: string | null
          ncr_number?: string
          photos?: Json | null
          preventive_action?: string | null
          raised_by?: string | null
          raised_by_name?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          resolved_by_name?: string | null
          root_cause?: string | null
          severity?: string | null
          source?: string | null
          status?: string | null
          supplier_id?: string | null
          supplier_name?: string | null
          target_date?: string | null
          updated_at?: string | null
        }
        Update: {
          corrective_action?: string | null
          cost_impact?: number | null
          created_at?: string | null
          created_by_name?: string | null
          department?: string | null
          description?: string | null
          grn_reference?: string | null
          id?: string
          inspection_id?: string | null
          issue_description?: string
          item_id?: string | null
          item_name?: string | null
          ncr_number?: string
          photos?: Json | null
          preventive_action?: string | null
          raised_by?: string | null
          raised_by_name?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          resolved_by_name?: string | null
          root_cause?: string | null
          severity?: string | null
          source?: string | null
          status?: string | null
          supplier_id?: string | null
          supplier_name?: string | null
          target_date?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "non_conformance_inspection_id_fkey"
            columns: ["inspection_id"]
            isOneToOne: false
            referencedRelation: "inspections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "non_conformance_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "non_conformance_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      non_conformances: {
        Row: {
          attachments: Json | null
          category: string | null
          corrective_action: string | null
          created_at: string | null
          department: string | null
          department_id: string | null
          description: string | null
          detected_at: string | null
          detected_by: string | null
          detected_by_name: string | null
          due_date: string | null
          facility_id: string | null
          id: string
          nc_number: string
          notes: string | null
          preventive_action: string | null
          related_item_id: string | null
          related_item_name: string | null
          related_supplier_id: string | null
          related_supplier_name: string | null
          resolved_at: string | null
          resolved_by: string | null
          resolved_by_name: string | null
          root_cause: string | null
          severity: string | null
          source: string | null
          status: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          attachments?: Json | null
          category?: string | null
          corrective_action?: string | null
          created_at?: string | null
          department?: string | null
          department_id?: string | null
          description?: string | null
          detected_at?: string | null
          detected_by?: string | null
          detected_by_name?: string | null
          due_date?: string | null
          facility_id?: string | null
          id?: string
          nc_number: string
          notes?: string | null
          preventive_action?: string | null
          related_item_id?: string | null
          related_item_name?: string | null
          related_supplier_id?: string | null
          related_supplier_name?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          resolved_by_name?: string | null
          root_cause?: string | null
          severity?: string | null
          source?: string | null
          status?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          attachments?: Json | null
          category?: string | null
          corrective_action?: string | null
          created_at?: string | null
          department?: string | null
          department_id?: string | null
          description?: string | null
          detected_at?: string | null
          detected_by?: string | null
          detected_by_name?: string | null
          due_date?: string | null
          facility_id?: string | null
          id?: string
          nc_number?: string
          notes?: string | null
          preventive_action?: string | null
          related_item_id?: string | null
          related_item_name?: string | null
          related_supplier_id?: string | null
          related_supplier_name?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          resolved_by_name?: string | null
          root_cause?: string | null
          severity?: string | null
          source?: string | null
          status?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "non_conformances_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "non_conformances_related_item_id_fkey"
            columns: ["related_item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "non_conformances_related_supplier_id_fkey"
            columns: ["related_supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_recipients: {
        Row: {
          created_at: string | null
          email_sent: boolean | null
          email_sent_at: string | null
          id: string
          notification_id: string | null
          read_at: string | null
          recipient_email: string | null
          recipient_id: string | null
          recipient_name: string | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          email_sent?: boolean | null
          email_sent_at?: string | null
          id?: string
          notification_id?: string | null
          read_at?: string | null
          recipient_email?: string | null
          recipient_id?: string | null
          recipient_name?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          email_sent?: boolean | null
          email_sent_at?: string | null
          id?: string
          notification_id?: string | null
          read_at?: string | null
          recipient_email?: string | null
          recipient_id?: string | null
          recipient_name?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_recipients_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_recipients_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          action_label: string | null
          action_url: string | null
          bcc: string | null
          body: string
          category: string | null
          cc: string | null
          created_at: string | null
          dismissed_at: string | null
          expires_at: string | null
          icon: string | null
          id: string
          inbox_id: string | null
          is_read: boolean | null
          message: string | null
          metadata: Json | null
          module: string
          priority: string | null
          record_id: string | null
          record_number: string | null
          record_type: string | null
          send_email: boolean | null
          sender_id: string | null
          sent_at: string | null
          smtp_used: boolean | null
          status: string | null
          subject: string
          title: string | null
          type: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          action_label?: string | null
          action_url?: string | null
          bcc?: string | null
          body: string
          category?: string | null
          cc?: string | null
          created_at?: string | null
          dismissed_at?: string | null
          expires_at?: string | null
          icon?: string | null
          id?: string
          inbox_id?: string | null
          is_read?: boolean | null
          message?: string | null
          metadata?: Json | null
          module?: string
          priority?: string | null
          record_id?: string | null
          record_number?: string | null
          record_type?: string | null
          send_email?: boolean | null
          sender_id?: string | null
          sent_at?: string | null
          smtp_used?: boolean | null
          status?: string | null
          subject: string
          title?: string | null
          type?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          action_label?: string | null
          action_url?: string | null
          bcc?: string | null
          body?: string
          category?: string | null
          cc?: string | null
          created_at?: string | null
          dismissed_at?: string | null
          expires_at?: string | null
          icon?: string | null
          id?: string
          inbox_id?: string | null
          is_read?: boolean | null
          message?: string | null
          metadata?: Json | null
          module?: string
          priority?: string | null
          record_id?: string | null
          record_number?: string | null
          record_type?: string | null
          send_email?: boolean | null
          sender_id?: string | null
          sent_at?: string | null
          smtp_used?: boolean | null
          status?: string | null
          subject?: string
          title?: string | null
          type?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      odbc_connections: {
        Row: {
          created_at: string | null
          created_by: string | null
          database: string | null
          description: string | null
          driver: string
          id: string
          last_sync: string | null
          name: string
          port: number | null
          server: string | null
          status: string | null
          sync_count: number | null
          tables_synced: Json | null
          username: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          database?: string | null
          description?: string | null
          driver: string
          id?: string
          last_sync?: string | null
          name: string
          port?: number | null
          server?: string | null
          status?: string | null
          sync_count?: number | null
          tables_synced?: Json | null
          username?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          database?: string | null
          description?: string | null
          driver?: string
          id?: string
          last_sync?: string | null
          name?: string
          port?: number | null
          server?: string | null
          status?: string | null
          sync_count?: number | null
          tables_synced?: Json | null
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "odbc_connections_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      password_reset_log: {
        Row: {
          completed_at: string | null
          email: string
          id: string
          ip_address: string | null
          requested_at: string | null
          status: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          completed_at?: string | null
          email: string
          id?: string
          ip_address?: string | null
          requested_at?: string | null
          status?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          completed_at?: string | null
          email?: string
          id?: string
          ip_address?: string | null
          requested_at?: string | null
          status?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "password_reset_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_proposals: {
        Row: {
          account_number: string | null
          approved_at: string | null
          approved_by: string | null
          approved_by_name: string | null
          bank_account_id: string | null
          bank_name: string | null
          created_at: string | null
          created_by: string | null
          created_by_name: string | null
          currency: string | null
          export_format: string | null
          export_url: string | null
          exported_at: string | null
          id: string
          item_count: number | null
          line_items: Json | null
          notes: string | null
          paid_at: string | null
          payment_date: string | null
          proposal_date: string | null
          proposal_number: string | null
          status: string | null
          total_amount: number | null
          updated_at: string | null
        }
        Insert: {
          account_number?: string | null
          approved_at?: string | null
          approved_by?: string | null
          approved_by_name?: string | null
          bank_account_id?: string | null
          bank_name?: string | null
          created_at?: string | null
          created_by?: string | null
          created_by_name?: string | null
          currency?: string | null
          export_format?: string | null
          export_url?: string | null
          exported_at?: string | null
          id?: string
          item_count?: number | null
          line_items?: Json | null
          notes?: string | null
          paid_at?: string | null
          payment_date?: string | null
          proposal_date?: string | null
          proposal_number?: string | null
          status?: string | null
          total_amount?: number | null
          updated_at?: string | null
        }
        Update: {
          account_number?: string | null
          approved_at?: string | null
          approved_by?: string | null
          approved_by_name?: string | null
          bank_account_id?: string | null
          bank_name?: string | null
          created_at?: string | null
          created_by?: string | null
          created_by_name?: string | null
          currency?: string | null
          export_format?: string | null
          export_url?: string | null
          exported_at?: string | null
          id?: string
          item_count?: number | null
          line_items?: Json | null
          notes?: string | null
          paid_at?: string | null
          payment_date?: string | null
          proposal_date?: string | null
          proposal_number?: string | null
          status?: string | null
          total_amount?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_proposals_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_vouchers: {
        Row: {
          account_number: string | null
          amount: number
          approved_at: string | null
          approved_by: string | null
          approved_by_name: string | null
          bank_name: string | null
          budget_id: string | null
          budget_line: string | null
          cheque_number: string | null
          cost_centre: string | null
          created_at: string | null
          created_by: string | null
          created_by_name: string | null
          description: string | null
          due_date: string | null
          expense_account: string | null
          facility_id: string | null
          fund_code: string | null
          grn_number: string | null
          id: string
          line_items: Json | null
          net_amount: number | null
          paid_at: string | null
          payee_name: string
          payee_pin: string | null
          payee_type: string | null
          payment_method: string | null
          payment_mode: string | null
          period: string | null
          reference: string | null
          rejection_reason: string | null
          status: string | null
          subtotal: number | null
          supplier_id: string | null
          tax_amount: number | null
          total_amount: number | null
          updated_at: string | null
          vote_head: string | null
          voucher_date: string
          voucher_number: string
          withholding_tax: number | null
        }
        Insert: {
          account_number?: string | null
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          approved_by_name?: string | null
          bank_name?: string | null
          budget_id?: string | null
          budget_line?: string | null
          cheque_number?: string | null
          cost_centre?: string | null
          created_at?: string | null
          created_by?: string | null
          created_by_name?: string | null
          description?: string | null
          due_date?: string | null
          expense_account?: string | null
          facility_id?: string | null
          fund_code?: string | null
          grn_number?: string | null
          id?: string
          line_items?: Json | null
          net_amount?: number | null
          paid_at?: string | null
          payee_name: string
          payee_pin?: string | null
          payee_type?: string | null
          payment_method?: string | null
          payment_mode?: string | null
          period?: string | null
          reference?: string | null
          rejection_reason?: string | null
          status?: string | null
          subtotal?: number | null
          supplier_id?: string | null
          tax_amount?: number | null
          total_amount?: number | null
          updated_at?: string | null
          vote_head?: string | null
          voucher_date?: string
          voucher_number?: string
          withholding_tax?: number | null
        }
        Update: {
          account_number?: string | null
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          approved_by_name?: string | null
          bank_name?: string | null
          budget_id?: string | null
          budget_line?: string | null
          cheque_number?: string | null
          cost_centre?: string | null
          created_at?: string | null
          created_by?: string | null
          created_by_name?: string | null
          description?: string | null
          due_date?: string | null
          expense_account?: string | null
          facility_id?: string | null
          fund_code?: string | null
          grn_number?: string | null
          id?: string
          line_items?: Json | null
          net_amount?: number | null
          paid_at?: string | null
          payee_name?: string
          payee_pin?: string | null
          payee_type?: string | null
          payment_method?: string | null
          payment_mode?: string | null
          period?: string | null
          reference?: string | null
          rejection_reason?: string | null
          status?: string | null
          subtotal?: number | null
          supplier_id?: string | null
          tax_amount?: number | null
          total_amount?: number | null
          updated_at?: string | null
          vote_head?: string | null
          voucher_date?: string
          voucher_number?: string
          withholding_tax?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_vouchers_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "budgets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_vouchers_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_vouchers_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      permissions: {
        Row: {
          action: string
          created_at: string | null
          id: string
          resource: string
          role_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          resource: string
          role_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          resource?: string
          role_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      print_jobs: {
        Row: {
          copies: number | null
          created_at: string | null
          facility_id: string | null
          id: string
          job_type: string
          metadata: Json | null
          paper_size: string | null
          printed_at: string | null
          printed_by: string | null
          printed_by_name: string | null
          reference_id: string | null
          reference_number: string | null
          status: string | null
          template: string | null
        }
        Insert: {
          copies?: number | null
          created_at?: string | null
          facility_id?: string | null
          id?: string
          job_type: string
          metadata?: Json | null
          paper_size?: string | null
          printed_at?: string | null
          printed_by?: string | null
          printed_by_name?: string | null
          reference_id?: string | null
          reference_number?: string | null
          status?: string | null
          template?: string | null
        }
        Update: {
          copies?: number | null
          created_at?: string | null
          facility_id?: string | null
          id?: string
          job_type?: string
          metadata?: Json | null
          paper_size?: string | null
          printed_at?: string | null
          printed_by?: string | null
          printed_by_name?: string | null
          reference_id?: string | null
          reference_number?: string | null
          status?: string | null
          template?: string | null
        }
        Relationships: []
      }
      procurement_plans: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          approved_by_name: string | null
          budget_line: string | null
          category: string | null
          created_at: string | null
          created_by: string | null
          created_by_name: string | null
          department_id: string | null
          department_name: string | null
          description: string | null
          end_date: string | null
          estimated_budget: number | null
          estimated_total_cost: number | null
          estimated_unit_cost: number | null
          financial_year: string | null
          id: string
          item_description: string
          item_id: string | null
          item_name: string | null
          justification: string | null
          notes: string | null
          plan_number: string
          planned_quarter: string | null
          priority: string | null
          procurement_method: string | null
          quantity: number | null
          rejection_reason: string | null
          start_date: string | null
          status: string | null
          title: string | null
          unit_of_measure: string | null
          updated_at: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          approved_by_name?: string | null
          budget_line?: string | null
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          created_by_name?: string | null
          department_id?: string | null
          department_name?: string | null
          description?: string | null
          end_date?: string | null
          estimated_budget?: number | null
          estimated_total_cost?: number | null
          estimated_unit_cost?: number | null
          financial_year?: string | null
          id?: string
          item_description?: string
          item_id?: string | null
          item_name?: string | null
          justification?: string | null
          notes?: string | null
          plan_number?: string
          planned_quarter?: string | null
          priority?: string | null
          procurement_method?: string | null
          quantity?: number | null
          rejection_reason?: string | null
          start_date?: string | null
          status?: string | null
          title?: string | null
          unit_of_measure?: string | null
          updated_at?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          approved_by_name?: string | null
          budget_line?: string | null
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          created_by_name?: string | null
          department_id?: string | null
          department_name?: string | null
          description?: string | null
          end_date?: string | null
          estimated_budget?: number | null
          estimated_total_cost?: number | null
          estimated_unit_cost?: number | null
          financial_year?: string | null
          id?: string
          item_description?: string
          item_id?: string | null
          item_name?: string | null
          justification?: string | null
          notes?: string | null
          plan_number?: string
          planned_quarter?: string | null
          priority?: string | null
          procurement_method?: string | null
          quantity?: number | null
          rejection_reason?: string | null
          start_date?: string | null
          status?: string | null
          title?: string | null
          unit_of_measure?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "procurement_plans_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "procurement_plans_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: unknown[] | null
          created_at: string | null
          department: string | null
          department_id: string | null
          email: string | null
          failed_logins: number | null
          full_name: string
          id: string
          is_active: boolean | null
          is_locked: boolean | null
          last_ip: string | null
          last_login: string | null
          last_seen: string | null
          phone: string | null
          phone_number: string | null
          preferred_language: string | null
          role: string | null
          sms_enabled: boolean | null
          updated_at: string | null
          username: string | null
        }
        Insert: {
          avatar_url?: unknown[] | null
          created_at?: string | null
          department?: string | null
          department_id?: string | null
          email?: string | null
          failed_logins?: number | null
          full_name: string
          id: string
          is_active?: boolean | null
          is_locked?: boolean | null
          last_ip?: string | null
          last_login?: string | null
          last_seen?: string | null
          phone?: string | null
          phone_number?: string | null
          preferred_language?: string | null
          role?: string | null
          sms_enabled?: boolean | null
          updated_at?: string | null
          username?: string | null
        }
        Update: {
          avatar_url?: unknown[] | null
          created_at?: string | null
          department?: string | null
          department_id?: string | null
          email?: string | null
          failed_logins?: number | null
          full_name?: string
          id?: string
          is_active?: boolean | null
          is_locked?: boolean | null
          last_ip?: string | null
          last_login?: string | null
          last_seen?: string | null
          phone?: string | null
          phone_number?: string | null
          preferred_language?: string | null
          role?: string | null
          sms_enabled?: boolean | null
          updated_at?: string | null
          username?: string | null
        }
        Relationships: []
      }
      purchase_order_items: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          item_id: string | null
          item_name: string
          notes: string | null
          po_id: string | null
          quantity: number
          total_price: number | null
          unit_of_measure: string | null
          unit_price: number | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          item_id?: string | null
          item_name: string
          notes?: string | null
          po_id?: string | null
          quantity?: number
          total_price?: number | null
          unit_of_measure?: string | null
          unit_price?: number | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          item_id?: string | null
          item_name?: string
          notes?: string | null
          po_id?: string | null
          quantity?: number
          total_price?: number | null
          unit_of_measure?: string | null
          unit_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_items_po_id_fkey"
            columns: ["po_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          approved_by_name: string | null
          approved_date: string | null
          budget_id: string | null
          created_at: string | null
          created_by: string | null
          created_by_name: string | null
          currency: string | null
          delivery_address: string | null
          delivery_date: string | null
          delivery_terms: string | null
          department: string | null
          discount_amount: number | null
          expected_delivery: string | null
          facility_id: string | null
          id: string
          include_vat: boolean | null
          is_urgent: boolean | null
          line_items: Json | null
          lpo_number: string | null
          notes: string | null
          payment_terms: string | null
          po_date: string | null
          po_number: string
          rejection_reason: string | null
          requisition_id: string | null
          status: string | null
          subtotal: number | null
          supplier_address: string | null
          supplier_email: string | null
          supplier_id: string | null
          supplier_name: string | null
          supplier_phone: string | null
          supplier_pin: string | null
          terms: string | null
          terms_conditions: string | null
          total_amount: number | null
          updated_at: string | null
          vat_amount: number | null
          vat_rate: string | null
          warranty_period: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          approved_by_name?: string | null
          approved_date?: string | null
          budget_id?: string | null
          created_at?: string | null
          created_by?: string | null
          created_by_name?: string | null
          currency?: string | null
          delivery_address?: string | null
          delivery_date?: string | null
          delivery_terms?: string | null
          department?: string | null
          discount_amount?: number | null
          expected_delivery?: string | null
          facility_id?: string | null
          id?: string
          include_vat?: boolean | null
          is_urgent?: boolean | null
          line_items?: Json | null
          lpo_number?: string | null
          notes?: string | null
          payment_terms?: string | null
          po_date?: string | null
          po_number?: string
          rejection_reason?: string | null
          requisition_id?: string | null
          status?: string | null
          subtotal?: number | null
          supplier_address?: string | null
          supplier_email?: string | null
          supplier_id?: string | null
          supplier_name?: string | null
          supplier_phone?: string | null
          supplier_pin?: string | null
          terms?: string | null
          terms_conditions?: string | null
          total_amount?: number | null
          updated_at?: string | null
          vat_amount?: number | null
          vat_rate?: string | null
          warranty_period?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          approved_by_name?: string | null
          approved_date?: string | null
          budget_id?: string | null
          created_at?: string | null
          created_by?: string | null
          created_by_name?: string | null
          currency?: string | null
          delivery_address?: string | null
          delivery_date?: string | null
          delivery_terms?: string | null
          department?: string | null
          discount_amount?: number | null
          expected_delivery?: string | null
          facility_id?: string | null
          id?: string
          include_vat?: boolean | null
          is_urgent?: boolean | null
          line_items?: Json | null
          lpo_number?: string | null
          notes?: string | null
          payment_terms?: string | null
          po_date?: string | null
          po_number?: string
          rejection_reason?: string | null
          requisition_id?: string | null
          status?: string | null
          subtotal?: number | null
          supplier_address?: string | null
          supplier_email?: string | null
          supplier_id?: string | null
          supplier_name?: string | null
          supplier_phone?: string | null
          supplier_pin?: string | null
          terms?: string | null
          terms_conditions?: string | null
          total_amount?: number | null
          updated_at?: string | null
          vat_amount?: number | null
          vat_rate?: string | null
          warranty_period?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "budgets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
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
      purchase_vouchers: {
        Row: {
          amount: number | null
          approved_by: string | null
          approved_by_name: string | null
          created_at: string | null
          created_by: string | null
          created_by_name: string | null
          description: string | null
          due_date: string | null
          expense_account: string | null
          id: string
          invoice_number: string | null
          line_items: Json | null
          po_reference: string | null
          rejection_reason: string | null
          status: string | null
          subtotal: number | null
          supplier_id: string | null
          supplier_name: string | null
          tax_amount: number | null
          tax_rate: number | null
          updated_at: string | null
          voucher_date: string
          voucher_number: string
        }
        Insert: {
          amount?: number | null
          approved_by?: string | null
          approved_by_name?: string | null
          created_at?: string | null
          created_by?: string | null
          created_by_name?: string | null
          description?: string | null
          due_date?: string | null
          expense_account?: string | null
          id?: string
          invoice_number?: string | null
          line_items?: Json | null
          po_reference?: string | null
          rejection_reason?: string | null
          status?: string | null
          subtotal?: number | null
          supplier_id?: string | null
          supplier_name?: string | null
          tax_amount?: number | null
          tax_rate?: number | null
          updated_at?: string | null
          voucher_date?: string
          voucher_number?: string
        }
        Update: {
          amount?: number | null
          approved_by?: string | null
          approved_by_name?: string | null
          created_at?: string | null
          created_by?: string | null
          created_by_name?: string | null
          description?: string | null
          due_date?: string | null
          expense_account?: string | null
          id?: string
          invoice_number?: string | null
          line_items?: Json | null
          po_reference?: string | null
          rejection_reason?: string | null
          status?: string | null
          subtotal?: number | null
          supplier_id?: string | null
          supplier_name?: string | null
          tax_amount?: number | null
          tax_rate?: number | null
          updated_at?: string | null
          voucher_date?: string
          voucher_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_vouchers_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      query_log: {
        Row: {
          error_message: string | null
          executed_at: string | null
          executed_by: string | null
          execution_ms: number | null
          id: string
          query_text: string
          query_type: string | null
          rows_affected: number | null
        }
        Insert: {
          error_message?: string | null
          executed_at?: string | null
          executed_by?: string | null
          execution_ms?: number | null
          id?: string
          query_text: string
          query_type?: string | null
          rows_affected?: number | null
        }
        Update: {
          error_message?: string | null
          executed_at?: string | null
          executed_by?: string | null
          execution_ms?: number | null
          id?: string
          query_text?: string
          query_type?: string | null
          rows_affected?: number | null
        }
        Relationships: []
      }
      quotation_items: {
        Row: {
          created_at: string | null
          description: string
          gl_account: string | null
          id: string
          item_id: string | null
          quantity: number
          quotation_id: string | null
          total_price: number | null
          unit_price: number
        }
        Insert: {
          created_at?: string | null
          description: string
          gl_account?: string | null
          id?: string
          item_id?: string | null
          quantity: number
          quotation_id?: string | null
          total_price?: number | null
          unit_price: number
        }
        Update: {
          created_at?: string | null
          description?: string
          gl_account?: string | null
          id?: string
          item_id?: string | null
          quantity?: number
          quotation_id?: string | null
          total_price?: number | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "quotation_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotation_items_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
        ]
      }
      quotations: {
        Row: {
          approved_by: string | null
          attachment_url: string | null
          created_at: string | null
          created_by: string | null
          currency: string | null
          delivery_terms: string | null
          evaluated_score: number | null
          facility_id: string | null
          id: string
          notes: string | null
          payment_terms: string | null
          quotation_number: string
          received_date: string | null
          rejected_reason: string | null
          requisition_id: string | null
          status: string | null
          supplier_id: string | null
          total_amount: number | null
          updated_at: string | null
          valid_until: string | null
        }
        Insert: {
          approved_by?: string | null
          attachment_url?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          delivery_terms?: string | null
          evaluated_score?: number | null
          facility_id?: string | null
          id?: string
          notes?: string | null
          payment_terms?: string | null
          quotation_number?: string
          received_date?: string | null
          rejected_reason?: string | null
          requisition_id?: string | null
          status?: string | null
          supplier_id?: string | null
          total_amount?: number | null
          updated_at?: string | null
          valid_until?: string | null
        }
        Update: {
          approved_by?: string | null
          attachment_url?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          delivery_terms?: string | null
          evaluated_score?: number | null
          facility_id?: string | null
          id?: string
          notes?: string | null
          payment_terms?: string | null
          quotation_number?: string
          received_date?: string | null
          rejected_reason?: string | null
          requisition_id?: string | null
          status?: string | null
          supplier_id?: string | null
          total_amount?: number | null
          updated_at?: string | null
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quotations_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotations_requisition_id_fkey"
            columns: ["requisition_id"]
            isOneToOne: false
            referencedRelation: "requisitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotations_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      receipt_vouchers: {
        Row: {
          amount: number
          bank_name: string | null
          bank_reference: string | null
          created_at: string | null
          created_by: string | null
          created_by_name: string | null
          department_id: string | null
          description: string | null
          id: string
          income_account: string | null
          payment_method: string | null
          receipt_date: string
          receipt_number: string
          received_from: string
          reference: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          amount?: number
          bank_name?: string | null
          bank_reference?: string | null
          created_at?: string | null
          created_by?: string | null
          created_by_name?: string | null
          department_id?: string | null
          description?: string | null
          id?: string
          income_account?: string | null
          payment_method?: string | null
          receipt_date?: string
          receipt_number?: string
          received_from: string
          reference?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          bank_name?: string | null
          bank_reference?: string | null
          created_at?: string | null
          created_by?: string | null
          created_by_name?: string | null
          department_id?: string | null
          description?: string | null
          id?: string
          income_account?: string | null
          payment_method?: string | null
          receipt_date?: string
          receipt_number?: string
          received_from?: string
          reference?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "receipt_vouchers_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      reception_calls: {
        Row: {
          call_status: string | null
          called_at: string | null
          caller_name: string | null
          caller_phone: string
          caller_type: string | null
          created_at: string | null
          department: string | null
          duration_sec: number | null
          id: string
          notes: string | null
          purpose: string | null
          received_by: string | null
          received_by_name: string | null
          staff_contacted: string | null
          twilio_call_sid: string | null
        }
        Insert: {
          call_status?: string | null
          called_at?: string | null
          caller_name?: string | null
          caller_phone: string
          caller_type?: string | null
          created_at?: string | null
          department?: string | null
          duration_sec?: number | null
          id?: string
          notes?: string | null
          purpose?: string | null
          received_by?: string | null
          received_by_name?: string | null
          staff_contacted?: string | null
          twilio_call_sid?: string | null
        }
        Update: {
          call_status?: string | null
          called_at?: string | null
          caller_name?: string | null
          caller_phone?: string
          caller_type?: string | null
          created_at?: string | null
          department?: string | null
          duration_sec?: number | null
          id?: string
          notes?: string | null
          purpose?: string | null
          received_by?: string | null
          received_by_name?: string | null
          staff_contacted?: string | null
          twilio_call_sid?: string | null
        }
        Relationships: []
      }
      reception_messages: {
        Row: {
          created_at: string | null
          department: string | null
          id: string
          message_body: string
          message_type: string | null
          recipient_name: string
          recipient_phone: string
          sender_name: string | null
          sent_at: string | null
          sent_by: string | null
          sent_by_name: string | null
          status: string | null
          twilio_sid: string | null
        }
        Insert: {
          created_at?: string | null
          department?: string | null
          id?: string
          message_body: string
          message_type?: string | null
          recipient_name: string
          recipient_phone: string
          sender_name?: string | null
          sent_at?: string | null
          sent_by?: string | null
          sent_by_name?: string | null
          status?: string | null
          twilio_sid?: string | null
        }
        Update: {
          created_at?: string | null
          department?: string | null
          id?: string
          message_body?: string
          message_type?: string | null
          recipient_name?: string
          recipient_phone?: string
          sender_name?: string | null
          sent_at?: string | null
          sent_by?: string | null
          sent_by_name?: string | null
          status?: string | null
          twilio_sid?: string | null
        }
        Relationships: []
      }
      reception_visitors: {
        Row: {
          badge_number: string | null
          checked_in_at: string | null
          checked_out_at: string | null
          created_at: string | null
          full_name: string
          host_department: string | null
          host_name: string | null
          id: string
          id_number: string | null
          notes: string | null
          organization: string | null
          phone: string | null
          photo_url: string | null
          purpose: string
          received_by: string | null
          received_by_name: string | null
          sms_sent: boolean | null
          visit_status: string | null
        }
        Insert: {
          badge_number?: string | null
          checked_in_at?: string | null
          checked_out_at?: string | null
          created_at?: string | null
          full_name: string
          host_department?: string | null
          host_name?: string | null
          id?: string
          id_number?: string | null
          notes?: string | null
          organization?: string | null
          phone?: string | null
          photo_url?: string | null
          purpose: string
          received_by?: string | null
          received_by_name?: string | null
          sms_sent?: boolean | null
          visit_status?: string | null
        }
        Update: {
          badge_number?: string | null
          checked_in_at?: string | null
          checked_out_at?: string | null
          created_at?: string | null
          full_name?: string
          host_department?: string | null
          host_name?: string | null
          id?: string
          id_number?: string | null
          notes?: string | null
          organization?: string | null
          phone?: string | null
          photo_url?: string | null
          purpose?: string
          received_by?: string | null
          received_by_name?: string | null
          sms_sent?: boolean | null
          visit_status?: string | null
        }
        Relationships: []
      }
      record_comments: {
        Row: {
          author_id: string | null
          author_name: string | null
          comment: string
          created_at: string | null
          id: string
          is_internal: boolean | null
          record_id: string
          table_name: string
        }
        Insert: {
          author_id?: string | null
          author_name?: string | null
          comment: string
          created_at?: string | null
          id?: string
          is_internal?: boolean | null
          record_id: string
          table_name: string
        }
        Update: {
          author_id?: string | null
          author_name?: string | null
          comment?: string
          created_at?: string | null
          id?: string
          is_internal?: boolean | null
          record_id?: string
          table_name?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          columns: Json | null
          created_at: string | null
          data_snapshot: Json | null
          file_url: string | null
          filters: Json | null
          format: string | null
          generated_by: string | null
          generated_by_name: string | null
          id: string
          module: string | null
          report_name: string
          report_type: string
          row_count: number | null
          status: string | null
        }
        Insert: {
          columns?: Json | null
          created_at?: string | null
          data_snapshot?: Json | null
          file_url?: string | null
          filters?: Json | null
          format?: string | null
          generated_by?: string | null
          generated_by_name?: string | null
          id?: string
          module?: string | null
          report_name: string
          report_type: string
          row_count?: number | null
          status?: string | null
        }
        Update: {
          columns?: Json | null
          created_at?: string | null
          data_snapshot?: Json | null
          file_url?: string | null
          filters?: Json | null
          format?: string | null
          generated_by?: string | null
          generated_by_name?: string | null
          id?: string
          module?: string | null
          report_name?: string
          report_type?: string
          row_count?: number | null
          status?: string | null
        }
        Relationships: []
      }
      requisition_items: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          item_id: string | null
          item_name: string
          notes: string | null
          quantity: number
          requisition_id: string | null
          specifications: string | null
          total_price: number | null
          unit_of_measure: string | null
          unit_price: number | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          item_id?: string | null
          item_name: string
          notes?: string | null
          quantity?: number
          requisition_id?: string | null
          specifications?: string | null
          total_price?: number | null
          unit_of_measure?: string | null
          unit_price?: number | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          item_id?: string | null
          item_name?: string
          notes?: string | null
          quantity?: number
          requisition_id?: string | null
          specifications?: string | null
          total_price?: number | null
          unit_of_measure?: string | null
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
          approved_by_name: string | null
          approver_id: string | null
          approver_name: string | null
          cost_centre: string | null
          created_at: string | null
          created_by: string | null
          currency: string | null
          delivery_date: string | null
          delivery_location: string | null
          department: string | null
          department_id: string | null
          department_name: string | null
          description: string | null
          facility_id: string | null
          fund_source: string | null
          hospital_ward: string | null
          id: string
          is_urgent: boolean | null
          items_count: number | null
          justification: string | null
          line_items: Json | null
          lpo_generated: boolean | null
          lpo_generated_at: string | null
          lpo_id: string | null
          lpo_number: string | null
          notes: string | null
          priority: string | null
          purpose: string | null
          reference_number: string | null
          rejected_at: string | null
          rejected_by: string | null
          rejected_by_name: string | null
          rejected_reason: string | null
          rejection_reason: string | null
          requested_by: string | null
          requested_by_name: string | null
          requester_name: string | null
          required_date: string | null
          requisition_number: string
          status: string | null
          submitted_at: string | null
          title: string | null
          total_amount: number | null
          total_estimated: number | null
          updated_at: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          approved_by_name?: string | null
          approver_id?: string | null
          approver_name?: string | null
          cost_centre?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          delivery_date?: string | null
          delivery_location?: string | null
          department?: string | null
          department_id?: string | null
          department_name?: string | null
          description?: string | null
          facility_id?: string | null
          fund_source?: string | null
          hospital_ward?: string | null
          id?: string
          is_urgent?: boolean | null
          items_count?: number | null
          justification?: string | null
          line_items?: Json | null
          lpo_generated?: boolean | null
          lpo_generated_at?: string | null
          lpo_id?: string | null
          lpo_number?: string | null
          notes?: string | null
          priority?: string | null
          purpose?: string | null
          reference_number?: string | null
          rejected_at?: string | null
          rejected_by?: string | null
          rejected_by_name?: string | null
          rejected_reason?: string | null
          rejection_reason?: string | null
          requested_by?: string | null
          requested_by_name?: string | null
          requester_name?: string | null
          required_date?: string | null
          requisition_number?: string
          status?: string | null
          submitted_at?: string | null
          title?: string | null
          total_amount?: number | null
          total_estimated?: number | null
          updated_at?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          approved_by_name?: string | null
          approver_id?: string | null
          approver_name?: string | null
          cost_centre?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          delivery_date?: string | null
          delivery_location?: string | null
          department?: string | null
          department_id?: string | null
          department_name?: string | null
          description?: string | null
          facility_id?: string | null
          fund_source?: string | null
          hospital_ward?: string | null
          id?: string
          is_urgent?: boolean | null
          items_count?: number | null
          justification?: string | null
          line_items?: Json | null
          lpo_generated?: boolean | null
          lpo_generated_at?: string | null
          lpo_id?: string | null
          lpo_number?: string | null
          notes?: string | null
          priority?: string | null
          purpose?: string | null
          reference_number?: string | null
          rejected_at?: string | null
          rejected_by?: string | null
          rejected_by_name?: string | null
          rejected_reason?: string | null
          rejection_reason?: string | null
          requested_by?: string | null
          requested_by_name?: string | null
          requester_name?: string | null
          required_date?: string | null
          requisition_number?: string
          status?: string | null
          submitted_at?: string | null
          title?: string | null
          total_amount?: number | null
          total_estimated?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "requisitions_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requisitions_lpo_id_fkey"
            columns: ["lpo_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          can_approve: boolean | null
          can_create: boolean | null
          can_delete: boolean | null
          can_edit: boolean | null
          can_export: boolean | null
          can_sync: boolean | null
          can_view: boolean | null
          created_at: string | null
          id: string
          module: string
          role: string
        }
        Insert: {
          can_approve?: boolean | null
          can_create?: boolean | null
          can_delete?: boolean | null
          can_edit?: boolean | null
          can_export?: boolean | null
          can_sync?: boolean | null
          can_view?: boolean | null
          created_at?: string | null
          id?: string
          module: string
          role: string
        }
        Update: {
          can_approve?: boolean | null
          can_create?: boolean | null
          can_delete?: boolean | null
          can_edit?: boolean | null
          can_export?: boolean | null
          can_sync?: boolean | null
          can_view?: boolean | null
          created_at?: string | null
          id?: string
          module?: string
          role?: string
        }
        Relationships: []
      }
      roles: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      sales_vouchers: {
        Row: {
          amount: number | null
          created_at: string | null
          created_by: string | null
          created_by_name: string | null
          customer_name: string
          customer_type: string | null
          department_id: string | null
          description: string | null
          due_date: string | null
          id: string
          income_account: string | null
          line_items: Json | null
          patient_number: string | null
          payment_method: string | null
          status: string | null
          subtotal: number | null
          tax_amount: number | null
          tax_rate: number | null
          updated_at: string | null
          voucher_date: string
          voucher_number: string
        }
        Insert: {
          amount?: number | null
          created_at?: string | null
          created_by?: string | null
          created_by_name?: string | null
          customer_name: string
          customer_type?: string | null
          department_id?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          income_account?: string | null
          line_items?: Json | null
          patient_number?: string | null
          payment_method?: string | null
          status?: string | null
          subtotal?: number | null
          tax_amount?: number | null
          tax_rate?: number | null
          updated_at?: string | null
          voucher_date?: string
          voucher_number?: string
        }
        Update: {
          amount?: number | null
          created_at?: string | null
          created_by?: string | null
          created_by_name?: string | null
          customer_name?: string
          customer_type?: string | null
          department_id?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          income_account?: string | null
          line_items?: Json | null
          patient_number?: string | null
          payment_method?: string | null
          status?: string | null
          subtotal?: number | null
          tax_amount?: number | null
          tax_rate?: number | null
          updated_at?: string | null
          voucher_date?: string
          voucher_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_vouchers_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      schema_cache_log: {
        Row: {
          details: string | null
          id: number
          operation: string
          performed_at: string | null
          performed_by: string | null
          table_name: string
        }
        Insert: {
          details?: string | null
          id?: number
          operation: string
          performed_at?: string | null
          performed_by?: string | null
          table_name: string
        }
        Update: {
          details?: string | null
          id?: number
          operation?: string
          performed_at?: string | null
          performed_by?: string | null
          table_name?: string
        }
        Relationships: []
      }
      sms_log: {
        Row: {
          cost: number | null
          created_at: string | null
          error_msg: string | null
          from_number: string | null
          id: string
          message: string
          module: string | null
          provider: string | null
          record_id: string | null
          sent_at: string | null
          sent_by: string | null
          sent_by_name: string | null
          status: string | null
          to_number: string
          twilio_sid: string | null
        }
        Insert: {
          cost?: number | null
          created_at?: string | null
          error_msg?: string | null
          from_number?: string | null
          id?: string
          message: string
          module?: string | null
          provider?: string | null
          record_id?: string | null
          sent_at?: string | null
          sent_by?: string | null
          sent_by_name?: string | null
          status?: string | null
          to_number: string
          twilio_sid?: string | null
        }
        Update: {
          cost?: number | null
          created_at?: string | null
          error_msg?: string | null
          from_number?: string | null
          id?: string
          message?: string
          module?: string | null
          provider?: string | null
          record_id?: string | null
          sent_at?: string | null
          sent_by?: string | null
          sent_by_name?: string | null
          status?: string | null
          to_number?: string
          twilio_sid?: string | null
        }
        Relationships: []
      }
      stock_movements: {
        Row: {
          created_at: string | null
          created_by: string | null
          created_by_name: string | null
          department_id: string | null
          from_location: string | null
          id: string
          item_id: string | null
          item_name: string | null
          movement_number: string
          movement_type: string
          notes: string | null
          quantity: number
          reference: string | null
          reference_type: string | null
          to_location: string | null
          total_value: number | null
          unit_cost: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          created_by_name?: string | null
          department_id?: string | null
          from_location?: string | null
          id?: string
          item_id?: string | null
          item_name?: string | null
          movement_number: string
          movement_type: string
          notes?: string | null
          quantity: number
          reference?: string | null
          reference_type?: string | null
          to_location?: string | null
          total_value?: number | null
          unit_cost?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          created_by_name?: string | null
          department_id?: string | null
          from_location?: string | null
          id?: string
          item_id?: string | null
          item_name?: string | null
          movement_number?: string
          movement_type?: string
          notes?: string | null
          quantity?: number
          reference?: string | null
          reference_type?: string | null
          to_location?: string | null
          total_value?: number | null
          unit_cost?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          address: string | null
          bank_account: string | null
          bank_branch: string | null
          bank_name: string | null
          category: string | null
          contact_person: string | null
          county: string | null
          created_at: string | null
          created_by: string | null
          email: string | null
          facility_id: string | null
          id: string
          is_active: boolean | null
          kra_pin: string | null
          name: string
          notes: string | null
          payment_terms: string | null
          phone: string | null
          pin_number: string | null
          postal_address: string | null
          rating: number | null
          registration_number: string | null
          status: string | null
          supplier_code: string | null
          tax_id: string | null
          updated_at: string | null
          website: string | null
        }
        Insert: {
          address?: string | null
          bank_account?: string | null
          bank_branch?: string | null
          bank_name?: string | null
          category?: string | null
          contact_person?: string | null
          county?: string | null
          created_at?: string | null
          created_by?: string | null
          email?: string | null
          facility_id?: string | null
          id?: string
          is_active?: boolean | null
          kra_pin?: string | null
          name: string
          notes?: string | null
          payment_terms?: string | null
          phone?: string | null
          pin_number?: string | null
          postal_address?: string | null
          rating?: number | null
          registration_number?: string | null
          status?: string | null
          supplier_code?: string | null
          tax_id?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          address?: string | null
          bank_account?: string | null
          bank_branch?: string | null
          bank_name?: string | null
          category?: string | null
          contact_person?: string | null
          county?: string | null
          created_at?: string | null
          created_by?: string | null
          email?: string | null
          facility_id?: string | null
          id?: string
          is_active?: boolean | null
          kra_pin?: string | null
          name?: string
          notes?: string | null
          payment_terms?: string | null
          phone?: string | null
          pin_number?: string | null
          postal_address?: string | null
          rating?: number | null
          registration_number?: string | null
          status?: string | null
          supplier_code?: string | null
          tax_id?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
        ]
      }
      system_broadcasts: {
        Row: {
          action_url: string | null
          expires_in: number | null
          id: string
          message: string
          recipient_count: number | null
          sent_at: string | null
          sent_by: string | null
          title: string
          type: string | null
        }
        Insert: {
          action_url?: string | null
          expires_in?: number | null
          id?: string
          message: string
          recipient_count?: number | null
          sent_at?: string | null
          sent_by?: string | null
          title: string
          type?: string | null
        }
        Update: {
          action_url?: string | null
          expires_in?: number | null
          id?: string
          message?: string
          recipient_count?: number | null
          sent_at?: string | null
          sent_by?: string | null
          title?: string
          type?: string | null
        }
        Relationships: []
      }
      system_config: {
        Row: {
          category: string | null
          id: string
          key: string
          label: string | null
          type: string | null
          updated_at: string | null
          updated_by: string | null
          value: string | null
        }
        Insert: {
          category?: string | null
          id?: string
          key: string
          label?: string | null
          type?: string | null
          updated_at?: string | null
          updated_by?: string | null
          value?: string | null
        }
        Update: {
          category?: string | null
          id?: string
          key?: string
          label?: string | null
          type?: string | null
          updated_at?: string | null
          updated_by?: string | null
          value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "system_config_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      system_errors: {
        Row: {
          created_at: string | null
          error_code: string | null
          error_msg: string
          id: string
          is_resolved: boolean | null
          page: string | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string | null
          stack_trace: string | null
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          error_code?: string | null
          error_msg: string
          id?: string
          is_resolved?: boolean | null
          page?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string | null
          stack_trace?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          error_code?: string | null
          error_msg?: string
          id?: string
          is_resolved?: boolean | null
          page?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string | null
          stack_trace?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "system_errors_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "system_errors_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      system_settings: {
        Row: {
          category: string
          id: string
          key: string
          label: string | null
          updated_at: string | null
          updated_by: string | null
          value: string | null
          value_json: Json | null
        }
        Insert: {
          category?: string
          id?: string
          key: string
          label?: string | null
          updated_at?: string | null
          updated_by?: string | null
          value?: string | null
          value_json?: Json | null
        }
        Update: {
          category?: string
          id?: string
          key?: string
          label?: string | null
          updated_at?: string | null
          updated_by?: string | null
          value?: string | null
          value_json?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "system_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tenders: {
        Row: {
          approved_by: string | null
          approved_by_name: string | null
          award_date: string | null
          awarded_amount: number | null
          awarded_at: string | null
          awarded_to: string | null
          awarded_to_name: string | null
          awarding_criteria: string | null
          bid_bond_amount: number | null
          bid_bond_required: boolean | null
          category: string | null
          closing_date: string
          contact_email: string | null
          contact_person: string | null
          contact_phone: string | null
          contract_duration: string | null
          created_at: string | null
          created_by: string | null
          created_by_name: string | null
          currency: string | null
          description: string | null
          documents_required: string | null
          estimated_value: number | null
          evaluation_criteria: string | null
          facility_id: string | null
          id: string
          opening_date: string | null
          performance_bond: boolean | null
          pre_bid_date: string | null
          pre_bid_meeting: boolean | null
          pre_bid_venue: string | null
          procurement_method: string | null
          published_at: string | null
          reference_number: string | null
          rejection_reason: string | null
          remarks: string | null
          status: string | null
          submission_requirements: string | null
          tender_fee: number | null
          tender_number: string
          tender_type: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          approved_by?: string | null
          approved_by_name?: string | null
          award_date?: string | null
          awarded_amount?: number | null
          awarded_at?: string | null
          awarded_to?: string | null
          awarded_to_name?: string | null
          awarding_criteria?: string | null
          bid_bond_amount?: number | null
          bid_bond_required?: boolean | null
          category?: string | null
          closing_date: string
          contact_email?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          contract_duration?: string | null
          created_at?: string | null
          created_by?: string | null
          created_by_name?: string | null
          currency?: string | null
          description?: string | null
          documents_required?: string | null
          estimated_value?: number | null
          evaluation_criteria?: string | null
          facility_id?: string | null
          id?: string
          opening_date?: string | null
          performance_bond?: boolean | null
          pre_bid_date?: string | null
          pre_bid_meeting?: boolean | null
          pre_bid_venue?: string | null
          procurement_method?: string | null
          published_at?: string | null
          reference_number?: string | null
          rejection_reason?: string | null
          remarks?: string | null
          status?: string | null
          submission_requirements?: string | null
          tender_fee?: number | null
          tender_number?: string
          tender_type?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          approved_by?: string | null
          approved_by_name?: string | null
          award_date?: string | null
          awarded_amount?: number | null
          awarded_at?: string | null
          awarded_to?: string | null
          awarded_to_name?: string | null
          awarding_criteria?: string | null
          bid_bond_amount?: number | null
          bid_bond_required?: boolean | null
          category?: string | null
          closing_date?: string
          contact_email?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          contract_duration?: string | null
          created_at?: string | null
          created_by?: string | null
          created_by_name?: string | null
          currency?: string | null
          description?: string | null
          documents_required?: string | null
          estimated_value?: number | null
          evaluation_criteria?: string | null
          facility_id?: string | null
          id?: string
          opening_date?: string | null
          performance_bond?: boolean | null
          pre_bid_date?: string | null
          pre_bid_meeting?: boolean | null
          pre_bid_venue?: string | null
          procurement_method?: string | null
          published_at?: string | null
          reference_number?: string | null
          rejection_reason?: string | null
          remarks?: string | null
          status?: string | null
          submission_requirements?: string | null
          tender_fee?: number | null
          tender_number?: string
          tender_type?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenders_awarded_to_fkey"
            columns: ["awarded_to"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenders_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
        ]
      }
      user_facilities: {
        Row: {
          created_at: string | null
          facility_id: string | null
          id: string
          is_primary: boolean | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          facility_id?: string | null
          id?: string
          is_primary?: boolean | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          facility_id?: string | null
          id?: string
          is_primary?: boolean | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_facilities_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      db_stats: {
        Row: {
          column_count: number | null
          policy_count: number | null
          table_name: unknown
          trigger_count: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      __plpgsql_show_dependency_tb:
        | {
            Args: {
              anycompatiblerangetype?: unknown
              anycompatibletype?: unknown
              anyelememttype?: unknown
              anyenumtype?: unknown
              anyrangetype?: unknown
              funcoid: unknown
              relid?: unknown
            }
            Returns: {
              name: string
              oid: unknown
              params: string
              schema: string
              type: string
            }[]
          }
        | {
            Args: {
              anycompatiblerangetype?: unknown
              anycompatibletype?: unknown
              anyelememttype?: unknown
              anyenumtype?: unknown
              anyrangetype?: unknown
              name: string
              relid?: unknown
            }
            Returns: {
              name: string
              oid: unknown
              params: string
              schema: string
              type: string
            }[]
          }
      dblink: { Args: { "": string }; Returns: Record<string, unknown>[] }
      dblink_cancel_query: { Args: { "": string }; Returns: string }
      dblink_close: { Args: { "": string }; Returns: string }
      dblink_connect: { Args: { "": string }; Returns: string }
      dblink_connect_u: { Args: { "": string }; Returns: string }
      dblink_current_query: { Args: never; Returns: string }
      dblink_disconnect:
        | { Args: never; Returns: string }
        | { Args: { "": string }; Returns: string }
      dblink_error_message: { Args: { "": string }; Returns: string }
      dblink_exec: { Args: { "": string }; Returns: string }
      dblink_fdw_validator: {
        Args: { catalog: unknown; options: string[] }
        Returns: undefined
      }
      dblink_get_connections: { Args: never; Returns: string[] }
      dblink_get_notify:
        | { Args: { conname: string }; Returns: Record<string, unknown>[] }
        | { Args: never; Returns: Record<string, unknown>[] }
      dblink_get_pkey: {
        Args: { "": string }
        Returns: Database["public"]["CompositeTypes"]["dblink_pkey_results"][]
        SetofOptions: {
          from: "*"
          to: "dblink_pkey_results"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      dblink_get_result: {
        Args: { "": string }
        Returns: Record<string, unknown>[]
      }
      dblink_is_busy: { Args: { "": string }; Returns: number }
      el5_next_number: {
        Args: { prefix: string; seq_table?: string; year_prefix?: boolean }
        Returns: string
      }
      exec_sql: { Args: { query: string }; Returns: Json }
      has_any_role: { Args: { required_roles: string[] }; Returns: boolean }
      has_role:
        | {
            Args: {
              _role: Database["public"]["Enums"]["app_role"]
              _user_id: string
            }
            Returns: boolean
          }
        | { Args: { required_role: string }; Returns: boolean }
      is_admin: { Args: never; Returns: boolean }
      json_matches_schema: {
        Args: { instance: Json; schema: Json }
        Returns: boolean
      }
      jsonb_matches_schema: {
        Args: { instance: Json; schema: Json }
        Returns: boolean
      }
      jsonschema_is_valid: { Args: { schema: Json }; Returns: boolean }
      jsonschema_validation_errors: {
        Args: { instance: Json; schema: Json }
        Returns: string[]
      }
      pgroonga_database_remove: { Args: never; Returns: boolean }
      plpgsql_check_function:
        | {
            Args: {
              all_warnings?: boolean
              anycompatiblerangetype?: unknown
              anycompatibletype?: unknown
              anyelememttype?: unknown
              anyenumtype?: unknown
              anyrangetype?: unknown
              compatibility_warnings?: boolean
              constant_tracing?: boolean
              extra_warnings?: boolean
              fatal_errors?: boolean
              format?: string
              funcoid: unknown
              incomment_options_usage_warning?: boolean
              newtable?: unknown
              oldtable?: unknown
              other_warnings?: boolean
              performance_warnings?: boolean
              relid?: unknown
              security_warnings?: boolean
              use_incomment_options?: boolean
              without_warnings?: boolean
            }
            Returns: string[]
          }
        | {
            Args: {
              all_warnings?: boolean
              anycompatiblerangetype?: unknown
              anycompatibletype?: unknown
              anyelememttype?: unknown
              anyenumtype?: unknown
              anyrangetype?: unknown
              compatibility_warnings?: boolean
              constant_tracing?: boolean
              extra_warnings?: boolean
              fatal_errors?: boolean
              format?: string
              incomment_options_usage_warning?: boolean
              name: string
              newtable?: unknown
              oldtable?: unknown
              other_warnings?: boolean
              performance_warnings?: boolean
              relid?: unknown
              security_warnings?: boolean
              use_incomment_options?: boolean
              without_warnings?: boolean
            }
            Returns: string[]
          }
      plpgsql_check_function_tb:
        | {
            Args: {
              all_warnings?: boolean
              anycompatiblerangetype?: unknown
              anycompatibletype?: unknown
              anyelememttype?: unknown
              anyenumtype?: unknown
              anyrangetype?: unknown
              compatibility_warnings?: boolean
              constant_tracing?: boolean
              extra_warnings?: boolean
              fatal_errors?: boolean
              funcoid: unknown
              incomment_options_usage_warning?: boolean
              newtable?: unknown
              oldtable?: unknown
              other_warnings?: boolean
              performance_warnings?: boolean
              relid?: unknown
              security_warnings?: boolean
              use_incomment_options?: boolean
              without_warnings?: boolean
            }
            Returns: {
              context: string
              detail: string
              functionid: unknown
              hint: string
              level: string
              lineno: number
              message: string
              position: number
              query: string
              sqlstate: string
              statement: string
            }[]
          }
        | {
            Args: {
              all_warnings?: boolean
              anycompatiblerangetype?: unknown
              anycompatibletype?: unknown
              anyelememttype?: unknown
              anyenumtype?: unknown
              anyrangetype?: unknown
              compatibility_warnings?: boolean
              constant_tracing?: boolean
              extra_warnings?: boolean
              fatal_errors?: boolean
              incomment_options_usage_warning?: boolean
              name: string
              newtable?: unknown
              oldtable?: unknown
              other_warnings?: boolean
              performance_warnings?: boolean
              relid?: unknown
              security_warnings?: boolean
              use_incomment_options?: boolean
              without_warnings?: boolean
            }
            Returns: {
              context: string
              detail: string
              functionid: unknown
              hint: string
              level: string
              lineno: number
              message: string
              position: number
              query: string
              sqlstate: string
              statement: string
            }[]
          }
      plpgsql_check_pragma: { Args: { name: string[] }; Returns: number }
      plpgsql_check_profiler: { Args: { enable?: boolean }; Returns: boolean }
      plpgsql_check_tracer: {
        Args: { enable?: boolean; verbosity?: string }
        Returns: boolean
      }
      plpgsql_coverage_branches:
        | { Args: { funcoid: unknown }; Returns: number }
        | { Args: { name: string }; Returns: number }
      plpgsql_coverage_statements:
        | { Args: { funcoid: unknown }; Returns: number }
        | { Args: { name: string }; Returns: number }
      plpgsql_profiler_function_statements_tb:
        | {
            Args: { funcoid: unknown }
            Returns: {
              avg_time: number
              block_num: number
              exec_stmts: number
              exec_stmts_err: number
              lineno: number
              max_time: number
              parent_note: string
              parent_stmtid: number
              processed_rows: number
              queryid: number
              stmtid: number
              stmtname: string
              total_time: number
            }[]
          }
        | {
            Args: { name: string }
            Returns: {
              avg_time: number
              block_num: number
              exec_stmts: number
              exec_stmts_err: number
              lineno: number
              max_time: number
              parent_note: string
              parent_stmtid: number
              processed_rows: number
              queryid: number
              stmtid: number
              stmtname: string
              total_time: number
            }[]
          }
      plpgsql_profiler_function_tb:
        | {
            Args: { funcoid: unknown }
            Returns: {
              avg_time: number
              cmds_on_row: number
              exec_stmts: number
              exec_stmts_err: number
              lineno: number
              max_time: number[]
              processed_rows: number[]
              queryids: number[]
              source: string
              stmt_lineno: number
              total_time: number
            }[]
          }
        | {
            Args: { name: string }
            Returns: {
              avg_time: number
              cmds_on_row: number
              exec_stmts: number
              exec_stmts_err: number
              lineno: number
              max_time: number[]
              processed_rows: number[]
              queryids: number[]
              source: string
              stmt_lineno: number
              total_time: number
            }[]
          }
      plpgsql_profiler_functions_all: {
        Args: never
        Returns: {
          avg_time: number
          exec_count: number
          exec_stmts_err: number
          funcoid: unknown
          max_time: number
          min_time: number
          stddev_time: number
          total_time: number
        }[]
      }
      plpgsql_profiler_install_fake_queryid_hook: {
        Args: never
        Returns: undefined
      }
      plpgsql_profiler_remove_fake_queryid_hook: {
        Args: never
        Returns: undefined
      }
      plpgsql_profiler_reset: { Args: { funcoid: unknown }; Returns: undefined }
      plpgsql_profiler_reset_all: { Args: never; Returns: undefined }
      plpgsql_show_dependency_tb:
        | {
            Args: {
              anycompatiblerangetype?: unknown
              anycompatibletype?: unknown
              anyelememttype?: unknown
              anyenumtype?: unknown
              anyrangetype?: unknown
              fnname: string
              relid?: unknown
            }
            Returns: {
              name: string
              oid: unknown
              params: string
              schema: string
              type: string
            }[]
          }
        | {
            Args: {
              anycompatiblerangetype?: unknown
              anycompatibletype?: unknown
              anyelememttype?: unknown
              anyenumtype?: unknown
              anyrangetype?: unknown
              funcoid: unknown
              relid?: unknown
            }
            Returns: {
              name: string
              oid: unknown
              params: string
              schema: string
              type: string
            }[]
          }
      ssl_cipher: { Args: never; Returns: string }
      ssl_client_cert_present: { Args: never; Returns: boolean }
      ssl_client_dn: { Args: never; Returns: string }
      ssl_client_dn_field: { Args: { "": string }; Returns: string }
      ssl_client_serial: { Args: never; Returns: number }
      ssl_extension_info: { Args: never; Returns: Record<string, unknown>[] }
      ssl_is_used: { Args: never; Returns: boolean }
      ssl_issuer_dn: { Args: never; Returns: string }
      ssl_issuer_field: { Args: { "": string }; Returns: string }
      ssl_version: { Args: never; Returns: string }
    }
    Enums: {
      app_role:
        | "student"
        | "teacher"
        | "admin"
        | "parent"
        | "ministry_official"
        | "curriculum_developer"
        | "requisitioner"
        | "procurement_officer"
        | "procurement_manager"
        | "warehouse_officer"
        | "inventory_manager"
        | "database_admin"
        | "webmaster"
      content_type:
        | "video"
        | "document"
        | "audio"
        | "interactive"
        | "simulation"
        | "quiz"
        | "assignment"
    }
    CompositeTypes: {
      dblink_pkey_results: {
        position: number | null
        colname: string | null
      }
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
        "requisitioner",
        "procurement_officer",
        "procurement_manager",
        "warehouse_officer",
        "inventory_manager",
        "database_admin",
        "webmaster",
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
    },
  },
} as const
