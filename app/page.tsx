import Link from "next/link";
import { 
  ArrowRight, 
  BookOpen, 
  Building2, 
  Database, 
  Layout, 
  MessageSquare, 
  Quote, 
  ShieldCheck, 
  Sparkles 
} from "lucide-react";

export default function HomePage() {
  return (
    <div className="landing-page">
      {/* Animated background gradient orbs */}
      <div className="bg-orbs">
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />
        <div className="orb orb-4" />
      </div>

      {/* Navigation */}
      <nav className="landing-nav">
        <div className="nav-container">
          <div className="nav-brand">
            <div className="nav-logo glow-effect">
              <Sparkles size={20} className="text-white" />
            </div>
            <span className="nav-brand-text">KnowledgeBase AI</span>
          </div>
          <div className="nav-actions">
            <Link href="/login" className="btn btn-ghost text-sm">
              Log In
            </Link>
            <Link href="/signup" className="btn btn-primary btn-sm btn-glow">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero">
        <div className="hero-content">
          <div className="hero-badge animate-fade-in-down">
            <span className="badge badge-info">
              <Sparkles size={14} className="mr-1" /> AI-Powered Support Assistant
            </span>
          </div>
          <h1 className="hero-title animate-fade-in-up">
            Make your documents <br />
            <span className="gradient-text">truly conversational.</span>
          </h1>
          <p className="hero-description animate-fade-in-up" style={{ animationDelay: "100ms" }}>
            Upload your company's knowledge base and instantly deploy an AI chat widget on your website. 
            Accurate, cited, and beautifully integrated in just one line of code.
          </p>
          <div className="hero-actions animate-fade-in-up" style={{ animationDelay: "200ms" }}>
            <Link href="/signup" className="btn btn-primary btn-lg btn-glow group">
              Start Building for Free
              <ArrowRight size={18} className="btn-icon-right transition-transform group-hover:translate-x-1" />
            </Link>
            <Link href="#features" className="btn btn-secondary btn-lg btn-interactive">
              Explore Features
            </Link>
          </div>
          
          <div className="trusted-by animate-fade-in-up" style={{ animationDelay: "300ms" }}>
            <p className="trusted-title">Trusted by innovative teams worldwide</p>
            <div className="trusted-logos">
              <div className="trusted-logo"><Building2 size={20}/> <span>Acme Corp</span></div>
              <div className="trusted-logo"><Layout size={20}/> <span>GlobalNet</span></div>
              <div className="trusted-logo"><Database size={20}/> <span>DataSys</span></div>
            </div>
          </div>
        </div>

        {/* Hero Visual — Floating UI Preview */}
        <div className="hero-visual animate-fade-in-up" style={{ animationDelay: "400ms" }}>
          <div className="glass-card hero-mockup glow-border">
            <div className="mockup-header mac-header">
              <div className="mockup-dots">
                <span /><span /><span />
              </div>
              <span className="mockup-url">dashboard.knowledgebase.ai</span>
            </div>
            <div className="mockup-body">
              <div className="mockup-sidebar">
                <div className="mockup-sidebar-item active"><BookOpen size={14}/> Product Docs</div>
                <div className="mockup-sidebar-item"><MessageSquare size={14}/> FAQ</div>
                <div className="mockup-sidebar-item"><ShieldCheck size={14}/> Policies</div>
              </div>
              <div className="mockup-chat">
                <div className="mockup-msg user">What is the API rate limit for the Pro plan?</div>
                <div className="mockup-msg assistant">
                  Based on your pricing documentation, the Pro plan includes up to 1,000 API requests per minute.
                  <div className="mockup-citation">
                    <BookOpen size={12}/> API_Docs.pdf
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features" id="features">
        <div className="section-header">
          <h2 className="section-title">
            Enterprise-grade capabilities,<br />
            <span className="gradient-text">built for scale.</span>
          </h2>
          <p className="section-subtitle">
            Everything you need to deploy reliable AI assistants without writing complex RAG pipelines.
          </p>
        </div>
        
        <div className="bento-grid">
          <div className="bento-card col-span-2 glass-card glass-card-interactive">
            <div className="feature-icon-wrapper"><Database className="feature-icon text-accent-primary" /></div>
            <h3>Multi-Tenant Architecture</h3>
            <p>Create isolated knowledge bases for different projects, clients, or internal teams. Data is perfectly segmented and secure, never leaking between environments.</p>
          </div>
          <div className="bento-card glass-card glass-card-interactive">
            <div className="feature-icon-wrapper"><BookOpen className="feature-icon text-accent-secondary" /></div>
            <h3>Universal Support</h3>
            <p>Upload PDFs, Word docs, text files, or provide website URLs. We handle the chunking.</p>
          </div>
          <div className="bento-card glass-card glass-card-interactive">
            <div className="feature-icon-wrapper"><ShieldCheck className="feature-icon text-success" /></div>
            <h3>Ironclad Security</h3>
            <p>Row-level database security with public/private key isolation and robust rate limiting.</p>
          </div>
          <div className="bento-card col-span-2 glass-card glass-card-interactive">
            <div className="feature-icon-wrapper"><MessageSquare className="feature-icon text-info" /></div>
            <h3>Zero-Hallucination Citations</h3>
            <p>Every response strictly cites your exact documentation. If the answer isn't in your files, the AI safely admits it, protecting your brand from misinformation.</p>
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="how-it-works-section">
        <h2 className="section-title text-center">
          From documents to <span className="gradient-text">chatbot</span> in minutes
        </h2>
        <div className="steps-container mt-12">
          <div className="step-card glass-card">
            <div className="step-number glow-text">01</div>
            <h3>Upload Data</h3>
            <p className="text-secondary text-sm mt-2">Drag and drop your PDFs, manuals, and FAQs.</p>
          </div>
          <div className="step-connector"></div>
          <div className="step-card glass-card">
            <div className="step-number glow-text">02</div>
            <h3>Auto-Process</h3>
            <p className="text-secondary text-sm mt-2">We chunk, embed, and index your content instantly.</p>
          </div>
          <div className="step-connector"></div>
          <div className="step-card glass-card">
            <div className="step-number glow-text">03</div>
            <h3>Embed Widget</h3>
            <p className="text-secondary text-sm mt-2">Copy one line of code to deploy on your site.</p>
          </div>
        </div>
      </section>

      {/* Embed Section */}
      <section className="embed-section">
        <div className="embed-content">
          <h2 className="section-title">
            Deploy in <span className="gradient-text">one line</span> of code
          </h2>
          <p className="section-subtitle mx-auto">
            No frontend work required. Drop this script tag on any website, and your users get an intelligent support widget instantly.
          </p>
          <div className="terminal-window glass-card mt-12 glow-border">
            <div className="terminal-header mac-header">
              <div className="mockup-dots">
                <span /><span /><span />
              </div>
              <span className="terminal-title">index.html</span>
            </div>
            <div className="terminal-body">
              <code>
                <span className="token-tag">{"<script"}</span>
                <span className="token-attr">{" src"}</span>
                <span className="token-punct">{"="}</span>
                <span className="token-string">{'"https://knowledgebase.ai/widget.js"'}</span>
                <br/>
                <span className="token-attr">{"        data-kb"}</span>
                <span className="token-punct">{"="}</span>
                <span className="token-string">{'"kb_public_key_123456789"'}</span>
                <span className="token-tag">{"></script>"}</span>
              </code>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="testimonials">
        <div className="testimonial-card glass-card glow-border-soft">
          <Quote size={40} className="text-accent opacity-30 mb-6" />
          <p className="testimonial-text text-lg italic">
            "KnowledgeBase AI completely transformed our customer support. We uploaded our entire product manual, and now our users get instant, accurate answers without submitting tickets."
          </p>
          <div className="testimonial-author mt-8 flex items-center gap-4">
            <div className="author-avatar bg-accent-glow rounded-full w-12 h-12 flex items-center justify-center font-bold text-accent">
              SJ
            </div>
            <div>
              <div className="font-bold">Sarah Jenkins</div>
              <div className="text-sm text-secondary">VP of Support, TechFlow</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta-section">
        <div className="glass-card cta-card glow-border-strong relative overflow-hidden">
          <div className="cta-bg-glow" />
          <h2 className="relative z-10 text-3xl md:text-4xl font-bold mb-4">Ready to elevate your support?</h2>
          <p className="relative z-10 text-secondary mb-8 max-w-lg mx-auto text-lg">Join thousands of companies using KnowledgeBase AI to empower their users with intelligent, cited answers.</p>
          <Link href="/signup" className="btn btn-primary btn-lg btn-glow group relative z-10">
            Create Your Knowledge Base
            <ArrowRight size={18} className="btn-icon-right transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="footer-content max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center py-8 px-6 gap-6">
          <div className="nav-brand">
            <Sparkles size={16} className="text-accent" />
            <span className="font-bold ml-2">KnowledgeBase AI</span>
          </div>
          <div className="text-secondary text-sm flex gap-8 font-medium">
            <Link href="#" className="hover:text-accent transition-colors">Terms of Service</Link>
            <Link href="#" className="hover:text-accent transition-colors">Privacy Policy</Link>
            <Link href="#" className="hover:text-accent transition-colors">Contact Support</Link>
          </div>
        </div>
        <p className="text-secondary text-xs text-center border-t border-glass pt-8 mt-4 mx-6 opacity-60">
          © {new Date().getFullYear()} KnowledgeBase AI. Designed for production.
        </p>
      </footer>
    </div>
  );
}
