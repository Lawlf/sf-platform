import type { Metadata } from "next";
import type { Route } from "next";

import { getA11yPrefs } from "@/theme/a11y-cookie";
import { getColorblindPreference } from "@/theme/colorblind-cookie";

import { PageShell } from "../../_components/page-shell";

import { PrefSection } from "./_components/pref-section";
import { RadioPref } from "./_components/radio-pref";
import { StickyPreview } from "./_components/sticky-preview";
import { TextSizeSlider } from "./_components/text-size-slider";

export const metadata: Metadata = { title: "Acessibilidade" };

export default async function AcessibilidadePage() {
  const colorblind = await getColorblindPreference();
  const prefs = await getA11yPrefs();

  return (
    <PageShell
      title="Acessibilidade"
      description="Ajustes para tornar o Sabor Financeiro mais fácil de ler."
      backHref={"/app/configuracoes" as Route}
    >
      <div className="sticky top-[76px] z-10 md:top-[60px]">
        <StickyPreview />
      </div>

      <div className="divide-y divide-[color:var(--border-soft)]">
        <PrefSection
          eyebrow="Cores"
          title="Modo daltônico"
          description="Troca o verde por azul, distinguível do vermelho em qualquer tipo de daltonismo."
        >
          <RadioPref
            prefKey="colorblind"
            attr="data-cb"
            current={colorblind}
            options={[
              { value: "off", label: "Padrão", hint: "Verde para positivo, vermelho para negativo" },
              {
                value: "on",
                label: "Daltônico",
                hint: "Positivo em azul, distinguível em qualquer daltonismo",
              },
            ]}
          />
        </PrefSection>

        <PrefSection
          eyebrow="Leitura"
          title="Tamanho do texto"
          description="Arraste até o tamanho que ficar confortável. O app inteiro acompanha."
        >
          <TextSizeSlider current={prefs.textsize} />
        </PrefSection>

        <PrefSection
          eyebrow="Layout"
          title="Densidade visual"
          description="Controla o espaçamento entre os elementos, sem mudar o tamanho do texto."
        >
          <RadioPref
            prefKey="density"
            attr="data-density"
            current={prefs.density}
            options={[
              { value: "compact", label: "Compacto", hint: "Mais conteúdo na tela" },
              { value: "cozy", label: "Padrão", hint: "Equilíbrio recomendado" },
              { value: "comfortable", label: "Amplo", hint: "Mais espaço para respirar" },
            ]}
          />
        </PrefSection>

        <PrefSection
          eyebrow="Movimento"
          title="Animações"
          description="Reduz transições e animações para quem tem sensibilidade a movimento."
        >
          <RadioPref
            prefKey="motion"
            attr="data-motion"
            current={prefs.motion}
            options={[
              { value: "full", label: "Completo", hint: "Transições e animações normais" },
              { value: "reduce", label: "Reduzido", hint: "Desliga animações" },
            ]}
          />
        </PrefSection>

        <PrefSection
          eyebrow="Contraste"
          title="Contraste"
          description="Reforça textos secundários e bordas para melhor legibilidade."
        >
          <RadioPref
            prefKey="contrast"
            attr="data-contrast"
            current={prefs.contrast}
            options={[
              { value: "normal", label: "Padrão" },
              { value: "high", label: "Alto", hint: "Textos e bordas mais fortes" },
            ]}
          />
        </PrefSection>
      </div>
    </PageShell>
  );
}
