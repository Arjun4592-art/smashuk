import { NextRequest, NextResponse } from 'next/server'
import { sendMail, notifyOwner } from '@/lib/email'
import { contactAutoReplyEmail, contactAdminEmail } from '@/lib/email-templates'

export async function POST(req: NextRequest) {
  try {
    const { name, email, subject, message } = await req.json()

    if (!name || !email || !message) {
      return NextResponse.json(
        { error: 'Name, email and message are required.' },
        { status: 400 },
      )
    }

    // Notify the store owner of the new enquiry
    const adminEmail = contactAdminEmail({ name, email, subject, message })
    notifyOwner({
      subject: adminEmail.subject,
      html: adminEmail.html,
      text: adminEmail.text,
      templateVariables: adminEmail.templateVariables,
      customerEmail: email,
    }).catch((err) => {
      console.error('[contact] notifyOwner failed:', err)
    })

    // Send an auto-reply confirmation to the customer
    const autoReply = contactAutoReplyEmail({ name, message })
    sendMail({
      to: email,
      subject: autoReply.subject,
      html: autoReply.html,
      text: autoReply.text,
      templateVariables: autoReply.templateVariables,
    }).catch((err) => {
      console.error('[contact] auto-reply failed:', err)
    })

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (err: any) {
    console.error('[contact]', err)
    return NextResponse.json(
      { error: 'Failed to send message. Please try again.' },
      { status: 500 },
    )
  }
}
