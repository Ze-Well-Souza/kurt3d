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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      app_settings: {
        Row: {
          consumo_kw: number
          custo_fixo_unidade: number
          default_peso_rolo: number
          default_quantidade: number
          depreciacao_hora: number
          id: string
          impressora_modelo: string
          studio_nome: string
          tarifa_energia_kwh: number
          whatsapp_numero: string
        }
        Insert: {
          consumo_kw?: number
          custo_fixo_unidade?: number
          default_peso_rolo?: number
          default_quantidade?: number
          depreciacao_hora?: number
          id?: string
          impressora_modelo?: string
          studio_nome?: string
          tarifa_energia_kwh?: number
          whatsapp_numero?: string
        }
        Update: {
          consumo_kw?: number
          custo_fixo_unidade?: number
          default_peso_rolo?: number
          default_quantidade?: number
          depreciacao_hora?: number
          id?: string
          impressora_modelo?: string
          studio_nome?: string
          tarifa_energia_kwh?: number
          whatsapp_numero?: string
        }
        Relationships: []
      }
      clients: {
        Row: {
          created_at: string
          email: string | null
          id: string
          nome: string
          notas: string | null
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          id: string
          nome: string
          notas?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          nome?: string
          notas?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      expenses: {
        Row: {
          categoria: string | null
          data: string
          descricao: string
          id: string
          ref_id: string
          source: string
          valor: number
        }
        Insert: {
          categoria?: string | null
          data: string
          descricao: string
          id: string
          ref_id: string
          source: string
          valor: number
        }
        Update: {
          categoria?: string | null
          data?: string
          descricao?: string
          id?: string
          ref_id?: string
          source?: string
          valor?: number
        }
        Relationships: []
      }
      filamento_payment_installments: {
        Row: {
          data_pagamento: string | null
          id: string
          numero: number
          observacao: string | null
          pago: boolean
          payment_id: string
          valor: number
          valor_pago: number | null
          vencimento: string
        }
        Insert: {
          data_pagamento?: string | null
          id: string
          numero: number
          observacao?: string | null
          pago?: boolean
          payment_id: string
          valor: number
          valor_pago?: number | null
          vencimento: string
        }
        Update: {
          data_pagamento?: string | null
          id?: string
          numero?: number
          observacao?: string | null
          pago?: boolean
          payment_id?: string
          valor?: number
          valor_pago?: number | null
          vencimento?: string
        }
        Relationships: [
          {
            foreignKeyName: "filamento_payment_installments_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "filamento_payments"
            referencedColumns: ["id"]
          },
        ]
      }
      filamento_payment_events: {
        Row: {
          created_at: string
          data_pagamento: string
          id: string
          installment_id: string
          observacao: string | null
          payment_id: string
          tipo: string
          valor: number
        }
        Insert: {
          created_at?: string
          data_pagamento: string
          id: string
          installment_id: string
          observacao?: string | null
          payment_id: string
          tipo: string
          valor: number
        }
        Update: {
          created_at?: string
          data_pagamento?: string
          id?: string
          installment_id?: string
          observacao?: string | null
          payment_id?: string
          tipo?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "filamento_payment_events_installment_id_fkey"
            columns: ["installment_id"]
            isOneToOne: false
            referencedRelation: "filamento_payment_installments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "filamento_payment_events_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "filamento_payments"
            referencedColumns: ["id"]
          },
        ]
      }
      filamento_payments: {
        Row: {
          batch_id: string
          created_at: string
          custo_total: number
          data_para_pagamento: string | null
          forma_pagamento: string
          id: string
          parcelas: number
        }
        Insert: {
          batch_id: string
          created_at?: string
          custo_total: number
          data_para_pagamento?: string | null
          forma_pagamento: string
          id: string
          parcelas?: number
        }
        Update: {
          batch_id?: string
          created_at?: string
          custo_total?: number
          data_para_pagamento?: string | null
          forma_pagamento?: string
          id?: string
          parcelas?: number
        }
        Relationships: []
      }
      insumo_payment_installments: {
        Row: {
          data_pagamento: string | null
          id: string
          numero: number
          observacao: string | null
          pago: boolean
          payment_id: string
          valor: number
          valor_pago: number | null
          vencimento: string
        }
        Insert: {
          data_pagamento?: string | null
          id: string
          numero: number
          observacao?: string | null
          pago?: boolean
          payment_id: string
          valor: number
          valor_pago?: number | null
          vencimento: string
        }
        Update: {
          data_pagamento?: string | null
          id?: string
          numero?: number
          observacao?: string | null
          pago?: boolean
          payment_id?: string
          valor?: number
          valor_pago?: number | null
          vencimento?: string
        }
        Relationships: [
          {
            foreignKeyName: "insumo_payment_installments_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "insumo_payments"
            referencedColumns: ["id"]
          },
        ]
      }
      insumo_payment_events: {
        Row: {
          created_at: string
          data_pagamento: string
          id: string
          installment_id: string
          observacao: string | null
          payment_id: string
          tipo: string
          valor: number
        }
        Insert: {
          created_at?: string
          data_pagamento: string
          id: string
          installment_id: string
          observacao?: string | null
          payment_id: string
          tipo: string
          valor: number
        }
        Update: {
          created_at?: string
          data_pagamento?: string
          id?: string
          installment_id?: string
          observacao?: string | null
          payment_id?: string
          tipo?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "insumo_payment_events_installment_id_fkey"
            columns: ["installment_id"]
            isOneToOne: false
            referencedRelation: "insumo_payment_installments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insumo_payment_events_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "insumo_payments"
            referencedColumns: ["id"]
          },
        ]
      }
      insumo_payments: {
        Row: {
          created_at: string
          custo_total: number
          data_para_pagamento: string | null
          forma_pagamento: string
          id: string
          insumo_id: string
          parcelas: number
        }
        Insert: {
          created_at?: string
          custo_total: number
          data_para_pagamento?: string | null
          forma_pagamento: string
          id: string
          insumo_id: string
          parcelas?: number
        }
        Update: {
          created_at?: string
          custo_total?: number
          data_para_pagamento?: string | null
          forma_pagamento?: string
          id?: string
          insumo_id?: string
          parcelas?: number
        }
        Relationships: [
          {
            foreignKeyName: "insumo_payments_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "insumos"
            referencedColumns: ["id"]
          },
        ]
      }
      filamentos: {
        Row: {
          batch_id: string | null
          comentario: string | null
          cor: string
          created_at: string
          data_compra: string
          data_entrega: string | null
          data_fim: string | null
          id: string
          link_produto: string | null
          marca: string
          material: string
          observacao: string | null
          payment_id: string | null
          peso_atual: number
          peso_inicial: number
          preco_pago: number
          qualidade: string | null
          sku: string
        }
        Insert: {
          batch_id?: string | null
          comentario?: string | null
          cor: string
          created_at?: string
          data_compra: string
          data_entrega?: string | null
          data_fim?: string | null
          id: string
          link_produto?: string | null
          marca: string
          material: string
          observacao?: string | null
          payment_id?: string | null
          peso_atual: number
          peso_inicial: number
          preco_pago: number
          qualidade?: string | null
          sku: string
        }
        Update: {
          batch_id?: string | null
          comentario?: string | null
          cor?: string
          created_at?: string
          data_compra?: string
          data_entrega?: string | null
          data_fim?: string | null
          id?: string
          link_produto?: string | null
          marca?: string
          material?: string
          observacao?: string | null
          payment_id?: string | null
          peso_atual?: number
          peso_inicial?: number
          preco_pago?: number
          qualidade?: string | null
          sku?: string
        }
        Relationships: []
      }
      filamentos_history: {
        Row: {
          arquivado_at: string
          batch_id: string | null
          comentario: string | null
          cor: string
          data_compra: string
          data_entrega: string | null
          data_fim: string | null
          id: string
          link_produto: string | null
          marca: string
          material: string
          observacao: string | null
          payment_id: string | null
          peso_atual: number
          peso_inicial: number
          preco_pago: number
          qualidade: string | null
          sku: string
        }
        Insert: {
          arquivado_at?: string
          batch_id?: string | null
          comentario?: string | null
          cor: string
          data_compra: string
          data_entrega?: string | null
          data_fim?: string | null
          id: string
          link_produto?: string | null
          marca: string
          material: string
          observacao?: string | null
          payment_id?: string | null
          peso_atual: number
          peso_inicial: number
          preco_pago: number
          qualidade?: string | null
          sku: string
        }
        Update: {
          arquivado_at?: string
          batch_id?: string | null
          comentario?: string | null
          cor?: string
          data_compra?: string
          data_entrega?: string | null
          data_fim?: string | null
          id?: string
          link_produto?: string | null
          marca?: string
          material?: string
          observacao?: string | null
          payment_id?: string | null
          peso_atual?: number
          peso_inicial?: number
          preco_pago?: number
          qualidade?: string | null
          sku?: string
        }
        Relationships: []
      }
      insumos: {
        Row: {
          classificacao_financeira: string
          data_compra: string
          id: string
          link_produto: string | null
          nome: string
          payment_id: string | null
          preco_total: number
          quantidade: string
        }
        Insert: {
          classificacao_financeira?: string
          data_compra: string
          id: string
          link_produto?: string | null
          nome: string
          payment_id?: string | null
          preco_total: number
          quantidade: string
        }
        Update: {
          classificacao_financeira?: string
          data_compra?: string
          id?: string
          link_produto?: string | null
          nome?: string
          payment_id?: string | null
          preco_total?: number
          quantidade?: string
        }
        Relationships: []
      }
      inventory_txns: {
        Row: {
          created_at: string
          filament_id: string
          grams: number
          id: string
          order_id: string
          type: string
        }
        Insert: {
          created_at: string
          filament_id: string
          grams: number
          id: string
          order_id: string
          type: string
        }
        Update: {
          created_at?: string
          filament_id?: string
          grams?: number
          id?: string
          order_id?: string
          type?: string
        }
        Relationships: []
      }
      leads: {
        Row: {
          created_at: string
          id: string
          imagens: Json | null
          link_projeto: string | null
          mensagem: string
          nome: string
          whatsapp: string
        }
        Insert: {
          created_at?: string
          id: string
          imagens?: Json | null
          link_projeto?: string | null
          mensagem: string
          nome: string
          whatsapp: string
        }
        Update: {
          created_at?: string
          id?: string
          imagens?: Json | null
          link_projeto?: string | null
          mensagem?: string
          nome?: string
          whatsapp?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          client: string
          client_id: string | null
          created_at: string
          data_pagamento: string | null
          destino: string | null
          filamento_id: string | null
          forma_pagamento: string | null
          grams_per_unit: number | null
          id: string
          link_projeto: string | null
          multi_part: boolean | null
          portfolio_project_id: string | null
          preco_venda: number | null
          project_name: string
          quantity: number
          status: string
          time_minutes: number
          updated_at: string
          valor_recebido: number | null
        }
        Insert: {
          client: string
          client_id?: string | null
          created_at: string
          data_pagamento?: string | null
          destino?: string | null
          filamento_id?: string | null
          forma_pagamento?: string | null
          grams_per_unit?: number | null
          id: string
          link_projeto?: string | null
          multi_part?: boolean | null
          portfolio_project_id?: string | null
          preco_venda?: number | null
          project_name: string
          quantity: number
          status: string
          time_minutes: number
          updated_at: string
          valor_recebido?: number | null
        }
        Update: {
          client?: string
          client_id?: string | null
          created_at?: string
          data_pagamento?: string | null
          destino?: string | null
          filamento_id?: string | null
          forma_pagamento?: string | null
          grams_per_unit?: number | null
          id?: string
          link_projeto?: string | null
          multi_part?: boolean | null
          portfolio_project_id?: string | null
          preco_venda?: number | null
          project_name?: string
          quantity?: number
          status?: string
          time_minutes?: number
          updated_at?: string
          valor_recebido?: number | null
        }
        Relationships: []
      }
      order_parts: {
        Row: {
          created_at: string
          grams_per_unit: number
          id: string
          link_projeto: string | null
          nome: string
          notes: string | null
          order_id: string
          position: number
          quantity: number
          status: string
          time_minutes: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          grams_per_unit: number
          id: string
          link_projeto?: string | null
          nome: string
          notes?: string | null
          order_id: string
          position?: number
          quantity?: number
          status?: string
          time_minutes: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          grams_per_unit?: number
          id?: string
          link_projeto?: string | null
          nome?: string
          notes?: string | null
          order_id?: string
          position?: number
          quantity?: number
          status?: string
          time_minutes?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_parts_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolio_projects: {
        Row: {
          categoria: string
          created_at: string
          custo_rolo: number
          filamento_id: string | null
          id: string
          link_modelo: string | null
          nome: string
          perda_percent: number | null
          peso_peca: number
          peso_rolo: number
          preco_venda: number
          quantidade: number
          tempo_min: number
          updated_at: string
        }
        Insert: {
          categoria: string
          created_at: string
          custo_rolo: number
          filamento_id?: string | null
          id: string
          link_modelo?: string | null
          nome: string
          perda_percent?: number | null
          peso_peca: number
          peso_rolo: number
          preco_venda: number
          quantidade: number
          tempo_min: number
          updated_at: string
        }
        Update: {
          categoria?: string
          created_at?: string
          custo_rolo?: number
          filamento_id?: string | null
          id?: string
          link_modelo?: string | null
          nome?: string
          perda_percent?: number | null
          peso_peca?: number
          peso_rolo?: number
          preco_venda?: number
          quantidade?: number
          tempo_min?: number
          updated_at?: string
        }
        Relationships: []
      }
      site_content: {
        Row: {
          content: Json
          id: string
          updated_at: string
        }
        Insert: {
          content?: Json
          id?: string
          updated_at?: string
        }
        Update: {
          content?: Json
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          created_at: string
          id: string
          nome: string | null
          password_hash: string
          phone: string | null
          role: string
          updated_at: string
          username: string
        }
        Insert: {
          created_at: string
          id: string
          nome?: string | null
          password_hash: string
          phone?: string | null
          role?: string
          updated_at: string
          username: string
        }
        Update: {
          created_at?: string
          id?: string
          nome?: string | null
          password_hash?: string
          phone?: string | null
          role?: string
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      vendas: {
        Row: {
          client: string
          custo: number
          data: string
          depreciacao: number
          id: string
          order_id: string
          project_name: string
          valor: number
        }
        Insert: {
          client: string
          custo: number
          data: string
          depreciacao: number
          id: string
          order_id: string
          project_name: string
          valor: number
        }
        Update: {
          client?: string
          custo?: number
          data?: string
          depreciacao?: number
          id?: string
          order_id?: string
          project_name?: string
          valor?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
