import { ReactNode } from "react";

type Props = {
  children: ReactNode;
};

export function DashboardGlass({ children }: Props) {
  return <>{children}</>;
}