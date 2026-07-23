import { ArrowRight, BadgeCheck, Diamond, Gem, MapPin, MoveRight, PackageCheck, ShieldCheck, Sparkles, Star } from "lucide-react";
import { Link } from "react-router-dom";
import HeroScene from "../components/HeroScene";
import ProductCard from "../components/ProductCard";
import { useStore } from "../context/StoreContext";

const metalEdits = [
  { name: "Gold", note: "22K heirloom warmth", image: "/assets/products/necklace-heritage.webp", tone: "gold" },
  { name: "Diamond", note: "Light, held forever", image: "/assets/products/rings-diamond.webp", tone: "diamond" },
  { name: "Silver", note: "Everyday radiance", image: "/assets/products/earrings-sunburst.webp", tone: "silver" },
  { name: "Platinum", note: "Quietly enduring", image: "/assets/products/rings-vintage.webp", tone: "platinum" },
];

const reviews = [
  { quote: "Value for money. Beautiful design, a good collection and courteous staff.", author: "A. N.", meta: "Local Guide" },
  { quote: "Got beautiful pieces at a very good offer with zero making charges.", author: "Ananya Biswas", meta: "Verified visitor" },
  { quote: "Their collection feels traditional yet modern, with both lightweight and statement jewellery.", author: "Dipankar Ghosh", meta: "Royco customer" },
];

