INSERT INTO theme_definitions (name, version, configuration) VALUES
  ('simple-light', 1, '{"--store-bg":"#f7f7f5","--store-ink":"#181a18","--store-accent":"#dff45f","--store-muted":"#697069","--store-line":"#dedfda","--home-columns":"3","--products-columns":"3","--collections-columns":"3","--orders-columns":"1","--card-border":"1px","--card-radius":"8px"}'),
  ('simple-dark', 1, '{"--store-bg":"#171918","--store-ink":"#f4f5f2","--store-accent":"#dff45f","--store-muted":"#a7ada6","--store-line":"#363a36","--home-columns":"3","--products-columns":"3","--collections-columns":"3","--orders-columns":"1","--card-border":"1px","--card-radius":"8px"}')
ON CONFLICT (name, version) DO UPDATE SET configuration = EXCLUDED.configuration;

UPDATE business_theme_mappings
SET theme_name = 'simple-light',
    theme_version = 1,
    configuration = (SELECT configuration FROM theme_definitions WHERE name = 'simple-light' AND version = 1),
    updated_at = NOW()
WHERE theme_name NOT IN ('simple-light', 'simple-dark');

DELETE FROM theme_definitions WHERE name NOT IN ('simple-light', 'simple-dark');
