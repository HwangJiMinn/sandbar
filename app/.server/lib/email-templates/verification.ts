export interface VerificationEmailOptions {
  name: string;
  verifyUrl: string;
}

export const verificationEmailHtml = ({
  name,
  verifyUrl,
}: VerificationEmailOptions): string => `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>이메일 인증 | 운결</title>
</head>
<body style="margin:0;padding:0;background-color:#0f0c1a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">

  <!-- Wrapper -->
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0f0c1a;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:560px;" cellpadding="0" cellspacing="0">

          <!-- Header -->
          <tr>
            <td align="center" style="padding-bottom:32px;">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="font-size:36px;line-height:1;">🔮</td>
                  <td style="padding-left:10px;">
                    <div style="font-size:22px;font-weight:900;color:#ffffff;letter-spacing:-0.5px;">운결</div>
                    <div style="font-size:12px;color:#7c6fa0;margin-top:2px;">AI 사주 · 운세</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background:linear-gradient(135deg,#1e1535 0%,#16122a 100%);border-radius:20px;border:1px solid #2d2250;overflow:hidden;">

              <!-- 상단 그라디언트 바 -->
              <tr>
                <td style="height:4px;background:linear-gradient(90deg,#7c3aed,#a855f7,#f59e0b);"></td>
              </tr>

              <!-- 본문 -->
              <tr>
                <td style="padding:44px 40px 40px;">

                  <!-- 별 장식 -->
                  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                    <tr>
                      <td align="center">
                        <div style="display:inline-block;background:linear-gradient(135deg,#3b1f6e,#2d1f54);border:1px solid #5b3fa0;border-radius:50%;width:72px;height:72px;line-height:72px;text-align:center;font-size:32px;">
                          ✉️
                        </div>
                      </td>
                    </tr>
                  </table>

                  <!-- 인사 -->
                  <p style="margin:0 0 8px;font-size:22px;font-weight:800;color:#ffffff;text-align:center;">
                    ${name}님, 환영합니다! 🎉
                  </p>
                  <p style="margin:0 0 28px;font-size:15px;color:#9d8ec0;text-align:center;line-height:1.6;">
                    운결 가입을 축하드려요.<br/>
                    아래 버튼을 눌러 이메일 인증을 완료하면<br/>
                    나만의 운세 여정이 시작됩니다.
                  </p>

                  <!-- 구분선 -->
                  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                    <tr>
                      <td style="height:1px;background:linear-gradient(90deg,transparent,#3d2e6e,transparent);"></td>
                    </tr>
                  </table>

                  <!-- 인증 버튼 -->
                  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                    <tr>
                      <td align="center">
                        <a href="${verifyUrl}"
                          style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#9333ea);color:#ffffff;text-decoration:none;font-size:16px;font-weight:700;padding:16px 40px;border-radius:50px;letter-spacing:0.3px;box-shadow:0 4px 24px rgba(124,58,237,0.4);">
                          ✨ &nbsp; 이메일 인증하기
                        </a>
                      </td>
                    </tr>
                  </table>

                  <!-- 유효 시간 안내 -->
                  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                    <tr>
                      <td align="center" style="background:#1a1230;border:1px solid #2d2250;border-radius:12px;padding:14px 20px;">
                        <p style="margin:0;font-size:13px;color:#7c6fa0;">
                          ⏰ &nbsp; 인증 링크는 <strong style="color:#a78bfa;">24시간</strong> 동안 유효합니다
                        </p>
                      </td>
                    </tr>
                  </table>

                  <!-- URL 직접 복사 -->
                  <p style="margin:0 0 8px;font-size:12px;color:#5d4f82;text-align:center;">
                    버튼이 작동하지 않으면 아래 링크를 브라우저에 직접 붙여넣으세요
                  </p>
                  <p style="margin:0;word-break:break-all;font-size:11px;color:#7c6fa0;text-align:center;background:#120f21;border-radius:8px;padding:10px 14px;border:1px solid #2d2250;">
                    ${verifyUrl}
                  </p>

                </td>
              </tr>

              <!-- 하단 구분선 -->
              <tr>
                <td style="height:1px;background:linear-gradient(90deg,transparent,#2d2250,transparent);"></td>
              </tr>

              <!-- 푸터 영역 -->
              <tr>
                <td style="padding:24px 40px;text-align:center;">
                  <p style="margin:0 0 8px;font-size:12px;color:#5d4f82;">
                    본 이메일은 <strong style="color:#7c6fa0;">운결</strong>에서 발송되었습니다.
                  </p>
                  <p style="margin:0;font-size:12px;color:#3d3160;">
                    회원가입을 요청하지 않으셨다면 이 이메일을 무시하세요.
                  </p>

                  <!-- 미니 별자리 장식 -->
                  <p style="margin:16px 0 0;font-size:18px;letter-spacing:6px;color:#3d3160;">
                    ✦ ✧ ✦
                  </p>
                </td>
              </tr>

            </td>
          </tr>

          <!-- 최하단 저작권 -->
          <tr>
            <td align="center" style="padding-top:24px;">
              <p style="margin:0;font-size:11px;color:#3d3160;">
                © 2026 운결. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>
`;
