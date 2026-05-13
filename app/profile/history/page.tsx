import { redirect } from 'next/navigation'

export default function TravelHistoryRedirect({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>
}) {
  redirect('/wallet/history')
}
