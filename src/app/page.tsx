import { redirect } from 'next/navigation'

export default function Home() {
    // Redirect to admin login if accessing root
    redirect('/admin/login')
}
