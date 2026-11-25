export function parseCsv(input: string): string[][] {
  const text = input.replace(/^\uFEFF/, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];

    if (quoted) {
      if (char === '"') {
        if (text[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          quoted = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(field.trim());
      field = "";
    } else if (char === "\n") {
      row.push(field.trim());
      rows.push(row);
      row = [];
      field = "";
    } else if (char !== "\r") {
      field += char;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field.trim());
    rows.push(row);
  }

  return rows.filter((entry) => entry.some((cell) => cell.length > 0));
}

/** Quote a CSV cell and neutralize spreadsheet formula injection. */
export function csvCell(value: string | number | null | undefined) {
  let text = value === null || value === undefined ? "" : String(value);
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

export function toCsv(rows: (string | number | null | undefined)[][]) {
  return rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
}

export const STUDENT_CSV_HEADERS = [
  "studentNo",
  "firstName",
  "middleName",
  "lastName",
  "sex",
  "birthDate",
  "email",
  "className",
  "guardianName",
  "guardianPhone",
] as const;

export function studentCsvTemplate() {
  return [
    STUDENT_CSV_HEADERS.join(","),
    "2026-0101,Juan,Dela,Cruz,M,2011-05-14,juan@iscp.edu.ph,1st Year – BSCS A,Rosa Dela Cruz,09171234567",
    "2026-0102,Ana,M,Santos,F,2011-08-02,,1st Year – BSCS A,,",
  ].join("\n");
}
