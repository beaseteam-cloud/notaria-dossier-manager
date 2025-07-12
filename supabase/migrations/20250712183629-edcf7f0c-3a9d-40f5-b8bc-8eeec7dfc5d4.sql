-- Fix the handle_new_user function to properly handle user_role type conversion
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  user_role_value public.user_role := 'clerc';
BEGIN
  -- Safely convert role from metadata, default to 'clerc' if invalid
  IF NEW.raw_user_meta_data ->> 'role' IS NOT NULL THEN
    CASE NEW.raw_user_meta_data ->> 'role'
      WHEN 'admin' THEN user_role_value := 'admin';
      WHEN 'collaborateur' THEN user_role_value := 'collaborateur';
      WHEN 'clerc' THEN user_role_value := 'clerc';
      ELSE user_role_value := 'clerc';
    END CASE;
  END IF;

  INSERT INTO public.profiles (user_id, email, nom, prenom, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'nom', 'Nom'),
    COALESCE(NEW.raw_user_meta_data ->> 'prenom', 'Prénom'),
    user_role_value
  );
  RETURN NEW;
END;
$$;