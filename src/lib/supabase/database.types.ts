// Hand-authored Supabase database types, transcribed from
// `supabase/migrations/0001_init.sql` (the source of truth).
//
// `npx supabase gen types` could not be run in this environment (no Supabase
// access token available), so this file mirrors the CLI's generated shape by
// hand. Keep it in sync with the migration if the schema changes.

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
      categories: {
        Row: {
          slug: string;
          title: string;
          sort: number;
          tone: string | null;
          tagline: string | null;
        };
        Insert: {
          slug: string;
          title: string;
          sort?: number;
          tone?: string | null;
          tagline?: string | null;
        };
        Update: {
          slug?: string;
          title?: string;
          sort?: number;
          tone?: string | null;
          tagline?: string | null;
        };
        Relationships: [];
      };
      age_tiers: {
        Row: {
          slug: string;
          title: string;
          sort: number;
          tone: string | null;
          tagline: string | null;
        };
        Insert: {
          slug: string;
          title: string;
          sort?: number;
          tone?: string | null;
          tagline?: string | null;
        };
        Update: {
          slug?: string;
          title?: string;
          sort?: number;
          tone?: string | null;
          tagline?: string | null;
        };
        Relationships: [];
      };
      products: {
        Row: {
          id: string;
          slug: string;
          sku: string;
          title: string;
          price: number;
          compare_at_price: number | null;
          rating: number;
          review_count: number;
          age_tier_slug: string | null;
          category_slug: string | null;
          badge: string | null;
          description: string | null;
          image_label: string | null;
          image_tones: string[];
          preorder_ship_date: string | null;
          active: boolean;
          kit_contents: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          sku: string;
          title: string;
          price: number;
          compare_at_price?: number | null;
          rating?: number;
          review_count?: number;
          age_tier_slug?: string | null;
          category_slug?: string | null;
          badge?: string | null;
          description?: string | null;
          image_label?: string | null;
          image_tones?: string[];
          preorder_ship_date?: string | null;
          active?: boolean;
          kit_contents?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          sku?: string;
          title?: string;
          price?: number;
          compare_at_price?: number | null;
          rating?: number;
          review_count?: number;
          age_tier_slug?: string | null;
          category_slug?: string | null;
          badge?: string | null;
          description?: string | null;
          image_label?: string | null;
          image_tones?: string[];
          preorder_ship_date?: string | null;
          active?: boolean;
          kit_contents?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "products_age_tier_slug_fkey";
            columns: ["age_tier_slug"];
            isOneToOne: false;
            referencedRelation: "age_tiers";
            referencedColumns: ["slug"];
          },
          {
            foreignKeyName: "products_category_slug_fkey";
            columns: ["category_slug"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["slug"];
          },
        ];
      };
      product_variants: {
        Row: {
          id: string;
          product_id: string;
          name: string;
          tone: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          name: string;
          tone: string;
        };
        Update: {
          id?: string;
          product_id?: string;
          name?: string;
          tone?: string;
        };
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      inventory: {
        Row: {
          product_id: string;
          stock_qty: number;
          low_stock_threshold: number;
        };
        Insert: {
          product_id: string;
          stock_qty?: number;
          low_stock_threshold?: number;
        };
        Update: {
          product_id?: string;
          stock_qty?: number;
          low_stock_threshold?: number;
        };
        Relationships: [
          {
            foreignKeyName: "inventory_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: true;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      customers: {
        Row: {
          id: string;
          phone: string;
          name: string;
          email: string | null;
          auth_user_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          phone: string;
          name: string;
          email?: string | null;
          auth_user_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          phone?: string;
          name?: string;
          email?: string | null;
          auth_user_id?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      orders: {
        Row: {
          id: string;
          order_number: string;
          customer_id: string | null;
          customer_name: string;
          customer_phone: string;
          customer_email: string | null;
          division: string;
          district: string;
          area: string;
          address_line: string;
          landmark: string | null;
          status: string;
          payment_method: string;
          subtotal: number;
          delivery_fee: number;
          total: number;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_number: string;
          customer_id?: string | null;
          customer_name: string;
          customer_phone: string;
          customer_email?: string | null;
          division: string;
          district: string;
          area: string;
          address_line: string;
          landmark?: string | null;
          status?: string;
          payment_method?: string;
          subtotal: number;
          delivery_fee?: number;
          total: number;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          order_number?: string;
          customer_id?: string | null;
          customer_name?: string;
          customer_phone?: string;
          customer_email?: string | null;
          division?: string;
          district?: string;
          area?: string;
          address_line?: string;
          landmark?: string | null;
          status?: string;
          payment_method?: string;
          subtotal?: number;
          delivery_fee?: number;
          total?: number;
          notes?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "orders_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
        ];
      };
      order_items: {
        Row: {
          id: string;
          order_id: string;
          product_id: string | null;
          title: string;
          unit_price: number;
          qty: number;
          line_total: number;
          fulfillment_type: string;
          preorder_ship_date: string | null;
        };
        Insert: {
          id?: string;
          order_id: string;
          product_id?: string | null;
          title: string;
          unit_price: number;
          qty: number;
          line_total: number;
          fulfillment_type: string;
          preorder_ship_date?: string | null;
        };
        Update: {
          id?: string;
          order_id?: string;
          product_id?: string | null;
          title?: string;
          unit_price?: number;
          qty?: number;
          line_total?: number;
          fulfillment_type?: string;
          preorder_ship_date?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "order_items_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      blog_posts: {
        Row: {
          slug: string;
          title: string;
          excerpt: string | null;
          body: Json;
          author: string | null;
          cover_image: string | null;
          category: string | null;
          read_mins: number | null;
          date_iso: string | null;
          featured: boolean;
          published: boolean;
        };
        Insert: {
          slug: string;
          title: string;
          excerpt?: string | null;
          body?: Json;
          author?: string | null;
          cover_image?: string | null;
          category?: string | null;
          read_mins?: number | null;
          date_iso?: string | null;
          featured?: boolean;
          published?: boolean;
        };
        Update: {
          slug?: string;
          title?: string;
          excerpt?: string | null;
          body?: Json;
          author?: string | null;
          cover_image?: string | null;
          category?: string | null;
          read_mins?: number | null;
          date_iso?: string | null;
          featured?: boolean;
          published?: boolean;
        };
        Relationships: [];
      };
      site_settings: {
        Row: {
          key: string;
          value: Json;
        };
        Insert: {
          key: string;
          value: Json;
        };
        Update: {
          key?: string;
          value?: Json;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      decrement_stock: {
        Args: {
          p_product_id: string;
          p_qty: number;
        };
        Returns: number;
      };
      place_order: {
        Args: {
          p_order: Json;
          p_items: Json;
        };
        Returns: string;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
