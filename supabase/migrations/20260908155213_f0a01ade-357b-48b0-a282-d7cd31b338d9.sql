
REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.has_role(UUID, public.app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.org_role(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.can_view_org(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.can_manage_org(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.can_view_event(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.can_manage_event(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.verify_certificate(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.log_verification_attempt(TEXT, BOOLEAN) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.mark_certificate_downloaded(TEXT) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.org_role(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_view_org(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_manage_org(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_view_event(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_manage_event(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.verify_certificate(TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.log_verification_attempt(TEXT, BOOLEAN) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.mark_certificate_downloaded(TEXT) TO anon, authenticated, service_role;
