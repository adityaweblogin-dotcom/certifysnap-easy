
CREATE POLICY "cert_assets_read" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'certificate-assets');
CREATE POLICY "cert_assets_insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'certificate-assets');
CREATE POLICY "cert_assets_update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'certificate-assets') WITH CHECK (bucket_id = 'certificate-assets');
CREATE POLICY "cert_assets_delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'certificate-assets' AND owner = auth.uid());
