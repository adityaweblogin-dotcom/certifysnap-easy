import Papa from "papaparse";

import type { ParticipantDraft } from "@/services/participants";

export const REQUIRED_TARGETS = ["name", "email"] as const;
export const OPTIONAL_TARGETS = ["certificate_type", "college", "team", "position"] as const;

export type ColumnMapping = Record<string, string>; // target field -> source column

export interface ParsedSheet {
  headers: string[];
  rows: Record<string, string>[];
}

export interface RowIssue {
  row: number;
  column: string;
  message: string;
  value: string;
}

export interface ValidationReport {
  valid: ParticipantDraft[];
  issues: RowIssue[];
  duplicatesInFile: number;
  totalRows: number;
}

export function parseDelimited(file: File): Promise<ParsedSheet> {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: "greedy",
      transformHeader: (h) => h.trim(),
      complete: (result) => {
        const headers = (result.meta.fields ?? []).filter((h) => h && h.length > 0);
        const rows = result.data.map((row) => {
          const clean: Record<string, string> = {};
          for (const key of headers) clean[key] = String(row[key] ?? "").trim();
          return clean;
        });
        resolve({ headers, rows });
      },
      error: (error) => reject(new Error(error.message)),
    });
  });
}

/** Guesses which uploaded column feeds each certificate field. */
export function autoMap(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {};
  const normalized = headers.map((h) => ({ header: h, key: h.toLowerCase().replace(/[^a-z]/g, "") }));
  const candidates: Record<string, string[]> = {
    name: ["name", "fullname", "participantname", "student"],
    email: ["email", "emailaddress", "mail"],
    certificate_type: ["certificatetype", "type", "category", "award", "position"],
    college: ["college", "institute", "institution", "school", "organization"],
    team: ["team", "teamname", "group"],
    position: ["position", "rank", "result"],
  };
  for (const [target, aliases] of Object.entries(candidates)) {
    const hit = normalized.find((n) => aliases.includes(n.key));
    if (hit) mapping[target] = hit.header;
  }
  return mapping;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function validateRows(
  sheet: ParsedSheet,
  mapping: ColumnMapping,
  existingEmails: string[] = [],
): ValidationReport {
  const issues: RowIssue[] = [];
  const valid: ParticipantDraft[] = [];
  const seen = new Set<string>();
  const existing = new Set(existingEmails.map((e) => e.toLowerCase()));
  let duplicatesInFile = 0;

  const nameColumn = mapping["name"];
  const emailColumn = mapping["email"];

  sheet.rows.forEach((row, index) => {
    const rowNumber = index + 2; // account for the header row
    const name = nameColumn ? (row[nameColumn] ?? "") : "";
    const email = emailColumn ? (row[emailColumn] ?? "") : "";
    let rowValid = true;

    if (!nameColumn || name.length === 0) {
      issues.push({ row: rowNumber, column: "name", message: "Name is required", value: name });
      rowValid = false;
    } else if (name.length > 120) {
      issues.push({ row: rowNumber, column: "name", message: "Name is too long (max 120)", value: name });
      rowValid = false;
    }

    if (!emailColumn || email.length === 0) {
      issues.push({ row: rowNumber, column: "email", message: "Email is required", value: email });
      rowValid = false;
    } else if (!EMAIL_RE.test(email)) {
      issues.push({ row: rowNumber, column: "email", message: "Email address is not valid", value: email });
      rowValid = false;
    } else if (seen.has(email.toLowerCase())) {
      duplicatesInFile += 1;
      issues.push({ row: rowNumber, column: "email", message: "Duplicate row in this file", value: email });
      rowValid = false;
    }

    if (!rowValid) return;

    seen.add(email.toLowerCase());
    const data: Record<string, string> = {};
    for (const [target, column] of Object.entries(mapping)) {
      if (target === "name" || target === "email" || target === "certificate_type") continue;
      const value = row[column] ?? "";
      if (value.length > 0) data[target] = value;
    }
    const typeColumn = mapping["certificate_type"];
    valid.push({
      name,
      email: email.toLowerCase(),
      certificate_type: typeColumn ? (row[typeColumn] ?? null) || null : null,
      data,
    });
    if (existing.has(email.toLowerCase())) {
      issues.push({
        row: rowNumber,
        column: "email",
        message: "Already in this event — will be updated",
        value: email,
      });
    }
  });

  return { valid, issues, duplicatesInFile, totalRows: sheet.rows.length };
}

export function isBlockingIssue(issue: RowIssue): boolean {
  return !issue.message.startsWith("Already in this event");
}

export const SAMPLE_CSV = `name,email,college,team,position
Rahul Sharma,rahul@example.com,ABC College,Team Alpha,Winner
Priya Shah,priya@example.com,XYZ College,Team Beta,Finalist
Amit Kumar,amit@example.com,ABC College,Team Gamma,Participant
`;
