// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  sanitizeCSVValue,
  escapeCSVCell,
  generateCSV,
  downloadCSV,
} from "@/lib/csv";

describe("lib/csv", () => {
  describe("sanitizeCSVValue", () => {
    it("returns empty string for null and undefined", () => {
      expect(sanitizeCSVValue(null)).toBe("");
      expect(sanitizeCSVValue(undefined)).toBe("");
    });

    it("preserves standard string, numeric, and boolean values", () => {
      expect(sanitizeCSVValue("Hello World")).toBe("Hello World");
      expect(sanitizeCSVValue(123)).toBe("123");
      expect(sanitizeCSVValue(0)).toBe("0");
      expect(sanitizeCSVValue(false)).toBe("false");
      expect(sanitizeCSVValue(true)).toBe("true");
    });

    it("neutralizes formula injection characters (=, +, -, @, \\t, \\r)", () => {
      expect(sanitizeCSVValue("=SUM(A1:A10)")).toBe("'=SUM(A1:A10)");
      expect(sanitizeCSVValue("+12345")).toBe("'+12345");
      expect(sanitizeCSVValue("-50")).toBe("'-50");
      expect(sanitizeCSVValue("@cmd|' /C calc'!A0")).toBe("'@cmd|' /C calc'!A0");
      expect(sanitizeCSVValue("\tLeadingTab")).toBe("'\tLeadingTab");
      expect(sanitizeCSVValue("\rLeadingCR")).toBe("'\rLeadingCR");
    });

    it("neutralizes formula characters preceded by whitespace", () => {
      expect(sanitizeCSVValue("   =2+2")).toBe("'   =2+2");
      expect(sanitizeCSVValue("   @SUM(1,2)")).toBe("'   @SUM(1,2)");
    });
  });

  describe("escapeCSVCell", () => {
    it("wraps value in double quotes and escapes internal quotes", () => {
      expect(escapeCSVCell('John "The Boss" Doe')).toBe(
        '"John ""The Boss"" Doe"',
      );
    });

    it("safely wraps values containing commas and newlines", () => {
      expect(escapeCSVCell("Lagos, Nigeria")).toBe('"Lagos, Nigeria"');
      expect(escapeCSVCell("Line 1\nLine 2")).toBe('"Line 1\nLine 2"');
    });

    it("escapes formula injection prefixes with leading single quote inside quotes", () => {
      expect(escapeCSVCell("=1+1")).toBe('"\'=1+1"');
      expect(escapeCSVCell("+44 123 456")).toBe('"\'+44 123 456"');
    });
  });

  describe("generateCSV", () => {
    it("correctly generates RFC 4180 CSV with escaped headers and rows", () => {
      const headers = ["Name", "Role, Title", 'Notes with "Quotes"'];
      const rows = [
        ["Alice", "Software Engineer", 'Works on "FastAPI"'],
        ["Bob", "Designer", "Line 1\nLine 2"],
        [0, false, null],
      ];

      const csv = generateCSV(headers, rows);
      const lines = csv.split("\r\n");

      expect(lines).toHaveLength(4);
      expect(lines[0]).toBe('"Name","Role, Title","Notes with ""Quotes"""');
      expect(lines[1]).toBe('"Alice","Software Engineer","Works on ""FastAPI"""');
      expect(lines[2]).toBe('"Bob","Designer","Line 1\nLine 2"');
      expect(lines[3]).toBe('"0","false",""');
    });

    it("prevents formula injection in both headers and data cells", () => {
      const headers = ["=FormulaHeader", "SafeHeader"];
      const rows = [["=cmd|' /C calc'!A0", "-50"]];

      const csv = generateCSV(headers, rows);
      expect(csv).toContain('"\'=FormulaHeader","SafeHeader"');
      expect(csv).toContain('"\'=cmd|\' /C calc\'!A0","\'-50"');
    });
  });

  describe("downloadCSV", () => {
    let originalCreateObjectURL: typeof URL.createObjectURL;
    let originalRevokeObjectURL: typeof URL.revokeObjectURL;

    beforeEach(() => {
      originalCreateObjectURL = URL.createObjectURL;
      originalRevokeObjectURL = URL.revokeObjectURL;
      URL.createObjectURL = vi.fn(() => "blob:http://localhost/test-blob-url");
      URL.revokeObjectURL = vi.fn();
    });

    afterEach(() => {
      URL.createObjectURL = originalCreateObjectURL;
      URL.revokeObjectURL = originalRevokeObjectURL;
      vi.restoreAllMocks();
    });

    it("creates a downloadable blob with UTF-8 BOM and triggers download", () => {
      const appendChildSpy = vi.spyOn(document.body, "appendChild");
      const removeChildSpy = vi.spyOn(document.body, "removeChild");

      const headers = ["Name", "Score"];
      const rows = [["Alice", "95"]];

      downloadCSV(headers, rows, "students_report");

      expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
      const blobArg = (URL.createObjectURL as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0] as Blob;
      expect(blobArg).toBeInstanceOf(Blob);
      expect(blobArg.type).toBe("text/csv;charset=utf-8;");

      expect(appendChildSpy).toHaveBeenCalled();
      expect(removeChildSpy).toHaveBeenCalled();
      expect(URL.revokeObjectURL).toHaveBeenCalledWith(
        "blob:http://localhost/test-blob-url",
      );
    });
  });
});
