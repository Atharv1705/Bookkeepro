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
      alert("Message Sent! Thank you for contacting us.");
      setFormData({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        message: ''
      });
    } catch (err) {
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
      {/* HERO */}
      <div className="page-hero" style={{
        backgroundImage: 'linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5)), url("/images/home-background.jpg")',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        minHeight: '350px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        color: '#fff'
      }}>
        <div>
          <h1>Get In Touch</h1>
          <p>We'd love to hear from you. Reach out to our global teams.</p>
        </div>
      </div>

      <section className="contact-section" style={{ border: 'none', marginTop: '60px', marginBottom: '80px' }}>
        <h2 className="contact-title" style={{ color: 'var(--navy)', marginBottom: '50px' }}>
          CONTACT <span style={{ color: 'var(--blue)' }}>BOOK</span><span style={{ color: 'var(--orange)' }}>KEEPRO</span>
        </h2>

        <div className="contact-container" style={{ width: '100%', maxWidth: '1000px', display: 'flex', flexWrap: 'wrap', gap: '40px', justifyContent: 'center' }}>
          <div className="contact-info" style={{ flex: '1 1 300px', display: 'flex', flexDirection: 'column', gap: '30px' }}>
            <div className="info-box usa" style={{ padding: '30px', borderRadius: '20px', boxShadow: 'var(--shadow-md)' }}>
              <h3 style={{ fontSize: '24px', marginBottom: '12px' }}>USA</h3>
              <p style={{ lineHeight: '1.6', marginBottom: '16px', opacity: 0.9 }}>2520 Indigo Dr<br />McKinney, TX<br />75072, United States</p>
              <p className="phone" style={{ display: 'flex', alignItems: 'center', gap: '10px', fontWeight: '500' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>call</span> +1469-796-6151
              </p>
            </div>

            <div className="info-box ind" style={{ padding: '30px', borderRadius: '20px', boxShadow: 'var(--shadow-md)' }}>
              <h3 style={{ fontSize: '24px', marginBottom: '12px' }}>IND</h3>
              <p style={{ lineHeight: '1.6', marginBottom: '16px', opacity: 0.9 }}>508, White Square,<br />Hinjewadi Road, Pune<br />411057, India</p>
              <p className="phone" style={{ display: 'flex', alignItems: 'center', gap: '10px', fontWeight: '500' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>call</span> +91 738 793 6020
              </p>
            </div>
          </div>

          <div style={{ flex: '1.5 1 400px' }}>
            <form className="contact-form" onSubmit={handleSubmit} style={{ padding: '40px', borderRadius: '20px', boxShadow: 'var(--shadow-lg)' }}>
              <h3 style={{ fontSize: '22px', marginBottom: '24px', color: 'var(--navy)' }}>Send us a message</h3>
              <div className="form-row" style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
                <input 
                  type="text" 
                  name="first_name" 
                  placeholder="First Name" 
                  required 
                  value={formData.first_name}
                  onChange={handleChange}
                  style={{ flex: 1, padding: '14px', borderRadius: '8px', border: '1px solid var(--border)', outline: 'none' }}
                />
                <input 
                  type="text" 
                  name="last_name" 
                  placeholder="Last Name" 
                  required 
                  value={formData.last_name}
                  onChange={handleChange}
                  style={{ flex: 1, padding: '14px', borderRadius: '8px', border: '1px solid var(--border)', outline: 'none' }}
                />
              </div>

              <input 
                type="email" 
                name="email" 
                placeholder="Email Address" 
                required 
                value={formData.email}
                onChange={handleChange}
                style={{ width: '100%', padding: '14px', borderRadius: '8px', border: '1px solid var(--border)', outline: 'none', marginBottom: '20px' }}
              />

              <div className="phone-row" style={{ marginBottom: '20px', border: 'none', padding: 0 }}>
                <input 
                  type="text" 
                  name="phone" 
                  placeholder="Mobile Number" 
                  required 
                  value={formData.phone}
                  onChange={handleChange}
                  style={{ width: '100%', padding: '14px', borderRadius: '8px', border: '1px solid var(--border)', outline: 'none' }}
                />
              </div>

              <div className="message-row">
                <textarea 
                  name="message" 
                  placeholder="How can we help you?" 
                  required 
                  style={{ width: '100%', padding: '14px', border: '1px solid var(--border)', borderRadius: '8px', fontFamily: 'inherit', fontSize: '15px', outline: 'none', marginBottom: '24px', resize: 'vertical', minHeight: '120px' }}
                  value={formData.message}
                  onChange={handleChange}
                ></textarea>
              </div>

              <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%', padding: '14px', fontSize: '16px', borderRadius: '30px' }}>
                {loading ? 'SENDING...' : 'SEND MESSAGE'}
              </button>
            </form>
          </div>
        </div>
      </section>
    </>
  );
}
