'use client';

type Props = {
  remaining: number;
  limit: number;
  tier: string;
  onUpgrade: () => void;
  onSignUp: () => void;
};

export default function TierStatus({ remaining, limit, tier, onUpgrade, onSignUp }: Props) {
  if (tier === 'paid') return null;

  if (tier === 'anonymous') {
    return (
      <div style={{
        padding: '14px 18px', background: 'var(--surface)',
        border: '1px solid var(--border)', marginBottom: 20,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <p style={{
          fontSize: 10, color: 'var(--text-dim)', margin: 0,
          fontFamily: 'var(--font-ui)', letterSpacing: 1, lineHeight: 1.5,
        }}>
          {remaining} reflection{remaining !== 1 ? 's' : ''} remaining as guest.
          <br />
          <span style={{ color: 'var(--text-muted)' }}>Create a free account to save your reflections and get more.</span>
        </p>
        <button onClick={onSignUp} style={{
          background: 'none', border: '1px solid var(--border-hover)',
          color: 'var(--text)', padding: '8px 14px', fontSize: 9,
          letterSpacing: 2, textTransform: 'uppercase', cursor: 'pointer',
          fontFamily: 'var(--font-ui)', whiteSpace: 'nowrap', marginLeft: 12,
        }}>
          Sign Up
        </button>
      </div>
    );
  }

  // Free tier
  return (
    <div style={{
      padding: '14px 18px', background: 'var(--surface)',
      border: '1px solid var(--border)', marginBottom: 20,
    }}>
      <p style={{
        fontSize: 10, color: 'var(--text-dim)', margin: 0,
        fontFamily: 'var(--font-ui)', letterSpacing: 1, lineHeight: 1.6,
      }}>
        {remaining} reflection{remaining !== 1 ? 's' : ''} remaining this week. Go deep. The mirror rewards honesty, not frequency.
      </p>
      {remaining <= 3 && (
        <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p style={{
            fontSize: 10, color: 'var(--text-muted)', margin: 0,
            fontFamily: 'var(--font-ui)', lineHeight: 1.5,
          }}>
            This is a solo-built product. Unlimited free access isn't sustainable, but full access is here if you want it.
          </p>
          <button onClick={onUpgrade} style={{
            background: 'none', border: '1px solid var(--border-hover)',
            color: 'var(--text)', padding: '8px 14px', fontSize: 9,
            letterSpacing: 2, textTransform: 'uppercase', cursor: 'pointer',
            fontFamily: 'var(--font-ui)', whiteSpace: 'nowrap', marginLeft: 12,
          }}>
            Full Access
          </button>
        </div>
      )}
    </div>
  );
}
