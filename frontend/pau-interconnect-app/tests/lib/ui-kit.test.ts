// @vitest-environment jsdom
import React, { act, createRef } from "react";
import { createRoot } from "react-dom/client";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  Button,
  Input,
  Select,
  Textarea,
  Modal,
  Card,
  StatusPill,
  EmptyState,
  StatCard,
  Tabs,
  ProgressBar,
} from "@/components/ui";
import { STATUS_STYLE_MAP } from "@/components/ui/StatusPill";

describe("UI Kit Components & Design System", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    (globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  describe("Button", () => {
    it("renders children and forwards ref", async () => {
      const ref = createRef<HTMLButtonElement>();
      const root = createRoot(container);

      await act(async () => {
        root.render(React.createElement(Button, { ref }, "Click Me"));
      });

      expect(ref.current).toBeInstanceOf(HTMLButtonElement);
      expect(ref.current?.textContent).toBe("Click Me");
      expect(ref.current?.getAttribute("type")).toBe("button");
    });

    it("handles disabled and isLoading states with ARIA attributes", async () => {
      const ref = createRef<HTMLButtonElement>();
      const root = createRoot(container);

      await act(async () => {
        root.render(
          React.createElement(
            Button,
            { ref, isLoading: true, disabled: true },
            "Submit",
          ),
        );
      });

      expect(ref.current?.getAttribute("aria-busy")).toBe("true");
      expect(ref.current?.getAttribute("aria-disabled")).toBe("true");
      expect(ref.current?.disabled).toBe(true);
    });
  });

  describe("Input", () => {
    it("forwards ref and binds label with htmlFor/id and error with aria-describedby", async () => {
      const ref = createRef<HTMLInputElement>();
      const root = createRoot(container);

      await act(async () => {
        root.render(
          React.createElement(Input, {
            ref,
            label: "Email Address",
            error: "Invalid email address",
          }),
        );
      });

      expect(ref.current).toBeInstanceOf(HTMLInputElement);
      const inputId = ref.current?.id;
      expect(inputId).toBeDefined();

      const label = container.querySelector("label");
      expect(label?.getAttribute("for")).toBe(inputId);

      const describedById = ref.current?.getAttribute("aria-describedby");
      expect(describedById).toBeDefined();

      const errorP = container.querySelector(`#${describedById}`);
      expect(errorP?.textContent).toBe("Invalid email address");
      expect(ref.current?.getAttribute("aria-invalid")).toBe("true");
    });
  });

  describe("Select", () => {
    it("forwards ref and binds label and error attributes", async () => {
      const ref = createRef<HTMLSelectElement>();
      const root = createRoot(container);

      await act(async () => {
        root.render(
          React.createElement(Select, {
            ref,
            label: "Department",
            error: "Please select an option",
            options: [{ value: "cs", label: "Computer Science" }],
          }),
        );
      });

      expect(ref.current).toBeInstanceOf(HTMLSelectElement);
      const selectId = ref.current?.id;
      const label = container.querySelector("label");
      expect(label?.getAttribute("for")).toBe(selectId);
      expect(ref.current?.getAttribute("aria-invalid")).toBe("true");
    });
  });

  describe("Textarea", () => {
    it("forwards ref and binds label and helperText", async () => {
      const ref = createRef<HTMLTextAreaElement>();
      const root = createRoot(container);

      await act(async () => {
        root.render(
          React.createElement(Textarea, {
            ref,
            label: "Cover Letter",
            helperText: "Minimum 200 words",
          }),
        );
      });

      expect(ref.current).toBeInstanceOf(HTMLTextAreaElement);
      const textareaId = ref.current?.id;
      const label = container.querySelector("label");
      expect(label?.getAttribute("for")).toBe(textareaId);

      const describedById = ref.current?.getAttribute("aria-describedby");
      const helper = container.querySelector(`#${describedById}`);
      expect(helper?.textContent).toBe("Minimum 200 words");
      expect(ref.current?.getAttribute("aria-invalid")).toBe("false");
    });
  });

  describe("Modal", () => {
    it("renders modal with dialog role, aria-modal, and handles Escape key", async () => {
      const onClose = vi.fn();
      const root = createRoot(container);

      await act(async () => {
        root.render(
          React.createElement(
            Modal,
            { isOpen: true, onClose, title: "Confirm Application" },
            React.createElement("p", null, "Are you sure you want to apply?"),
          ),
        );
      });

      const dialog = document.querySelector('[role="dialog"]');
      expect(dialog).not.toBeNull();
      expect(dialog?.getAttribute("aria-modal")).toBe("true");

      await act(async () => {
        window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
      });

      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe("Card", () => {
    it("forwards ref and executes onClick on Enter or Space for accessibility", async () => {
      const onClick = vi.fn();
      const ref = createRef<HTMLDivElement>();
      const root = createRoot(container);

      await act(async () => {
        root.render(
          React.createElement(Card, { ref, onClick }, "Card Body"),
        );
      });

      expect(ref.current?.getAttribute("role")).toBe("button");
      expect(ref.current?.getAttribute("tabindex")).toBe("0");

      await act(async () => {
        ref.current?.dispatchEvent(
          new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
        );
      });

      expect(onClick).toHaveBeenCalledTimes(1);
    });
  });

  describe("StatusPill Color Map", () => {
    it("covers all key application, logbook, and internship lifecycle statuses", async () => {
      const requiredStatuses = [
        "applied",
        "reviewed",
        "interview",
        "shortlisted",
        "offered",
        "accepted",
        "rejected",
        "withdrawn",
        "pending",
        "draft",
        "submitted",
        "approved",
        "needs_revision",
        "open",
        "closed",
        "active",
        "completed",
      ];

      for (const status of requiredStatuses) {
        expect(STATUS_STYLE_MAP[status]).toBeDefined();
        expect(STATUS_STYLE_MAP[status].label).toBeTruthy();
        expect(STATUS_STYLE_MAP[status].bgClass).toBeTruthy();
        expect(STATUS_STYLE_MAP[status].textClass).toBeTruthy();
        expect(STATUS_STYLE_MAP[status].icon).toBeDefined();
      }
    });

    it("renders StatusPill correctly", async () => {
      const root = createRoot(container);

      await act(async () => {
        root.render(React.createElement(StatusPill, { status: "offered" }));
      });

      expect(container.textContent).toContain("Offered");
    });
  });

  describe("Foundational UI Additions", () => {
    it("renders EmptyState with actions", async () => {
      const root = createRoot(container);
      const onAction = vi.fn();

      await act(async () => {
        root.render(
          React.createElement(EmptyState, {
            title: "No Data",
            description: "No items found",
            action: { label: "Create", onClick: onAction },
          }),
        );
      });

      expect(container.textContent).toContain("No Data");
      expect(container.textContent).toContain("No items found");
      const button = container.querySelector("button");
      expect(button?.textContent).toBe("Create");
    });

    it("renders StatCard with trend indicator", async () => {
      const root = createRoot(container);

      await act(async () => {
        root.render(
          React.createElement(StatCard, {
            label: "Total Match",
            value: "95%",
            change: { value: "+5%", trend: "up" },
          }),
        );
      });

      expect(container.textContent).toContain("Total Match");
      expect(container.textContent).toContain("95%");
      expect(container.textContent).toContain("+5%");
    });

    it("renders ProgressBar with ARIA values", async () => {
      const root = createRoot(container);

      await act(async () => {
        root.render(
          React.createElement(ProgressBar, { value: 65, max: 100 }),
        );
      });

      const bar = container.querySelector('[role="progressbar"]');
      expect(bar?.getAttribute("aria-valuenow")).toBe("65");
      expect(bar?.getAttribute("aria-valuemax")).toBe("100");
    });

    it("renders Tabs with tablist and tab roles", async () => {
      const root = createRoot(container);

      await act(async () => {
        root.render(
          React.createElement(Tabs, {
            tabs: [
              { id: "tab1", label: "First Tab" },
              { id: "tab2", label: "Second Tab" },
            ],
          }),
        );
      });

      const tablist = container.querySelector('[role="tablist"]');
      expect(tablist).not.toBeNull();
      const tabs = container.querySelectorAll('[role="tab"]');
      expect(tabs.length).toBe(2);
      expect(tabs[0].getAttribute("aria-selected")).toBe("true");
    });
  });
});
