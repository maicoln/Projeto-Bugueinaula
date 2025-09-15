// Tipagem genérica para resultados do Supabase
export type SupabaseQueryResult<T> = {
  data: T | null;
  error: Error | null;
};

/**
 * Função genérica para buscar dados do Supabase com tipagem correta
 * @param query - Função que retorna um Promise com data e error do Supabase
 * @returns Os dados tipados
 */
export async function supabaseFetcher<T>(
  query: () => Promise<SupabaseQueryResult<T>>
): Promise<T> {
  const { data, error } = await query();

  if (error) throw error;
  if (!data) throw new Error('Dados não encontrados.');

  return data;
}
