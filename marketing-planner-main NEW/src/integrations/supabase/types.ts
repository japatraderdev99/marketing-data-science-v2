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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      active_creatives: {
        Row: {
          campaign_id: string | null
          clicks: number | null
          conversions: number | null
          created_at: string
          dimensions: string | null
          engagement_rate: number | null
          file_url: string | null
          format_type: string | null
          grid_position: number | null
          id: string
          impressions: number | null
          notes: string | null
          platform: string | null
          published_at: string | null
          spend: number | null
          status: string
          tags: string[] | null
          thumbnail_url: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          campaign_id?: string | null
          clicks?: number | null
          conversions?: number | null
          created_at?: string
          dimensions?: string | null
          engagement_rate?: number | null
          file_url?: string | null
          format_type?: string | null
          grid_position?: number | null
          id?: string
          impressions?: number | null
          notes?: string | null
          platform?: string | null
          published_at?: string | null
          spend?: number | null
          status?: string
          tags?: string[] | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          campaign_id?: string | null
          clicks?: number | null
          conversions?: number | null
          created_at?: string
          dimensions?: string | null
          engagement_rate?: number | null
          file_url?: string | null
          format_type?: string | null
          grid_position?: number | null
          id?: string
          impressions?: number | null
          notes?: string | null
          platform?: string | null
          published_at?: string | null
          spend?: number | null
          status?: string
          tags?: string[] | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_usage_log: {
        Row: {
          cost_estimate: number | null
          created_at: string
          function_name: string
          id: string
          latency_ms: number | null
          model_used: string
          provider: string
          success: boolean | null
          task_type: string
          tokens_input: number | null
          tokens_output: number | null
          user_id: string
        }
        Insert: {
          cost_estimate?: number | null
          created_at?: string
          function_name: string
          id?: string
          latency_ms?: number | null
          model_used: string
          provider?: string
          success?: boolean | null
          task_type: string
          tokens_input?: number | null
          tokens_output?: number | null
          user_id: string
        }
        Update: {
          cost_estimate?: number | null
          created_at?: string
          function_name?: string
          id?: string
          latency_ms?: number | null
          model_used?: string
          provider?: string
          success?: boolean | null
          task_type?: string
          tokens_input?: number | null
          tokens_output?: number | null
          user_id?: string
        }
        Relationships: []
      }
      brand_assets: {
        Row: {
          asset_type: string
          category: string | null
          created_at: string
          file_format: string | null
          file_size: number | null
          file_url: string
          height: number | null
          id: string
          is_favorite: boolean | null
          name: string
          sort_order: number | null
          tags: string[] | null
          thumbnail_url: string | null
          usage_notes: string | null
          user_id: string
          width: number | null
        }
        Insert: {
          asset_type?: string
          category?: string | null
          created_at?: string
          file_format?: string | null
          file_size?: number | null
          file_url: string
          height?: number | null
          id?: string
          is_favorite?: boolean | null
          name: string
          sort_order?: number | null
          tags?: string[] | null
          thumbnail_url?: string | null
          usage_notes?: string | null
          user_id: string
          width?: number | null
        }
        Update: {
          asset_type?: string
          category?: string | null
          created_at?: string
          file_format?: string | null
          file_size?: number | null
          file_url?: string
          height?: number | null
          id?: string
          is_favorite?: boolean | null
          name?: string
          sort_order?: number | null
          tags?: string[] | null
          thumbnail_url?: string | null
          usage_notes?: string | null
          user_id?: string
          width?: number | null
        }
        Relationships: []
      }
      brand_colors: {
        Row: {
          category: string | null
          created_at: string
          hex_value: string
          id: string
          name: string
          rgb_value: string | null
          sort_order: number | null
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          hex_value: string
          id?: string
          name: string
          rgb_value?: string | null
          sort_order?: number | null
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          hex_value?: string
          id?: string
          name?: string
          rgb_value?: string | null
          sort_order?: number | null
          user_id?: string
        }
        Relationships: []
      }
      brand_fonts: {
        Row: {
          created_at: string
          font_name: string
          font_url: string | null
          font_weight: string | null
          id: string
          sample_text: string | null
          sort_order: number | null
          usage: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          font_name: string
          font_url?: string | null
          font_weight?: string | null
          id?: string
          sample_text?: string | null
          sort_order?: number | null
          usage?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          font_name?: string
          font_url?: string | null
          font_weight?: string | null
          id?: string
          sample_text?: string | null
          sort_order?: number | null
          usage?: string | null
          user_id?: string
        }
        Relationships: []
      }
      calendar_contents: {
        Row: {
          created_at: string | null
          data: Json
          id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          data?: Json
          id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          data?: Json
          id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      campaign_tasks: {
        Row: {
          approval_note: string | null
          approved_by: string | null
          asset_name: string | null
          assigned_to: string
          campaign_context: Json | null
          campaign_id: string
          campaign_name: string
          channel: string
          completed_at: string | null
          created_at: string
          creative_output: Json | null
          creative_type: string
          deadline: string | null
          description: string | null
          destination_platform: string | null
          drive_link: string | null
          format_height: number | null
          format_name: string | null
          format_ratio: string | null
          format_width: number | null
          id: string
          priority: string
          started_at: string | null
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          approval_note?: string | null
          approved_by?: string | null
          asset_name?: string | null
          assigned_to?: string
          campaign_context?: Json | null
          campaign_id: string
          campaign_name: string
          channel: string
          completed_at?: string | null
          created_at?: string
          creative_output?: Json | null
          creative_type: string
          deadline?: string | null
          description?: string | null
          destination_platform?: string | null
          drive_link?: string | null
          format_height?: number | null
          format_name?: string | null
          format_ratio?: string | null
          format_width?: number | null
          id?: string
          priority?: string
          started_at?: string | null
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          approval_note?: string | null
          approved_by?: string | null
          asset_name?: string | null
          assigned_to?: string
          campaign_context?: Json | null
          campaign_id?: string
          campaign_name?: string
          channel?: string
          completed_at?: string | null
          created_at?: string
          creative_output?: Json | null
          creative_type?: string
          deadline?: string | null
          description?: string | null
          destination_platform?: string | null
          drive_link?: string | null
          format_height?: number | null
          format_name?: string | null
          format_ratio?: string | null
          format_width?: number | null
          id?: string
          priority?: string
          started_at?: string | null
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      campaigns: {
        Row: {
          created_at: string | null
          data: Json
          id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          data?: Json
          id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          data?: Json
          id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      competitor_benchmarks: {
        Row: {
          ai_insights: Json | null
          competitor_name: string
          created_at: string
          file_name: string | null
          file_size: number | null
          file_url: string | null
          format_type: string | null
          id: string
          notes: string | null
          platform: string | null
          status: string
          tags: string[] | null
          thumbnail_url: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_insights?: Json | null
          competitor_name: string
          created_at?: string
          file_name?: string | null
          file_size?: number | null
          file_url?: string | null
          format_type?: string | null
          id?: string
          notes?: string | null
          platform?: string | null
          status?: string
          tags?: string[] | null
          thumbnail_url?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_insights?: Json | null
          competitor_name?: string
          created_at?: string
          file_name?: string | null
          file_size?: number | null
          file_url?: string | null
          format_type?: string | null
          id?: string
          notes?: string | null
          platform?: string | null
          status?: string
          tags?: string[] | null
          thumbnail_url?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      content_performance_insights: {
        Row: {
          ai_recommendation: string | null
          avg_engagement_rate: number | null
          avg_reach: number | null
          confidence_score: number | null
          created_at: string | null
          id: string
          insight_type: string | null
          pattern_data: Json | null
          total_occurrences: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          ai_recommendation?: string | null
          avg_engagement_rate?: number | null
          avg_reach?: number | null
          confidence_score?: number | null
          created_at?: string | null
          id?: string
          insight_type?: string | null
          pattern_data?: Json | null
          total_occurrences?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          ai_recommendation?: string | null
          avg_engagement_rate?: number | null
          avg_reach?: number | null
          confidence_score?: number | null
          created_at?: string | null
          id?: string
          insight_type?: string | null
          pattern_data?: Json | null
          total_occurrences?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      creative_drafts: {
        Row: {
          angle: string | null
          campaign_name: string | null
          carousel_data: Json | null
          channel: string | null
          context: string | null
          created_at: string
          feedback_requests: Json | null
          format_id: string | null
          id: string
          name: string
          persona: string | null
          sigla: string
          slide_images: Json | null
          status: string
          tone: string | null
          updated_at: string
          user_id: string
          workflow_stage: string | null
        }
        Insert: {
          angle?: string | null
          campaign_name?: string | null
          carousel_data?: Json | null
          channel?: string | null
          context?: string | null
          created_at?: string
          feedback_requests?: Json | null
          format_id?: string | null
          id?: string
          name: string
          persona?: string | null
          sigla: string
          slide_images?: Json | null
          status?: string
          tone?: string | null
          updated_at?: string
          user_id: string
          workflow_stage?: string | null
        }
        Update: {
          angle?: string | null
          campaign_name?: string | null
          carousel_data?: Json | null
          channel?: string | null
          context?: string | null
          created_at?: string
          feedback_requests?: Json | null
          format_id?: string | null
          id?: string
          name?: string
          persona?: string | null
          sigla?: string
          slide_images?: Json | null
          status?: string
          tone?: string | null
          updated_at?: string
          user_id?: string
          workflow_stage?: string | null
        }
        Relationships: []
      }
      creative_suggestions: {
        Row: {
          ai_reasoning: string | null
          channel: string | null
          copy_text: string | null
          created_at: string
          description: string | null
          format: string | null
          id: string
          input_text: string
          input_type: string
          metadata: Json | null
          status: string
          suggestion_type: string
          title: string
          updated_at: string
          user_id: string
          visual_direction: string | null
        }
        Insert: {
          ai_reasoning?: string | null
          channel?: string | null
          copy_text?: string | null
          created_at?: string
          description?: string | null
          format?: string | null
          id?: string
          input_text: string
          input_type?: string
          metadata?: Json | null
          status?: string
          suggestion_type: string
          title: string
          updated_at?: string
          user_id: string
          visual_direction?: string | null
        }
        Update: {
          ai_reasoning?: string | null
          channel?: string | null
          copy_text?: string | null
          created_at?: string
          description?: string | null
          format?: string | null
          id?: string
          input_text?: string
          input_type?: string
          metadata?: Json | null
          status?: string
          suggestion_type?: string
          title?: string
          updated_at?: string
          user_id?: string
          visual_direction?: string | null
        }
        Relationships: []
      }
      dam_assets: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          download_url: string | null
          drive_file_id: string
          file_size: number | null
          filename: string
          folder_path: string | null
          id: string
          mime_type: string | null
          synced_at: string | null
          tags: string[] | null
          thumbnail_url: string | null
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          download_url?: string | null
          drive_file_id: string
          file_size?: number | null
          filename: string
          folder_path?: string | null
          id?: string
          mime_type?: string | null
          synced_at?: string | null
          tags?: string[] | null
          thumbnail_url?: string | null
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          download_url?: string | null
          drive_file_id?: string
          file_size?: number | null
          filename?: string
          folder_path?: string | null
          id?: string
          mime_type?: string | null
          synced_at?: string | null
          tags?: string[] | null
          thumbnail_url?: string | null
          user_id?: string
        }
        Relationships: []
      }
      forum_messages: {
        Row: {
          author_initials: string
          author_name: string
          author_role: string
          content: string
          created_at: string
          id: string
          is_ai: boolean
          is_pinned: boolean
          message_type: string
          metadata: Json | null
          reply_to: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          author_initials?: string
          author_name: string
          author_role?: string
          content: string
          created_at?: string
          id?: string
          is_ai?: boolean
          is_pinned?: boolean
          message_type?: string
          metadata?: Json | null
          reply_to?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          author_initials?: string
          author_name?: string
          author_role?: string
          content?: string
          created_at?: string
          id?: string
          is_ai?: boolean
          is_pinned?: boolean
          message_type?: string
          metadata?: Json | null
          reply_to?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "forum_messages_reply_to_fkey"
            columns: ["reply_to"]
            isOneToOne: false
            referencedRelation: "forum_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      ga4_metrics: {
        Row: {
          avg_session_duration: number | null
          bounce_rate: number | null
          campaign_name: string | null
          city: string | null
          conversion_rate: number | null
          conversions: number | null
          country: string | null
          created_at: string | null
          device_category: string | null
          events_count: number | null
          id: string
          landing_page: string | null
          metric_date: string
          new_users: number | null
          page_views: number | null
          revenue: number | null
          sessions: number | null
          source_medium: string | null
          synced_at: string | null
          total_users: number | null
          user_id: string
        }
        Insert: {
          avg_session_duration?: number | null
          bounce_rate?: number | null
          campaign_name?: string | null
          city?: string | null
          conversion_rate?: number | null
          conversions?: number | null
          country?: string | null
          created_at?: string | null
          device_category?: string | null
          events_count?: number | null
          id?: string
          landing_page?: string | null
          metric_date: string
          new_users?: number | null
          page_views?: number | null
          revenue?: number | null
          sessions?: number | null
          source_medium?: string | null
          synced_at?: string | null
          total_users?: number | null
          user_id: string
        }
        Update: {
          avg_session_duration?: number | null
          bounce_rate?: number | null
          campaign_name?: string | null
          city?: string | null
          conversion_rate?: number | null
          conversions?: number | null
          country?: string | null
          created_at?: string | null
          device_category?: string | null
          events_count?: number | null
          id?: string
          landing_page?: string | null
          metric_date?: string
          new_users?: number | null
          page_views?: number | null
          revenue?: number | null
          sessions?: number | null
          source_medium?: string | null
          synced_at?: string | null
          total_users?: number | null
          user_id?: string
        }
        Relationships: []
      }
      generative_playbooks: {
        Row: {
          created_at: string
          id: string
          knowledge_json: Json
          playbook_type: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          knowledge_json: Json
          playbook_type: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          knowledge_json?: Json
          playbook_type?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      google_ads_campaigns: {
        Row: {
          ad_group_id: string | null
          ad_group_name: string | null
          avg_cpc: number | null
          avg_cpm: number | null
          campaign_id: string
          campaign_name: string | null
          campaign_status: string | null
          campaign_type: string | null
          clicks: number | null
          conversion_value: number | null
          conversions: number | null
          cost: number | null
          cost_micros: number | null
          created_at: string | null
          ctr: number | null
          date_start: string | null
          date_stop: string | null
          id: string
          impressions: number | null
          interaction_rate: number | null
          synced_at: string | null
          user_id: string
        }
        Insert: {
          ad_group_id?: string | null
          ad_group_name?: string | null
          avg_cpc?: number | null
          avg_cpm?: number | null
          campaign_id: string
          campaign_name?: string | null
          campaign_status?: string | null
          campaign_type?: string | null
          clicks?: number | null
          conversion_value?: number | null
          conversions?: number | null
          cost?: number | null
          cost_micros?: number | null
          created_at?: string | null
          ctr?: number | null
          date_start?: string | null
          date_stop?: string | null
          id?: string
          impressions?: number | null
          interaction_rate?: number | null
          synced_at?: string | null
          user_id: string
        }
        Update: {
          ad_group_id?: string | null
          ad_group_name?: string | null
          avg_cpc?: number | null
          avg_cpm?: number | null
          campaign_id?: string
          campaign_name?: string | null
          campaign_status?: string | null
          campaign_type?: string | null
          clicks?: number | null
          conversion_value?: number | null
          conversions?: number | null
          cost?: number | null
          cost_micros?: number | null
          created_at?: string | null
          ctr?: number | null
          date_start?: string | null
          date_stop?: string | null
          id?: string
          impressions?: number | null
          interaction_rate?: number | null
          synced_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      instagram_posts: {
        Row: {
          caption: string | null
          comments: number | null
          created_at: string | null
          engagement: number | null
          from_explore: number | null
          from_hashtags: number | null
          from_other: number | null
          from_profile: number | null
          id: string
          impressions: number | null
          instagram_account_id: string
          instagram_media_id: string
          likes: number | null
          media_type: string | null
          media_url: string | null
          permalink: string | null
          published_at: string | null
          reach: number | null
          saves: number | null
          shares: number | null
          synced_at: string | null
          thumbnail_url: string | null
          user_id: string
          video_views: number | null
        }
        Insert: {
          caption?: string | null
          comments?: number | null
          created_at?: string | null
          engagement?: number | null
          from_explore?: number | null
          from_hashtags?: number | null
          from_other?: number | null
          from_profile?: number | null
          id?: string
          impressions?: number | null
          instagram_account_id: string
          instagram_media_id: string
          likes?: number | null
          media_type?: string | null
          media_url?: string | null
          permalink?: string | null
          published_at?: string | null
          reach?: number | null
          saves?: number | null
          shares?: number | null
          synced_at?: string | null
          thumbnail_url?: string | null
          user_id: string
          video_views?: number | null
        }
        Update: {
          caption?: string | null
          comments?: number | null
          created_at?: string | null
          engagement?: number | null
          from_explore?: number | null
          from_hashtags?: number | null
          from_other?: number | null
          from_profile?: number | null
          id?: string
          impressions?: number | null
          instagram_account_id?: string
          instagram_media_id?: string
          likes?: number | null
          media_type?: string | null
          media_url?: string | null
          permalink?: string | null
          published_at?: string | null
          reach?: number | null
          saves?: number | null
          shares?: number | null
          synced_at?: string | null
          thumbnail_url?: string | null
          user_id?: string
          video_views?: number | null
        }
        Relationships: []
      }
      media_library: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          file_size: number | null
          filename: string
          id: string
          tags: string[] | null
          url: string
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          file_size?: number | null
          filename: string
          id?: string
          tags?: string[] | null
          url: string
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          file_size?: number | null
          filename?: string
          id?: string
          tags?: string[] | null
          url?: string
          user_id?: string
        }
        Relationships: []
      }
      meta_ads_performance: {
        Row: {
          ad_account_id: string
          ad_body: string | null
          ad_id: string
          ad_name: string | null
          ad_title: string | null
          adset_id: string | null
          campaign_id: string | null
          campaign_name: string | null
          clicks: number | null
          conversions: number | null
          copy_style: string | null
          cost_per_conversion: number | null
          cpc: number | null
          cpm: number | null
          created_at: string | null
          creative_category: string | null
          creative_niche: string | null
          creative_url: string | null
          ctr: number | null
          date_start: string | null
          date_stop: string | null
          draft_id: string | null
          id: string
          impressions: number | null
          roas: number | null
          spend: number | null
          status: string | null
          synced_at: string | null
          thumbnail_url: string | null
          user_id: string
          visual_style: string | null
        }
        Insert: {
          ad_account_id: string
          ad_body?: string | null
          ad_id: string
          ad_name?: string | null
          ad_title?: string | null
          adset_id?: string | null
          campaign_id?: string | null
          campaign_name?: string | null
          clicks?: number | null
          conversions?: number | null
          copy_style?: string | null
          cost_per_conversion?: number | null
          cpc?: number | null
          cpm?: number | null
          created_at?: string | null
          creative_category?: string | null
          creative_niche?: string | null
          creative_url?: string | null
          ctr?: number | null
          date_start?: string | null
          date_stop?: string | null
          draft_id?: string | null
          id?: string
          impressions?: number | null
          roas?: number | null
          spend?: number | null
          status?: string | null
          synced_at?: string | null
          thumbnail_url?: string | null
          user_id: string
          visual_style?: string | null
        }
        Update: {
          ad_account_id?: string
          ad_body?: string | null
          ad_id?: string
          ad_name?: string | null
          ad_title?: string | null
          adset_id?: string | null
          campaign_id?: string | null
          campaign_name?: string | null
          clicks?: number | null
          conversions?: number | null
          copy_style?: string | null
          cost_per_conversion?: number | null
          cpc?: number | null
          cpm?: number | null
          created_at?: string | null
          creative_category?: string | null
          creative_niche?: string | null
          creative_url?: string | null
          ctr?: number | null
          date_start?: string | null
          date_stop?: string | null
          draft_id?: string | null
          id?: string
          impressions?: number | null
          roas?: number | null
          spend?: number | null
          status?: string | null
          synced_at?: string | null
          thumbnail_url?: string | null
          user_id?: string
          visual_style?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meta_ads_performance_draft_id_fkey"
            columns: ["draft_id"]
            isOneToOne: false
            referencedRelation: "creative_drafts"
            referencedColumns: ["id"]
          },
        ]
      }
      monthly_reports: {
        Row: {
          ai_analysis: string | null
          created_at: string
          extracted_data: Json | null
          file_name: string
          file_url: string
          id: string
          model_used: string | null
          report_month: string
          user_id: string
        }
        Insert: {
          ai_analysis?: string | null
          created_at?: string
          extracted_data?: Json | null
          file_name: string
          file_url: string
          id?: string
          model_used?: string | null
          report_month: string
          user_id: string
        }
        Update: {
          ai_analysis?: string | null
          created_at?: string
          extracted_data?: Json | null
          file_name?: string
          file_url?: string
          id?: string
          model_used?: string | null
          report_month?: string
          user_id?: string
        }
        Relationships: []
      }
      operational_metrics: {
        Row: {
          city: string | null
          count: number
          created_at: string
          id: string
          metadata: Json | null
          metric_date: string
          metric_type: string
          state: string | null
          synced_at: string | null
          total_value: number | null
          user_id: string
        }
        Insert: {
          city?: string | null
          count?: number
          created_at?: string
          id?: string
          metadata?: Json | null
          metric_date: string
          metric_type: string
          state?: string | null
          synced_at?: string | null
          total_value?: number | null
          user_id: string
        }
        Update: {
          city?: string | null
          count?: number
          created_at?: string
          id?: string
          metadata?: Json | null
          metric_date?: string
          metric_type?: string
          state?: string | null
          synced_at?: string | null
          total_value?: number | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string
          id: string
          user_id: string | null
          username: string
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          user_id?: string | null
          username: string
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          user_id?: string | null
          username?: string
        }
        Relationships: []
      }
      strategy_knowledge: {
        Row: {
          created_at: string
          document_name: string
          document_type: string | null
          document_url: string
          error_message: string | null
          extracted_knowledge: Json | null
          file_size: number | null
          id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          document_name: string
          document_type?: string | null
          document_url: string
          error_message?: string | null
          extracted_knowledge?: Json | null
          file_size?: number | null
          id?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          document_name?: string
          document_type?: string | null
          document_url?: string
          error_message?: string | null
          extracted_knowledge?: Json | null
          file_size?: number | null
          id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      video_projects: {
        Row: {
          briefing_data: Json | null
          concept: string | null
          created_at: string
          id: string
          pipeline_notes: Json | null
          shot_frames: Json | null
          shot_motions: Json | null
          status: string
          storyboard: Json | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          briefing_data?: Json | null
          concept?: string | null
          created_at?: string
          id?: string
          pipeline_notes?: Json | null
          shot_frames?: Json | null
          shot_motions?: Json | null
          status?: string
          storyboard?: Json | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          briefing_data?: Json | null
          concept?: string | null
          created_at?: string
          id?: string
          pipeline_notes?: Json | null
          shot_frames?: Json | null
          shot_motions?: Json | null
          status?: string
          storyboard?: Json | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_draft_sigla: { Args: never; Returns: string }
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
