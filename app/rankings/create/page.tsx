// app/rankings/create/page.tsx
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { NewRankingForm } from "@/components/rankings/NewRankingForm";

export default async function CreateRankingPage() {
  const { userId } =  await auth();
  if (!userId) {
    redirect('/sign-in');
  }

  return (
    <> 
      <h1 className="text-2xl font-bold mb-6">新しいランキングを作成</h1>
      <NewRankingForm />
    </>
  );
}