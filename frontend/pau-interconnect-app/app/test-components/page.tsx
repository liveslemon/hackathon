import { notFound } from "next/navigation";
import TestComponentsClient from "./TestComponentsClient";

export default function TestComponentsPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return <TestComponentsClient />;
}
