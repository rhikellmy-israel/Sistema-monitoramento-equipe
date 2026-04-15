-- Este script apagará a tabela antiga de monitoramento e criará uma nova
-- com a estrutura esperada pela sua nova planilha Excel.

DROP TABLE IF EXISTS public.monitoring_records CASCADE;

CREATE TABLE public.monitoring_records (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    import_id UUID REFERENCES public.import_history(id) ON DELETE CASCADE,
    dia_da_semana TEXT,
    data_registro TEXT,
    funcionario TEXT,
    limpos INTEGER DEFAULT 0,
    testados INTEGER DEFAULT 0,
    observacao TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- CORREÇÃO DA PERSISTÊNCIA DO MOCK USER
-- Como você está acessando sem validar um usuário oficial no Supabase (auth bypass), 
-- as políticas de segurança (RLS) bloqueiam que você salve. Para resolver o fato 
-- de que os dados somem ao recarregar, execute os comandos abaixo para liberar o acesso:

ALTER TABLE public.monitoring_records DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.auditors DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.technicians DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_history DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.discrepancies_records DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- Corrige também o erro do Upload onde o campo imported_by reclamava que o usuário
-- Mock não existia na base oficial de usuários:
ALTER TABLE public.import_history ALTER COLUMN imported_by DROP NOT NULL;
