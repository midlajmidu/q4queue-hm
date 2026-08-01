import { redirect } from "next/navigation";

interface PageProps {
    params: Promise<{ orgSlug: string }>;
}

export default async function SessionsRedirectPage({ params }: PageProps) {
    const { orgSlug } = await params;
    redirect(`/${orgSlug}/dashboard/queues`);
}
