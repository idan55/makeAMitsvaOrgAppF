
import React from 'react';
import { FaGithub, FaEnvelope } from "react-icons/fa"; 

function Footer() {
  return (
    <footer className="site-footer">
      <div className="social-icons">
        <a
          href="https://github.com/idan55/makeAMitsva.orgF"
          target="_blank"
          rel="noreferrer"
          aria-label="GitHub repository"
          className="social-link"
        >
          <FaGithub size={28} color="#000" />
        </a>
        <a
          href="mailto:makeamitsva@gmail.com"
          aria-label="Email support"
          className="social-link"
        >
          <FaEnvelope size={28} color="#d97706" />
        </a>
      </div>
      <p className="footer-text">© 2025 Make-A-Mitsva.org --- All rights reserved.</p>
    </footer>
  );
}

export default Footer;
