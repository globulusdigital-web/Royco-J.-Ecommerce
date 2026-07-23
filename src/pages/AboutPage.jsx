import { ArrowRight, Gem, HeartHandshake, Scale, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

export default function AboutPage() {
  return (
    <div className="about-page">
      <header className="page-hero about-hero"><div className="container-wide"><span className="eyebrow eyebrow-light">Royco Jewellers · রায়কো জুয়েলার্স</span><h1>A neighbourhood name.<br /><em>A new kind of experience.</em></h1><p>Rooted in Chandannagar, created around the way people really choose jewellery: with time, trust and someone who listens.</p></div></header>
      <section className="about-intro container-wide"><div className="about-collage"><div className="about-image-main"><img src="/assets/products/necklace-heritage.webp" alt="Gold necklace detail" /></div><div className="about-image-small"><img src="/assets/products/earrings-modern.webp" alt="Jewellery detail" /></div><span className="about-seal"><Gem /><strong>ROYCO</strong><small>CHANDANNAGAR</small></span></div><div className="about-intro-copy"><span className="eyebrow">Our point of view</span><h2>Jewellery should feel<br /><em>as personal as the moment.</em></h2><p>Royco brings traditional warmth and modern clarity together. The collection moves from lightweight daily pieces to wedding signatures across gold, silver, diamond and platinum.</p><p>Our role is simple: help you understand the details, compare with confidence and leave with something that feels right—not merely impressive.</p><Link className="line-link" to="/visit">Meet us in the showroom <ArrowRight /></Link></div></section>
      <section className="about-values"><div className="container-wide"><div><Sparkles /><span>01</span><h3>Design with feeling</h3><p>Pieces selected for proportion, wearability and a point of view—not just trend.</p></div><div><Scale /><span>02</span><h3>Clarity in every detail</h3><p>Visible purity, weight, price and product information for an informed choice.</p></div><div><HeartHandshake /><span>03</span><h3>Service that listens</h3><p>Warm guidance in store and thoughtful support before and after your order.</p></div></div></section>
      <section className="about-quote container"><span className="quote-mark">“</span><blockquote>Tradition is not about standing still. It is about carrying what matters into the present.</blockquote><p className="bengali">ঐতিহ্যকে সঙ্গে নিয়ে, আজকের জন্য</p></section>
      <section className="about-cta container-wide"><div><span className="eyebrow eyebrow-light">See it in person</span><h2>Your next favourite piece<br />may already be waiting.</h2></div><Link className="button button-light" to="/visit">Plan your visit <ArrowRight /></Link></section>
    </div>
  );
}
