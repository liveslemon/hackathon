import { notFound } from "next/navigation";
import TestConnectionClient from "./TestConnectionClient";

export default function TestConnectionPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return <TestConnectionClient />;
}
