import { pool } from '../config/database'

const internships = [
  {
    title: 'Software Development Intern',
    company_name: 'Google',
    location: 'Bangalore',
    work_type: 'hybrid',
    duration_months: 6,
    stipend: 80000,
    description: 'Work on cutting-edge technologies and contribute to products used by billions. Collaborate with experienced engineers on real-world projects.',
    required_skills: ['JavaScript', 'Python', 'Data Structures', 'Algorithms'],
    application_deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    source_url: 'https://careers.google.com/internships',
    source_name: 'Google Careers'
  },
  {
    title: 'Data Science Intern',
    company_name: 'Microsoft',
    location: 'Hyderabad',
    work_type: 'hybrid',
    duration_months: 6,
    stipend: 75000,
    description: 'Apply machine learning and statistical analysis to solve complex business problems. Work with Azure ML and big data technologies.',
    required_skills: ['Python', 'Machine Learning', 'SQL', 'Statistics'],
    application_deadline: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000),
    source_url: 'https://careers.microsoft.com',
    source_name: 'Microsoft Careers'
  },
  {
    title: 'Frontend Developer Intern',
    company_name: 'Amazon',
    location: 'Mumbai',
    work_type: 'office',
    duration_months: 5,
    stipend: 70000,
    description: 'Build responsive and scalable web applications for Amazon\'s e-commerce platform. Work with React, TypeScript, and AWS services.',
    required_skills: ['React', 'TypeScript', 'HTML', 'CSS', 'JavaScript'],
    application_deadline: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
    source_url: 'https://amazon.jobs',
    source_name: 'Amazon Jobs'
  },
  {
    title: 'Mobile App Development Intern',
    company_name: 'Flipkart',
    location: 'Bangalore',
    work_type: 'hybrid',
    duration_months: 6,
    stipend: 50000,
    description: 'Develop features for Flipkart\'s mobile app used by millions. Work with React Native and native Android/iOS development.',
    required_skills: ['React Native', 'Android', 'iOS', 'JavaScript'],
    application_deadline: new Date(Date.now() + 35 * 24 * 60 * 60 * 1000),
    source_url: 'https://flipkart.com/careers',
    source_name: 'Flipkart Careers'
  },
  {
    title: 'Machine Learning Intern',
    company_name: 'Adobe',
    location: 'Noida',
    work_type: 'hybrid',
    duration_months: 6,
    stipend: 65000,
    description: 'Work on AI-powered creative tools. Implement ML models for image processing, natural language processing, and computer vision.',
    required_skills: ['Python', 'TensorFlow', 'PyTorch', 'Computer Vision'],
    application_deadline: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000),
    source_url: 'https://adobe.com/careers',
    source_name: 'Adobe Careers'
  },
  {
    title: 'Backend Developer Intern',
    company_name: 'Swiggy',
    location: 'Bangalore',
    work_type: 'office',
    duration_months: 4,
    stipend: 45000,
    description: 'Build scalable microservices for food delivery platform. Work with Node.js, MongoDB, and distributed systems.',
    required_skills: ['Node.js', 'MongoDB', 'REST API', 'Microservices'],
    application_deadline: new Date(Date.now() + 22 * 24 * 60 * 60 * 1000),
    source_url: 'https://swiggy.com/careers',
    source_name: 'Swiggy Careers'
  },
  {
    title: 'Full Stack Developer Intern',
    company_name: 'Zomato',
    location: 'Gurgaon',
    work_type: 'hybrid',
    duration_months: 5,
    stipend: 48000,
    description: 'Work on both frontend and backend of Zomato\'s restaurant discovery platform. Build features end-to-end.',
    required_skills: ['React', 'Node.js', 'PostgreSQL', 'AWS'],
    application_deadline: new Date(Date.now() + 18 * 24 * 60 * 60 * 1000),
    source_url: 'https://zomato.com/careers',
    source_name: 'Zomato Careers'
  },
  {
    title: 'DevOps Intern',
    company_name: 'Paytm',
    location: 'Noida',
    work_type: 'office',
    duration_months: 6,
    stipend: 42000,
    description: 'Automate deployment pipelines and manage cloud infrastructure. Work with Docker, Kubernetes, and CI/CD tools.',
    required_skills: ['Docker', 'Kubernetes', 'AWS', 'Linux', 'CI/CD'],
    application_deadline: new Date(Date.now() + 32 * 24 * 60 * 60 * 1000),
    source_url: 'https://paytm.com/careers',
    source_name: 'Paytm Careers'
  },
  {
    title: 'UI/UX Design Intern',
    company_name: 'Razorpay',
    location: 'Bangalore',
    work_type: 'remote',
    duration_months: 4,
    stipend: 35000,
    description: 'Design intuitive payment experiences for merchants and customers. Create wireframes, prototypes, and conduct user research.',
    required_skills: ['Figma', 'Adobe XD', 'User Research', 'Prototyping'],
    application_deadline: new Date(Date.now() + 26 * 24 * 60 * 60 * 1000),
    source_url: 'https://razorpay.com/careers',
    source_name: 'Razorpay Careers'
  },
  {
    title: 'Data Analyst Intern',
    company_name: 'Ola',
    location: 'Bangalore',
    work_type: 'hybrid',
    duration_months: 5,
    stipend: 40000,
    description: 'Analyze ride data to derive insights and improve business decisions. Work with SQL, Python, and data visualization tools.',
    required_skills: ['SQL', 'Python', 'Excel', 'Tableau', 'Statistics'],
    application_deadline: new Date(Date.now() + 24 * 24 * 60 * 60 * 1000),
    source_url: 'https://ola.com/careers',
    source_name: 'Ola Careers'
  },
  {
    title: 'Cybersecurity Intern',
    company_name: 'Infosys',
    location: 'Pune',
    work_type: 'office',
    duration_months: 6,
    stipend: 25000,
    description: 'Learn about security best practices, penetration testing, and vulnerability assessment. Work on real security projects.',
    required_skills: ['Network Security', 'Ethical Hacking', 'Linux', 'Python'],
    application_deadline: new Date(Date.now() + 40 * 24 * 60 * 60 * 1000),
    source_url: 'https://infosys.com/careers',
    source_name: 'Infosys Careers'
  },
  {
    title: 'Cloud Computing Intern',
    company_name: 'TCS',
    location: 'Chennai',
    work_type: 'hybrid',
    duration_months: 6,
    stipend: 22000,
    description: 'Work with AWS, Azure, and GCP. Learn cloud architecture, serverless computing, and infrastructure as code.',
    required_skills: ['AWS', 'Azure', 'Cloud Architecture', 'Terraform'],
    application_deadline: new Date(Date.now() + 38 * 24 * 60 * 60 * 1000),
    source_url: 'https://tcs.com/careers',
    source_name: 'TCS Careers'
  },
  {
    title: 'Product Management Intern',
    company_name: 'PhonePe',
    location: 'Bangalore',
    work_type: 'office',
    duration_months: 5,
    stipend: 55000,
    description: 'Work with product managers to define features, analyze metrics, and improve user experience for digital payments.',
    required_skills: ['Product Strategy', 'Analytics', 'SQL', 'Communication'],
    application_deadline: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
    source_url: 'https://phonepe.com/careers',
    source_name: 'PhonePe Careers'
  },
  {
    title: 'Blockchain Developer Intern',
    company_name: 'Polygon',
    location: 'Remote',
    work_type: 'remote',
    duration_months: 6,
    stipend: 60000,
    description: 'Build decentralized applications on Polygon network. Work with Solidity, Web3.js, and smart contracts.',
    required_skills: ['Solidity', 'Blockchain', 'Web3', 'JavaScript'],
    application_deadline: new Date(Date.now() + 33 * 24 * 60 * 60 * 1000),
    source_url: 'https://polygon.technology/careers',
    source_name: 'Polygon Careers'
  },
  {
    title: 'Game Development Intern',
    company_name: 'Dream11',
    location: 'Mumbai',
    work_type: 'hybrid',
    duration_months: 4,
    stipend: 38000,
    description: 'Develop engaging gaming features for fantasy sports platform. Work with Unity, game mechanics, and real-time systems.',
    required_skills: ['Unity', 'C#', 'Game Design', 'Physics'],
    application_deadline: new Date(Date.now() + 27 * 24 * 60 * 60 * 1000),
    source_url: 'https://dream11.com/careers',
    source_name: 'Dream11 Careers'
  },
  {
    title: 'AI Research Intern',
    company_name: 'NVIDIA',
    location: 'Pune',
    work_type: 'hybrid',
    duration_months: 6,
    stipend: 85000,
    description: 'Research and develop AI algorithms for computer graphics and autonomous systems. Work with cutting-edge GPU technology.',
    required_skills: ['Deep Learning', 'CUDA', 'Python', 'Computer Vision'],
    application_deadline: new Date(Date.now() + 29 * 24 * 60 * 60 * 1000),
    source_url: 'https://nvidia.com/careers',
    source_name: 'NVIDIA Careers'
  },
  {
    title: 'Content Writing Intern',
    company_name: 'Byju\'s',
    location: 'Bangalore',
    work_type: 'remote',
    duration_months: 3,
    stipend: 15000,
    description: 'Create educational content for K-12 students. Write engaging lessons, quizzes, and learning materials.',
    required_skills: ['Content Writing', 'Research', 'Education', 'Communication'],
    application_deadline: new Date(Date.now() + 19 * 24 * 60 * 60 * 1000),
    source_url: 'https://byjus.com/careers',
    source_name: 'Byju\'s Careers'
  },
  {
    title: 'Digital Marketing Intern',
    company_name: 'Meesho',
    location: 'Bangalore',
    work_type: 'hybrid',
    duration_months: 4,
    stipend: 20000,
    description: 'Plan and execute digital marketing campaigns. Work with SEO, social media, email marketing, and analytics.',
    required_skills: ['Digital Marketing', 'SEO', 'Social Media', 'Google Analytics'],
    application_deadline: new Date(Date.now() + 23 * 24 * 60 * 60 * 1000),
    source_url: 'https://meesho.com/careers',
    source_name: 'Meesho Careers'
  },
  {
    title: 'Quality Assurance Intern',
    company_name: 'Freshworks',
    location: 'Chennai',
    work_type: 'office',
    duration_months: 5,
    stipend: 30000,
    description: 'Test software products, write test cases, and automate testing processes. Ensure product quality and reliability.',
    required_skills: ['Manual Testing', 'Selenium', 'Test Automation', 'JIRA'],
    application_deadline: new Date(Date.now() + 31 * 24 * 60 * 60 * 1000),
    source_url: 'https://freshworks.com/careers',
    source_name: 'Freshworks Careers'
  },
  {
    title: 'Business Analyst Intern',
    company_name: 'Accenture',
    location: 'Gurgaon',
    work_type: 'hybrid',
    duration_months: 6,
    stipend: 28000,
    description: 'Analyze business processes, gather requirements, and create documentation. Work with stakeholders to improve operations.',
    required_skills: ['Business Analysis', 'Excel', 'SQL', 'Communication'],
    application_deadline: new Date(Date.now() + 36 * 24 * 60 * 60 * 1000),
    source_url: 'https://accenture.com/careers',
    source_name: 'Accenture Careers'
  }
]

