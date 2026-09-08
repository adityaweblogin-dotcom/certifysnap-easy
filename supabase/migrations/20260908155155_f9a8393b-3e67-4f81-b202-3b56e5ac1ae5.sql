
-- ENUMS
CREATE TYPE public.app_role AS ENUM ('admin','organizer','viewer');
CREATE TYPE public.cert_status AS ENUM ('draft','generated','sent','failed','downloaded');

-- shared updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

-- PROFILES
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select_auth" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- USER ROLES (global)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;
CREATE POLICY "user_roles_select_own_or_admin" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- new user -> profile + default organizer role
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1)))
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'organizer') ON CONFLICT DO NOTHING;
  RETURN NEW;
END $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ORGANIZATIONS
CREATE TABLE public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT,
  logo_url TEXT,
  signature_url TEXT,
  website TEXT,
  is_demo BOOLEAN NOT NULL DEFAULT false,
  owner_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organizations TO authenticated;
GRANT ALL ON public.organizations TO service_role;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER organizations_updated_at BEFORE UPDATE ON public.organizations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role public.app_role NOT NULL DEFAULT 'viewer',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organization_members TO authenticated;
GRANT ALL ON public.organization_members TO service_role;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.org_role(_org UUID)
RETURNS public.app_role LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE
    WHEN public.has_role(auth.uid(),'admin') THEN 'admin'::public.app_role
    WHEN EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = _org AND (o.owner_id = auth.uid() OR o.is_demo)) THEN 'admin'::public.app_role
    ELSE (SELECT m.role FROM public.organization_members m WHERE m.organization_id = _org AND m.user_id = auth.uid())
  END
$$;

