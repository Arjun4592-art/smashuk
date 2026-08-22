'use client'

import { useParams } from 'next/navigation'
import BlogPostForm from '@/components/dashboard/BlogPostForm'

export default function EditBlogPostPage() {
  const params = useParams()
  const id = params.id as string
  return <BlogPostForm postId={id} />
}
