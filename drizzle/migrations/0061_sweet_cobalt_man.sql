CREATE TABLE "user_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"domain" text NOT NULL,
	"kind" text NOT NULL,
	"slug" text NOT NULL,
	"name" text,
	"icon" text,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_categories" ADD CONSTRAINT "user_categories_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "user_categories_user_domain_slug_idx" ON "user_categories" USING btree ("user_id","domain","slug");--> statement-breakpoint
UPDATE "debts" SET "expense_category" = CASE "expense_category"
  WHEN 'housing' THEN 'moradia'
  WHEN 'utilities' THEN 'contas'
  WHEN 'food' THEN 'alimentacao'
  WHEN 'transport' THEN 'transporte'
  WHEN 'health' THEN 'saude'
  WHEN 'leisure' THEN 'lazer'
  WHEN 'subscriptions' THEN 'assinaturas'
  WHEN 'education' THEN 'educacao'
  WHEN 'other' THEN 'outros'
  ELSE "expense_category" END
WHERE "expense_category" IN ('housing','utilities','food','transport','health','leisure','subscriptions','education','other');--> statement-breakpoint
UPDATE "transactions" SET "category" = CASE "category"
  WHEN 'Alimentação' THEN 'alimentacao'
  WHEN 'Transporte' THEN 'transporte'
  WHEN 'Moradia' THEN 'moradia'
  WHEN 'Saúde' THEN 'saude'
  WHEN 'Lazer' THEN 'lazer'
  WHEN 'Educação' THEN 'educacao'
  WHEN 'Compras' THEN 'compras'
  WHEN 'Mercado' THEN 'mercado'
  WHEN 'Outros' THEN 'outros'
  WHEN 'Transferência' THEN 'transferencia'
  WHEN 'Presente' THEN 'presente'
  WHEN 'Reembolso' THEN 'reembolso'
  WHEN 'Venda' THEN 'venda'
  ELSE "category" END
WHERE "category" IN ('Alimentação','Transporte','Moradia','Saúde','Lazer','Educação','Compras','Mercado','Outros','Transferência','Presente','Reembolso','Venda');