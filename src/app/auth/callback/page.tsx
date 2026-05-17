// This page was for Google OAuth callback and is no longer needed
// Redirecting to login
import { redirect } from 'next/navigation'

export default function AuthCallback() {
    redirect('/login')
}
