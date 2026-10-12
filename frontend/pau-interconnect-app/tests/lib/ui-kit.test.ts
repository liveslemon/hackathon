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
  Badge,
  Typography,
} from "@/components/ui";

describe("UI Kit Components", () => {
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

      // Press Escape
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

  describe("Badge & Typography", () => {
    it("renders badge and typography with semantic tags", async () => {
      const badgeRef = createRef<HTMLSpanElement>();
      const typoRef = createRef<HTMLHeadingElement>();
      const root = createRoot(container);

      await act(async () => {
        root.render(
          React.createElement(
            "div",
            null,
            React.createElement(Badge, { ref: badgeRef, variant: "success" }, "Active"),
            React.createElement(Typography, { ref: typoRef, variant: "h2" }, "Dashboard"),
          ),
        );
      });

      expect(badgeRef.current?.tagName).toBe("SPAN");
      expect(typoRef.current?.tagName).toBe("H2");
      expect(typoRef.current?.textContent).toBe("Dashboard");
    });
  });
});
