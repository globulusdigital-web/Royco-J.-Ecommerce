ALTER TABLE products ADD COLUMN IF NOT EXISTS bengali_name TEXT NOT NULL DEFAULT '';

UPDATE products
SET
  image_url = CASE category
    WHEN 'Rings' THEN CASE WHEN material = 'Gold' THEN '/assets/products/gold-ring.webp' ELSE '/assets/products/rings-diamond.webp' END
    WHEN 'Earrings' THEN CASE WHEN material IN ('Gold', 'Diamond') THEN '/assets/products/earrings-modern.webp' ELSE '/assets/products/earrings-sunburst.webp' END
    WHEN 'Necklaces' THEN CASE WHEN material IN ('Gold', 'Platinum') THEN '/assets/products/necklace-heritage.webp' ELSE '/assets/products/necklace-temple.webp' END
    WHEN 'Bangles' THEN '/assets/products/bracelet-gold.webp'
    WHEN 'Chains' THEN '/assets/products/gold-chain.webp'
    WHEN 'Pendants' THEN CASE WHEN material IN ('Silver', 'Diamond') THEN '/assets/products/ring-solitaire.webp' ELSE '/assets/products/necklace-heritage.webp' END
    WHEN 'Bracelets' THEN CASE WHEN material IN ('Gold', 'Diamond') THEN '/assets/products/bracelet-gold.webp' ELSE '/assets/products/jewellery-editorial.webp' END
    WHEN 'Mangalsutra' THEN '/assets/products/bangles-stack.webp'
    ELSE '/assets/products/gold-ring.webp'
  END,
  bengali_name =
    CASE material
      WHEN 'Gold' THEN 'সোনার '
      WHEN 'Silver' THEN 'রূপোর '
      WHEN 'Platinum' THEN 'প্ল্যাটিনাম '
      WHEN 'Diamond' THEN 'হীরের '
    END ||
    CASE category
      WHEN 'Rings' THEN 'আংটি'
      WHEN 'Earrings' THEN 'দুল'
      WHEN 'Necklaces' THEN 'হার'
      WHEN 'Bangles' THEN 'চুড়ি'
      WHEN 'Chains' THEN 'চেন'
      WHEN 'Pendants' THEN 'পেন্ডেন্ট'
      WHEN 'Bracelets' THEN 'ব্রেসলেট'
      WHEN 'Mangalsutra' THEN 'মঙ্গলসূত্র'
    END;
