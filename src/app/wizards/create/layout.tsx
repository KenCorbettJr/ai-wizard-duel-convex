import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create a Wizard",
};

export default function CreateWizardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
