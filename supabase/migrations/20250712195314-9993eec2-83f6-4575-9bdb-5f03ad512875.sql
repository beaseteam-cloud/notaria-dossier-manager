-- Update the user with email chenrigotta@gmail.com to admin role
UPDATE public.profiles 
SET role = 'admin' 
WHERE email = 'chenrigotta@gmail.com';