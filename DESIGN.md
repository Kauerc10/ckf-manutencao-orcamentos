# CKF Sistema Design Context

## Register
Product UI. Design serves task completion.

## Scene Sentence
An employee uses the system on an office desktop during a workday, often while handling a service request, needing calm contrast, fast scanning, and confidence that the exported document is official.

## Color Strategy
Restrained. Use a dark carbon operational shell, neutral surfaces, one modest amber action accent, and semantic green/amber/red status colors. Keep the document preview white and print-like.

## Typography
Use a system sans stack for the product UI. Use compact Arial/Calibri-like typography for generated PDF and XLSX documents. Do not use display fonts in labels, buttons, forms, or data.

## Layout Principles
- Fixed left sidebar on desktop, collapsible on small screens.
- Dense but readable dashboard and history tables.
- Form and document preview sit side by side on desktop; mobile uses tabs.
- Use cards only for KPIs and bounded repeated records. Do not nest cards.
- Keep controls familiar: icon buttons with tooltips, clear primary actions, standard inputs, selects, and confirmation dialog.

## Component Rules
- Buttons, fields, badges, tables, dialogs, empty states, loading states, focus states, and destructive actions must use one consistent visual vocabulary.
- Primary action is reserved for "Novo orcamento" and save/export actions.
- Destructive delete uses explicit confirmation.
- Status badges: rascunho neutral, enviado blue, aprovado green, recusado red, cancelado gray.

## Document Rules
PDF and XLSX must reproduce the model visually as code: black header, centered company identity, date/number row, service row, item table, total, observations area, and validity line. Never embed the old header image because it contains an outdated CNPJ.
