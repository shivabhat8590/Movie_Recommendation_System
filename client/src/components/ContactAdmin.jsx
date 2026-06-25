import { useState } from 'react';
import './ContactAdmin.css';

export default function ContactAdmin({ showHeading = false }) {
  const [copied, setCopied] = useState(false);
  const email = 'admin@movieai.com';

  const handleCopy = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy email:', err);
    }
  };

  const handleSendEmail = (e) => {
    e.preventDefault();
    window.open(`https://mail.google.com/mail/?view=cm&fs=1&to=${email}`, '_blank');
  };

  return (
    <div className="contact-admin-section">
      {showHeading && <h3 className="contact-heading">Need More Help?</h3>}
      
      <div className="contact-card glass">
        <div className="contact-header">
          <div className="contact-icon-wrapper">
            <span className="contact-main-icon">🛡️</span>
          </div>
          <div className="contact-header-text">
            <h4 className="contact-title">Contact Administrator</h4>
            <p className="contact-description">
              Need help? If you experience any issues, have questions, or would like to report a problem, feel free to contact the administrator.
            </p>
          </div>
        </div>

        <div className="contact-details">
          <div className="contact-detail-item">
            <span className="detail-icon" title="Email">📧</span>
            <div className="detail-content">
              <span className="detail-label">Email Address</span>
              <div className="email-copy-wrapper">
                <a href={`mailto:${email}`} onClick={handleSendEmail} className="detail-value email-link">
                  {email}
                </a>
                <button 
                  className="copy-btn" 
                  onClick={handleCopy} 
                  title="Copy email address"
                  aria-label="Copy email address"
                >
                  📋
                  {copied && <span className="copy-tooltip">Copied!</span>}
                </button>
              </div>
            </div>
          </div>

          <div className="contact-detail-item">
            <span className="detail-icon" title="Support Hours">🕒</span>
            <div className="detail-content">
              <span className="detail-label">Support Hours</span>
              <span className="detail-value">Monday – Friday | 9:00 AM – 6:00 PM</span>
            </div>
          </div>

          <div className="contact-detail-item">
            <span className="detail-icon" title="Response Time">⚡</span>
            <div className="detail-content">
              <span className="detail-label">Response Time</span>
              <span className="detail-value">Usually within 24 hours</span>
            </div>
          </div>
        </div>

        <div className="contact-footer">
          <button onClick={handleSendEmail} className="btn btn-primary send-email-btn">
            ✉️ Send Email
          </button>
          <p className="contact-note">
            Please include your registered email address and a brief description of your issue for faster assistance.
          </p>
        </div>
      </div>
    </div>
  );
}
