import { useState } from 'react';

export default function Contact() {
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    message: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });
      if (!res.ok) throw new Error("Failed to send");
      alert("Message sent! Thank you for contacting us.");
      setFormData({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        message: ''
      });
    } catch (err) { console.error(err);
      alert("Failed to send message");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <>
      <div className="page-hero" style={{ '--hero-img': 'url("/images/home-background.webp")' }}>
        <div className="page-hero-inner">
          <span className="eyebrow">Get in touch</span>
          <h1>Let's talk about your books</h1>
          <p>We'd love to hear from you. Reach out to our global teams.</p>
        </div>
      </div>

      <section className="contact-section reveal">
        <h2 className="contact-title">Contact BookKeepPro</h2>
        <p className="contact-sub">Tell us a little about your business and we'll follow up within one business day.</p>

        <div className="contact-container">
          <div className="contact-info">
            <div className="info-box usa">
              <h3>USA</h3>
              <p>2520 Indigo Dr<br />McKinney, TX<br />75072, United States</p>
              <p className="phone">
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>call</span> +1 469-796-6151
              </p>
            </div>

            <div className="info-box ind">
              <h3>India</h3>
              <p>508, White Square,<br />Hinjewadi Road, Pune<br />411057, India</p>
              <p className="phone">
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>call</span> +91 738 793 6020
              </p>
            </div>
          </div>

          <form className="contact-form" onSubmit={handleSubmit}>
            <h3 style={{ marginBottom: '22px' }}>Send us a message</h3>
            <div className="form-row">
              <input
                type="text"
                name="first_name"
                placeholder="First name"
                required
                value={formData.first_name}
                onChange={handleChange}
              />
              <input
                type="text"
                name="last_name"
                placeholder="Last name"
                required
                value={formData.last_name}
                onChange={handleChange}
              />
            </div>

            <input
              type="email"
              name="email"
              placeholder="Email address"
              required
              value={formData.email}
              onChange={handleChange}
            />

            <input
              type="text"
              name="phone"
              placeholder="Mobile number"
              required
              value={formData.phone}
              onChange={handleChange}
            />

            <textarea
              name="message"
              placeholder="How can we help you?"
              required
              style={{ minHeight: '120px' }}
              value={formData.message}
              onChange={handleChange}
            ></textarea>

            <button type="submit" disabled={loading} className="btn btn-primary w-full">
              {loading ? 'Sending…' : 'Send message'}
            </button>
          </form>
        </div>
      </section>
    </>
  );
}