async function seedInternships() {
  const client = await pool.connect()
  
  try {
    console.log('🌱 Starting to seed internships...')
    
    let successCount = 0
    let errorCount = 0
    
    for (const internship of internships) {
      try {
        const query = `
          INSERT INTO internships (
            title, company_name, location, work_type, duration_months, stipend,
            description, required_skills, application_deadline, application_url, source_website,
            external_id, is_active, created_at, updated_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, true, NOW(), NOW())
          ON CONFLICT (source_website, external_id) DO NOTHING
          RETURNING id
        `
        
        const values = [
          internship.title,
          internship.company_name,
          internship.location,
          internship.work_type,
          internship.duration_months,
          internship.stipend,
          internship.description,
          internship.required_skills,
          internship.application_deadline,
          internship.source_url,
          internship.source_name,
          `${internship.company_name.toLowerCase().replace(/\s+/g, '-')}-${internship.title.toLowerCase().replace(/\s+/g, '-')}`
        ]
        
        const result = await client.query(query, values)
        
        if (result.rows.length > 0) {
          successCount++
          console.log(`✅ Added: ${internship.title} at ${internship.company_name}`)
        } else {
          console.log(`⏭️  Skipped (already exists): ${internship.title} at ${internship.company_name}`)
        }
      } catch (error) {
        errorCount++
        console.error(`❌ Error adding ${internship.title}:`, error)
      }
    }
    
    console.log(`\n🎉 Seeding complete!`)
    console.log(`✅ Successfully added: ${successCount} internships`)
    console.log(`❌ Errors: ${errorCount}`)
    console.log(`📊 Total attempted: ${internships.length}`)
    
  } catch (error) {
    console.error('❌ Fatal error during seeding:', error)
    throw error
  } finally {
    client.release()
    await pool.end()
  }
}

// Run the seed function
seedInternships()
  .then(() => {
    console.log('✅ Seed script completed successfully')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Seed script failed:', error)
    process.exit(1)
  })
