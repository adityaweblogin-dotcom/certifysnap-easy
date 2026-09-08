export type AppRole = "admin" | "organizer" | "viewer";
export type CertStatus = "draft" | "generated" | "sent" | "failed" | "downloaded";

export interface Organization {
  id: string;
  name: string;
  slug: string | null;
  logo_url: string | null;
  signature_url: string | null;
  website: string | null;
  is_demo: boolean;
  owner_id: string | null;
  created_at: string;
}

export interface EventRecord {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  event_date: string | null;
  certificate_type: string;
  status: string;
  schedule_enabled: boolean;
  schedule_cadence: string;
  schedule_batch_size: number;
  schedule_next_at: string | null;
  schedule_last_run_at: string | null;
  created_at: string;
}

export type ElementType = "text" | "field" | "image" | "qr" | "shape";

export interface TemplateElement {
  id: string;
  type: ElementType;
  text?: string;
  field?: string;
  src?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string;
  fontStyle?: string;
  textDecoration?: string;
  color?: string;
  align?: "left" | "center" | "right";
  letterSpacing?: number;
  lineHeight?: number;
  background?: string;
  radius?: number;
}

export interface TemplateRecord {
  id: string;
  event_id: string;
  name: string;
  background_url: string | null;
  background_color: string;
  width: number;
  height: number;
  elements: TemplateElement[];
  field_map: Record<string, string>;
  is_default: boolean;
}

export interface Participant {
  id: string;
  event_id: string;
  name: string;
  email: string;
  certificate_type: string | null;
  data: Record<string, string>;
  created_at: string;
}

export interface Certificate {
  id: string;
  event_id: string;
  participant_id: string;
  template_id: string | null;
  verification_code: string;
  status: CertStatus;
  values: Record<string, string>;
  issued_at: string;
  sent_at: string | null;
  downloaded_at: string | null;
  download_count: number;
  revoked: boolean;
  last_error: string | null;
}

export interface DeliveryLog {
  id: string;
  event_id: string;
  certificate_id: string | null;
  recipient_email: string | null;
  channel: string;
  status: string;
  detail: string | null;
  created_at: string;
}

export interface AuditLog {
  id: string;
  actor_id: string | null;
  actor_email: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  organization_id: string | null;
  event_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface VerificationResult {
  verification_code: string;
  valid: boolean;
  revoked: boolean;
  recipient_name: string;
  recipient_email_masked: string;
  certificate_type: string | null;
  event_name: string;
  event_date: string | null;
  organization_name: string;
  issued_at: string;
  sent_at: string | null;
  status: string;
}
