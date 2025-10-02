// LandingPage.tsx
import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useScroll, useTransform, useInView } from 'framer-motion';
import anime from 'animejs';
// import { Rive, Layout, Fit, Alignment } from '@rive-app/react-canvas';
// import Spline from '@splinetool/react-spline';
import Squares from '../components/Squares';
import GlitchText from '../components/GlitchText';
import { LineShadowText } from '../components/ui/LineShadowText';
import './LandingPage.css';

// TypeScript interfaces
interface FeatureCardProps {
  icon: string;
  title: string;
  description: string;
  delay?: number;
}

interface StatProps {
  number: string;
  label: string;
  delay?: number;
}

// FloatingCard interface removed - no longer needed

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const featuresRef = useRef<HTMLElement>(null);
  const heroRef = useRef<HTMLElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [showHeader, setShowHeader] = useState(false);

  // Framer Motion scroll-based animations - simplified
  const { scrollYProgress } = useScroll();

  // Intersection Observer for gradual blur effects
  const heroInView = useInView(heroRef, { once: true, amount: 0.3 });
  const featuresInView = useInView(featuresRef, { once: true, amount: 0.2 });

  useEffect(() => {
    setIsLoaded(true);
    
    // Enhanced hero section animations with gradual blur
    const heroAnimation = anime.timeline({
      easing: 'easeOutExpo',
      duration: 1000
    });

    heroAnimation
      .add({
        targets: '.hero-title',
        translateY: [-50, 0],
        opacity: [0, 1],
        duration: 1200,
        easing: 'easeOutCubic'
      })
      .add({
        targets: '.hero-subtitle',
        translateY: [30, 0],
        opacity: [0, 1],
        duration: 1000,
        // filter: ['blur(10px)', 'blur(0px)'] // Gradual blur effect - removed to prevent errors
      }, '-=800')
      .add({
        targets: '.hero-buttons',
        translateY: [30, 0],
        opacity: [0, 1],
        duration: 1000,
        // filter: ['blur(10px)', 'blur(0px)'] // Removed to prevent errors
      }, '-=600');

    // Floating cards animation removed - no longer needed

    // Stats counter animation
    anime({
      targets: '.stat-number',
      innerHTML: [0, (el: HTMLElement) => {
        const target = el.getAttribute('data-target');
        return target || '0';
      }],
      duration: 2000,
      easing: 'easeOutExpo',
      round: 1,
      delay: anime.stagger(200)
    });

    // Initialize draggable squares with native JavaScript
    const squares = document.querySelectorAll('.draggable-square');
    const draggableInstances: Array<{ element: HTMLElement; cleanup: () => void }> = [];
    
    squares.forEach((square, index) => {
      const element = square as HTMLElement;
      let isDragging = false;
      let startX = 0;
      let startY = 0;
      let initialX = 0;
      let initialY = 0;

      const handleMouseDown = (e: MouseEvent) => {
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        initialX = element.offsetLeft;
        initialY = element.offsetTop;
        
        // Grab animation
        anime({
          targets: element,
          scale: 1.1,
          rotate: 5,
          duration: 200,
          easing: 'easeOutExpo'
        });
        
        element.style.cursor = 'grabbing';
        e.preventDefault();
      };

      const handleMouseMove = (e: MouseEvent) => {
        if (!isDragging) return;
        
        const deltaX = e.clientX - startX;
        const deltaY = e.clientY - startY;
        
        // Snap to grid
        const snapSize = 50;
        const snappedX = Math.round((initialX + deltaX) / snapSize) * snapSize;
        const snappedY = Math.round((initialY + deltaY) / snapSize) * snapSize;
        
        element.style.left = `${snappedX}px`;
        element.style.top = `${snappedY}px`;
      };

      const handleMouseUp = () => {
        if (!isDragging) return;
        
        isDragging = false;
        
        // Release animation
        anime({
          targets: element,
          scale: 1,
          rotate: 0,
          duration: 300,
          easing: 'easeOutExpo'
        });
        
        element.style.cursor = 'grab';
      };

      // Add event listeners
      element.addEventListener('mousedown', handleMouseDown);
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);

      // Store cleanup function
      draggableInstances.push({
        element,
        cleanup: () => {
          element.removeEventListener('mousedown', handleMouseDown);
          document.removeEventListener('mousemove', handleMouseMove);
          document.removeEventListener('mouseup', handleMouseUp);
        }
      });
    });

    // Scroll-triggered animations for squares rolling in from sides
    const handleScroll = () => {
      squares.forEach((square) => {
        const element = square as HTMLElement;
        const rect = element.getBoundingClientRect();
        const isVisible = rect.top < window.innerHeight && rect.bottom > 0;
        
        if (isVisible && !element.classList.contains('animated-in')) {
          element.classList.add('animated-in');
          const delay = parseInt(element.getAttribute('data-delay') || '0') * 200;
          const isLeftSide = element.classList.contains('square-1') || element.classList.contains('square-3');
          
          anime({
            targets: element,
            translateX: [isLeftSide ? -200 : 200, 0],
            rotate: [isLeftSide ? -180 : 180, 0],
            opacity: [0, 1],
            scale: [0.5, 1],
            duration: 800,
            delay: delay,
            easing: 'easeOutExpo'
          });
        }
      });
    };

    // Scroll animations for features section
    const handleFeaturesScroll = () => {
      const featureCards = document.querySelectorAll('.feature-card');
      featureCards.forEach((card) => {
        const element = card as HTMLElement;
        const rect = element.getBoundingClientRect();
        const isVisible = rect.top < window.innerHeight * 0.8 && rect.bottom > 0;
        
        if (isVisible && !element.classList.contains('feature-animated')) {
          element.classList.add('feature-animated');
          anime({
            targets: element,
            translateY: [100, 0],
            opacity: [0, 1],
            rotate: [5, 0],
            scale: [0.8, 1],
            duration: 800,
            easing: 'easeOutExpo'
          });
        }
      });
    };

    // Add scroll listeners
    window.addEventListener('scroll', handleScroll);
    window.addEventListener('scroll', handleFeaturesScroll);
    
    // Initial check
    handleScroll();
    handleFeaturesScroll();
    
    // Cleanup function
    return () => {
      draggableInstances.forEach(instance => instance.cleanup());
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('scroll', handleFeaturesScroll);
    };

  }, []);

  // Header scroll listener
  useEffect(() => {
    const handleHeaderScroll = () => {
      const heroHeight = heroRef.current?.offsetHeight || 0;
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      setShowHeader(scrollTop > heroHeight * 0.5);
    };

    window.addEventListener('scroll', handleHeaderScroll);
    return () => window.removeEventListener('scroll', handleHeaderScroll);
  }, []);

  const handleGetStarted = (): void => {
    navigate('/register');
  };

  const handleLogin = (): void => {
    navigate('/login');
  };

  const scrollToFeatures = (): void => {
    featuresRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Feature card component with enhanced animations
  const FeatureCard: React.FC<FeatureCardProps> = ({ icon, title, description, delay = 0 }) => (
    <motion.div
      className="feature-card"
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ 
        opacity: 1, 
        y: 0,
        transition: { duration: 0.8, delay: delay * 0.1 }
      }}
      viewport={{ once: true, amount: 0.3 }}
      whileHover={{ 
        scale: 1.05, 
        y: -10,
        transition: { duration: 0.3 }
      }}
    >
      <div className="feature-icon">
        <i className={icon}></i>
      </div>
      <h3>{title}</h3>
      <p>{description}</p>
    </motion.div>
  );

  // Stat component with counter animation
  const Stat: React.FC<StatProps> = ({ number, label, delay = 0 }) => (
    <motion.div
      className="stat"
      initial={{ opacity: 0, scale: 0.8 }}
      whileInView={{ 
        opacity: 1, 
        scale: 1,
        transition: { duration: 0.6, delay: delay * 0.1 }
      }}
      viewport={{ once: true }}
    >
      <div className="stat-number" data-target={number}>{number}</div>
      <div className="stat-label">{label}</div>
    </motion.div>
  );

  // FloatingCard component removed - no longer needed

  return (
    <div 
      className="landing-page"
      style={{
        background: 'transparent',
        margin: 0,
        padding: 0,
        minHeight: '100vh',
        width: '100%'
      }}
    >
      {/* Interactive Squares Background */}
      <div style={{ 
        position: 'fixed', 
        top: 0, 
        left: 0, 
        right: 0, 
        bottom: 0, 
        zIndex: 1,
        pointerEvents: 'auto'
      }}>
        <Squares
          speed={0.10}
          squareSize={120}
          direction="diagonal"
          borderColor="rgba(255, 255, 255, 0.2)"
          hoverFillColor="rgba(52, 152, 219, 0.6)"
        />
      </div>
      {/* Header with enhanced animations - only show when scrolled */}
      {showHeader && (
        <motion.header 
          className="header"
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
        <div className="container">
          <motion.div 
            className="logo" 
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <div className="logo-icon">
              <i className="fas fa-graduation-cap"></i>
            </div>
            <span className="logo-text">CampusLearn™</span>
          </motion.div>
          
          <nav className="nav-links">
            <motion.a 
              href="#features" 
              onClick={(e) => { e.preventDefault(); scrollToFeatures(); }}
              whileHover={{ scale: 1.1 }}
            >
              Features
            </motion.a>
            <motion.a 
              href="#about"
              whileHover={{ scale: 1.1 }}
            >
              About
            </motion.a>
            <motion.button 
              className="btn btn-outline btn-star-border" 
              onClick={handleLogin}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Login
            </motion.button>
            <motion.button 
              className="btn btn-primary btn-star-border" 
              onClick={handleGetStarted}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Get Started
            </motion.button>
          </nav>
          
          <motion.button 
            className="mobile-menu-btn"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <i className="fas fa-bars"></i>
          </motion.button>
        </div>
      </motion.header>
      )}

      {/* Hero Section with enhanced visual effects */}
      <motion.section 
        ref={heroRef}
        className="hero-section"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
      >
        <div className="hero-background">
          <motion.div 
            className="gradient-blob blob-1"
            animate={{ 
              scale: [1, 1.2, 1],
              rotate: [0, 180, 360],
              opacity: [0.7, 1, 0.7]
            }}
            transition={{ 
              duration: 8, 
              repeat: Infinity, 
              ease: "easeInOut" 
            }}
          ></motion.div>
          <motion.div 
            className="gradient-blob blob-2"
            animate={{ 
              scale: [1.2, 1, 1.2],
              rotate: [360, 180, 0],
              opacity: [0.5, 0.8, 0.5]
            }}
            transition={{ 
              duration: 10, 
              repeat: Infinity, 
              ease: "easeInOut",
              delay: 2
            }}
          ></motion.div>
          <motion.div 
            className="gradient-blob blob-3"
            animate={{ 
              scale: [1, 1.3, 1],
              rotate: [0, -180, -360],
              opacity: [0.6, 0.9, 0.6]
            }}
            transition={{ 
              duration: 12, 
              repeat: Infinity, 
              ease: "easeInOut",
              delay: 4
            }}
          ></motion.div>
          
          {/* Floating Particles */}
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              className="floating-particle"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
              animate={{
                y: [0, -30, 0],
                x: [0, Math.random() * 20 - 10, 0],
                opacity: [0.3, 0.8, 0.3],
                scale: [0.8, 1.2, 0.8],
              }}
              transition={{
                duration: 4 + Math.random() * 2,
                repeat: Infinity,
                delay: Math.random() * 2,
                ease: "easeInOut",
              }}
            />
          ))}
        </div>
        
        <div 
          className="container"
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '4rem',
            alignItems: 'center',
            position: 'relative',
            zIndex: 10000,
            minHeight: 'calc(100vh - 200px)',
            width: '100%',
            maxWidth: '1200px',
            margin: '0 auto',
            padding: '0 2rem'
          }}
        >
          <div 
            className="hero-content"
            style={{
              color: 'white',
              zIndex: 10,
              position: 'relative',
              minHeight: '400px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              paddingTop: '20px',
              width: '100%'
            }}
          >
            
            <motion.h1 
              className="hero-title"
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.4 }}
            >
              <span>Transform Your</span>
              <LineShadowText
                shadowColor="rgba(52, 152, 219, 0.6)"
                className="hero-line-shadow-text"
              >
                Learning Experience
              </LineShadowText>
            </motion.h1>
            
            <motion.p 
              className="hero-subtitle"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
            >
              CampusLearn™ connects students and tutors in an immersive educational environment. 
              Access resources, collaborate with peers, and achieve academic excellence.
            </motion.p>
            
            <motion.div 
              className="hero-buttons"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.8 }}
            >
              <button 
                className="btn btn-glass btn-large btn-star-border" 
                onClick={handleGetStarted}
              >
                Get Started
              </button>
              <button 
                className="btn btn-glass btn-large btn-star-border" 
                onClick={handleLogin}
              >
                Login
              </button>
              <button 
                className="btn btn-glass btn-large btn-star-border" 
                onClick={scrollToFeatures}
              >
                Learn More
              </button>
            </motion.div>
            
            <motion.div 
              className="hero-stats"
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 1 }}
            >
              <Stat number="00K+" label="Active Students" delay={0} />
              <Stat number="000+" label="Expert Tutors" delay={1} />
              <Stat number="00.00%" label="Success Rate" delay={2} />
            </motion.div>
          </div>
          
        </div>
      </motion.section>

      {/* Features Section with enhanced animations */}
      <motion.section 
        ref={featuresRef}
        className="features-section"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.8 }}
      >
        <div className="container">
          <motion.div 
            className="section-header"
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <h2>Why Choose CampusLearn?</h2>
            <p>Experience education reimagined with our cutting-edge platform</p>
          </motion.div>
          
          <div className="features-grid">
            <FeatureCard
              icon="fas fa-graduation-cap"
              title="Personalized Learning"
              description="Adaptive learning paths tailored to your pace and style with AI-powered recommendations."
              delay={0}
            />
            
            <FeatureCard
              icon="fas fa-users"
              title="Collaborative Environment"
              description="Connect with peers, join study groups, and participate in interactive forums."
              delay={1}
            />
            
            <FeatureCard
              icon="fas fa-chart-line"
              title="Progress Tracking"
              description="Monitor your academic journey with detailed analytics and performance insights."
              delay={2}
            />
            
            <FeatureCard
              icon="fas fa-mobile-alt"
              title="Mobile First"
              description="Access your courses and materials anywhere, anytime with our responsive design."
              delay={3}
            />
            
            <FeatureCard
              icon="fas fa-rocket"
              title="Fast & Reliable"
              description="Lightning-fast performance with 99.9% uptime for uninterrupted learning."
              delay={4}
            />
            
            <FeatureCard
              icon="fas fa-shield-alt"
              title="Secure Platform"
              description="Your data is protected with enterprise-grade security and privacy controls."
              delay={5}
            />
          </div>
        </div>
      </motion.section>


      {/* Application Footer */}
      <footer className="footer">
        <div className="footer-content">
          <div>© 2025 CampusLearn™ - Peer-Powered Learning Platform</div>
          <div className="footer-links">
            <a href="#">Privacy Policy</a>
            <a href="#">Terms of Service</a>
            <a href="#">Contact Us</a>
            <a href="#">About</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
