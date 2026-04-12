import Link from 'next/link';

const F = "'Cormorant Garamond', Georgia, serif";

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div style={{ marginBottom: 44 }}>
    <p style={{ fontSize: 11, letterSpacing: 4, textTransform: 'uppercase', color: 'var(--text-dim)', margin: '0 0 16px 0', fontFamily: F }}>
      {title}
    </p>
    <div style={{ borderLeft: '1px solid var(--border)', paddingLeft: 20 }}>
      {children}
    </div>
  </div>
);

const P = ({ children }: { children: React.ReactNode }) => (
  <p style={{ fontSize: 15, lineHeight: 1.9, color: 'var(--text)', fontWeight: 300, fontFamily: F, margin: '0 0 12px 0' }}>
    {children}
  </p>
);

const Li = ({ children }: { children: React.ReactNode }) => (
  <li style={{ fontSize: 15, lineHeight: 1.9, color: 'var(--text)', fontWeight: 300, fontFamily: F, marginBottom: 6 }}>
    {children}
  </li>
);

export default function PrivacyPage() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', fontFamily: F, padding: '60px 28px 80px' }}>
      <div style={{ maxWidth: 620, margin: '0 auto' }}>

        <Link href="/" style={{ fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', color: 'var(--text-muted)', textDecoration: 'none', display: 'inline-block', marginBottom: 48 }}>
          Back to Mirror
        </Link>

        <h1 style={{ fontSize: 11, letterSpacing: 4, textTransform: 'uppercase', color: 'var(--text-dim)', margin: '0 0 8px 0', fontFamily: F, fontWeight: 400 }}>
          Privacy Policy
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 48px 0', fontFamily: F, fontWeight: 300 }}>
          Last updated: April 2026
        </p>

        <p style={{ fontSize: 15, lineHeight: 1.9, color: 'var(--text)', fontWeight: 300, fontFamily: F, margin: '0 0 44px 0', fontStyle: 'italic' }}>
          This is written in plain language. We want you to actually understand it.
        </p>

        <Section title="What We Collect">
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            <Li><strong>Account information</strong>: your email address and a hashed password (we never store your password in plain text)</Li>
            <Li><strong>Conversation data</strong>: what you write in the mirror and what the AI responds</Li>
            <Li><strong>Usage data</strong>: reflection counts, timestamps, and the confrontation level you used</Li>
            <Li><strong>Payment information</strong>: processed entirely by Stripe. We never see or store your full card number. Stripe handles all of that.</Li>
          </ul>
        </Section>

        <Section title="How We Use Your Data">
          <P>To provide the mirror service and generate reflections.</P>
          <P>To improve AI quality. Conversation data may be used in anonymized form to refine how the AI reflects. Personal identifiers are stripped before any review or training use. Your name, email, and account details are never attached to training data.</P>
          <P>To track usage limits and manage subscriptions.</P>
          <P><strong>We never sell your data to advertisers or third parties. Ever.</strong></P>
        </Section>

        <Section title="Third Parties">
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            <Li><strong>Anthropic</strong>: processes your messages through their AI to generate reflections. Your input is sent to their API and subject to Anthropic's privacy policy.</Li>
            <Li><strong>Stripe</strong>: handles payment and subscription management. We never touch your card details.</Li>
            <Li><strong>Supabase</strong>: stores your account and conversation data securely on their infrastructure.</Li>
            <Li>No other third parties receive your data.</Li>
          </ul>
        </Section>

        <Section title="Your Rights">
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            <Li>Delete your account and all associated conversation history at any time from the side panel.</Li>
            <Li>Delete individual conversations from the conversation menu.</Li>
            <Li>Conversation data used for AI improvement is anonymized and cannot be traced back to your account.</Li>
            <Li>Contact <a href="mailto:blunnit@gmail.com" style={{ color: 'var(--text-dim)' }}>blunnit@gmail.com</a> for any questions about your data.</Li>
          </ul>
        </Section>

        <Section title="Data Security">
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            <Li>Data is encrypted in transit (HTTPS) and at rest.</Li>
            <Li>Row-level security ensures users can only access their own data.</Li>
            <Li>We follow industry standard security practices.</Li>
          </ul>
        </Section>

        <Section title="Changes">
          <P>We may update this policy. Continued use after changes constitutes acceptance. We will note the date of the last update at the top of this page.</P>
        </Section>

        <p style={{ fontSize: 13, color: 'var(--text-muted)', fontFamily: F, fontWeight: 300, marginTop: 48, paddingTop: 24, borderTop: '1px solid var(--border)' }}>
          Questions? <a href="mailto:blunnit@gmail.com" style={{ color: 'var(--text-dim)' }}>blunnit@gmail.com</a>
        </p>
      </div>
    </div>
  );
}
