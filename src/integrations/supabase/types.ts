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
      comprovantes_pagamento: {
        Row: {
          arquivo_nome: string
          arquivo_tipo: string
          arquivo_url: string
          data_expiracao: string
          data_upload: string
          id: string
          pagamento_id: string
        }
        Insert: {
          arquivo_nome: string
          arquivo_tipo: string
          arquivo_url: string
          data_expiracao?: string
          data_upload?: string
          id?: string
          pagamento_id: string
        }
        Update: {
          arquivo_nome?: string
          arquivo_tipo?: string
          arquivo_url?: string
          data_expiracao?: string
          data_upload?: string
          id?: string
          pagamento_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comprovantes_pagamento_pagamento_id_fkey"
            columns: ["pagamento_id"]
            isOneToOne: false
            referencedRelation: "pagamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      contas: {
        Row: {
          codigo_barras: string | null
          created_at: string | null
          data_emissao: string | null
          deleted_at: string | null
          desconto: number | null
          descricao: string
          empresa: string
          fornecedor_id: string | null
          grupo_parcela_id: string | null
          id: string
          juros: number | null
          multa: number | null
          observacoes: string | null
          parcela_numero: number | null
          responsavel: string | null
          total_pago: number | null
          total_parcelas: number | null
          valor_total: number
          vencimento: string
        }
        Insert: {
          codigo_barras?: string | null
          created_at?: string | null
          data_emissao?: string | null
          deleted_at?: string | null
          desconto?: number | null
          descricao: string
          empresa: string
          fornecedor_id?: string | null
          grupo_parcela_id?: string | null
          id?: string
          juros?: number | null
          multa?: number | null
          observacoes?: string | null
          parcela_numero?: number | null
          responsavel?: string | null
          total_pago?: number | null
          total_parcelas?: number | null
          valor_total: number
          vencimento: string
        }
        Update: {
          codigo_barras?: string | null
          created_at?: string | null
          data_emissao?: string | null
          deleted_at?: string | null
          desconto?: number | null
          descricao?: string
          empresa?: string
          fornecedor_id?: string | null
          grupo_parcela_id?: string | null
          id?: string
          juros?: number | null
          multa?: number | null
          observacoes?: string | null
          parcela_numero?: number | null
          responsavel?: string | null
          total_pago?: number | null
          total_parcelas?: number | null
          valor_total?: number
          vencimento?: string
        }
        Relationships: [
          {
            foreignKeyName: "contas_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
        ]
      }
      fornecedores: {
        Row: {
          created_at: string | null
          empresa: string
          id: string
          nome: string
          observacao: string | null
        }
        Insert: {
          created_at?: string | null
          empresa: string
          id?: string
          nome: string
          observacao?: string | null
        }
        Update: {
          created_at?: string | null
          empresa?: string
          id?: string
          nome?: string
          observacao?: string | null
        }
        Relationships: []
      }
      pagamentos: {
        Row: {
          conta_id: string
          created_at: string | null
          data: string
          forma: string | null
          id: string
          observacao: string | null
          valor: number
        }
        Insert: {
          conta_id: string
          created_at?: string | null
          data: string
          forma?: string | null
          id?: string
          observacao?: string | null
          valor: number
        }
        Update: {
          conta_id?: string
          created_at?: string | null
          data?: string
          forma?: string | null
          id?: string
          observacao?: string | null
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "pagamentos_conta_id_fkey"
            columns: ["conta_id"]
            isOneToOne: false
            referencedRelation: "contas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pagamentos_conta_id_fkey"
            columns: ["conta_id"]
            isOneToOne: false
            referencedRelation: "contas_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pagamentos_conta_id_fkey"
            columns: ["conta_id"]
            isOneToOne: false
            referencedRelation: "v_contas_pagar"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      contas_view: {
        Row: {
          created_at: string | null
          descricao: string | null
          empresa: string | null
          id: string | null
          pagamentos_acumulados: number | null
          saldo: number | null
          status: string | null
          total_pago: number | null
          valor_total: number | null
          vencimento: string | null
        }
        Relationships: []
      }
      v_contas_pagar: {
        Row: {
          created_at: string | null
          data_emissao: string | null
          data_vencimento: string | null
          deleted_at: string | null
          desconto: number | null
          descricao: string | null
          empresa_id: string | null
          fornecedor_id: string | null
          id: string | null
          juros: number | null
          multa: number | null
          observacoes: string | null
          responsavel: string | null
          status_calc: string | null
          valor_aberto: number | null
          valor_original: number | null
          valor_pago_total: number | null
        }
        Insert: {
          created_at?: string | null
          data_emissao?: string | null
          data_vencimento?: string | null
          deleted_at?: string | null
          desconto?: number | null
          descricao?: string | null
          empresa_id?: never
          fornecedor_id?: string | null
          id?: string | null
          juros?: number | null
          multa?: number | null
          observacoes?: string | null
          responsavel?: string | null
          status_calc?: never
          valor_aberto?: never
          valor_original?: number | null
          valor_pago_total?: never
        }
        Update: {
          created_at?: string | null
          data_emissao?: string | null
          data_vencimento?: string | null
          deleted_at?: string | null
          desconto?: number | null
          descricao?: string | null
          empresa_id?: never
          fornecedor_id?: string | null
          id?: string | null
          juros?: number | null
          multa?: number | null
          observacoes?: string | null
          responsavel?: string | null
          status_calc?: never
          valor_aberto?: never
          valor_original?: number | null
          valor_pago_total?: never
        }
        Relationships: [
          {
            foreignKeyName: "contas_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      fn_proximas_contas: {
        Args: { p_empresa: string; p_limite?: number }
        Returns: {
          data_vencimento: string
          descricao: string
          fornecedor: string
          id: string
          status_calc: string
          valor_aberto: number
        }[]
      }
      fn_resumo_cp: {
        Args: { p_empresa: string; p_ref?: string }
        Returns: {
          qtd_pagas_mes: number
          qtd_pendentes: number
          qtd_vencidas: number
          total_hoje: number
          total_mes_atual: number
          total_prox_semana: number
        }[]
      }
      rpc_contas_proximas: {
        Args: { p_empresa: string; p_hoje: string }
        Returns: {
          descricao: string
          id: string
          saldo: number
          status: string
          vencimento: string
        }[]
      }
      rpc_contas_vencidas_e_hoje: {
        Args: { p_empresa: string; p_hoje: string }
        Returns: {
          descricao: string
          id: string
          is_hoje: boolean
          is_vencido: boolean
          saldo: number
          status: string
          vencimento: string
        }[]
      }
      rpc_dashboard_resumo: {
        Args: {
          p_empresa: string
          p_fim_mes: string
          p_hoje: string
          p_inicio_mes: string
        }
        Returns: {
          contas_pagas_mes: number
          contas_pendentes: number
          contas_vencidas: number
        }[]
      }
      rpc_total_contas_do_dia: {
        Args: { p_data: string; p_empresa: string }
        Returns: number
      }
      rpc_total_mes_atual: {
        Args: { p_data_fim: string; p_data_inicio: string; p_empresa: string }
        Returns: number
      }
      rpc_total_proxima_semana: {
        Args: { p_data_fim: string; p_data_inicio: string; p_empresa: string }
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
