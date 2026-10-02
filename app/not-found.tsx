import { redirect } from 'next/navigation'

// Every URL that doesn't exist (and every notFound() call across the site)
// lands here. Instead of showing a 404 page, send the visitor to the sale page.
export default function NotFound() {
  redirect('/shop?badge=SALE')
}
