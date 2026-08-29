INSERT INTO theme_definitions (name, version, configuration) VALUES
  ('minimal', 2, '{"--store-bg":"#f7f6f1","--store-ink":"#17211d","--store-accent":"#e5ff62","--store-muted":"#66716a","--store-line":"#d9ddd5","--home-columns":"3","--products-columns":"3","--collections-columns":"3","--orders-columns":"1","--card-border":"1px","--card-radius":"8px"}'),
  ('classic', 2, '{"--store-bg":"#fffdf8","--store-ink":"#29231d","--store-accent":"#bd7a42","--store-muted":"#71685f","--store-line":"#dfd4c8","--home-columns":"3","--products-columns":"4","--collections-columns":"3","--orders-columns":"1","--card-border":"1px","--card-radius":"2px"}'),
  ('bold', 2, '{"--store-bg":"#12101d","--store-ink":"#f7f0ff","--store-accent":"#ff5c35","--store-muted":"#c2b9cc","--store-line":"#3c3649","--home-columns":"2","--products-columns":"3","--collections-columns":"2","--orders-columns":"1","--card-border":"2px","--card-radius":"0px"}')
ON CONFLICT (name, version) DO NOTHING;
