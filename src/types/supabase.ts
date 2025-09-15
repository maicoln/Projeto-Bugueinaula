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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      alunos_pre_cadastrados: {
        Row: {
          escola_id: number
          ra: string
          turma_id: number
          user_id: string | null
        }
        Insert: {
          escola_id: number
          ra: string
          turma_id: number
          user_id?: string | null
        }
        Update: {
          escola_id?: number
          ra?: string
          turma_id?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "alunos_pre_cadastrados_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "escolas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alunos_pre_cadastrados_turma_id_fkey"
            columns: ["turma_id"]
            isOneToOne: false
            referencedRelation: "turmas"
            referencedColumns: ["id"]
          },
        ]
      }
      atividades_submissoes: {
        Row: {
          aluno_id: string
          arquivo_nome: string | null
          arquivo_url: string | null
          conteudo_id: number
          created_at: string | null
          feedback_texto: string | null
          id: number
          nota: number | null
          resposta_texto: string | null
          updated_at: string | null
        }
        Insert: {
          aluno_id: string
          arquivo_nome?: string | null
          arquivo_url?: string | null
          conteudo_id: number
          created_at?: string | null
          feedback_texto?: string | null
          id?: number
          nota?: number | null
          resposta_texto?: string | null
          updated_at?: string | null
        }
        Update: {
          aluno_id?: string
          arquivo_nome?: string | null
          arquivo_url?: string | null
          conteudo_id?: number
          created_at?: string | null
          feedback_texto?: string | null
          id?: number
          nota?: number | null
          resposta_texto?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "atividades_submissoes_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "atividades_submissoes_conteudo_id_fkey"
            columns: ["conteudo_id"]
            isOneToOne: false
            referencedRelation: "conteudos"
            referencedColumns: ["id"]
          },
        ]
      }
      conteudos: {
        Row: {
          bimestre: number
          created_at: string | null
          descricao: string | null
          disciplina_id: number
          id: number
          semana: number
          tipo: Database["public"]["Enums"]["tipo_conteudo_enum"]
          titulo: string
        }
        Insert: {
          bimestre: number
          created_at?: string | null
          descricao?: string | null
          disciplina_id: number
          id?: number
          semana: number
          tipo: Database["public"]["Enums"]["tipo_conteudo_enum"]
          titulo: string
        }
        Update: {
          bimestre?: number
          created_at?: string | null
          descricao?: string | null
          disciplina_id?: number
          id?: number
          semana?: number
          tipo?: Database["public"]["Enums"]["tipo_conteudo_enum"]
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "conteudos_disciplina_id_fkey"
            columns: ["disciplina_id"]
            isOneToOne: false
            referencedRelation: "disciplinas"
            referencedColumns: ["id"]
          },
        ]
      }
      disciplinas: {
        Row: {
          created_at: string | null
          escola_id: number
          id: number
          nome: string
        }
        Insert: {
          created_at?: string | null
          escola_id: number
          id?: number
          nome: string
        }
        Update: {
          created_at?: string | null
          escola_id?: number
          id?: number
          nome?: string
        }
        Relationships: [
          {
            foreignKeyName: "disciplinas_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "escolas"
            referencedColumns: ["id"]
          },
        ]
      }
      disciplinas_turmas: {
        Row: {
          disciplina_id: number
          turma_id: number
        }
        Insert: {
          disciplina_id: number
          turma_id: number
        }
        Update: {
          disciplina_id?: number
          turma_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "disciplinas_turmas_disciplina_id_fkey"
            columns: ["disciplina_id"]
            isOneToOne: false
            referencedRelation: "disciplinas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disciplinas_turmas_turma_id_fkey"
            columns: ["turma_id"]
            isOneToOne: false
            referencedRelation: "turmas"
            referencedColumns: ["id"]
          },
        ]
      }
      escolas: {
        Row: {
          created_at: string | null
          id: number
          nome: string
        }
        Insert: {
          created_at?: string | null
          id?: number
          nome: string
        }
        Update: {
          created_at?: string | null
          id?: number
          nome?: string
        }
        Relationships: []
      }
      jukebox_queue: {
        Row: {
          aluno_id: string
          created_at: string
          id: number
          song_title: string | null
          status: Database["public"]["Enums"]["jukebox_status_enum"]
          thumbnail_url: string | null
          youtube_url: string
        }
        Insert: {
          aluno_id: string
          created_at?: string
          id?: number
          song_title?: string | null
          status?: Database["public"]["Enums"]["jukebox_status_enum"]
          thumbnail_url?: string | null
          youtube_url: string
        }
        Update: {
          aluno_id?: string
          created_at?: string
          id?: number
          song_title?: string | null
          status?: Database["public"]["Enums"]["jukebox_status_enum"]
          thumbnail_url?: string | null
          youtube_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "jukebox_queue_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      professores_disciplinas: {
        Row: {
          disciplina_id: number
          professor_id: string
        }
        Insert: {
          disciplina_id: number
          professor_id: string
        }
        Update: {
          disciplina_id?: number
          professor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "professores_disciplinas_disciplina_id_fkey"
            columns: ["disciplina_id"]
            isOneToOne: false
            referencedRelation: "disciplinas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professores_disciplinas_professor_id_fkey"
            columns: ["professor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      professores_escolas: {
        Row: {
          escola_id: number
          professor_id: string
        }
        Insert: {
          escola_id: number
          professor_id: string
        }
        Update: {
          escola_id?: number
          professor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "professores_escolas_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "escolas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professores_escolas_professor_id_fkey"
            columns: ["professor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          escola_id: number | null
          id: string
          nome: string
          ra: string | null
          tipo_usuario: Database["public"]["Enums"]["tipo_usuario_enum"]
          turma_id: number | null
        }
        Insert: {
          escola_id?: number | null
          id: string
          nome: string
          ra?: string | null
          tipo_usuario: Database["public"]["Enums"]["tipo_usuario_enum"]
          turma_id?: number | null
        }
        Update: {
          escola_id?: number | null
          id?: string
          nome?: string
          ra?: string | null
          tipo_usuario?: Database["public"]["Enums"]["tipo_usuario_enum"]
          turma_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "escolas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_turma_id_fkey"
            columns: ["turma_id"]
            isOneToOne: false
            referencedRelation: "turmas"
            referencedColumns: ["id"]
          },
        ]
      }
      turmas: {
        Row: {
          created_at: string | null
          escola_id: number
          id: number
          nome: string
        }
        Insert: {
          created_at?: string | null
          escola_id: number
          id?: number
          nome: string
        }
        Update: {
          created_at?: string | null
          escola_id?: number
          id?: number
          nome?: string
        }
        Relationships: [
          {
            foreignKeyName: "turmas_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "escolas"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_my_user_type: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      pode_acessar_submissao: {
        Args: { p_path: string }
        Returns: boolean
      }
    }
    Enums: {
      jukebox_status_enum: "queued" | "playing" | "played" | "skipped"
      tipo_conteudo_enum: "MATERIAL_AULA" | "EXEMPLO" | "EXERCICIO" | "REGISTRO"
      tipo_usuario_enum: "ALUNO" | "PROFESSOR"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      jukebox_status_enum: ["queued", "playing", "played", "skipped"],
      tipo_conteudo_enum: ["MATERIAL_AULA", "EXEMPLO", "EXERCICIO", "REGISTRO"],
      tipo_usuario_enum: ["ALUNO", "PROFESSOR"],
    },
  },
} as const
