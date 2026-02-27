'use client';
import { useRouter } from 'next/navigation';
import { 
  Dumbbell, 
  Users, 
  Building2, 
  TrendingUp, 
  Shield, 
  Clock,
  BarChart3,
  Calendar,
  Phone,
  Mail,
  MapPin,
  Info,
  LogIn
} from 'lucide-react';

export default function LandingPage() {
  const router = useRouter();

  const handleLoginClick = () => {
    router.push('/login');
  };

  const features = [
    {
      icon: <Users style={{
        width: 'clamp(2rem, 4vw, 4rem)', 
        height: 'clamp(2rem, 4vw, 4rem)', 
        color: '#3B82F6'
      }} />,
      title: "Member Management",
      description: "Complete member profiles, attendance tracking, and membership management",
      bgColor: "bg-blue-500"
    },
    {
      icon: <Building2 style={{
        width: 'clamp(2rem, 4vw, 4rem)', 
        height: 'clamp(2rem, 4vw, 4rem)', 
        color: '#10B981'
      }} />,
      title: "Multi-Branch Control", 
      description: "Manage multiple gym branches with role-based access control",
      bgColor: "bg-green-500"
    },
    {
      icon: <TrendingUp style={{
        width: 'clamp(2rem, 4vw, 4rem)', 
        height: 'clamp(2rem, 4vw, 4rem)', 
        color: '#8B5CF6'
      }} />,
      title: "Analytics & Reports",
      description: "Revenue tracking, member analytics, and comprehensive reporting",
      bgColor: "bg-purple-500"
    },
    {
      icon: <Shield style={{
        width: 'clamp(2rem, 4vw, 4rem)', 
        height: 'clamp(2rem, 4vw, 4rem)', 
        color: '#EF4444'
      }} />,
      title: "Secure Access",
      description: "Role-based permissions for owners and branch managers",
      bgColor: "bg-red-500"
    },
    {
      icon: <BarChart3 style={{
        width: 'clamp(2rem, 4vw, 4rem)', 
        height: 'clamp(2rem, 4vw, 4rem)', 
        color: '#F59E0B'
      }} />,
      title: "Performance Metrics",
      description: "Track gym performance, member growth, and revenue trends",
      bgColor: "bg-yellow-500"
    },
    {
      icon: <Calendar style={{
        width: 'clamp(2rem, 4vw, 4rem)', 
        height: 'clamp(2rem, 4vw, 4rem)', 
        color: '#06B6D4'
      }} />,
      title: "Attendance Management",
      description: "Manage attendance of your members efficiently using biometrics",
      bgColor: "bg-cyan-500"
    }
  ];

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 50%, #1e293b 100%)',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      position: 'relative'
    }}>

      {/* Header */}
      <header style={{
        padding: 'clamp(1rem, 3vw, 2rem)', 
        position: 'relative', 
        zIndex: 10
      }}>
        <div style={{
          maxWidth: '90rem', 
          margin: '0 auto', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 'clamp(1rem, 2vw, 2rem)'
        }}>
          <div style={{
            display: 'flex', 
            alignItems: 'center', 
            gap: 'clamp(0.5rem, 2vw, 1rem)',
            minWidth: 'fit-content'
          }}>
            <div style={{
              background: 'linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%)',
              padding: 'clamp(0.5rem, 1.5vw, 0.75rem)',
              borderRadius: 'clamp(0.5rem, 1.5vw, 0.75rem)',
              boxShadow: '0 4px 15px rgba(59, 130, 246, 0.3)'
            }}>
              <Dumbbell style={{
                width: 'clamp(1.5rem, 3vw, 2rem)', 
                height: 'clamp(1.5rem, 3vw, 2rem)', 
                color: 'white'
              }} />
            </div>
            <h1 style={{
              fontSize: 'clamp(1.25rem, 4vw, 2rem)', 
              fontWeight: 'bold', 
              color: 'white', 
              margin: 0,
              whiteSpace: 'nowrap'
            }}>
              GymPro Manager
            </h1>
          </div>
          
          {/* Navigation */}
          <div style={{
            display: 'flex', 
            alignItems: 'center', 
            gap: 'clamp(1rem, 3vw, 2rem)',
            flexWrap: 'wrap',
            justifyContent: 'center'
          }}>
            <div style={{
              display: 'flex', 
              alignItems: 'center', 
              gap: 'clamp(0.25rem, 1vw, 0.5rem)', 
              color: '#94A3B8', 
              fontSize: 'clamp(0.75rem, 2vw, 0.9rem)',
              whiteSpace: 'nowrap'
            }}>
              <Clock style={{width: 'clamp(0.75rem, 2vw, 1rem)', height: 'clamp(0.75rem, 2vw, 1rem)'}} />
              <span>24/7 Management Access</span>
            </div>
            
            <nav style={{
              display: 'flex', 
              alignItems: 'center', 
              gap: 'clamp(0.75rem, 2.5vw, 1.5rem)',
              flexWrap: 'wrap'
            }}>
              <a href="#about" style={{
                color: '#CBD5E1', 
                textDecoration: 'none', 
                fontSize: 'clamp(0.8rem, 2vw, 0.95rem)', 
                fontWeight: '500', 
                transition: 'color 0.3s',
                whiteSpace: 'nowrap'
              }}
                 onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.color = '#60A5FA'}
                 onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.color = '#CBD5E1'}>
                About Us
              </a>
              <a href="#contact" style={{
                color: '#CBD5E1', 
                textDecoration: 'none', 
                fontSize: 'clamp(0.8rem, 2vw, 0.95rem)', 
                fontWeight: '500', 
                transition: 'color 0.3s',
                whiteSpace: 'nowrap'
              }}
                 onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.color = '#60A5FA'}
                 onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.color = '#CBD5E1'}>
                Contact Us
              </a>
              
              <button 
                onClick={handleLoginClick}
                style={{
                  background: 'linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%)',
                  color: 'white',
                  fontSize: 'clamp(0.8rem, 2vw, 0.95rem)',
                  fontWeight: '600',
                  padding: 'clamp(0.4rem, 1.5vw, 0.6rem) clamp(0.75rem, 3vw, 1.5rem)',
                  borderRadius: 'clamp(0.25rem, 1vw, 0.5rem)',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 'clamp(0.25rem, 1vw, 0.5rem)',
                  boxShadow: '0 4px 15px rgba(59, 130, 246, 0.3)',
                  transition: 'all 0.3s ease',
                  whiteSpace: 'nowrap'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(59, 130, 246, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 15px rgba(59, 130, 246, 0.3)';
                }}>
                <LogIn style={{width: 'clamp(0.75rem, 2vw, 1rem)', height: 'clamp(0.75rem, 2vw, 1rem)'}} />
                Login
              </button>
            </nav>
          </div>
        </div>
      </header>

      <main style={{
        maxWidth: '90rem', 
        margin: '0 auto', 
        padding: 'clamp(2rem, 5vw, 3rem) clamp(1rem, 4vw, 2rem)', 
        position: 'relative', 
        zIndex: 5
      }}>
        
        {/* Hero Section */}
        <div style={{
          textAlign: 'center', 
          marginBottom: 'clamp(3rem, 8vw, 6rem)'
        }}>
          <h2 style={{
            fontSize: 'clamp(2rem, 8vw, 4rem)',
            fontWeight: 'bold',
            color: 'white',
            lineHeight: '1.2',
            marginBottom: 'clamp(0.5rem, 2vw, 1rem)',
            margin: '0 0 clamp(0.5rem, 2vw, 1rem) 0'
          }}>
            Professional
          </h2>
          <h2 style={{
            fontSize: 'clamp(2rem, 8vw, 4rem)',
            fontWeight: 'bold',
            background: 'linear-gradient(135deg, #60A5FA 0%, #A78BFA 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            lineHeight: '1.2',
            marginBottom: 'clamp(2rem, 6vw, 4rem)',
            margin: '0 0 clamp(2rem, 6vw, 4rem) 0'
          }}>
            Gym Management System
          </h2>
          
          <p style={{
            fontSize: 'clamp(1rem, 3vw, 1.25rem)',
            color: '#CBD5E1',
            maxWidth: '50rem',
            margin: '0 auto clamp(2rem, 5vw, 3rem) auto',
            lineHeight: '1.7',
            padding: '0 clamp(1rem, 3vw, 2rem)'
          }}>
            Streamline your gym operations with our comprehensive management platform. 
            Perfect for gym owners and branch managers to track members, payments, and analytics.
          </p>
        </div>

        {/* Features Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(clamp(280px, 40vw, 350px), 1fr))',
          gap: 'clamp(1.5rem, 4vw, 2rem)',
          marginBottom: 'clamp(3rem, 8vw, 4rem)',
          padding: '0 clamp(0.5rem, 2vw, 1rem)'
        }}>
          {features.map((feature, index) => (
            <div key={index} style={{
              background: 'rgba(30, 41, 59, 0.6)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(100, 116, 139, 0.3)',
              borderRadius: 'clamp(0.75rem, 2vw, 1rem)',
              padding: 'clamp(1.5rem, 4vw, 2rem)',
              transition: 'all 0.3s ease',
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(30, 41, 59, 0.8)';
              e.currentTarget.style.transform = 'translateY(-5px)';
              e.currentTarget.style.boxShadow = '0 20px 40px rgba(0, 0, 0, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(30, 41, 59, 0.6)';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}>
              <div style={{marginBottom: 'clamp(0.75rem, 2vw, 1rem)'}}>
                {feature.icon}
              </div>
              <h3 style={{
                color: 'white',
                fontSize: 'clamp(1.125rem, 3vw, 1.5rem)',
                fontWeight: '600',
                marginBottom: 'clamp(0.75rem, 2vw, 1rem)',
                margin: '0 0 clamp(0.75rem, 2vw, 1rem) 0'
              }}>
                {feature.title}
              </h3>
              <p style={{
                color: '#94A3B8',
                lineHeight: '1.6',
                margin: 0,
                fontSize: 'clamp(0.875rem, 2.5vw, 1rem)'
              }}>
                {feature.description}
              </p>
            </div>
          ))}
        </div>

        {/* Stats Section */}
        <div style={{
          background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
          borderRadius: 'clamp(1.5rem, 4vw, 2rem)',
          padding: 'clamp(2rem, 6vw, 3rem) clamp(1rem, 4vw, 2rem)',
          border: '1px solid rgba(100, 116, 139, 0.3)',
          boxShadow: '0 25px 50px rgba(0, 0, 0, 0.2)',
          marginBottom: 'clamp(3rem, 8vw, 4rem)'
        }}>
          <h3 style={{
            textAlign: 'center',
            color: 'white',
            fontSize: 'clamp(1.5rem, 5vw, 2.5rem)',
            fontWeight: 'bold',
            marginBottom: 'clamp(2rem, 6vw, 3rem)',
            margin: '0 0 clamp(2rem, 6vw, 3rem) 0'
          }}>
            Gym Insights
          </h3>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(clamp(150px, 25vw, 200px), 1fr))',
            gap: 'clamp(1.5rem, 4vw, 2rem)',
            textAlign: 'center'
          }}>
            <div>
              <div style={{
                fontSize: 'clamp(2rem, 7vw, 3.5rem)',
                fontWeight: 'bold',
                background: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                marginBottom: 'clamp(0.25rem, 1vw, 0.5rem)'
              }}>
                3+
              </div>
              <div style={{
                color: '#94A3B8', 
                fontSize: 'clamp(0.9rem, 2.5vw, 1.1rem)'
              }}>
                Active Gyms
              </div>
            </div>
            
            <div>
              <div style={{
                fontSize: 'clamp(2rem, 7vw, 3.5rem)',
                fontWeight: 'bold',
                background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                marginBottom: 'clamp(0.25rem, 1vw, 0.5rem)'
              }}>
                1K+
              </div>
              <div style={{
                color: '#94A3B8', 
                fontSize: 'clamp(0.9rem, 2.5vw, 1.1rem)'
              }}>
                Members Managed
              </div>
            </div>
            
            <div>
              <div style={{
                fontSize: 'clamp(2rem, 7vw, 3.5rem)',
                fontWeight: 'bold',
                background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                marginBottom: 'clamp(0.25rem, 1vw, 0.5rem)'
              }}>
              ₹10K+
              </div>
              <div style={{
                color: '#94A3B8', 
                fontSize: 'clamp(0.9rem, 2.5vw, 1.1rem)'
              }}>
                Revenue Processed
              </div>
            </div>
          </div>
        </div>

        {/* About Us Section */}
        <div id="about" style={{
          background: 'rgba(30, 41, 59, 0.6)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(100, 116, 139, 0.3)',
          borderRadius: 'clamp(1.5rem, 4vw, 2rem)',
          padding: 'clamp(2rem, 6vw, 3rem) clamp(1rem, 4vw, 2rem)',
          marginBottom: 'clamp(3rem, 8vw, 4rem)',
          textAlign: 'center'
        }}>
          <div style={{marginBottom: 'clamp(1.5rem, 4vw, 2rem)'}}>
            <Info style={{
              width: 'clamp(3rem, 8vw, 4rem)', 
              height: 'clamp(3rem, 8vw, 4rem)', 
              color: '#60A5FA', 
              margin: '0 auto'
            }} />
          </div>
          <h3 style={{
            color: 'white',
            fontSize: 'clamp(1.5rem, 5vw, 2.5rem)',
            fontWeight: 'bold',
            marginBottom: 'clamp(1.5rem, 4vw, 2rem)',
            margin: '0 0 clamp(1.5rem, 4vw, 2rem) 0'
          }}>
            About GymPro Manager
          </h3>
          <p style={{
            color: '#CBD5E1',
            fontSize: 'clamp(1rem, 2.5vw, 1.1rem)',
            lineHeight: '1.8',
            maxWidth: '50rem',
            margin: '0 auto clamp(1.5rem, 4vw, 2rem) auto'
          }}>
            GymPro Manager is a comprehensive gym management solution designed specifically for gym owners and branch managers. 
            Built with modern technology and deep understanding of local gym operations, we provide tools that help you manage members, 
            track attendance, process payments, and generate insightful reports.
          </p>
          
        </div>

        {/* Contact Us Section */}
        <div id="contact" style={{
          background: 'rgba(30, 41, 59, 0.6)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(100, 116, 139, 0.3)',
          borderRadius: 'clamp(1.5rem, 4vw, 2rem)',
          padding: 'clamp(2rem, 6vw, 3rem) clamp(1rem, 4vw, 2rem)'
        }}>
          <h3 style={{
            textAlign: 'center',
            color: 'white',
            fontSize: 'clamp(1.5rem, 5vw, 2.5rem)',
            fontWeight: 'bold',
            marginBottom: 'clamp(2rem, 6vw, 3rem)',
            margin: '0 0 clamp(2rem, 6vw, 3rem) 0'
          }}>
            Contact Us
          </h3>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(clamp(200px, 30vw, 250px), 1fr))',
            gap: 'clamp(1.5rem, 4vw, 2rem)',
            textAlign: 'center'
          }}>
            <div style={{
              background: 'rgba(59, 130, 246, 0.1)',
              padding: 'clamp(1.5rem, 4vw, 2rem)',
              borderRadius: 'clamp(0.75rem, 2vw, 1rem)',
              border: '1px solid rgba(59, 130, 246, 0.2)'
            }}>
              <Phone style={{
                width: 'clamp(1.5rem, 4vw, 2rem)', 
                height: 'clamp(1.5rem, 4vw, 2rem)', 
                color: '#60A5FA', 
                margin: '0 auto clamp(0.75rem, 2vw, 1rem) auto'
              }} />
              <h4 style={{
                color: 'white', 
                fontSize: 'clamp(1rem, 2.75vw, 1.2rem)', 
                marginBottom: 'clamp(0.25rem, 1vw, 0.5rem)', 
                margin: '0 0 clamp(0.25rem, 1vw, 0.5rem) 0'
              }}>
                Phone Support
              </h4>
              <p style={{color: '#CBD5E1', margin: 0, fontSize: 'clamp(0.875rem, 2.25vw, 1rem)'}}>+91 98765 43210</p>
              <p style={{
                color: '#94A3B8', 
                fontSize: 'clamp(0.8rem, 2vw, 0.9rem)', 
                margin: 'clamp(0.25rem, 1vw, 0.5rem) 0 0 0'
              }}>
                Mon-Sat: 9 AM - 8 PM
              </p>
            </div>
            
            <div style={{
              background: 'rgba(16, 185, 129, 0.1)',
              padding: 'clamp(1.5rem, 4vw, 2rem)',
              borderRadius: 'clamp(0.75rem, 2vw, 1rem)',
              border: '1px solid rgba(16, 185, 129, 0.2)'
            }}>
              <Mail style={{
                width: 'clamp(1.5rem, 4vw, 2rem)', 
                height: 'clamp(1.5rem, 4vw, 2rem)', 
                color: '#10B981', 
                margin: '0 auto clamp(0.75rem, 2vw, 1rem) auto'
              }} />
              <h4 style={{
                color: 'white', 
                fontSize: 'clamp(1rem, 2.75vw, 1.2rem)', 
                marginBottom: 'clamp(0.25rem, 1vw, 0.5rem)', 
                margin: '0 0 clamp(0.25rem, 1vw, 0.5rem) 0'
              }}>
                Email Support
              </h4>
              <p style={{color: '#CBD5E1', margin: 0, fontSize: 'clamp(0.875rem, 2.25vw, 1rem)'}}>support@gympro.com</p>
              <p style={{
                color: '#94A3B8', 
                fontSize: 'clamp(0.8rem, 2vw, 0.9rem)', 
                margin: 'clamp(0.25rem, 1vw, 0.5rem) 0 0 0'
              }}>
                24/7 Response
              </p>
            </div>
            
            <div style={{
              background: 'rgba(139, 92, 246, 0.1)',
              padding: 'clamp(1.5rem, 4vw, 2rem)',
              borderRadius: 'clamp(0.75rem, 2vw, 1rem)',
              border: '1px solid rgba(139, 92, 246, 0.2)'
            }}>
              <MapPin style={{
                width: 'clamp(1.5rem, 4vw, 2rem)', 
                height: 'clamp(1.5rem, 4vw, 2rem)', 
                color: '#8B5CF6', 
                margin: '0 auto clamp(0.75rem, 2vw, 1rem) auto'
              }} />
              <h4 style={{
                color: 'white', 
                fontSize: 'clamp(1rem, 2.75vw, 1.2rem)', 
                marginBottom: 'clamp(0.25rem, 1vw, 0.5rem)', 
                margin: '0 0 clamp(0.25rem, 1vw, 0.5rem) 0'
              }}>
                Office Location
              </h4>
              <p style={{color: '#CBD5E1', margin: 0, fontSize: 'clamp(0.875rem, 2.25vw, 1rem)'}}>Chennai, Tamil Nadu</p>
              <p style={{
                color: '#94A3B8', 
                fontSize: 'clamp(0.8rem, 2vw, 0.9rem)', 
                margin: 'clamp(0.25rem, 1vw, 0.5rem) 0 0 0'
              }}>
                India - 600001
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Background Decorations */}
      <div style={{position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none', zIndex: -1}}>
        <div style={{
          position: 'absolute',
          top: '-10rem',
          right: '-10rem',
          width: 'clamp(15rem, 25vw, 20rem)',
          height: 'clamp(15rem, 25vw, 20rem)',
          background: 'radial-gradient(circle, rgba(59, 130, 246, 0.1) 0%, transparent 70%)',
          borderRadius: '50%'
        }}></div>
        <div style={{
          position: 'absolute',
          bottom: '-10rem',
          left: '-10rem',
          width: 'clamp(15rem, 25vw, 20rem)',
          height: 'clamp(15rem, 25vw, 20rem)',
          background: 'radial-gradient(circle, rgba(139, 92, 246, 0.1) 0%, transparent 70%)',
          borderRadius: '50%'
        }}></div>
      </div>
    </div>
  );
}
