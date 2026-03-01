import { SignupForm } from '@/components/auth/SignupForm'

interface Props {
  searchParams: Promise<{ email?: string; auction_id?: string }>
}

export default async function SignupPage({ searchParams }: Props) {
  const { email, auction_id } = await searchParams
  return <SignupForm initialEmail={email} auctionId={auction_id} />
}
