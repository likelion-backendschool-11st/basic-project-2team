'use strict';

const nodemailer = require('nodemailer');

/**
 * 메일 발송기. SMTP 설정(host)이 있으면 nodemailer 로 실제 발송하고,
 * 없으면 서버 콘솔에 내용을 출력합니다 (로컬 개발·테스트에서 메일 계정 없이 인증코드 확인).
 * @param {{ host: string, port: number, secure: boolean, user: string, password: string, from: string }} mailConfig
 * @returns {{ sendMail: (message: { to: string, subject: string, text: string }) => Promise<void> }}
 */
function createMailer({ host, port, secure, user, password, from }) {
  if (!host) {
    return {
      async sendMail({ to, subject, text }) {
        console.log(`[mail] SMTP 미설정 — 실제로 보내지 않고 출력합니다.\nTo: ${to}\nSubject: ${subject}\n\n${text}\n`);
      },
    };
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: user ? { user, pass: password } : undefined,
  });

  return {
    async sendMail({ to, subject, text }) {
      await transporter.sendMail({ from, to, subject, text });
    },
  };
}

module.exports = { createMailer };
