import { Body, Button, Container, Head, Heading, Hr, Html, Link, Preview, Section, Text } from "@react-email/components";
import { COMPANY_ADDRESS_LINES, SUPPORT_EMAIL, SUPPORT_PHONE } from "./contact";
import type { TransactionalEmailProps } from "./types";

// Wspólny wizualny szkielet wszystkich pięciu szablonów e mail transakcyjnych
// (spec 0051): każdy różni się wyłącznie treścią i linkiem, nie układem, więc
// jeden komponent renderuje wszystkie pięć na różnych danych. Logo w SVG
// powtarza dokładnie tę samą geometrię co components/brand/BrandLogo.tsx, z
// twardo wpisanymi kolorami zamiast currentColor/zmiennych CSS — te nie
// działają w izolowanym HTML e maila.
const COLORS = {
  background: "#e5e5e5",
  surface: "#ffffff",
  heading: "#14213d",
  body: "#4d5562",
  accent: "#fca311",
  accentText: "#000000",
};

export type { TransactionalEmailProps };

function BrandLogoMark() {
  return (
    <svg width="48" height="40" viewBox="0 0 120 100" style={{ display: "block", margin: "0 auto" }}>
      <path d="M10 28 58 3v14L22 37Z" fill={COLORS.heading} />
      <path d="M8 34 34 50l24-20v66l-14-8V58L34 68 21 57v31L8 80Z" fill={COLORS.heading} />
      <path d="m63 3 49 26v16L63 17Z" fill={COLORS.accent} />
      <path d="m63 23 16 9v23l17 8V38l16 9v35l-16 8V70l-17-8v34H63Z" fill={COLORS.body} />
      <path d="m84 69 9 4v18l-9 4Z" fill={COLORS.accent} />
    </svg>
  );
}

export function TransactionalEmail({ preview, heading, body, ctaLabel, ctaHref, badge, reference }: TransactionalEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={{ backgroundColor: COLORS.background, fontFamily: "Arial, Helvetica, sans-serif", margin: 0, padding: "48px 0" }}>
        <Container style={{ backgroundColor: COLORS.surface, borderRadius: 6, padding: "48px 40px", maxWidth: 520 }}>
          <Section style={{ textAlign: "center", marginBottom: 40 }}>
            <BrandLogoMark />
            <Text style={{ margin: "12px 0 0", fontSize: 16, fontWeight: 800, letterSpacing: "-0.01em", textTransform: "uppercase" }}>
              <span style={{ color: COLORS.heading }}>Modular </span>
              <span style={{ color: COLORS.accent }}>Hub</span>
              <span style={{ color: COLORS.body }}> Europe</span>
            </Text>
          </Section>

          {badge && (
            <Section style={{ textAlign: "center", marginBottom: 12 }}>
              <Text
                style={{
                  display: "inline-block",
                  backgroundColor: COLORS.background,
                  color: COLORS.heading,
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                  borderRadius: 999,
                  padding: "4px 14px",
                  margin: 0,
                }}
              >
                {badge}
              </Text>
            </Section>
          )}

          <Heading as="h1" style={{ color: COLORS.heading, fontSize: 20, margin: "0 0 20px", textAlign: "center" }}>
            {heading}
          </Heading>
          <Text style={{ color: COLORS.body, fontSize: 14, lineHeight: "24px", margin: "0 0 32px", textAlign: "center" }}>
            {body}
          </Text>

          <Section style={{ textAlign: "center", marginBottom: 40 }}>
            <Button
              href={ctaHref}
              style={{
                backgroundColor: COLORS.accent,
                color: COLORS.accentText,
                padding: "14px 32px",
                borderRadius: 4,
                fontSize: 14,
                fontWeight: 600,
                textDecoration: "none",
                display: "inline-block",
              }}
            >
              {ctaLabel}
            </Button>
          </Section>

          <Hr style={{ borderColor: COLORS.background, margin: "0 0 24px" }} />
          <Text style={{ color: COLORS.body, fontSize: 12, lineHeight: "20px", margin: "0 0 8px", textAlign: "center" }}>
            Masz pytania albo coś nie zadziałało? Napisz do nas:{" "}
            <Link href={`mailto:${SUPPORT_EMAIL}`} style={{ color: COLORS.accent }}>
              {SUPPORT_EMAIL}
            </Link>{" "}
            albo zadzwoń: {SUPPORT_PHONE}.
          </Text>
          {reference && (
            <Text style={{ color: COLORS.body, fontSize: 11, margin: "0 0 12px", textAlign: "center" }}>Nr referencyjny: {reference}</Text>
          )}
          <Text style={{ color: COLORS.body, fontSize: 11, lineHeight: "18px", margin: 0, textAlign: "center" }}>
            {COMPANY_ADDRESS_LINES.map((line) => (
              <span key={line}>
                {line}
                <br />
              </span>
            ))}
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