CREATE OR REPLACE FUNCTION public.can_view_org(_org UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.org_role(_org) IS NOT NULL
$$;

CREATE OR REPLACE FUNCTION public.can_manage_org(_org UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.org_role(_org) IN ('admin','organizer')
$$;

CREATE POLICY "orgs_select_members" ON public.organizations FOR SELECT TO authenticated USING (public.can_view_org(id));
CREATE POLICY "orgs_insert_own" ON public.organizations FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
CREATE POLICY "orgs_update_managers" ON public.organizations FOR UPDATE TO authenticated USING (public.can_manage_org(id)) WITH CHECK (public.can_manage_org(id));
CREATE POLICY "orgs_delete_owner_admin" ON public.organizations FOR DELETE TO authenticated USING (owner_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "members_select" ON public.organization_members FOR SELECT TO authenticated USING (public.can_view_org(organization_id) OR user_id = auth.uid());
CREATE POLICY "members_write" ON public.organization_members FOR ALL TO authenticated USING (public.can_manage_org(organization_id)) WITH CHECK (public.can_manage_org(organization_id));

-- EVENTS
CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  event_date DATE,
  certificate_type TEXT NOT NULL DEFAULT 'Participation',
  status TEXT NOT NULL DEFAULT 'active',
  schedule_enabled BOOLEAN NOT NULL DEFAULT false,
  schedule_cadence TEXT NOT NULL DEFAULT 'daily',
  schedule_batch_size INTEGER NOT NULL DEFAULT 50,
  schedule_next_at TIMESTAMPTZ,
  schedule_last_run_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.events TO authenticated;
GRANT ALL ON public.events TO service_role;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER events_updated_at BEFORE UPDATE ON public.events FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE POLICY "events_select" ON public.events FOR SELECT TO authenticated USING (public.can_view_org(organization_id));
CREATE POLICY "events_write" ON public.events FOR ALL TO authenticated USING (public.can_manage_org(organization_id)) WITH CHECK (public.can_manage_org(organization_id));

CREATE OR REPLACE FUNCTION public.can_view_event(_event UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.can_view_org((SELECT organization_id FROM public.events WHERE id = _event))
$$;
CREATE OR REPLACE FUNCTION public.can_manage_event(_event UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.can_manage_org((SELECT organization_id FROM public.events WHERE id = _event))
$$;

-- TEMPLATES
CREATE TABLE public.templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Certificate template',
  background_url TEXT,
  background_color TEXT NOT NULL DEFAULT '#fdfaf3',
  width INTEGER NOT NULL DEFAULT 1000,
  height INTEGER NOT NULL DEFAULT 707,
  elements JSONB NOT NULL DEFAULT '[]'::jsonb,
  field_map JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_default BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.templates TO authenticated;
GRANT ALL ON public.templates TO service_role;
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER templates_updated_at BEFORE UPDATE ON public.templates FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE POLICY "templates_select" ON public.templates FOR SELECT TO authenticated USING (public.can_view_event(event_id));
CREATE POLICY "templates_write" ON public.templates FOR ALL TO authenticated USING (public.can_manage_event(event_id)) WITH CHECK (public.can_manage_event(event_id));

-- PARTICIPANTS
CREATE TABLE public.participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  certificate_type TEXT,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (event_id, email)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.participants TO authenticated;
GRANT ALL ON public.participants TO service_role;
ALTER TABLE public.participants ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER participants_updated_at BEFORE UPDATE ON public.participants FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE POLICY "participants_select" ON public.participants FOR SELECT TO authenticated USING (public.can_view_event(event_id));
CREATE POLICY "participants_write" ON public.participants FOR ALL TO authenticated USING (public.can_manage_event(event_id)) WITH CHECK (public.can_manage_event(event_id));

-- CERTIFICATES
CREATE TABLE public.certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES public.participants(id) ON DELETE CASCADE,
  template_id UUID REFERENCES public.templates(id) ON DELETE SET NULL,
  verification_code TEXT NOT NULL UNIQUE,
  status public.cert_status NOT NULL DEFAULT 'generated',
  values JSONB NOT NULL DEFAULT '{}'::jsonb,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at TIMESTAMPTZ,
  downloaded_at TIMESTAMPTZ,
  download_count INTEGER NOT NULL DEFAULT 0,
  revoked BOOLEAN NOT NULL DEFAULT false,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (participant_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.certificates TO authenticated;
GRANT ALL ON public.certificates TO service_role;
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER certificates_updated_at BEFORE UPDATE ON public.certificates FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE POLICY "certificates_select" ON public.certificates FOR SELECT TO authenticated USING (public.can_view_event(event_id));
CREATE POLICY "certificates_write" ON public.certificates FOR ALL TO authenticated USING (public.can_manage_event(event_id)) WITH CHECK (public.can_manage_event(event_id));

-- DELIVERY LOGS
CREATE TABLE public.delivery_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  certificate_id UUID REFERENCES public.certificates(id) ON DELETE CASCADE,
  recipient_email TEXT,
  channel TEXT NOT NULL DEFAULT 'email',
  status TEXT NOT NULL,
  detail TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.delivery_logs TO authenticated;
GRANT ALL ON public.delivery_logs TO service_role;
ALTER TABLE public.delivery_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "delivery_logs_select" ON public.delivery_logs FOR SELECT TO authenticated USING (public.can_view_event(event_id));
CREATE POLICY "delivery_logs_insert" ON public.delivery_logs FOR INSERT TO authenticated WITH CHECK (public.can_manage_event(event_id));

-- AUDIT LOGS
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID,
  actor_email TEXT,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  organization_id UUID,
  event_id UUID,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit_select_admin_or_org" ON public.audit_logs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR (organization_id IS NOT NULL AND public.can_manage_org(organization_id)) OR actor_id = auth.uid());
CREATE POLICY "audit_insert_auth" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (actor_id = auth.uid() OR actor_id IS NULL);
CREATE INDEX audit_logs_created_idx ON public.audit_logs (created_at DESC);

-- PUBLIC VERIFICATION
CREATE OR REPLACE FUNCTION public.verify_certificate(_code TEXT)
RETURNS TABLE (
  verification_code TEXT, valid BOOLEAN, revoked BOOLEAN, recipient_name TEXT, recipient_email_masked TEXT,
  certificate_type TEXT, event_name TEXT, event_date DATE, organization_name TEXT,
  issued_at TIMESTAMPTZ, sent_at TIMESTAMPTZ, status TEXT
) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
  SELECT c.verification_code, (NOT c.revoked), c.revoked, p.name,
    regexp_replace(p.email, '^(.).*(@.*)$', '\1***\2'),
    COALESCE(c.values->>'certificate_type', p.certificate_type, e.certificate_type),
    e.name, e.event_date, o.name, c.issued_at, c.sent_at, c.status::text
  FROM public.certificates c
  JOIN public.participants p ON p.id = c.participant_id
  JOIN public.events e ON e.id = c.event_id
  JOIN public.organizations o ON o.id = e.organization_id
  WHERE upper(c.verification_code) = upper(trim(_code));
END $$;
GRANT EXECUTE ON FUNCTION public.verify_certificate(TEXT) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.log_verification_attempt(_code TEXT, _found BOOLEAN)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.audit_logs (action, entity_type, entity_id, metadata, event_id, organization_id)
  SELECT 'certificate.verified', 'certificate', upper(trim(_code)),
    jsonb_build_object('found', _found), c.event_id, e.organization_id
  FROM public.certificates c JOIN public.events e ON e.id = c.event_id
  WHERE upper(c.verification_code) = upper(trim(_code));
  IF NOT _found THEN
    INSERT INTO public.audit_logs (action, entity_type, entity_id, metadata)
    VALUES ('certificate.verify_failed','certificate', upper(trim(_code)), jsonb_build_object('found', false));
  END IF;
END $$;
GRANT EXECUTE ON FUNCTION public.log_verification_attempt(TEXT, BOOLEAN) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.mark_certificate_downloaded(_code TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.certificates
  SET downloaded_at = now(), download_count = download_count + 1,
      status = CASE WHEN status IN ('sent','downloaded') THEN 'downloaded'::public.cert_status ELSE status END
  WHERE upper(verification_code) = upper(trim(_code)) AND revoked = false;
END $$;
GRANT EXECUTE ON FUNCTION public.mark_certificate_downloaded(TEXT) TO anon, authenticated;

-- DEMO DATA
INSERT INTO public.organizations (id, name, slug, website, is_demo)
VALUES ('11111111-1111-1111-1111-111111111111','ABC University (Demo)','abc-university','https://example.edu', true);

INSERT INTO public.events (id, organization_id, name, description, event_date, certificate_type, schedule_enabled, schedule_cadence, schedule_batch_size, schedule_next_at)
VALUES
 ('22222222-2222-2222-2222-222222222222','11111111-1111-1111-1111-111111111111','National College Hackathon 2026','48-hour national level hackathon','2026-08-20','Participation', true, 'daily', 50, now() + interval '1 day'),
 ('22222222-2222-2222-2222-222222222223','11111111-1111-1111-1111-111111111111','AI Workshop','Hands-on applied AI workshop','2026-05-12','Participation', false, 'weekly', 25, NULL);

INSERT INTO public.templates (id, event_id, name, elements, field_map)
VALUES ('33333333-3333-3333-3333-333333333333','22222222-2222-2222-2222-222222222222','Hackathon 2026 template',
 '[
  {"id":"t1","type":"text","text":"ABC UNIVERSITY","x":300,"y":60,"width":400,"height":40,"fontSize":26,"fontFamily":"Georgia","fontWeight":"700","color":"#1f2937","align":"center","letterSpacing":4},
  {"id":"t2","type":"text","text":"CERTIFICATE OF PARTICIPATION","x":200,"y":140,"width":600,"height":50,"fontSize":34,"fontFamily":"Georgia","fontWeight":"700","color":"#b45309","align":"center","letterSpacing":2},
  {"id":"t3","type":"text","text":"This certificate is proudly presented to","x":250,"y":225,"width":500,"height":30,"fontSize":16,"fontFamily":"Inter","fontWeight":"400","color":"#4b5563","align":"center"},
  {"id":"t4","type":"field","field":"name","text":"{{name}}","x":200,"y":265,"width":600,"height":60,"fontSize":44,"fontFamily":"Georgia","fontWeight":"700","color":"#111827","align":"center"},
  {"id":"t5","type":"field","field":"college","text":"{{college}}","x":250,"y":340,"width":500,"height":30,"fontSize":18,"fontFamily":"Inter","fontWeight":"500","color":"#374151","align":"center"},
  {"id":"t6","type":"field","field":"event_name","text":"{{event_name}}","x":200,"y":395,"width":600,"height":36,"fontSize":22,"fontFamily":"Inter","fontWeight":"600","color":"#1f2937","align":"center"},
  {"id":"t7","type":"field","field":"certificate_id","text":"Certificate ID: {{certificate_id}}","x":80,"y":620,"width":420,"height":24,"fontSize":13,"fontFamily":"Inter","fontWeight":"400","color":"#6b7280","align":"left"},
  {"id":"t8","type":"qr","text":"","x":860,"y":580,"width":100,"height":100}
 ]'::jsonb,
 '{"name":"name","email":"email","college":"college","team":"team","position":"position"}'::jsonb);

INSERT INTO public.templates (event_id, name)
VALUES ('22222222-2222-2222-2222-222222222223','AI Workshop template');

INSERT INTO public.participants (id, event_id, name, email, certificate_type, data) VALUES
 ('44444444-4444-4444-4444-444444444401','22222222-2222-2222-2222-222222222222','Rahul Sharma','rahul@example.com','Winner','{"college":"ABC College","team":"Team Alpha","position":"Winner"}'),
 ('44444444-4444-4444-4444-444444444402','22222222-2222-2222-2222-222222222222','Priya Shah','priya@example.com','Finalist','{"college":"XYZ College","team":"Team Beta","position":"Finalist"}'),
 ('44444444-4444-4444-4444-444444444403','22222222-2222-2222-2222-222222222222','Amit Kumar','amit@example.com','Participation','{"college":"ABC College","team":"Team Gamma","position":"Participant"}'),
 ('44444444-4444-4444-4444-444444444404','22222222-2222-2222-2222-222222222222','Neha Verma','neha@example.com','Participation','{"college":"LMN Institute","team":"Team Delta","position":"Participant"}'),
 ('44444444-4444-4444-4444-444444444405','22222222-2222-2222-2222-222222222223','Sara Ali','sara@example.com','Participation','{"college":"PQR College","team":"","position":"Participant"}');

INSERT INTO public.certificates (event_id, participant_id, template_id, verification_code, status, values, sent_at, downloaded_at, download_count) VALUES
 ('22222222-2222-2222-2222-222222222222','44444444-4444-4444-4444-444444444401','33333333-3333-3333-3333-333333333333','CERT-2026-A1B2C3','downloaded','{"name":"Rahul Sharma","college":"ABC College","certificate_type":"Winner","event_name":"National College Hackathon 2026"}', now() - interval '3 days', now() - interval '2 days', 2),
 ('22222222-2222-2222-2222-222222222222','44444444-4444-4444-4444-444444444402','33333333-3333-3333-3333-333333333333','CERT-2026-D4E5F6','sent','{"name":"Priya Shah","college":"XYZ College","certificate_type":"Finalist","event_name":"National College Hackathon 2026"}', now() - interval '3 days', NULL, 0),
 ('22222222-2222-2222-2222-222222222222','44444444-4444-4444-4444-444444444403','33333333-3333-3333-3333-333333333333','CERT-2026-G7H8I9','generated','{"name":"Amit Kumar","college":"ABC College","certificate_type":"Participation","event_name":"National College Hackathon 2026"}', NULL, NULL, 0);

INSERT INTO public.delivery_logs (event_id, certificate_id, recipient_email, status, detail)
SELECT c.event_id, c.id, p.email, 'sent', 'Demo delivery record'
FROM public.certificates c JOIN public.participants p ON p.id = c.participant_id WHERE c.sent_at IS NOT NULL;

INSERT INTO public.audit_logs (action, entity_type, entity_id, organization_id, event_id, metadata, actor_email) VALUES
 ('certificates.generated','event','22222222-2222-2222-2222-222222222222','11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222','{"count":3}','demo@example.com'),
 ('participants.imported','event','22222222-2222-2222-2222-222222222222','11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222','{"imported":4,"skipped":0}','demo@example.com'),
 ('certificates.bulk_sent','event','22222222-2222-2222-2222-222222222222','11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222','{"sent":2,"failed":0}','demo@example.com');
