-- Restrict profiles SELECT to owner-only (was previously public)
DROP POLICY IF EXISTS "Public can read profiles for login" ON public.profiles;
CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = user_id);