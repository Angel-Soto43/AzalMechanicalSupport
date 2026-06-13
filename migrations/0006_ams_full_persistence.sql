-- Migración: Persistencia completa de campos AMS
-- Agrega columnas para Sección 1 (Atención), Sección 2 (Condiciones) y Sección 3 (Garantías/Objetos Sociales)
-- También agrega noPartida en quote_items para número de partida manual por el usuario

ALTER TABLE quotes
  ADD COLUMN IF NOT EXISTS attn_dia text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS attn_mes text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS attn_anio text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS attn_lugar text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS attn_grado text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS attn_area text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS attn_ubicacion text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS attn_direccion text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS attn_cargo text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS attn_contacto text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS payment_terms text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS has_manufacturing_time boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS delivery_single boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS delivery_locations_json text NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS quality_guarantees_json text NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS selected_social_objects_json text NOT NULL DEFAULT '[]';

ALTER TABLE quote_items
  ADD COLUMN IF NOT EXISTS no_partida text NOT NULL DEFAULT '';
