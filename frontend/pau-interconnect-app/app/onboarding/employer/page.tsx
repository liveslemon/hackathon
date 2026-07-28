import { redirect } from "next/navigation";

export default function EmployerOnboardingRoute() {
  redirect("/onboarding?role=employer");
}
