-- Crear enum para roles de usuario
CREATE TYPE public.user_role AS ENUM ('reg_user', 'nac_user', 'admin_user');

-- Crear enum para regiones
CREATE TYPE public.region AS ENUM ('Norte', 'Sur', 'Este', 'Oeste', 'Central');

-- Crear enum para tipos de garantía
CREATE TYPE public.tipo_garantia AS ENUM ('Fianza', 'Hipotecaria', 'Prendaria', 'Bancaria', 'Comercial');

-- Crear enum para tipos de operación
CREATE TYPE public.tipo_operacion AS ENUM ('Constitución', 'Renovación', 'Ampliación', 'Reducción', 'Cancelación');

-- Crear enum para monedas
CREATE TYPE public.currency AS ENUM ('BOB', 'USD', 'EUR');

-- Crear tabla de perfiles de usuario
CREATE TABLE public.profiles (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role user_role NOT NULL DEFAULT 'reg_user',
    region region,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Crear tabla de garantías
CREATE TABLE public.garantias (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    numero_poliza TEXT NOT NULL,
    ci_nit TEXT NOT NULL,
    region region NOT NULL,
    id_garantia TEXT NOT NULL,
    tipo_garantia tipo_garantia NOT NULL,
    tipo_operacion tipo_operacion NOT NULL,
    moneda currency NOT NULL,
    valor_nominal DECIMAL(15,2) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    deactivated_at TIMESTAMP WITH TIME ZONE,
    deactivated_by UUID REFERENCES auth.users(id)
);

-- Crear tabla de auditoría
CREATE TABLE public.audit_log (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    action TEXT NOT NULL,
    table_name TEXT NOT NULL,
    record_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS en todas las tablas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.garantias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Crear función para obtener el rol del usuario actual
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS user_role AS $$
    SELECT role FROM public.profiles WHERE user_id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Crear función para obtener la región del usuario actual
CREATE OR REPLACE FUNCTION public.get_current_user_region()
RETURNS region AS $$
    SELECT region FROM public.profiles WHERE user_id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Políticas RLS para profiles
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (user_id = auth.uid());

CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (public.get_current_user_role() = 'admin_user');

-- Políticas RLS para garantías
CREATE POLICY "Regional users can view garantias from their region" 
ON public.garantias 
FOR SELECT 
USING (
    CASE 
        WHEN public.get_current_user_role() = 'reg_user' THEN region = public.get_current_user_region()
        WHEN public.get_current_user_role() IN ('nac_user', 'admin_user') THEN true
        ELSE false
    END
);

CREATE POLICY "Regional users can insert garantias in their region" 
ON public.garantias 
FOR INSERT 
WITH CHECK (
    CASE 
        WHEN public.get_current_user_role() = 'reg_user' THEN region = public.get_current_user_region()
        WHEN public.get_current_user_role() IN ('nac_user', 'admin_user') THEN true
        ELSE false
    END
    AND created_by = auth.uid()
);

CREATE POLICY "Regional users can update garantias in their region" 
ON public.garantias 
FOR UPDATE 
USING (
    CASE 
        WHEN public.get_current_user_role() = 'reg_user' THEN region = public.get_current_user_region()
        WHEN public.get_current_user_role() IN ('nac_user', 'admin_user') THEN true
        ELSE false
    END
);

-- Políticas RLS para audit_log
CREATE POLICY "Users can view their own audit logs" 
ON public.audit_log 
FOR SELECT 
USING (
    CASE 
        WHEN public.get_current_user_role() = 'reg_user' THEN user_id = auth.uid()
        WHEN public.get_current_user_role() IN ('nac_user', 'admin_user') THEN true
        ELSE false
    END
);

CREATE POLICY "All authenticated users can insert audit logs" 
ON public.audit_log 
FOR INSERT 
WITH CHECK (user_id = auth.uid());

-- Crear función para registrar en audit_log
CREATE OR REPLACE FUNCTION public.log_audit_action(
    p_action TEXT,
    p_table_name TEXT,
    p_record_id UUID DEFAULT NULL,
    p_old_values JSONB DEFAULT NULL,
    p_new_values JSONB DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO public.audit_log (
        user_id,
        action,
        table_name,
        record_id,
        old_values,
        new_values,
        ip_address
    ) VALUES (
        auth.uid(),
        p_action,
        p_table_name,
        p_record_id,
        p_old_values,
        p_new_values,
        inet_client_addr()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Crear triggers para auditoría automática en garantías
CREATE OR REPLACE FUNCTION public.trigger_audit_garantias()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        PERFORM public.log_audit_action('INSERT', 'garantias', NEW.id, NULL, to_jsonb(NEW));
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        PERFORM public.log_audit_action('UPDATE', 'garantias', NEW.id, to_jsonb(OLD), to_jsonb(NEW));
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        PERFORM public.log_audit_action('DELETE', 'garantias', OLD.id, to_jsonb(OLD), NULL);
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER audit_garantias_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.garantias
    FOR EACH ROW EXECUTE FUNCTION public.trigger_audit_garantias();

-- Crear función para manejar nuevos usuarios
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (user_id, email, full_name, role, region)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data ->> 'full_name', 'Usuario'),
        COALESCE((NEW.raw_user_meta_data ->> 'role')::user_role, 'reg_user'),
        COALESCE((NEW.raw_user_meta_data ->> 'region')::region, 'Central')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Crear función para actualizar timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear triggers para actualizar timestamps
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_garantias_updated_at
    BEFORE UPDATE ON public.garantias
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();