export default function HomePage() {
  const { products } = useStore();
  const featured = products.filter((product) => product.featured).slice(0, 8);

  return (
    <>
      <section className="hero">
        <div className="hero-glow hero-glow-one" />
        <div className="hero-glow hero-glow-two" />
        <div className="hero-content container-wide">
          <div className="hero-copy">
            <div className="hero-kicker"><span>Since Chandannagar</span><i /><span>Made for now</span></div>
            <h1>Every chapter<br />deserves its <em>brilliance.</em></h1>
            <p className="bengali hero-bengali">প্রতিটি মুহূর্তের জন্য একটু উজ্জ্বলতা</p>
            <p className="hero-lead">Discover gold, silver, platinum and diamond jewellery—curated with a modern eye and the warmth of a neighbourhood jeweller.</p>
            <div className="hero-actions"><Link className="button button-gold" to="/shop">Shop the collection <ArrowRight size={17} /></Link><Link className="button button-ghost-light" to="/visit">Visit our showroom</Link></div>
            <div className="hero-trust">
              <div className="avatar-stack"><span>A</span><span>S</span><span>R</span></div>
              <div><strong><Star size={15} fill="currentColor" /> 4.2 from 89 reviews</strong><small>Loved across Chandannagar</small></div>
            </div>
          </div>
          <div className="hero-visual">
            <HeroScene />
            <div className="hero-orbit-label hero-orbit-label-one"><span>01</span><b>22K gold</b><small>BIS hallmark ready</small></div>
            <div className="hero-orbit-label hero-orbit-label-two"><Sparkles size={15} /><b>New bridal edit</b></div>
            <div className="hero-caption"><i /><span>Royco signature</span><strong>Celestial Bloom</strong></div>
          </div>
        </div>
        <div className="hero-scroll"><span>Scroll to discover</span><i /></div>
      </section>

      <section className="trust-strip" aria-label="Store benefits">
        <div className="container-wide">
          <div><BadgeCheck /><span><strong>Purity assured</strong><small>Transparent metal & stone details</small></span></div>
          <div><PackageCheck /><span><strong>Insured delivery</strong><small>Handled with care, door to door</small></span></div>
          <div><ShieldCheck /><span><strong>Secure checkout</strong><small>Your information stays protected</small></span></div>
          <div><MapPin /><span><strong>Local expertise</strong><small>Personal guidance in Chandannagar</small></span></div>
        </div>
      </section>

      <section className="section metal-section">
        <div className="section-heading container-wide">
          <div><span className="eyebrow">Choose your element</span><h2>Four worlds of <em>beauty.</em></h2></div>
          <p>From warm gold traditions to the clean permanence of platinum, begin with the material that feels like you.</p>
        </div>
        <div className="metal-grid container-wide">
          {metalEdits.map((metal, index) => (
            <Link className={`metal-card metal-${metal.tone}`} to={`/shop?metal=${metal.name}`} key={metal.name}>
              <img src={metal.image} alt="" loading="lazy" />
              <div className="metal-overlay" />
              <span className="metal-index">0{index + 1}</span>
              <div><small>{metal.note}</small><h3>{metal.name}</h3><span className="metal-link">Explore <MoveRight /></span></div>
            </Link>
          ))}
        </div>
      </section>

      <section className="section products-section">
        <div className="section-heading container-wide section-heading-row">
          <div><span className="eyebrow">The Royco edit</span><h2>Pieces worth <em>keeping.</em></h2></div>
          <Link className="line-link" to="/shop">View all jewellery <ArrowRight /></Link>
        </div>
        <div className="product-grid container-wide">
          {featured.map((product) => <ProductCard product={product} key={product.id} />)}
        </div>
      </section>

      <section className="editorial-banner container-wide">
        <div className="editorial-image"><img src="/assets/products/bangles-stack.webp" alt="A delicate necklace from the everyday collection" loading="lazy" /><span className="editorial-number">02</span></div>
        <div className="editorial-copy">
          <span className="eyebrow eyebrow-light">The everyday heirloom</span>
          <h2>Light enough for today.<br /><em>Meaningful enough for always.</em></h2>
          <p>Meet our lightweight edit: easy silhouettes, honest detailing and pieces made to become part of your daily ritual.</p>
          <Link className="button button-light" to="/shop?sort=price-asc">Discover lightweight pieces <ArrowRight /></Link>
          <div className="editorial-offer"><strong>0%</strong><span>making charge on selected styles<small>Limited period · Terms apply</small></span></div>
        </div>
      </section>

      <section className="section collection-section">
        <div className="section-heading container-wide centered"><span className="eyebrow">Find your form</span><h2>Made for every <em>gesture.</em></h2></div>
        <div className="collection-marquee" aria-label="Shop by category">
          {["Rings", "Earrings", "Necklaces", "Bangles", "Chains", "Pendants", "Bracelets", "Mangalsutra"].map((category) => (
            <Link to={`/shop?category=${category}`} key={category}><Gem size={18} /> {category}</Link>
          ))}
        </div>
      </section>

      <section className="reviews-section">
        <div className="container-wide reviews-layout">
          <div className="reviews-summary"><span className="eyebrow eyebrow-light">In their words</span><h2>Jewellery is personal.<br /><em>So is our service.</em></h2><div className="reviews-score"><strong>4.2</strong><span>★★★★★<small>Based on 89 Google reviews</small></span></div><Link className="line-link line-link-light" to="/visit">Find us on Google Maps <ArrowRight /></Link></div>
          <div className="review-cards">
            {reviews.map((review, index) => <blockquote key={review.author}><div className="quote-mark">“</div><p>{review.quote}</p><footer><span><strong>{review.author}</strong><small>{review.meta}</small></span><span className="review-stars">★★★★★</span></footer><i>0{index + 1}</i></blockquote>)}
          </div>
        </div>
      </section>

      <section className="visit-preview container-wide">
        <div className="visit-map-card">
          <div className="map-grid" aria-hidden="true"><i /><i /><i /><i /><b /></div>
          <span className="map-pin"><Diamond size={22} fill="currentColor" /></span>
          <div className="map-label"><strong>ROYCO</strong><small>Bagbazar Plaza</small></div>
        </div>
        <div className="visit-preview-copy"><span className="eyebrow">Come say hello</span><h2>Your neighbourhood<br /><em>jeweller, reimagined.</em></h2><p>See every detail up close, compare pieces and find the right fit with our Chandannagar team.</p><address>Bagbazar Plaza, Rash Behari Avenue<br />Chandannagar, West Bengal 712136</address><div className="visit-hours"><span><small>Today</small><strong>10:30 am — 9:00 pm</strong></span><b>Open</b></div><Link className="button button-dark" to="/visit">Plan your visit <ArrowRight /></Link></div>
      </section>
    </>
  );
}
