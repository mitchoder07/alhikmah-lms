'use client'

import { useEffect, useState, useRef } from 'react'
import QRCode from 'qrcode'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Award, Download, ExternalLink, ShieldCheck, Loader2 } from 'lucide-react'

export function CertificatePreview({
  cert,
}: {
  cert: {
    certificateNumber: string
    issuedAt: string
    score: number
    studentName: string
    matricNumber: string | null
    department: string
    courseCode: string
    courseTitle: string
    creditUnit: number
    lecturerName: string
    // Optional: lecturer's scanned signature (base64 data URL). If present,
    // we render the signature image above the printed lecturer name line.
    lecturerSignatureUrl?: string | null
  }
}) {
  const [qrUrl, setQrUrl] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const certRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const verifyUrl = `${window.location.origin}/verify-certificate?cert=${cert.certificateNumber}`
    QRCode.toDataURL(verifyUrl, {
      width: 200,
      margin: 1,
      color: { dark: '#006633', light: '#ffffff' },
      errorCorrectionLevel: 'H',
    }).then(setQrUrl).finally(() => setLoading(false))
  }, [cert.certificateNumber])

  const handleDownload = () => {
    // Open a clean new window with just the certificate — no parent CSS to interfere
    const win = window.open('', '_blank', 'width=1200,height=800')
    if (!win) {
      alert('Please allow popups to download the certificate.')
      return
    }

    const issuedDate = new Date(cert.issuedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    const verifyUrl = `${window.location.origin}/verify-certificate?cert=${cert.certificateNumber}`

    // Signature image HTML — only render if the lecturer has uploaded one.
    // The image is rendered on a transparent background; only the pen ink shows.
    const lecturerSigHtml = cert.lecturerSignatureUrl
      ? `<img src="${cert.lecturerSignatureUrl}" alt="Lecturer signature" style="max-height: 70px; max-width: 180px; object-fit: contain; margin-bottom: 4px;" />`
      : ''

    win.document.write(`<!DOCTYPE html>
<html>
<head>
<title>Certificate - ${cert.studentName}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Georgia, 'Times New Roman', serif; background: #f5f5f5; padding: 20px; display: flex; justify-content: center; }
  .cert-wrap { width: 1000px; max-width: 100%; }
  .cert-outer { border: 8px double #006633; padding: 4px; background: white; }
  .cert-inner { border: 2px solid #D4AF37; padding: 40px; position: relative; }
  .corner { position: absolute; width: 40px; height: 40px; }
  .corner-tl { top: 8px; left: 8px; border-left: 2px solid #D4AF37; border-top: 2px solid #D4AF37; }
  .corner-tr { top: 8px; right: 8px; border-right: 2px solid #D4AF37; border-top: 2px solid #D4AF37; }
  .corner-bl { bottom: 8px; left: 8px; border-left: 2px solid #D4AF37; border-bottom: 2px solid #D4AF37; }
  .corner-br { bottom: 8px; right: 8px; border-right: 2px solid #D4AF37; border-bottom: 2px solid #D4AF37; }
  .header { text-align: center; margin-bottom: 20px; }
  .header-top { display: flex; align-items: center; justify-content: center; gap: 12px; margin-bottom: 12px; }
  .logo { width: 60px; height: 60px; border-radius: 50%; background: #006633; color: white; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 14px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .uni-name { font-weight: bold; color: #006633; font-size: 18px; }
  .uni-sub { font-size: 10px; color: #666; }
  .divider { height: 1px; background: linear-gradient(90deg, transparent, #D4AF37, transparent); margin: 8px 0; }
  .arabic { font-size: 10px; color: #999; text-transform: uppercase; letter-spacing: 2px; }
  .title { text-align: center; margin: 24px 0; }
  .title h1 { font-size: 32px; color: #006633; margin-bottom: 4px; }
  .title p { font-size: 12px; color: #999; font-style: italic; }
  .name-section { text-align: center; margin: 20px 0; }
  .student-name { font-size: 26px; font-weight: bold; color: #333; }
  .matric { font-size: 12px; color: #999; margin-top: 4px; }
  .completed-text { font-size: 14px; color: #666; margin-top: 12px; font-style: italic; }
  .course-section { text-align: center; margin: 20px 0; }
  .course-name { font-size: 22px; font-weight: bold; color: #006633; }
  .course-meta { font-size: 14px; color: #666; margin-top: 4px; }
  .score-section { text-align: center; margin: 20px 0; position: relative; }
  .score-label { font-size: 11px; color: #999; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 4px; }
  .score-value { font-size: 36px; font-weight: bold; color: #D4AF37; }
  .seal { position: absolute; top: 0; right: 40px; width: 70px; height: 70px; border-radius: 50%; border: 4px solid #D4AF37; background: rgba(212,175,55,0.1); display: flex; align-items: center; justify-content: center; font-size: 32px; }
  .signatures { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; margin-top: 40px; align-items: end; }
  .sig-block { text-align: center; }
  .sig-image { height: 70px; display: flex; align-items: flex-end; justify-content: center; }
  .sig-line { border-top: 1px solid #999; padding-top: 4px; }
  .sig-name { font-size: 12px; font-weight: 600; color: #333; }
  .sig-role { font-size: 10px; color: #999; }
  .qr-block { text-align: center; }
  .qr-img { width: 90px; height: 90px; border: 1px solid #ddd; padding: 4px; }
  .qr-label { font-size: 8px; color: #999; margin-top: 4px; }
  .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid rgba(212,175,55,0.4); text-align: center; }
  .footer p { font-size: 9px; color: #999; }
  .toolbar { text-align: center; padding: 12px; background: #006633; color: white; margin-bottom: 16px; border-radius: 8px; }
  .toolbar button { background: #D4AF37; color: black; border: none; padding: 10px 24px; font-size: 14px; font-weight: bold; border-radius: 6px; cursor: pointer; margin: 0 4px; }
  .toolbar button:hover { background: #c4a030; }
  @page { size: A4 portrait; margin: 0.5in; }
  @media print {
    .toolbar { display: none; }
    body { background: white; padding: 0; }
    .cert-wrap { width: 100%; }
    .cert-inner { padding: 24px !important; }
    .logo { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  }
</style>
</head>
<body>
  <div class="cert-wrap">
    <div class="toolbar">
      <button onclick="window.print()">Print / Save as PDF</button>
    </div>
    <div class="cert-outer">
      <div class="cert-inner">
        <div class="corner corner-tl"></div>
        <div class="corner corner-tr"></div>
        <div class="corner corner-bl"></div>
        <div class="corner corner-br"></div>

        <div class="header">
          <div class="header-top">
            <div class="logo">BEC</div>
            <div style="text-align: left;">
              <div class="uni-name">AL-BASHIR EDUCATIONAL CONSULT</div>
              <div class="uni-sub">Ilorin, Kwara State, Nigeria</div>
              <div class="uni-sub">Department of Economics</div>
            </div>
          </div>
          <div class="divider"></div>
          <div class="arabic">In the name of Allah, the Most Gracious, the Most Merciful</div>
        </div>

        <div class="title">
          <h1>Certificate of Completion</h1>
          <p>This is to certify that</p>
        </div>

        <div class="name-section">
          <div class="student-name">${cert.studentName}</div>
          ${cert.matricNumber ? `<div class="matric">Matric No: ${cert.matricNumber}</div>` : ''}
          <div class="completed-text">has successfully completed the requirements for</div>
        </div>

        <div class="course-section">
          <div class="course-name">${cert.courseTitle}</div>
          <div class="course-meta">${cert.courseCode} &middot; ${cert.creditUnit} Credit Unit${cert.creditUnit !== 1 ? 's' : ''} &middot; ${cert.department}</div>
        </div>

        <div class="score-section">
          <div class="score-label">Final Score</div>
          <div class="score-value">${cert.score}%</div>
          <div class="seal">&#127942;</div>
        </div>

        <div class="signatures">
          <div class="sig-block">
            <div class="sig-image">${lecturerSigHtml}</div>
            <div class="sig-line">
              <div class="sig-name">${cert.lecturerName}</div>
              <div class="sig-role">Course Lecturer</div>
            </div>
          </div>
          <div class="qr-block">
            ${qrUrl ? `<img class="qr-img" src="${qrUrl}" alt="QR Code" />` : '<div class="qr-img"></div>'}
            <div class="qr-label">Scan to verify</div>
          </div>
          <div class="sig-block">
            <div class="sig-image"></div>
            <div class="sig-line">
              <div class="sig-name">Registrar</div>
              <div class="sig-role">Al-Bashir Educational Consult</div>
            </div>
          </div>
        </div>

        <div class="footer">
          <p>Certificate No: <strong style="color: #006633;">${cert.certificateNumber}</strong> &middot; Issued on ${issuedDate}</p>
          <p style="margin-top: 4px;">Verify at ${window.location.origin} or scan the QR code above.</p>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`)
    win.document.close()
    win.focus()
  }

  const issuedDate = new Date(cert.issuedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between no-print">
        <div>
          <h2 className="text-xl font-bold">Certificate Preview</h2>
          <p className="text-xs text-muted-foreground">Click Download to open your certificate in a new tab, then save as PDF.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => window.open(`/verify-certificate?cert=${cert.certificateNumber}`, '_blank')}>
            <ExternalLink className="h-3 w-3 mr-1" /> Public link
          </Button>
          <Button size="sm" onClick={handleDownload} className="bg-primary hover:bg-primary/90" disabled={loading}>
            <Download className="h-3 w-3 mr-1" /> Download Certificate
          </Button>
        </div>
      </div>

      {/* The actual certificate (preview only — download opens a clean version) */}
      <div ref={certRef} className="mx-auto max-w-4xl">
        <div className="bg-white border-8 border-double border-[#006633] p-1 shadow-2xl">
          <div className="border-2 border-[#D4AF37] p-6 sm:p-8 lg:p-12 relative">
            <div className="absolute top-2 left-2 w-10 h-10 sm:w-12 sm:h-12 border-l-2 border-t-2 border-[#D4AF37]" />
            <div className="absolute top-2 right-2 w-10 h-10 sm:w-12 sm:h-12 border-r-2 border-t-2 border-[#D4AF37]" />
            <div className="absolute bottom-2 left-2 w-10 h-10 sm:w-12 sm:h-12 border-l-2 border-b-2 border-[#D4AF37]" />
            <div className="absolute bottom-2 right-2 w-10 h-10 sm:w-12 sm:h-12 border-r-2 border-b-2 border-[#D4AF37]" />

            <div className="text-center mb-6">
              <div className="flex items-center justify-center gap-3 mb-3">
                <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-full flex items-center justify-center text-white font-bold text-sm sm:text-base flex-shrink-0" style={{ background: 'linear-gradient(135deg, #006633, #003d1f)' }}>BEC</div>
                <div className="text-left">
                  <p className="font-bold text-[#006633] text-base sm:text-lg leading-tight">AL-BASHIR EDUCATIONAL CONSULT</p>
                  <p className="text-[10px] text-gray-600">Ilorin, Kwara State, Nigeria</p>
                  <p className="text-[10px] text-gray-600">Department of Economics</p>
                </div>
              </div>
              <div className="h-0.5 bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent my-3" />
              <p className="text-[9px] sm:text-[10px] tracking-[0.3em] text-gray-500 uppercase">In the name of Allah, the Most Gracious, the Most Merciful</p>
            </div>

            <div className="text-center my-8">
              <p className="text-2xl sm:text-3xl lg:text-4xl font-bold text-[#006633] mb-1" style={{ fontFamily: 'Georgia, serif' }}>Certificate of Completion</p>
              <p className="text-xs text-gray-500 italic">This is to certify that</p>
            </div>

            <div className="text-center my-6">
              <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900" style={{ fontFamily: 'Georgia, serif' }}>{cert.studentName}</p>
              {cert.matricNumber && <p className="text-xs text-gray-500 mt-1">Matric No: <span className="font-mono">{cert.matricNumber}</span></p>}
              <p className="text-sm text-gray-600 mt-3 italic">has successfully completed the requirements for</p>
            </div>

            <div className="text-center my-6">
              <p className="text-lg sm:text-xl lg:text-2xl font-bold text-[#006633]" style={{ fontFamily: 'Georgia, serif' }}>{cert.courseTitle}</p>
              <p className="text-sm text-gray-600 mt-1"><span className="font-mono">{cert.courseCode}</span> · {cert.creditUnit} Credit Unit{cert.creditUnit !== 1 ? 's' : ''} · {cert.department}</p>
            </div>

            <div className="text-center my-6 relative">
              <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">Final Score</p>
              <div className="inline-flex items-baseline gap-1">
                <span className="text-3xl sm:text-4xl font-bold text-[#D4AF37]">{cert.score}</span>
                <span className="text-lg sm:text-xl text-[#D4AF37]">%</span>
              </div>
              <div className="absolute top-0 right-4 sm:right-8 hidden sm:block">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-4 border-[#D4AF37] flex items-center justify-center" style={{ backgroundColor: 'rgba(212,175,55,0.1)' }}>
                  <Award className="h-8 w-8 sm:h-10 sm:w-10 text-[#D4AF37]" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mt-12 items-end">
              <div className="text-center">
                {/* Lecturer signature image — transparent background, only the pen ink shows */}
                {cert.lecturerSignatureUrl ? (
                  <div className="h-16 flex items-end justify-center mb-1">
                    <img
                      src={cert.lecturerSignatureUrl}
                      alt="Lecturer signature"
                      className="max-h-16 max-w-[140px] object-contain"
                    />
                  </div>
                ) : (
                  <div className="h-16" />
                )}
                <div className="border-t border-gray-400 pt-1">
                  <p className="text-xs font-semibold text-gray-700">{cert.lecturerName}</p>
                  <p className="text-[10px] text-gray-500">Course Lecturer</p>
                </div>
              </div>
              <div className="flex flex-col items-center">
                {loading ? <div className="w-20 h-20 sm:w-24 sm:h-24 flex items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-[#006633]" /></div> : <img src={qrUrl} alt="Verify QR" className="w-20 h-20 sm:w-24 sm:h-24 border border-gray-200 p-1" />}
                <p className="text-[8px] text-gray-500 mt-1">Scan to verify</p>
              </div>
              <div className="text-center">
                <div className="h-16" />
                <div className="border-t border-gray-400 pt-1">
                  <p className="text-xs font-semibold text-gray-700">Registrar</p>
                  <p className="text-[10px] text-gray-500">Al-Bashir Educational Consult</p>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-4 border-t border-[#D4AF37]/40 text-center">
              <p className="text-[9px] text-gray-500">Certificate No: <span className="font-mono font-semibold text-[#006633]">{cert.certificateNumber}</span> · Issued on {issuedDate}</p>
              <p className="text-[9px] text-gray-400 mt-1">Verify at {typeof window !== 'undefined' ? window.location.origin : ''} or scan the QR code above.</p>
            </div>
          </div>
        </div>
      </div>

      <Card className="no-print">
        <CardContent className="p-4 flex items-center gap-3">
          <ShieldCheck className="h-5 w-5 text-green-600 flex-shrink-0" />
          <div className="text-xs">
            <p className="font-medium">This certificate is cryptographically verifiable.</p>
            <p className="text-muted-foreground">Anyone can scan the QR code or visit the public verification page to confirm its authenticity.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
