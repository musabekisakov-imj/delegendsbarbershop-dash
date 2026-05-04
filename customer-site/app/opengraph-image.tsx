import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'De Legends Barbershop — Vilnius';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          background:
            'linear-gradient(160deg, #1a1815 0%, #0a0a0a 60%, #0a0a0a 100%)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          padding: 80,
          fontFamily: '"Manrope", ui-sans-serif, system-ui, sans-serif',
          color: '#fafafa',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            marginBottom: 40,
            fontSize: 22,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: '#cdf85a',
            fontFamily: 'ui-monospace, monospace',
          }}
        >
          <span>SENAMIESTIS</span>
          <span style={{ color: 'rgba(255,255,255,0.3)' }}>·</span>
          <span>PILIES G. 38</span>
          <span style={{ color: 'rgba(255,255,255,0.3)' }}>·</span>
          <span>EST. 2022</span>
        </div>

        <div
          style={{
            display: 'flex',
            fontSize: 110,
            fontWeight: 700,
            letterSpacing: '-0.04em',
            lineHeight: 1.02,
          }}
        >
          <span style={{ color: '#cdf85a' }}>DE LEGENDS</span>
        </div>
        <div
          style={{
            display: 'flex',
            fontSize: 110,
            fontWeight: 700,
            letterSpacing: '-0.04em',
            lineHeight: 1.02,
          }}
        >
          <span>Barbershop, Vilnius.</span>
        </div>

        <div
          style={{
            marginTop: 48,
            fontSize: 28,
            fontStyle: 'italic',
            color: '#cdf85a',
            opacity: 0.85,
          }}
        >
          Tai ne tik kirpimas, bet ir patirtis. Užsisakykite vizitą per minutę.
        </div>
      </div>
    ),
    size,
  );
}
