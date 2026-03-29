import { redirect } from 'next/navigation'

// The (app) route group root — redirect to /home
export default function AppRootPage() {
  redirect('/home')
}
