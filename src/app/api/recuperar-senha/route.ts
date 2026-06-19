import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: Request) {
  try {
    const { email } = await req.json()
    if (!email) return NextResponse.json({ error: 'E-mail obrigatório.' }, { status: 400 })

    const emailNorm = email.toLowerCase().trim()

    const { data: parceiro } = await supabase
      .from('parceiros')
      .select('id, nome, email, senha')
      .eq('email', emailNorm)
      .single()

    // Sempre retorna 200 para não revelar se o e-mail existe
    if (!parceiro) {
      return NextResponse.json({ ok: true })
    }

    const firstName = parceiro.nome?.split(' ')[0] ?? 'Parceiro'

    await resend.emails.send({
      from: 'Meu Dentista em Casa <contato@meudentistaemcasa.com.br>',
      to: parceiro.email,
      subject: 'Recuperação de senha — Meu Dentista em Casa',
      html: `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#F1F5F9;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F1F5F9;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #E2E8F0;">

        <!-- Header verde -->
        <tr>
          <td style="background:#069E6E;padding:28px 32px;text-align:center;">
            <h1 style="margin:0;color:#fff;font-size:20px;font-weight:700;">Meu Dentista em Casa</h1>
            <p style="margin:6px 0 0;color:rgba(255,255,255,0.85);font-size:13px;">Portal de Parceiros</p>
          </td>
        </tr>

        <!-- Corpo -->
        <tr>
          <td style="padding:32px;">
            <p style="margin:0 0 12px;font-size:15px;color:#2D2E47;">Olá, <strong>${firstName}</strong>!</p>
            <p style="margin:0 0 20px;font-size:14px;color:#475569;line-height:1.6;">
              Recebemos uma solicitação de recuperação de senha para o seu cadastro no portal de parceiros do <strong>Meu Dentista em Casa</strong>.
            </p>

            <!-- Caixa da senha -->
            <div style="background:#F0FDF4;border:1.5px solid #069E6E;border-radius:12px;padding:20px 24px;margin-bottom:24px;text-align:center;">
              <p style="margin:0 0 6px;font-size:12px;font-weight:600;color:#475569;text-transform:uppercase;letter-spacing:0.5px;">Sua senha atual</p>
              <p style="margin:0;font-size:24px;font-weight:700;color:#2D2E47;letter-spacing:2px;">${parceiro.senha}</p>
            </div>

            <p style="margin:0 0 24px;font-size:13px;color:#64748B;line-height:1.6;">
              Acesse o portal com seu e-mail e a senha acima. Recomendamos que você altere sua senha após entrar.
            </p>

            <!-- Botão -->
            <div style="text-align:center;margin-bottom:24px;">
              <a href="https://prev-mdc-app.vercel.app/login"
                 style="display:inline-block;background:#069E6E;color:#fff;text-decoration:none;padding:13px 32px;border-radius:10px;font-weight:600;font-size:14px;">
                Acessar o portal →
              </a>
            </div>

            <hr style="border:none;border-top:1px solid #E2E8F0;margin:0 0 20px;">
            <p style="margin:0;font-size:12px;color:#94A3B8;text-align:center;">
              Se você não solicitou essa recuperação, ignore este e-mail.<br>
              Dúvidas? Entre em contato pelo WhatsApp da sua unidade MDC.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>
      `,
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Erro recuperação senha:', err)
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 })
  }
}
