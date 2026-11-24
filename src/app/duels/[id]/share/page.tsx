import { redirect } from "next/navigation";

// The invite (QR code, duel code and link) now lives on the duel page itself,
// so the creator is already there when their opponent joins. Old share links
// land there too.
export default async function DuelSharePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/duels/${id}`);
}
