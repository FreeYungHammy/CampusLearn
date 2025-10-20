import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import "./legal.css";

const ContactUs: React.FC = () => {
  const [submitted, setSubmitted] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="app-shell">
      <Header />
      <main className="site-main">
        <div className="container legal-container">
          <div className="legal-page">
            <div className="legal-topbar">
              <button className="btn btn-outline" onClick={() => navigate(-1)}>
                ← Back
              </button>
            </div>
            <div className="legal-card">
              <h1>Contact Us</h1>
              <p>
                Have questions or feedback? Send us a message and we'll get back to
                you. This is a demo-only form with no backend logic.
              </p>
              {submitted ? (
                <div className="alert-success">Thanks! We'll be in touch shortly.</div>
              ) : (
                <form className="contact-form" onSubmit={handleSubmit}>
                  <div className="form-field">
                    <label htmlFor="name">Name</label>
                    <input id="name" name="name" type="text" className="form-input" required />
                  </div>
                  <div className="form-field">
                    <label htmlFor="email">Email</label>
                    <input id="email" name="email" type="email" className="form-input" required />
                  </div>
                  <div className="form-field">
                    <label htmlFor="message">Message</label>
                    <textarea id="message" name="message" className="form-textarea" rows={6} required />
                  </div>
                  <div className="legal-actions">
                    <button type="button" className="btn btn-secondary" onClick={() => navigate(-1)}>
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-primary">
                      Send Message
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ContactUs;


