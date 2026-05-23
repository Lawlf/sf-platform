import { CreditCardForm } from "./_components/credit-card-form";

interface PageProps {
  searchParams: Promise<{ existing?: string }>;
}

export default async function CartaoPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  return <CreditCardForm existing={sp.existing === "1"} />;
}
