import React from "react";
import { useNavigate } from "react-router-dom";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import "./legal.css";

const TermsOfService: React.FC = () => {
  const navigate = useNavigate();

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
              <h1>Terms of Service</h1>
              <p>
                These Terms govern your use of CampusLearn. This is example content and
                should be reviewed and replaced with your actual terms.
              </p>
              <h2>Use of Service</h2>
              <ul>
                <li>You must create an account to access certain features.</li>
                <li>You agree not to misuse or disrupt the platform.</li>
                <li>You are responsible for the content you share.</li>
              </ul>
              <h2>Content and Ownership</h2>
              <p>
                Users retain ownership of their content. By uploading, you grant
                CampusLearn a license to host and display it for educational purposes.
              </p>
              <h2>Disclaimers</h2>
              <p>
                The service is provided "as is" without warranties of any kind. We are
                not liable for indirect or consequential damages.
              </p>
              <p>Effective date: October 2025</p>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default TermsOfService;


