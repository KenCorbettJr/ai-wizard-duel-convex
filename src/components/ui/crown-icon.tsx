import { LucideProps } from "lucide-react";

export const Crown = ({ className, ...props }: LucideProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm0 16h20" />
  </svg>
);
