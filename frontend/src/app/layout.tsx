import './globals.css'

export const metadata = {
  title: 'Cluely for Brands - Snap a product. Pick a brand. Get its vibe.',
  description: 'AI-powered brand transformation tool. Upload your product photos and get stunning brand-styled images.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white" suppressHydrationWarning={true}>
        {children}
      </body>
    </html>
  )
}
