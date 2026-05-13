import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Download, ExternalLink, FileText } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'

export default async function DocumentViewerPage({
  params,
}: {
  params: Promise<{ id: string; docId: string }>
}) {
  const { id, docId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: doc } = await supabase
    .from('documents')
    .select('*')
    .eq('id', docId)
    .eq('user_id', user!.id)
    .single()

  if (!doc) notFound()

  const { data: urlData } = await supabase.storage
    .from('documents')
    .createSignedUrl(doc.file_url, 3600)

  const signedUrl = urlData?.signedUrl ?? null
  const isImage = doc.mime_type?.startsWith('image/')
  const isPdf = doc.mime_type === 'application/pdf'
  const uploadDate = new Date(doc.upload_date).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })

  const typeLabels: Record<string, string> = {
    flight_confirmation: 'Flight confirmation',
    boarding_pass: 'Boarding pass',
    hotel_confirmation: 'Hotel booking',
    travel_insurance: 'Travel insurance',
    visa: 'Visa',
  }
  const typeLabel = typeLabels[doc.type as string] ?? (
    (doc.type as string)
      ? (doc.type as string).charAt(0).toUpperCase() + (doc.type as string).slice(1).replace(/_/g, ' ')
      : null
  )

  return (
    <div className="max-w-lg mx-auto px-4 pt-6">
      <div className="flex items-center gap-3 mb-6">
        <Link
          href={`/trips/${id}`}
          className="text-muted-foreground min-h-[44px] min-w-[44px] flex items-center shrink-0"
        >
          <ArrowLeft size={20} />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="font-bold text-base leading-tight truncate">{doc.name}</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {typeLabel ? `${typeLabel} · ` : ''}Uploaded {uploadDate}
          </p>
        </div>
      </div>

      {/* Image preview */}
      {signedUrl && isImage && (
        <img
          src={signedUrl}
          alt={doc.name}
          className="w-full rounded-xl border border-border object-contain mb-4"
          style={{ maxHeight: '60vh' }}
        />
      )}

      {/* PDF: show card + open button */}
      {isPdf && (
        <div className="rounded-xl border border-border bg-muted/50 px-6 py-10 flex flex-col items-center gap-4 mb-4">
          <FileText size={40} className="text-muted-foreground" />
          <p className="text-sm text-muted-foreground text-center truncate max-w-full">{doc.name}</p>
          {signedUrl && (
            <a
              href={signedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-border text-sm font-semibold"
            >
              <ExternalLink size={14} />
              Open PDF
            </a>
          )}
        </div>
      )}

      {/* Unknown type */}
      {!isImage && !isPdf && (
        <div className="rounded-xl border border-border bg-muted/50 px-6 py-10 flex flex-col items-center gap-3 mb-4">
          <FileText size={40} className="text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Preview not available</p>
        </div>
      )}

      {/* Download */}
      {signedUrl && (
        <a
          href={signedUrl}
          download={doc.name}
          className="flex items-center justify-center gap-2 w-full h-12 rounded-xl border border-border text-sm font-semibold"
        >
          <Download size={16} />
          Download
        </a>
      )}
    </div>
  )
}
