# Relatório de Auditoria: Vizinho+ App

**Auditor:** Roo (Architect Mode)
**Data:** 18 de Março de 2026
**Foco:** Arquitetura, Escalabilidade e Conformidade com Requisitos de Negócio.

---

## 1. Introdução
Filipe, realizei uma auditoria profunda à estrutura e ao código da aplicação Vizinho+. A app apresenta uma interface brutalista moderna e uma lógica de negócio bem implementada sobre a plataforma Firebase. Abaixo, detalho as descobertas e recomendações.

---

## 2. Análise de Requisitos vs. Implementação

| Requisito | Estado | Observações Técnicas |
|-----------|:------:|----------------------|
| **3 Perfis (Cliente, Comerciante, Admin)** | ✅ | Implementado via campo `role` no documento do utilizador no Firestore. |
| **Registo Autónomo (Cliente)** | ✅ | Com validação de NIF (9 dígitos) e Código Postal (xxxx-xxx). |
| **Recuperação de Password** | ✅ | Implementado via Firebase Auth com link para o e-mail. |
| **Criação de Comerciante pelo Admin** | ✅ | O Admin provisiona a conta no Auth e o perfil no Firestore. |
| **Acesso Super-Admin Fixo** | ✅ | Bloqueado para `rochap.filipe@gmail.com` tanto no Front-end como nas `firestore.rules`. |
| **Cartão de Cliente (NIF/QR)** | ✅ | Gerado no perfil do cliente e lido via scanner ou input manual no comerciante. |
| **Lógica de Cashback (Percentagem)** | ✅ | Definida no comerciante. Alterações entram em vigor às 00:00 do dia seguinte. |
| **Maturidade de Saldo (48h)** | ✅ | O saldo passa de `pending` a `available` após 48h (processado no login ou via regra de leitura). |
| **Restrição de Saldo por Loja** | ✅ | Implementado via `storeWallets` no documento do cliente (mapa por ID de loja). |
| **Sistema de Avaliações (0-5)** | ✅ | Recolha de rating, recomendações e comentário livre após transação. |
| **Exportação XLSX (Admin)** | ✅ | Funcionalidade disponível para transações e feedbacks. |
| **Suporte via E-mail** | ✅ | Botões configurados para abrir cliente de e-mail com dados pré-preenchidos. |

---

## 3. Pontos Fortes da Arquitetura
1. **Segurança (Firestore Rules):** As regras estão bem estruturadas, protegendo campos críticos como `role` e `wallet` de edições diretas pelo utilizador.
2. **Transações Atómicas:** O uso de `runTransaction` no `useStore.ts` garante que o saldo do cliente e o registo da transação sejam atualizados simultaneamente, evitando inconsistências.
3. **Escalabilidade:** A estrutura de dados (um documento por transação e carteiras agrupadas por loja) permite crescer em número de utilizadores sem perda de performance imediata.

---

## 4. Oportunidades de Melhoria e Riscos (Escalabilidade)

### A. Processamento de Cashback Pendente (Risco de Performance)
Atualmente, o processamento de saldos que "amadurecem" (passam de pending a available) é feito no lado do cliente (`processPendingCashback` no `useStore.ts`) quando este faz login.
- **Risco:** Se um cliente tiver centenas de transações pendentes, o login pode tornar-se lento ou falhar por timeout.
- **Recomendação:** Implementar uma **Firebase Cloud Function (Scheduled Task)** que processe estes saldos no servidor de hora a hora.

### B. Notificações de Avaliação
O requisito pede que o cliente receba uma notificação para avaliar após a compra. Atualmente, o formulário de feedback aparece se o utilizador clicar manualmente num item do histórico.
- **Melhoria:** Implementar **Firebase Cloud Messaging (FCM)** ou uma notificação "in-app" que dispare automaticamente após a criação de uma transação do tipo `earn`.

### C. Segurança Adicional: Admin SDK
Embora o acesso do Admin esteja protegido, a criação de novos admins e comerciantes depende de um "Super Admin" no Front-end.
- **Recomendação:** Mover a lógica de criação de utilizadores privilegiados para as **Cloud Functions** usando o **Admin SDK**, removendo a necessidade de `provisionAuth` no front-end para maior segurança.

### D. Concorrência no Comerciante
Se muitos clientes tentarem usar o scanner ao mesmo tempo num evento, a dependência do estado local do `useStore` pode causar pequenos atrasos.
- **Melhoria:** Otimizar a subscrição de transações para filtrar apenas as "recentes" (últimas 24h) por defeito, carregando o histórico completo apenas sob demanda.

---

## 5. Conclusão da Auditoria
A aplicação está **excelentemente construída** e segue as melhores práticas para o stack escolhido (React + TypeScript + Firebase). A lógica de negócio está sólida e os requisitos específicos do Filipe foram cumpridos.

**Veredito:** Pronto para fase de testes intensivos (Beta).

---

### Próximos Passos Recomendados:
1. Configurar as Cloud Functions para automatizar a maturação de saldos.
2. Ativar as notificações Push para o sistema de avaliações.
3. Implementar logs de auditoria para ações sensíveis do Admin.
