
export default function WhatsApp() {
  const etapas = [
    {
      numero: "01",
      titulo: "Conectar conta",
      descricao:
        "Autorize a conexão do WhatsApp Business pela plataforma oficial da Meta.",
    },
    {
      numero: "02",
      titulo: "Verificar número",
      descricao:
        "Confira o número comercial vinculado ao seu workspace.",
    },
    {
      numero: "03",
      titulo: "Ativar campanhas",
      descricao:
        "Utilize campanhas autorizadas e acompanhe os envios pelo Verdinho.",
    },
  ];

  return (
    <div style={{ maxWidth: 950, margin: "0 auto", color: "#172b26" }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>
          Integração WhatsApp
        </h1>
        <p style={{ color: "#64748b", margin: 0 }}>
          Gerencie a conexão do WhatsApp Business da sua empresa.
        </p>
      </div>

      <section
        style={{
          background: "#ffffff",
          border: "1px solid #e2e8f0",
          borderRadius: 16,
          padding: 28,
          marginBottom: 24,
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 12px",
            borderRadius: 100,
            background: "#f1f5f9",
            color: "#475569",
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          <span>●</span>
          Não conectado
        </div>

        <h2 style={{ fontSize: 23, marginTop: 22, marginBottom: 10 }}>
          Conecte seu WhatsApp Business
        </h2>

        <p
          style={{
            color: "#64748b",
            lineHeight: 1.7,
            maxWidth: 650,
          }}
        >
          Em breve, você poderá conectar um número comercial utilizando
          a API oficial do WhatsApp, gerenciar campanhas e acompanhar
          os resultados em um único painel.
        </p>

        <button
          type="button"
          disabled
          style={{
            marginTop: 14,
            padding: "14px 22px",
            borderRadius: 10,
            border: "none",
            background: "#94a3b8",
            color: "#ffffff",
            fontWeight: 600,
            cursor: "not-allowed",
          }}
        >
          Conectar WhatsApp — em breve
        </button>

        <p style={{ color: "#94a3b8", fontSize: 12, marginTop: 12 }}>
          Aguardando configuração da integração oficial com a Meta.
        </p>
      </section>

      <section
        style={{
          background: "#ffffff",
          border: "1px solid #e2e8f0",
          borderRadius: 16,
          padding: 28,
        }}
      >
        <h2 style={{ fontSize: 20, marginTop: 0 }}>
          Como funcionará?
        </h2>

        <div style={{ display: "grid", gap: 20, marginTop: 22 }}>
          {etapas.map((etapa) => (
            <div
              key={etapa.numero}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 16,
              }}
            >
              <div
                style={{
                  background: "#e8f7ef",
                  color: "#16834b",
                  borderRadius: 10,
                  padding: 12,
                  fontWeight: 700,
                  fontSize: 14,
                }}
              >
                {etapa.numero}
              </div>

              <div>
                <h3 style={{ margin: "0 0 6px", fontSize: 16 }}>
                  {etapa.titulo}
                </h3>
                <p
                  style={{
                    color: "#64748b",
                    margin: 0,
                    lineHeight: 1.6,
                  }}
                >
                  {etapa.descricao}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
