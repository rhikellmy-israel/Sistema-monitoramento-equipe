/**
 * Product Dictionary — HashMap para tradução de IDs de produto para descrições legíveis.
 * Consumido globalmente por qualquer componente que exiba IDs de produto.
 */
import { useMemo } from "react";
import { ProductBaseRecord } from "../types";
import { useData } from "../context/DataContext";

/**
 * Constrói o HashMap de produtos: chave = id_produto, valor = descricao
 */
export function buildProductDictionary(products: ProductBaseRecord[]): Map<string, string> {
  const dict = new Map<string, string>();
  for (const p of products) {
    if (p.id_produto && p.descricao) {
      dict.set(String(p.id_produto).trim(), p.descricao.trim());
    }
  }
  return dict;
}

/**
 * Faz lookup no dicionário e retorna a descrição.
 * Se não encontrado, retorna o ID original como fallback.
 */
export function resolveProductName(id: string | number, dict: Map<string, string>): string {
  const key = String(id).trim();
  return dict.get(key) || key;
}

/**
 * Hook que expõe o dicionário memoizado e um helper de resolução.
 * Uso: const { dict, resolve } = useProductDictionary();
 *      resolve("12345") => "ONT HUAWEI EG8145X6"
 */
export function useProductDictionary() {
  const { productsBase } = useData();

  const dict = useMemo(() => buildProductDictionary(productsBase), [productsBase]);

  const resolve = useMemo(
    () => (id: string | number) => resolveProductName(id, dict),
    [dict]
  );

  return { dict, resolve };
}
